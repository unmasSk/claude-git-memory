"""
Upgrade tests for safe version migration.

Covers no-install error, up-to-date check, dry-run, real upgrade,
JSON output, and manifest updates.

NOTE: Upgrade now only updates CLAUDE.md managed block and manifest.
No files are compared or copied since the plugin runs from the cache.
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
from version import VERSION


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
    assert "latest version" in stdout.lower() or "up to date" in stdout.lower() or "up_to_date" in stdout


def test_detects_outdated_block(tmp_path):
    """Dry-run detects outdated CLAUDE.md managed block."""
    repo = make_installed_repo(tmp_path)

    # Tamper with the managed block
    claude_md = os.path.join(repo, "CLAUDE.md")
    with open(claude_md) as f:
        content = f.read()
    content = content.replace("Git Memory Active", "Git Memory OLD")
    with open(claude_md, "w") as f:
        f.write(content)

    rc, stdout, _ = run_upgrade(repo, ["--dry-run"])
    assert rc == 0
    assert "outdated" in stdout.lower() or "changes" in stdout.lower() or "dry-run" in stdout.lower()


def test_upgrade_restores_block(tmp_path):
    """Real upgrade restores CLAUDE.md managed block and creates backup."""
    repo = make_installed_repo(tmp_path)

    # Tamper with the managed block
    claude_md = os.path.join(repo, "CLAUDE.md")
    with open(claude_md) as f:
        content = f.read()
    content = content.replace("Git Memory Active", "Git Memory OLD")
    with open(claude_md, "w") as f:
        f.write(content)

    rc, stdout, _ = run_upgrade(repo, ["--auto"])
    assert rc == 0

    with open(claude_md) as f:
        assert "Git Memory Active" in f.read()

    backup_dir = os.path.join(repo, ".claude", "backups")
    assert os.path.isdir(backup_dir)
    assert len(os.listdir(backup_dir)) >= 1


def test_json_output(tmp_path):
    """JSON --check output includes status and version info."""
    repo = make_installed_repo(tmp_path)

    # Tamper to trigger update_available
    claude_md = os.path.join(repo, "CLAUDE.md")
    with open(claude_md) as f:
        content = f.read()
    content = content.replace("Git Memory Active", "Git Memory OLD")
    with open(claude_md, "w") as f:
        f.write(content)

    rc, stdout, _ = run_upgrade(repo, ["--check", "--json"])
    data = json.loads(stdout)
    assert data.get("status") == "update_available"
    assert "installed_version" in data
    assert "reasons" in data


def test_check_json_up_to_date(tmp_path):
    """--check --json returns up_to_date status when current."""
    repo = make_installed_repo(tmp_path)

    rc, stdout, _ = run_upgrade(repo, ["--check", "--json"])
    data = json.loads(stdout)
    assert data.get("status") == "up_to_date"


def test_manifest_updated(tmp_path):
    """Manifest is updated after upgrade."""
    repo = make_installed_repo(tmp_path)

    # Tamper with CLAUDE.md to trigger upgrade
    claude_md = os.path.join(repo, "CLAUDE.md")
    with open(claude_md) as f:
        content = f.read()
    content = content.replace("Git Memory Active", "Git Memory OLD")
    with open(claude_md, "w") as f:
        f.write(content)

    run_upgrade(repo, ["--auto"])

    manifest_path = os.path.join(repo, ".claude", ".unmassk", "manifest.json")
    with open(manifest_path) as f:
        manifest = json.load(f)

    assert "upgraded_at" in manifest
    assert manifest["version"] == VERSION


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))
