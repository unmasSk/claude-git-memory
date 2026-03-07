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

import os
import re
import sys

# ── Shared lib ────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.realpath(__file__))), "lib"))

from git_helpers import run_git, is_git_repo
from colors import RED, YELLOW, RESET


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


def main() -> None:
    # Skip if not in a git repo
    if not is_git_repo():
        sys.exit(0)

    messages = []
    should_block = False

    # Check 1: Uncommitted changes
    if has_uncommitted_changes():
        should_block = True
        changes = get_change_summary()
        msg = f"\n{RED}>>> STOP BLOCKED: Uncommitted changes detected{RESET}"
        msg += f"\n{RED}>>> Changes:\n{changes}{RESET}"
        msg += f"\n{RED}>>>{RESET}"
        msg += f"\n{RED}>>> Choose an option:{RESET}"
        msg += f"\n{RED}>>>   (1) wip: commit with partial trailers (saves your work){RESET}"
        msg += f"\n{RED}>>>   (2) context() allow-empty commit (bookmark session state){RESET}"
        msg += f"\n{RED}>>>   (3) git stash (save for later, experimental changes){RESET}"
        msg += f"\n{RED}>>>   (4) Discard changes (requires confirmation){RESET}"
        msg += f"\n{RED}>>>{RESET}"
        msg += f"\n{RED}>>> Ask the user which option to use.{RESET}"
        messages.append(msg)

    # Check 2: Last commit has unresolved Next:
    next_item = get_last_commit_next()
    if next_item:
        msg = f"\n{YELLOW}>>> Note: Last commit has pending work: Next: {next_item}{RESET}"
        msg += f"\n{YELLOW}>>> Consider informing the user about unfinished tasks.{RESET}"
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
