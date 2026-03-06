#!/usr/bin/env python3
"""
Claude Code Hook: Stop — Definition of Done
=============================================
Before Claude ends a session, validates clean state.
If uncommitted changes exist, blocks and returns a menu
for Claude to present to the user.

Exit codes:
- 0: Clean state, allow stop
- 2: Block stop (uncommitted changes or unresolved Next:)
"""

import json
import re
import subprocess
import sys


def run_git(args: list[str]) -> tuple[int, str]:
    """Run a git command and return (exit_code, stdout)."""
    try:
        result = subprocess.run(
            ["git"] + args,
            capture_output=True, text=True, timeout=10,
        )
        return result.returncode, result.stdout.strip()
    except Exception:
        return 1, ""


def is_git_repo() -> bool:
    """Check if we're in a git repository."""
    code, _ = run_git(["rev-parse", "--is-inside-work-tree"])
    return code == 0


def has_uncommitted_changes() -> bool:
    """Check for uncommitted changes (staged or unstaged)."""
    code, output = run_git(["status", "--porcelain"])
    if code != 0:
        return False
    return bool(output.strip())


def get_change_summary() -> str:
    """Get a brief summary of uncommitted changes."""
    code, output = run_git(["status", "--short"])
    if code != 0:
        return ""

    lines = output.strip().split("\n")
    if len(lines) <= 5:
        return output.strip()
    else:
        return "\n".join(lines[:5]) + f"\n... and {len(lines) - 5} more files"


def get_last_commit_next() -> str | None:
    """Check if last commit has an unresolved Next: trailer."""
    code, output = run_git(["log", "-1", "--pretty=format:%b"])
    if code != 0:
        return None

    for line in output.strip().split("\n"):
        line = line.strip()
        match = re.match(r"^Next:\s*(.+)$", line)
        if match:
            return match.group(1)

    return None


def main():
    # Skip if not in a git repo
    if not is_git_repo():
        sys.exit(0)

    messages = []
    should_block = False

    # Check 1: Uncommitted changes
    if has_uncommitted_changes():
        should_block = True
        changes = get_change_summary()
        msg = "\n\033[91m>>> STOP BLOCKED: Uncommitted changes detected\033[0m"
        msg += f"\n\033[91m>>> Changes:\n{changes}\033[0m"
        msg += "\n\033[91m>>>\033[0m"
        msg += "\n\033[91m>>> Choose an option:\033[0m"
        msg += "\n\033[91m>>>   (1) wip: commit with partial trailers (saves your work)\033[0m"
        msg += "\n\033[91m>>>   (2) context() allow-empty commit (bookmark session state)\033[0m"
        msg += "\n\033[91m>>>   (3) git stash (save for later, experimental changes)\033[0m"
        msg += "\n\033[91m>>>   (4) Discard changes (requires confirmation)\033[0m"
        msg += "\n\033[91m>>>\033[0m"
        msg += "\n\033[91m>>> Ask the user which option to use.\033[0m"
        messages.append(msg)

    # Check 2: Last commit has unresolved Next:
    next_item = get_last_commit_next()
    if next_item:
        msg = f"\n\033[93m>>> Note: Last commit has pending work: Next: {next_item}\033[0m"
        msg += "\n\033[93m>>> Consider informing the user about unfinished tasks.\033[0m"
        messages.append(msg)

    if messages:
        for m in messages:
            print(m, file=sys.stderr)

    if should_block:
        sys.exit(2)
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()
