#!/usr/bin/env python3
"""
Stop hook -- definition of done check.

Before Claude ends a session, validates clean state. If uncommitted changes
exist, blocks and returns a menu for Claude to present to the user.

Exit codes:
    0: Clean state, allow stop.
    2: Block stop (uncommitted changes detected).
"""

import json
import os
import re
import sys
import tempfile
import time

# ── Shared lib ────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.realpath(__file__))), "lib"))

# Circuit breaker: prevent infinite stop-hook loops (e.g. when Claude gets
# a 401 error and can't respond, the stop hook keeps blocking).
LOCKFILE = os.path.join(tempfile.gettempdir(), "git-memory-stop-hook.lock")
COOLDOWN_SECONDS = 30

from git_helpers import run_git, is_git_repo
from colors import RED, YELLOW, RESET

# Context awareness thresholds (percentage used)
CTX_WARN_THRESHOLD = 60   # Suggest context commit
CTX_URGENT_THRESHOLD = 75  # Strongly urge context commit (near auto-compact at ~80%)

# git-memory project files — only CLAUDE.md and manifest live at the project root.
# The stop hook should not block for these.
RUNTIME_PREFIXES = (
    "CLAUDE.md",
    ".claude/git-memory-manifest.json",
)


def _is_runtime_file(path: str) -> bool:
    """Check if a path is a git-memory runtime file."""
    return any(path.startswith(p) or path == p for p in RUNTIME_PREFIXES)


def _filter_status_lines(lines: list[str]) -> list[str]:
    """Filter out git-memory runtime files from git status output.

    Each line has format: 'XY path' or 'XY path -> new_path'.
    Returns only lines with non-runtime files.
    """
    result = []
    for line in lines:
        if not line.strip():
            continue
        # git status --porcelain: first 2 chars are status, then space, then path
        path = line[3:].strip()
        # Handle renames: "old -> new"
        if " -> " in path:
            path = path.split(" -> ")[-1]
        if not _is_runtime_file(path):
            result.append(line)
    return result


def has_uncommitted_changes() -> bool:
    """Check for uncommitted changes (staged or unstaged), ignoring runtime files.

    Returns:
        True if there are non-runtime modifications.
    """
    code, output = run_git(["status", "--porcelain"])
    if code != 0:
        return False
    lines = [l for l in output.strip().split("\n") if l.strip()]
    return bool(_filter_status_lines(lines))


def get_change_summary() -> str:
    """Get a brief summary of uncommitted changes, excluding runtime files.

    Shows up to 5 files from git status --short, with a count of
    remaining files if there are more.

    Returns:
        Short status text, or empty string on failure.
    """
    code, output = run_git(["status", "--short"])
    if code != 0:
        return ""

    lines = _filter_status_lines(
        [l for l in output.strip().split("\n") if l.strip()]
    )
    if not lines:
        return ""
    if len(lines) <= 5:
        return "\n".join(lines)
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


def get_context_status() -> dict | None:
    """Read context window status from .claude/.context-status.json.

    Returns:
        Dict with used_percentage, remaining_percentage, etc., or None.
    """
    code, root = run_git(["rev-parse", "--show-toplevel"])
    if code != 0 or not root:
        return None
    status_path = os.path.join(root, ".claude", ".context-status.json")
    if not os.path.isfile(status_path):
        return None
    try:
        with open(status_path) as f:
            data = json.load(f)
        # Stale data check: ignore if older than 5 minutes
        ts = data.get("timestamp", 0)
        if time.time() - ts > 300:
            return None
        return data
    except (json.JSONDecodeError, OSError, ValueError):
        return None


def main() -> None:
    """Entry point. Blocks session stop if uncommitted changes exist."""
    # Skip if not in a git repo
    if not is_git_repo():
        sys.exit(0)

    # Circuit breaker: if we already blocked recently, let it through
    # to prevent infinite loops when Claude can't respond (e.g. 401).
    try:
        if os.path.isfile(LOCKFILE):
            mtime = os.path.getmtime(LOCKFILE)
            if time.time() - mtime < COOLDOWN_SECONDS:
                sys.exit(0)
    except OSError:
        pass

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

    # Check 4: Context window status
    ctx = get_context_status()
    if ctx:
        used = ctx.get("used_percentage")
        remaining = ctx.get("remaining_percentage")
        if used is not None and remaining is not None:
            if used >= CTX_URGENT_THRESHOLD:
                msg = f"\n{RED}>>> CONTEXT CRITICAL: {used:.0f}% used ({remaining:.0f}% remaining).{RESET}"
                msg += f"\n{RED}>>> Auto-compact imminent (~80%). Create a context() commit NOW.{RESET}"
                messages.append(msg)
            elif used >= CTX_WARN_THRESHOLD:
                msg = f"\n{YELLOW}>>> Context: {used:.0f}% used ({remaining:.0f}% remaining).{RESET}"
                msg += f"\n{YELLOW}>>> Consider creating a context() commit to preserve session state.{RESET}"
                messages.append(msg)

    if messages:
        for m in messages:
            print(m, file=sys.stderr)

    if should_block:
        # Write lockfile so the circuit breaker can prevent loops
        try:
            with open(LOCKFILE, "w") as f:
                f.write(str(time.time()))
        except OSError:
            pass
        sys.exit(2)
    else:
        # Clean up lockfile on clean exit
        try:
            if os.path.isfile(LOCKFILE):
                os.unlink(LOCKFILE)
        except OSError:
            pass
        sys.exit(0)


if __name__ == "__main__":
    main()
