"""
Upgrade tests for safe version migration.

Covers no-install error, up-to-date check, dry-run, real upgrade,
JSON output, and manifest updates.
"""

import json
import os
import subprocess
import sys

import pytest

from conftest import (
    INSTALL, UPGRADE, DOCTOR,
    git_cmd, run_script,
)


# ── Helpers ────────────────────────────────────────────────────────────

def make_installed_repo(tmp_path, name="repo"):
    """Create a temporary git repo with git-memory installed."""
    repo = str(tmp_path / name)
    os.makedirs(repo)
    subprocess.run(["git", "init", repo], capture_output=True)
    subprocess.run(["git", "-C", repo, "commit", "--allow-empty", "-m", "init"], capture_output=True)
    subprocess.run(
        [sys.executable, INSTALL, "--auto"],
        capture_output=True, text=True, cwd=repo, timeout=15,
    )
    return repo


def run_upgrade(cwd, extra_args=None):
    """Run the upgrade script and return (rc, stdout, stderr)."""
    return run_script(UPGRADE, cwd, extra_args)


# ── Tests ──────────────────────────────────────────────────────────────


def test_no_install_error(tmp_path):
    """Upgrade without install should fail."""
    repo = str(tmp_path / "repo")
    os.makedirs(repo)
    subprocess.run(["git", "init", repo], capture_output=True)
    subprocess.run(["git", "-C", repo, "commit", "--allow-empty", "-m", "init"], capture_output=True)

    rc, stdout, stderr = run_upgrade(repo)
    assert rc == 1
    assert "install" in stderr.lower() or "install" in stdout.lower()


def test_up_to_date(tmp_path):
    """Everything up-to-date → nothing to do."""
    repo = make_installed_repo(tmp_path)

    rc, stdout, _ = run_upgrade(repo, ["--check"])
    assert rc == 0
    assert "latest version" in stdout or "up to date" in stdout.lower() or "reciente" in stdout


def test_detects_modified_file(tmp_path):
    """Dry-run detects modified hook but doesn't change it."""
    repo = make_installed_repo(tmp_path)

    hook = os.path.join(repo, "hooks", "pre-validate-commit-trailers.py")
    with open(hook, "a") as f:
        f.write("\n# viejo\n")

    rc, stdout, _ = run_upgrade(repo, ["--dry-run"])
    assert rc == 0
    assert "pre-validate" in stdout

    with open(hook) as f:
        assert "viejo" in f.read(), "Dry-run modified the hook"


def test_upgrade_restores_files(tmp_path):
    """Real upgrade restores modified files and creates backup."""
    repo = make_installed_repo(tmp_path)

    hook = os.path.join(repo, "hooks", "pre-validate-commit-trailers.py")
    with open(hook, "a") as f:
        f.write("\n# viejo\n")

    rc, stdout, _ = run_upgrade(repo, ["--auto"])
    assert rc == 0

    with open(hook) as f:
        assert "viejo" not in f.read()

    backup_dir = os.path.join(repo, ".claude", "backups")
    assert os.path.isdir(backup_dir)
    assert len(os.listdir(backup_dir)) >= 1


def test_json_output(tmp_path):
    """JSON output includes status, version, and changes."""
    repo = make_installed_repo(tmp_path)

    skill = os.path.join(repo, "skills", "git-memory", "SKILL.md")
    with open(skill, "a") as f:
        f.write("\n# viejo\n")

    rc, stdout, _ = run_upgrade(repo, ["--json", "--dry-run"])
    data = json.loads(stdout)
    assert data.get("status") == "update_available"
    assert "installed_version" in data
    assert "modified" in data.get("changes", {})
    modified = data.get("changes", {}).get("modified", [])
    assert any("SKILL.md" in f for f in modified)


def test_check_json(tmp_path):
    """--check --json returns up_to_date status."""
    repo = make_installed_repo(tmp_path)

    rc, stdout, _ = run_upgrade(repo, ["--check", "--json"])
    data = json.loads(stdout)
    assert data.get("status") == "up_to_date"


def test_manifest_updated(tmp_path):
    """Manifest is updated after upgrade."""
    repo = make_installed_repo(tmp_path)

    hook = os.path.join(repo, "hooks", "stop-dod-check.py")
    with open(hook, "a") as f:
        f.write("\n# viejo\n")

    run_upgrade(repo, ["--auto"])

    manifest_path = os.path.join(repo, ".claude", "git-memory-manifest.json")
    with open(manifest_path) as f:
        manifest = json.load(f)

    assert "upgraded_at" in manifest
    assert manifest.get("version") == "2.0.0"
    assert "sha256:" in manifest.get("install_fingerprint", "")


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))
