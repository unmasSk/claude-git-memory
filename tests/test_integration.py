"""
End-to-end integration tests.

Covers real-world scenarios: install over existing config,
bootstrap, sessions, compaction, GC, branch-aware context,
uninstall+reinstall, upgrade, and bootstrap detection.

NOTE: The plugin runs from the cache (SOURCE_ROOT). Install only creates
CLAUDE.md + manifest at the project root. Hooks/skills/bin are never
copied to the project.
"""

import json
import os
import subprocess
import sys

import pytest

from conftest import (
    SOURCE_ROOT, HOOKS_DIR, INSTALL, UNINSTALL, UPGRADE, BOOTSTRAP, DOCTOR,
    PRE_HOOK, POST_HOOK,
    run_cmd, git_cmd, write_file, run_script, run_doctor_json,
)
from version import VERSION


# ── Helpers ────────────────────────────────────────────────────────────

def make_installed_repo(tmp_path, name="repo"):
    """Create a temp repo with git-memory installed."""
    repo = str(tmp_path / name)
    os.makedirs(repo)
    git_cmd(["init"], repo)
    git_cmd(["commit", "--allow-empty", "-m", "init"], repo)
    run_script(INSTALL, repo, ["--auto"])
    return repo


def run_hook_from_cache(hook_name, commit_msg, cwd, env_extra=None):
    """Run a hook script from the plugin source (cache) and return (rc, stdout, stderr)."""
    hook_path = os.path.join(HOOKS_DIR, hook_name)
    if not os.path.isfile(hook_path):
        return 1, "", f"hook not found: {hook_path}"
    env = {"CLAUDE_CODE": "1"}
    if env_extra:
        env.update(env_extra)
    return run_cmd([sys.executable, hook_path, commit_msg], cwd, env=env)


# ── Tests ──────────────────────────────────────────────────────────────


def test_install_over_existing(tmp_path):
    """Install over existing .claude/ preserves user content."""
    repo = str(tmp_path / "repo")
    os.makedirs(repo)
    git_cmd(["init"], repo)
    git_cmd(["commit", "--allow-empty", "-m", "init"], repo)

    # Create existing user content
    write_file(repo, ".claude/my-settings.json", '{"custom": true}')
    write_file(repo, "CLAUDE.md", "# Mi Proyecto\n\nInstrucciones personalizadas aquí.\n")
    git_cmd(["add", "-A"], repo)
    git_cmd(["commit", "-m", "mi config"], repo)

    rc, _, _ = run_script(INSTALL, repo, ["--auto"])
    assert rc == 0
    assert os.path.isfile(os.path.join(repo, ".claude", "my-settings.json"))

    with open(os.path.join(repo, "CLAUDE.md")) as f:
        claude_md = f.read()
    assert "Instrucciones personalizadas" in claude_md
    assert "BEGIN unmassk-gitmemory" in claude_md


def test_install_only_creates_claude_md_and_manifest(tmp_path):
    """Install should only create CLAUDE.md and manifest — no hooks/skills/bin at project root."""
    repo = make_installed_repo(tmp_path)

    # CLAUDE.md exists
    with open(os.path.join(repo, "CLAUDE.md")) as f:
        assert "BEGIN unmassk-gitmemory" in f.read()

    # Manifest exists
    with open(os.path.join(repo, ".claude", "git-memory-manifest.json")) as f:
        manifest = json.load(f)
        assert manifest["version"] == VERSION

    # Nothing else copied to project root
    assert not os.path.isdir(os.path.join(repo, "hooks"))
    assert not os.path.isdir(os.path.join(repo, "skills"))
    assert not os.path.isdir(os.path.join(repo, "bin"))
    assert not os.path.isdir(os.path.join(repo, "lib"))
    assert not os.path.isdir(os.path.join(repo, ".claude-plugin"))


def test_bootstrap_with_commits(tmp_path):
    """Bootstrap detects stack in project with commits."""
    repo = str(tmp_path / "repo")
    os.makedirs(repo)
    git_cmd(["init"], repo)
    write_file(repo, "package.json", json.dumps({
        "name": "test-app",
        "dependencies": {"react": "^18.0.0", "next": "^14.0.0"},
        "devDependencies": {"typescript": "^5.3.0"},
    }))
    write_file(repo, "tsconfig.json", "{}")
    git_cmd(["add", "-A"], repo)
    git_cmd(["commit", "-m", "setup"], repo)

    for i in range(25):
        write_file(repo, f"src/file{i}.ts", f"export const x{i} = {i}")
        git_cmd(["add", "-A"], repo)
        git_cmd(["commit", "-m", f"feat(app): add file{i}"], repo)

    rc, out, _ = run_script(BOOTSTRAP, repo, ["--json"])
    data = json.loads(out)
    findings = data.get("findings", [])
    stack_findings = [f for f in findings if f["category"] == "stack"]
    history_findings = [f for f in findings if f["category"] == "history"]

    assert len(stack_findings) > 0
    assert len(history_findings) > 0
    assert any("React" in f["text"] or "Next" in f["text"] for f in stack_findings)


def test_session_with_trailers(tmp_path):
    """Pre-hook accepts commits with valid trailers (hook runs from plugin cache)."""
    repo = make_installed_repo(tmp_path)

    write_file(repo, "src/main.py", "print('hello')")
    git_cmd(["add", "-A"], repo)

    msg = "✨ feat(core): add main\n\nWhy: initial implementation\nTouched: src/main.py"
    write_file(repo, ".git/COMMIT_EDITMSG", msg)
    msg_file = os.path.join(repo, ".git", "COMMIT_EDITMSG")

    rc, _, _ = run_hook_from_cache("pre-validate-commit-trailers.py", msg_file, repo)
    assert rc == 0

    git_cmd(["commit", "-m", msg], repo)

    rc, _, _ = run_hook_from_cache("post-validate-commit-trailers.py", msg_file, repo)
    assert rc == 0


def test_compaction_snapshot(tmp_path):
    """PreCompact snapshot stays within 18 lines."""
    repo = make_installed_repo(tmp_path)

    trailers_sets = [
        "Decision: usar TypeScript strict\nWhy: mejor tipado",
        "Memo: preference - siempre async/await\nWhy: consistencia",
        "Next: implementar auth\nBlocker: falta API key",
        "Decision: usar Prisma para ORM\nWhy: mejor DX",
        "Memo: stack - React 18, Next.js 14\nWhy: bootstrap",
    ]
    for i, trailers in enumerate(trailers_sets):
        git_cmd(["commit", "--allow-empty", "-m",
                 f"🧭 decision(core): choice {i}\n\n{trailers}"], repo)

    hook_path = os.path.join(HOOKS_DIR, "precompact-snapshot.py")
    if os.path.isfile(hook_path):
        rc, stdout, _ = run_cmd([sys.executable, hook_path], repo)
        if stdout:
            lines = stdout.strip().split("\n")
            assert len(lines) <= 18, f"Snapshot has {len(lines)} lines"


def test_gc_real(tmp_path):
    """GC executes and produces tombstones or reports clean."""
    repo = make_installed_repo(tmp_path)

    git_cmd(["commit", "--allow-empty", "-m",
             "📌 memo(old): setup\n\nNext: tarea vieja\nBlocker: algo bloqueado"], repo)

    old_date = "2025-01-01T00:00:00"
    git_cmd(["commit", "--allow-empty", "--date", old_date, "-m",
             "📌 memo(legacy): old stuff\n\nNext: tarea antigua\nBlocker: blocker viejo"], repo)

    gc_script = os.path.join(SOURCE_ROOT, "bin", "git-memory-gc.py")
    rc, stdout, _ = run_cmd([sys.executable, gc_script, "--auto", "--days", "7"], repo)
    assert rc == 0

    _, log_output, _ = git_cmd(["log", "-n", "5", "--pretty=format:%s%n%b"], repo)
    has_tombstone = ("Resolved-Next:" in log_output or "Stale-Blocker:" in log_output
                     or "Nothing" in stdout or "nothing" in stdout)
    assert has_tombstone


def test_human_commits_not_blocked(tmp_path):
    """Human commits without trailers should not be blocked (hook from cache)."""
    repo = make_installed_repo(tmp_path)

    hook_input = json.dumps({
        "tool_name": "Bash",
        "tool_input": {"command": 'git commit -m "fix: quick hotfix"'},
    })
    hook_path = os.path.join(HOOKS_DIR, "pre-validate-commit-trailers.py")

    # Without CLAUDE_CODE → allowed
    env_no_claude = {k: v for k, v in os.environ.items() if k != "CLAUDE_CODE"}
    result = subprocess.run(
        [sys.executable, hook_path],
        input=hook_input, capture_output=True, text=True,
        cwd=repo, timeout=15, env=env_no_claude,
    )
    assert result.returncode == 0

    # With CLAUDE_CODE → blocked
    result = subprocess.run(
        [sys.executable, hook_path],
        input=hook_input, capture_output=True, text=True,
        cwd=repo, timeout=15, env={**env_no_claude, "CLAUDE_CODE": "1"},
    )
    assert result.returncode == 2


def test_branch_context(tmp_path):
    """Branch change produces branch-aware context."""
    repo = make_installed_repo(tmp_path)

    # Remember the default branch name (may be "main" or "master")
    _, default_branch, _ = git_cmd(["branch", "--show-current"], repo)

    git_cmd(["commit", "--allow-empty", "-m",
             "🧭 decision(main): arch principal\n\nDecision: usar monolito\nWhy: simplicidad"], repo)

    git_cmd(["checkout", "-b", "feat/microservices"], repo)
    git_cmd(["commit", "--allow-empty", "-m",
             "🧭 decision(arch): cambiar arq\n\nDecision: usar microservicios\nWhy: escalabilidad"], repo)

    _, log_output, _ = git_cmd(["log", "-n", "5", "--pretty=format:%s%n%b"], repo)
    assert "microservicios" in log_output

    git_cmd(["checkout", default_branch], repo)
    _, log_output, _ = git_cmd(["log", "-n", "5", "--pretty=format:%s%n%b"], repo)
    assert "monolito" in log_output
    assert "microservicios" not in log_output


def test_uninstall_reinstall_data_intact(tmp_path):
    """Uninstall + reinstall preserves git history and trailers."""
    repo = make_installed_repo(tmp_path)

    git_cmd(["commit", "--allow-empty", "-m",
             "🧭 decision(api): usar REST\n\nDecision: REST over GraphQL\nWhy: simplicidad"], repo)
    git_cmd(["commit", "--allow-empty", "-m",
             "📌 memo(stack): Python 3.12\n\nMemo: stack - Python 3.12, FastAPI"], repo)

    _, log_before, _ = git_cmd(["log", "--oneline"], repo)
    commits_before = len(log_before.strip().split("\n"))

    run_script(UNINSTALL, repo, ["--auto"])

    # After uninstall: CLAUDE.md block gone, manifest gone
    claude_md = os.path.join(repo, "CLAUDE.md")
    if os.path.isfile(claude_md):
        with open(claude_md) as f:
            assert "BEGIN unmassk-gitmemory" not in f.read()
    assert not os.path.isfile(os.path.join(repo, ".claude", "git-memory-manifest.json"))

    _, log_after, _ = git_cmd(["log", "--oneline"], repo)
    assert len(log_after.strip().split("\n")) == commits_before

    _, full_log, _ = git_cmd(["log", "--pretty=format:%b"], repo)
    assert "Decision:" in full_log
    assert "Memo:" in full_log

    # Reinstall
    run_script(INSTALL, repo, ["--auto"])
    with open(os.path.join(repo, "CLAUDE.md")) as f:
        assert "BEGIN unmassk-gitmemory" in f.read()

    _, log_final, _ = git_cmd(["log", "--oneline"], repo)
    assert len(log_final.strip().split("\n")) == commits_before


def test_upgrade_creates_backup(tmp_path):
    """Upgrade creates a backup and updates CLAUDE.md managed block."""
    repo = make_installed_repo(tmp_path)

    # Tamper with the managed block to trigger an upgrade
    claude_md = os.path.join(repo, "CLAUDE.md")
    with open(claude_md) as f:
        content = f.read()
    content = content.replace("Git Memory Active", "Git Memory OLD VERSION")
    with open(claude_md, "w") as f:
        f.write(content)

    rc, _, _ = run_script(UPGRADE, repo, ["--auto"])
    assert rc == 0

    # Backup exists
    backup_dir = os.path.join(repo, ".claude", "backups")
    assert os.path.isdir(backup_dir) and len(os.listdir(backup_dir)) > 0

    # CLAUDE.md restored
    with open(claude_md) as f:
        assert "Git Memory Active" in f.read()

    result, _ = run_doctor_json(repo)
    assert result.get("status") != "error"


def test_bootstrap_detects_installed(tmp_path):
    """Bootstrap detects already-installed git-memory."""
    repo = make_installed_repo(tmp_path)

    rc, out, _ = run_script(BOOTSTRAP, repo, ["--json"])
    data = json.loads(out)
    suggestions = [s["action"] for s in data.get("suggestions", [])]
    assert "skip_bootstrap" in suggestions


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))
