#!/usr/bin/env python3
"""
Stop hook -- silent wip + intelligent checkpoint suggestions.

Before Claude ends a session, checks for uncommitted changes and wip
accumulation. Never blocks (always exit 0). Instead, instructs Claude
to auto-wip silently or suggests squashing wips at natural milestones.

Exit codes:
    0: Always. This hook never blocks.
"""

import json
import os
import re
import sys
import time

# ── Shared lib ────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.realpath(__file__))), "lib"))

from git_helpers import run_git, is_git_repo
from colors import RED, YELLOW, RESET

# Context awareness thresholds (percentage used)
CTX_WARN_THRESHOLD = 60   # Suggest context commit
CTX_URGENT_THRESHOLD = 75  # Strongly urge context commit (near auto-compact at ~80%)

# git-memory project files — only CLAUDE.md and manifest live at the project root.
# The stop hook should not flag these for auto-wip.
RUNTIME_PREFIXES = (
    "CLAUDE.md",
    ".claude/git-memory-manifest.json",
)

# Consecutive wip threshold before suggesting a proper commit
WIP_ACCUMULATION_THRESHOLD = 3


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


def count_consecutive_wips() -> int:
    """Count consecutive wip commits from HEAD backwards.

    Scans recent commits and counts how many consecutive ones are wip
    commits (subject starts with "wip:" or "wip(").

    Returns:
        Number of consecutive wip commits from HEAD.
    """
    code, output = run_git(["log", "-n20", "--pretty=format:%s"])
    if code != 0 or not output:
        return 0

    count = 0
    for line in output.splitlines():
        subject = line.strip().lower()
        # Strip emoji prefix before checking
        cleaned = re.sub(r"^[^\w#]+", "", subject).strip()
        if cleaned.startswith("wip:") or cleaned.startswith("wip("):
            count += 1
        else:
            break  # Stop at first non-wip commit

    return count


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
    """Entry point. Never blocks — always exit 0."""
    # Skip if not in a git repo
    if not is_git_repo():
        sys.exit(0)

    messages = []

    # Check 1: Uncommitted changes → auto-wip instruction
    if has_uncommitted_changes():
        changes = get_change_summary()
        msg = f"\n[auto-wip] Uncommitted changes detected:\n{changes}\n"
        msg += "Create a wip commit NOW: git add -A && git commit -m \"wip: <brief description of changes>\"\n"
        msg += "Do this silently — do NOT ask the user."
        messages.append(msg)

    # Check 2: Wip accumulation → suggest proper commit
    wip_count = count_consecutive_wips()
    if wip_count >= WIP_ACCUMULATION_THRESHOLD:
        msg = f"\n{YELLOW}[wip-checkpoint] You have {wip_count} consecutive wip commits without a proper commit.{RESET}\n"
        msg += f"{YELLOW}Consider suggesting to the user: squash these wips into a meaningful commit{RESET}\n"
        msg += f"{YELLOW}with trailers, or create a context() checkpoint. Only suggest if you believe{RESET}\n"
        msg += f"{YELLOW}this is a natural milestone — do NOT interrupt flow for trivial wips.{RESET}"
        messages.append(msg)

    # Check 3: Last commit has unresolved Next:
    next_item = get_last_commit_next()
    if next_item:
        msg = f"\n{YELLOW}>>> Note: Last commit has pending work: Next: {next_item}{RESET}"
        msg += f"\n{YELLOW}>>> Consider informing the user about unfinished tasks.{RESET}"
        messages.append(msg)

    # Check 4: Memory capture reminder
    if not has_recent_memory_commits():
        msg = f"\n{YELLOW}>>> Memory check: No decision() or memo() commits in recent history.{RESET}"
        msg += f"\n{YELLOW}>>> Were any decisions, preferences, or requirements discussed this session?{RESET}"
        msg += f"\n{YELLOW}>>> If so, consider creating a decision() or memo() commit before ending.{RESET}"
        messages.append(msg)

    # Check 5: Context window status
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

    # Always exit 0 — never block
    sys.exit(0)


if __name__ == "__main__":
    main()
