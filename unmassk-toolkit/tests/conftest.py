"""Shared fixtures and helpers for git-memory tests."""

import json
import os
import subprocess
import sys

import pytest

SOURCE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BIN_DIR = os.path.join(SOURCE_ROOT, "bin")
LIB_DIR = os.path.join(SOURCE_ROOT, "lib")

# Make lib/ importable for unit tests of shared modules
if LIB_DIR not in sys.path:
    sys.path.insert(0, LIB_DIR)
HOOKS_DIR = os.path.join(SOURCE_ROOT, "hooks")

# Hook / script paths (all in plugin source, not project root)
PRECOMPACT_SCRIPT = os.path.join(HOOKS_DIR, "precompact-snapshot.py")
PRE_HOOK = os.path.join(HOOKS_DIR, "pre-validate-commit-trailers.py")
POST_HOOK = os.path.join(HOOKS_DIR, "post-validate-commit-trailers.py")

DOCTOR = os.path.join(BIN_DIR, "git-memory-doctor.py")
INSTALL = os.path.join(BIN_DIR, "git-memory-install.py")
REPAIR = os.path.join(BIN_DIR, "git-memory-repair.py")
UNINSTALL = os.path.join(BIN_DIR, "git-memory-uninstall.py")
UPGRADE = os.path.join(BIN_DIR, "git-memory-upgrade.py")
BOOTSTRAP = os.path.join(BIN_DIR, "git-memory-bootstrap.py")


# ── Helpers ────────────────────────────────────────────────────────────


def run_cmd(args, cwd, timeout=30, env=None, input_text=None):
    """Run a command and return (returncode, stdout, stderr)."""
    merged = {**os.environ, **(env or {})}
    result = subprocess.run(
        args, capture_output=True, text=True,
        cwd=cwd, timeout=timeout, env=merged, input=input_text,
    )
    return result.returncode, result.stdout.strip(), result.stderr.strip()


def git_cmd(args, cwd, env=None):
    """Run a git command. args can be a list or a space-separated string."""
    if isinstance(args, str):
        args = args.split()
    return run_cmd(["git"] + args, cwd, env=env)


def write_file(repo, path, content):
    """Write a file inside a repo directory."""
    full = os.path.join(repo, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w") as f:
        f.write(content)


def run_script(script_path, cwd, extra_args=None, timeout=30, env=None, input_text=None):
    """Run a Python script. Returns (returncode, stdout, stderr)."""
    args = [sys.executable, script_path] + (extra_args or [])
    return run_cmd(args, cwd, timeout=timeout, env=env, input_text=input_text)


def run_doctor_json(cwd):
    """Run doctor --json and return (parsed_dict, returncode)."""
    rc, out, _ = run_script(DOCTOR, cwd, ["--json"])
    try:
        return json.loads(out), rc
    except json.JSONDecodeError:
        return {"status": "error", "checks": []}, rc


def check_hook_msg(subject, cwd, trailers=None, as_claude=False):
    """Send a commit message to the pre-hook and return the exit code."""
    command = 'git commit -m "' + subject + '"'
    if trailers:
        command = command + ' -m "' + trailers + '"'
    payload = {"tool_input": {"command": command}}
    env = {}
    if as_claude:
        env["CLAUDE_CODE"] = "1"
    rc, _, _ = run_script(PRE_HOOK, cwd, env=env, input_text=json.dumps(payload))
    return rc


# ── Fixtures ───────────────────────────────────────────────────────────


@pytest.fixture
def tmp_repo(tmp_path):
    """Create a temporary git repo with an initial commit."""
    repo = str(tmp_path / "repo")
    os.makedirs(repo)
    git_cmd(["init"], repo)
    git_cmd(["commit", "--allow-empty", "-m", "init"], repo)
    return repo


@pytest.fixture
def installed_repo(tmp_path):
    """Create a temporary git repo with git-memory installed."""
    repo = str(tmp_path / "repo")
    os.makedirs(repo)
    git_cmd(["init"], repo)
    git_cmd(["commit", "--allow-empty", "-m", "init"], repo)
    run_script(INSTALL, repo, ["--auto"])
    return repo
