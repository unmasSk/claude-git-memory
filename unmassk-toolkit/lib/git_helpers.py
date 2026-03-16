"""
Git command helpers for unmassk-toolkit.

Thin wrappers around subprocess calls to git. Used by hooks,
CLI scripts to run git commands safely.
"""

import os
import subprocess
import sys


# Runtime directory for all generated files — single gitignore entry.
# git-memory-scopes.json is NOT here — it lives in agent-memory (per-project, tracked).
UNMASSK_RUNTIME_DIR = ".claude/.unmassk"

_GENERATED_JSONS = [
    ".claude/.unmassk/",
]


def ensure_runtime_dir(project_root: str) -> str:
    """Ensure .claude/.unmassk/ directory exists and return its path."""
    runtime_dir = os.path.join(project_root, UNMASSK_RUNTIME_DIR)
    os.makedirs(runtime_dir, exist_ok=True)
    return runtime_dir


def ensure_gitignore(project_root: str, entry: str | None = None) -> None:
    """Ensure generated JSON files are in the project's .gitignore.

    Args:
        project_root: Path to the project root (where .gitignore lives).
        entry: Single entry to add. If None, adds all _GENERATED_JSONS.
    """
    entries = [entry] if entry else _GENERATED_JSONS
    gitignore_path = os.path.join(project_root, ".gitignore")
    try:
        existing = ""
        if os.path.isfile(gitignore_path):
            with open(gitignore_path) as f:
                existing = f.read()
        missing = [e for e in entries if e not in existing]
        if not missing:
            return
        block = "\n".join(missing)
        separator = "" if existing.endswith("\n") or not existing else "\n"
        with open(gitignore_path, "a") as f:
            f.write(f"{separator}\n# unmassk-toolkit generated (do not track)\n{block}\n")
    except OSError as e:
        print(f"[unmassk-toolkit] WARNING: could not update .gitignore at {gitignore_path}: {e}", file=sys.stderr)


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
