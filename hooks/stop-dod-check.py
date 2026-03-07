#!/usr/bin/env python3
"""
Stop hook -- definition of done check.

Before Claude ends a session, validates clean state. If uncommitted changes
exist, blocks and returns a menu for Claude to present to the user.

Exit codes:
    0: Clean state, allow stop.
    2: Block stop (uncommitted changes detected).
"""

import os
import re
import sys

# ── Shared lib ────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.realpath(__file__))), "lib"))

from git_helpers import run_git, is_git_repo
from colors import RED, YELLOW, RESET


def has_uncommitted_changes() -> bool:
    """Check for uncommitted changes (staged or unstaged).

    Returns:
        True if the working tree or index has modifications.
    """
    code, output = run_git(["status", "--porcelain"])
    if code != 0:
        return False
    return bool(output.strip())


def get_change_summary() -> str:
    """Get a brief summary of uncommitted changes.

    Shows up to 5 files from git status --short, with a count of
    remaining files if there are more.

    Returns:
        Short status text, or empty string on failure.
    """
    code, output = run_git(["status", "--short"])
    if code != 0:
        return ""

    lines = output.strip().split("\n")
    if len(lines) <= 5:
        return output.strip()
    else:
        return "\n".join(lines[:5]) + f"\n... and {len(lines) - 5} more files"


def has_recent_memory_commits(depth: int = 10) -> bool:
    """Check if any recent commits are decision() or memo() commits.

    Scans the last `depth` commits for subjects containing "decision("
    or "memo(" (case-insensitive), indicating memory was captured.

    Args:
        depth: Number of recent commits to scan.

    Returns:
        True if at least one decision/memo commit was found.
    """
    code, output = run_git(["log", f"-n{depth}", "--pretty=format:%s"])
    if code != 0 or not output:
        return True  # If git fails, don't nag

    for line in output.splitlines():
        subject = line.strip().lower()
        # Strip emoji prefix before checking
        cleaned = re.sub(r"^[^\w#]+", "", subject).strip()
        if cleaned.startswith("decision(") or cleaned.startswith("memo("):
            return True

    return False


def get_last_commit_next() -> str | None:
    """Check if the last commit has an unresolved Next: trailer.

    Returns:
        The Next: value if found, or None.
    """
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
    """Entry point. Blocks session stop if uncommitted changes exist."""
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

    # Check 3: Memory capture reminder
    if not has_recent_memory_commits():
        msg = f"\n{YELLOW}>>> Memory check: No decision() or memo() commits in recent history.{RESET}"
        msg += f"\n{YELLOW}>>> Were any decisions, preferences, or requirements discussed this session?{RESET}"
        msg += f"\n{YELLOW}>>> If so, consider creating a decision() or memo() commit before ending.{RESET}"
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
