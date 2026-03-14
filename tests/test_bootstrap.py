"""
Bootstrap tests for conservative project detection.

Covers empty projects, Node.js/TS, Python, monorepo detection,
commitlint integration, installed memory, multiple ecosystems, and silent mode.
"""

import json
import os
import subprocess
import sys

import pytest

from conftest import (
    BOOTSTRAP, INSTALL,
    git_cmd, write_file, run_script,
)


# ── Helpers ────────────────────────────────────────────────────────────

def make_temp_repo(tmp_path, name="repo"):
    """Create a temporary git repo with an initial empty commit."""
    repo = str(tmp_path / name)
    os.makedirs(repo)
    subprocess.run(["git", "init", repo], capture_output=True)
    subprocess.run(["git", "-C", repo, "commit", "--allow-empty", "-m", "init"], capture_output=True)
    return repo


def run_bootstrap(cwd, extra_args=None):
    """Run bootstrap with --json and return (rc, stdout, parsed_json)."""
    rc, stdout, stderr = run_script(BOOTSTRAP, cwd, ["--json"] + (extra_args or []))
    parsed = None
    if stdout:
        try:
            parsed = json.loads(stdout)
        except json.JSONDecodeError:
            pass
    return rc, stdout, parsed


# ── Tests ──────────────────────────────────────────────────────────────


def test_empty_project(tmp_path):
    """Empty project suggests minimal_bootstrap."""
    repo = make_temp_repo(tmp_path)
    _, _, data = run_bootstrap(repo)
    assert data is not None
    suggestions = [s["action"] for s in data.get("suggestions", [])]
    findings_categories = [f["category"] for f in data.get("findings", [])]
    assert "stack" not in findings_categories
    assert "minimal_bootstrap" in suggestions


def test_nodejs_typescript(tmp_path):
    """Detects React, Next.js, TypeScript, Tailwind."""
    repo = make_temp_repo(tmp_path)
    write_file(repo, "package.json", json.dumps({
        "name": "test-app",
        "dependencies": {"react": "^18.0.0", "next": "^14.0.0"},
        "devDependencies": {"typescript": "^5.3.0"},
    }))
    write_file(repo, "tsconfig.json", '{"compilerOptions":{}}')
    write_file(repo, "tailwind.config.js", "module.exports = {}")
    subprocess.run(["git", "-C", repo, "add", "-A"], capture_output=True)
    subprocess.run(["git", "-C", repo, "commit", "-m", "setup"], capture_output=True)

    _, _, data = run_bootstrap(repo)
    findings_text = [f["text"] for f in data.get("findings", [])]
    assert any("React" in t for t in findings_text)
    assert any("Next.js" in t for t in findings_text)
    assert any("TypeScript" in t for t in findings_text)
    assert any("Tailwind" in t for t in findings_text)
    assert "bootstrap_commit" in [s["action"] for s in data.get("suggestions", [])]


def test_python_project(tmp_path):
    """Detects Python, FastAPI, SQLAlchemy, Pydantic."""
    repo = make_temp_repo(tmp_path)
    write_file(repo, "pyproject.toml", """
[project]
name = "my-api"
requires-python = ">=3.11"

[build-system]
build-backend = "hatchling.core"

[project.dependencies]
fastapi = ">=0.110"
sqlalchemy = ">=2.0"
pydantic = ">=2.0"
""")
    write_file(repo, "requirements.txt", "fastapi\nsqlalchemy\n")
    subprocess.run(["git", "-C", repo, "add", "-A"], capture_output=True)
    subprocess.run(["git", "-C", repo, "commit", "-m", "setup"], capture_output=True)

    _, _, data = run_bootstrap(repo)
    findings_text = [f["text"] for f in data.get("findings", [])]
    assert any("Python" in t for t in findings_text)
    assert any("FastAPI" in t for t in findings_text)
    assert any("SQLAlchemy" in t for t in findings_text)
    assert any("Pydantic" in t for t in findings_text)


def test_monorepo(tmp_path):
    """Detects monorepo structure and suggests ask_scope."""
    repo = make_temp_repo(tmp_path)
    write_file(repo, "package.json", json.dumps({
        "name": "monorepo",
        "workspaces": ["packages/*"],
    }))
    write_file(repo, "turbo.json", "{}")
    write_file(repo, "packages/web/package.json", '{"name": "@app/web"}')
    write_file(repo, "packages/api/package.json", '{"name": "@app/api"}')
    write_file(repo, "packages/shared/package.json", '{"name": "@app/shared"}')
    subprocess.run(["git", "-C", repo, "add", "-A"], capture_output=True)
    subprocess.run(["git", "-C", repo, "commit", "-m", "setup"], capture_output=True)

    _, _, data = run_bootstrap(repo)
    findings = data.get("findings", [])
    hypotheses = [f for f in findings if f["level"] == "hypothesis"]
    suggestions = [s["action"] for s in data.get("suggestions", [])]

    assert any("Monorepo" in f["text"] for f in hypotheses)
    assert "ask_scope" in suggestions
    assert len(data.get("monorepo_signals", [])) > 0
    # Scope map should map packages/X → X
    scope_map = data.get("monorepo_scope_map", {})
    assert "packages/web" in scope_map
    assert scope_map["packages/web"] == "web"
    assert "packages/api" in scope_map


def test_commitlint_detected(tmp_path):
    """Detects commitlint and suggests compatible mode."""
    repo = make_temp_repo(tmp_path)
    write_file(repo, "commitlint.config.js",
               "module.exports = { extends: ['@commitlint/config-conventional'] };")
    write_file(repo, "package.json", '{"name": "test"}')
    os.makedirs(os.path.join(repo, ".husky"), exist_ok=True)
    write_file(repo, ".husky/commit-msg", '#!/bin/sh\nnpx --no -- commitlint --edit "$1"')
    subprocess.run(["git", "-C", repo, "add", "-A"], capture_output=True)
    subprocess.run(["git", "-C", repo, "commit", "-m", "setup"], capture_output=True)

    _, _, data = run_bootstrap(repo)
    findings = data.get("findings", [])
    suggestions = [s["action"] for s in data.get("suggestions", [])]

    assert any("commitlint" in f.get("text", "").lower()
               for f in findings if f["level"] == "hypothesis")
    assert "consider_compatible_mode" in suggestions


def test_memory_already_installed(tmp_path):
    """Detects git-memory already installed."""
    repo = make_temp_repo(tmp_path)
    claude_dir = os.path.join(repo, ".claude")
    os.makedirs(claude_dir, exist_ok=True)
    with open(os.path.join(claude_dir, "git-memory-manifest.json"), "w") as f:
        json.dump({"version": "2.1.0", "runtime_mode": "normal"}, f)
    subprocess.run(["git", "-C", repo, "add", "-A"], capture_output=True)
    subprocess.run(["git", "-C", repo, "commit", "-m", "installed"], capture_output=True)

    _, _, data = run_bootstrap(repo)
    suggestions = [s["action"] for s in data.get("suggestions", [])]
    findings = data.get("findings", [])

    assert any("already installed" in f.get("text", "") for f in findings)
    assert "skip_bootstrap" in suggestions


def test_multiple_ecosystems(tmp_path):
    """Detects Docker, Go, GitHub Actions, Make."""
    repo = make_temp_repo(tmp_path)
    write_file(repo, "Dockerfile", "FROM python:3.11")
    write_file(repo, "Makefile", "build:\n\tdocker build .")
    os.makedirs(os.path.join(repo, ".github", "workflows"), exist_ok=True)
    write_file(repo, ".github/workflows/ci.yml", "name: CI")
    write_file(repo, "go.mod", "module myapp\ngo 1.22")
    subprocess.run(["git", "-C", repo, "add", "-A"], capture_output=True)
    subprocess.run(["git", "-C", repo, "commit", "-m", "setup"], capture_output=True)

    _, _, data = run_bootstrap(repo)
    findings_text = [f["text"] for f in data.get("findings", [])]

    assert any("Docker" in t for t in findings_text)
    assert any("Go" in t for t in findings_text)
    assert any("GitHub Actions" in t for t in findings_text)
    assert any("Make" in t for t in findings_text)


def test_silent_exit_code(tmp_path):
    """--silent mode: empty → exit 1, with stack → exit 0, no output."""
    repo = make_temp_repo(tmp_path)

    result_empty = subprocess.run(
        [sys.executable, BOOTSTRAP, "--silent"],
        capture_output=True, text=True, cwd=repo, timeout=15,
    )

    write_file(repo, "package.json", '{"name": "test"}')
    subprocess.run(["git", "-C", repo, "add", "-A"], capture_output=True)
    subprocess.run(["git", "-C", repo, "commit", "-m", "add"], capture_output=True)

    result_full = subprocess.run(
        [sys.executable, BOOTSTRAP, "--silent"],
        capture_output=True, text=True, cwd=repo, timeout=15,
    )

    assert result_empty.returncode == 1
    assert result_full.returncode == 0
    assert result_empty.stdout.strip() == ""
    assert result_full.stdout.strip() == ""


# ── Scope mapping (unit tests, no git needed) ───────────────────────────

def test_suggest_scope_single_match():
    """All files in one scope → returns that scope."""
    from parsing import suggest_scope_from_paths

    scope_map = {"apps/web": "web", "apps/api": "api", "packages/ui": "ui"}
    files = ["apps/web/src/index.ts", "apps/web/src/app.tsx"]
    assert suggest_scope_from_paths(files, scope_map) == "web"


def test_suggest_scope_ambiguous():
    """Files across multiple scopes → returns None."""
    from parsing import suggest_scope_from_paths

    scope_map = {"apps/web": "web", "apps/api": "api"}
    files = ["apps/web/src/index.ts", "apps/api/src/server.ts"]
    assert suggest_scope_from_paths(files, scope_map) is None


def test_suggest_scope_root_files_ignored():
    """Root-level files (outside any scope) are ignored."""
    from parsing import suggest_scope_from_paths

    scope_map = {"apps/web": "web", "packages/ui": "ui"}
    files = ["apps/web/src/index.ts", "README.md", ".gitignore"]
    assert suggest_scope_from_paths(files, scope_map) == "web"


def test_suggest_scope_empty():
    """Empty inputs → None."""
    from parsing import suggest_scope_from_paths

    assert suggest_scope_from_paths([], {"a": "b"}) is None
    assert suggest_scope_from_paths(["x/y"], {}) is None


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))
