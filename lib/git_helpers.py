"""
Git command helpers for git-memory.

Thin wrappers around subprocess calls to git. Used by hooks,
CLI scripts, and the dashboard to run git commands safely.
"""

import subprocess


def run_git(args: list[str], timeout: int = 10) -> tuple[int, str]:
    """Run a git command and return (exit_code, stdout).

    Args:
        args: Git subcommand and arguments (e.g. ["log", "--oneline"]).
        timeout: Max seconds to wait before killing the process.

    Returns:
        Tuple of (exit_code, stripped_stdout). Returns (1, "") on any error.
    """
    try:
        result = subprocess.run(
            ["git"] + args,
            capture_output=True, text=True, timeout=timeout,
        )
        return result.returncode, result.stdout.strip()
    except Exception:
        return 1, ""


def is_git_repo() -> bool:
    """Check if we're in a git repository."""
    code, _ = run_git(["rev-parse", "--is-inside-work-tree"])
    return code == 0


def is_shallow_clone() -> bool:
    """Check if the repository is a shallow clone."""
    code, output = run_git(["rev-parse", "--is-shallow-repository"])
    return code == 0 and output == "true"
