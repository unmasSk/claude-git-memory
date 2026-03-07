"""
Lifecycle tests for doctor, install, repair, and uninstall.

Runs the full install, doctor, break, repair, uninstall cycle
in a shared temporary repo.
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile

import pytest

from conftest import (
    DOCTOR, INSTALL, REPAIR, UNINSTALL,
    run_cmd, git_cmd, run_script, run_doctor_json,
)


# ── Helpers ────────────────────────────────────────────────────────────

def run_install(cwd, extra_args=None):
    """Run the install script with --auto."""
    return run_script(INSTALL, cwd, ["--auto"] + (extra_args or []))


def run_repair(cwd, extra_args=None):
    """Run the repair script with --auto."""
    return run_script(REPAIR, cwd, ["--auto"] + (extra_args or []))


def run_uninstall(cwd, extra_args=None):
    """Run the uninstall script with --auto."""
    return run_script(UNINSTALL, cwd, ["--auto"] + (extra_args or []))


# ── Module-scoped fixture (sequential tests share one repo) ───────────

@pytest.fixture(scope="module")
def lifecycle_repo():
    """Create a temp git repo for lifecycle tests."""
    path = tempfile.mkdtemp(prefix="lifecycle-test-")
    git_cmd(["init"], path)
    git_cmd(["checkout", "-b", "main"], path)
    run_cmd(["git", "commit", "--allow-empty", "-m",
             "chore: init repo\n\nWhy: initial setup\nTouched: none"], path)
    yield path
    shutil.rmtree(path, ignore_errors=True)


# ── Tests (run in definition order) ───────────────────────────────────


def test_doctor_fresh_repo(lifecycle_repo):
    """Doctor on a fresh repo should find missing components."""
    result, rc = run_doctor_json(lifecycle_repo)
    assert result.get("status") != "ok", "Doctor reported 'ok' on fresh repo"

    hook_check = next((c for c in result.get("checks", []) if c.get("component") == "Hooks"), None)
    assert hook_check and "0/4" in hook_check.get("message", "")

    skill_check = next((c for c in result.get("checks", []) if c.get("component") == "Skills"), None)
    assert skill_check and "0/4" in skill_check.get("message", "")


def test_install(lifecycle_repo):
    """Install should create all components."""
    rc, _, _ = run_install(lifecycle_repo)
    assert rc == 0

    # Hooks
    hooks_dir = os.path.join(lifecycle_repo, "hooks")
    for hook in ["pre-validate-commit-trailers.py", "post-validate-commit-trailers.py",
                 "precompact-snapshot.py", "stop-dod-check.py"]:
        assert os.path.isfile(os.path.join(hooks_dir, hook)), f"Hook missing: {hook}"

    # Skills
    skills_dir = os.path.join(lifecycle_repo, "skills")
    for skill in ["git-memory", "git-memory-protocol", "git-memory-lifecycle", "git-memory-recovery"]:
        assert os.path.isfile(os.path.join(skills_dir, skill, "SKILL.md")), f"Skill missing: {skill}"

    # CLI
    cli = os.path.join(lifecycle_repo, "bin", "git-memory")
    assert os.path.isfile(cli) and os.access(cli, os.X_OK)

    # CLAUDE.md
    with open(os.path.join(lifecycle_repo, "CLAUDE.md")) as f:
        assert "BEGIN claude-git-memory" in f.read()

    # Manifest
    with open(os.path.join(lifecycle_repo, ".claude", "git-memory-manifest.json")) as f:
        assert json.load(f).get("version") == "2.0.0"

    # hooks.json
    assert os.path.isfile(os.path.join(lifecycle_repo, "hooks.json"))


def test_doctor_after_install(lifecycle_repo):
    """Doctor after install should report healthy (no errors)."""
    result, _ = run_doctor_json(lifecycle_repo)
    assert result.get("status") != "error"
    error_checks = [c for c in result.get("checks", []) if c.get("level") == "error"]
    assert not error_checks


def test_repair(lifecycle_repo):
    """Break components, then repair should fix them."""
    hook_path = os.path.join(lifecycle_repo, "hooks", "pre-validate-commit-trailers.py")
    skill_dir = os.path.join(lifecycle_repo, "skills", "git-memory-protocol")
    manifest = os.path.join(lifecycle_repo, ".claude", "git-memory-manifest.json")

    # Break things
    if os.path.isfile(hook_path):
        os.unlink(hook_path)
    if os.path.isdir(skill_dir):
        shutil.rmtree(skill_dir)
    if os.path.isfile(manifest):
        os.unlink(manifest)

    # Doctor detects problems
    result, _ = run_doctor_json(lifecycle_repo)
    error_checks = [c for c in result.get("checks", []) if c.get("level") == "error"]
    assert len(error_checks) > 0

    # Repair
    rc, _, _ = run_repair(lifecycle_repo)
    assert rc == 0
    assert os.path.isfile(hook_path), "Hook not restored"
    assert os.path.isfile(os.path.join(skill_dir, "SKILL.md")), "Skill not restored"
    assert os.path.isfile(manifest), "Manifest not restored"


def test_uninstall(lifecycle_repo):
    """Uninstall should remove components but preserve git history."""
    _, count_before, _ = git_cmd("rev-list --count HEAD", lifecycle_repo)

    rc, _, _ = run_uninstall(lifecycle_repo)
    assert rc == 0

    # Components gone
    hooks_dir = os.path.join(lifecycle_repo, "hooks")
    assert not (os.path.isdir(hooks_dir) and os.listdir(hooks_dir))

    skills_dir = os.path.join(lifecycle_repo, "skills")
    assert not (os.path.isdir(skills_dir) and os.listdir(skills_dir))

    assert not os.path.exists(os.path.join(lifecycle_repo, "bin", "git-memory"))

    claude_md = os.path.join(lifecycle_repo, "CLAUDE.md")
    if os.path.isfile(claude_md):
        with open(claude_md) as f:
            assert "BEGIN claude-git-memory" not in f.read()

    assert not os.path.exists(os.path.join(lifecycle_repo, ".claude", "git-memory-manifest.json"))

    # History preserved
    _, count_after, _ = git_cmd("rev-list --count HEAD", lifecycle_repo)
    assert count_before == count_after


def test_doctor_after_uninstall(lifecycle_repo):
    """Doctor after uninstall should find missing components."""
    result, _ = run_doctor_json(lifecycle_repo)
    assert result.get("status") != "ok"


def test_reinstall(lifecycle_repo):
    """Re-install after uninstall."""
    rc, _, _ = run_install(lifecycle_repo)
    assert rc == 0

    result, _ = run_doctor_json(lifecycle_repo)
    error_checks = [c for c in result.get("checks", []) if c.get("level") == "error"]
    assert not error_checks


def test_uninstall_full_local(lifecycle_repo):
    """Uninstall --full-local removes generated files too."""
    dashboard = os.path.join(lifecycle_repo, ".claude", "dashboard.html")
    os.makedirs(os.path.dirname(dashboard), exist_ok=True)
    with open(dashboard, "w") as f:
        f.write("<html>dashboard</html>")

    rc, _, _ = run_uninstall(lifecycle_repo, ["--full-local"])
    assert rc == 0
    assert not os.path.exists(dashboard)


def test_repair_dry_run(lifecycle_repo):
    """Repair --dry-run doesn't change anything."""
    run_install(lifecycle_repo)

    hook = os.path.join(lifecycle_repo, "hooks", "stop-dod-check.py")
    if os.path.isfile(hook):
        os.unlink(hook)

    # Dry run should NOT fix it
    run_cmd([sys.executable, REPAIR, "--dry-run"], lifecycle_repo)
    assert not os.path.isfile(hook), "Dry run repaired the hook"

    # Real repair should fix it
    run_repair(lifecycle_repo)
    assert os.path.isfile(hook), "Real repair didn't restore the hook"


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))
