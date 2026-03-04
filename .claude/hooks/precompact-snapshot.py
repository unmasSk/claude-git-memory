#!/usr/bin/env python3
"""
Claude Code Hook: PreCompact Snapshot
=======================================
Before Claude compresses context, extracts critical memory
from recent commits and re-injects as a compact summary.

This ensures Next:, Decision:, and Blocker: trailers survive
context compression.

Exit codes:
- 0: Always (non-blocking, injects context)
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


def extract_memory_from_log() -> dict:
    """
    Read last 30 commits and extract memory trailers.
    Returns structured memory data.
    """
    code, output = run_git([
        "log", "-n", "30",
        "--pretty=format:%h|%s|%b|---END---",
    ])

    if code != 0 or not output:
        return {}

    memory = {
        "pending": [],       # Next: items
        "blockers": [],      # Blocker: items
        "decisions": {},     # scope → Decision: (latest per scope)
        "last_context": None,  # Last context() commit
    }

    commits = output.split("|---END---")

    for commit in commits:
        parts = commit.strip().split("|", 2)
        if len(parts) < 3:
            continue

        sha = parts[0].strip()
        subject = parts[1].strip()
        body = parts[2].strip() if len(parts) > 2 else ""

        # Extract scope from subject
        scope_match = re.match(r"^\w+\(([^)]+)\)", subject)
        scope = scope_match.group(1) if scope_match else "global"

        # Check if context commit
        if subject.lower().startswith("context"):
            if memory["last_context"] is None:
                memory["last_context"] = {
                    "sha": sha,
                    "subject": subject,
                    "scope": scope,
                }

        # Extract trailers from body
        for line in body.split("\n"):
            line = line.strip()

            next_match = re.match(r"^Next:\s*(.+)$", line)
            if next_match:
                memory["pending"].append({
                    "sha": sha,
                    "subject": subject,
                    "next": next_match.group(1),
                })

            blocker_match = re.match(r"^Blocker:\s*(.+)$", line)
            if blocker_match:
                memory["blockers"].append({
                    "sha": sha,
                    "blocker": blocker_match.group(1),
                })

            decision_match = re.match(r"^Decision:\s*(.+)$", line)
            if decision_match:
                if scope not in memory["decisions"]:
                    memory["decisions"][scope] = {
                        "sha": sha,
                        "subject": subject,
                        "decision": decision_match.group(1),
                    }

    return memory


def format_snapshot(memory: dict) -> str:
    """Format memory data as a compact snapshot for re-injection."""
    lines = []
    lines.append("=== GIT MEMORY SNAPSHOT (pre-compact) ===")

    # Branch
    code, branch = run_git(["branch", "--show-current"])
    if code == 0:
        lines.append(f"Branch: {branch}")

    # Last context
    if memory.get("last_context"):
        ctx = memory["last_context"]
        lines.append(f"Last session: {ctx['sha']} {ctx['subject']}")

    # Pending items
    if memory.get("pending"):
        lines.append("Pending:")
        for item in memory["pending"][:5]:  # Max 5
            lines.append(f"  - [{item['sha']}] {item['next']}")

    # Blockers
    if memory.get("blockers"):
        lines.append("Blockers:")
        for item in memory["blockers"][:3]:  # Max 3
            lines.append(f"  - [{item['sha']}] {item['blocker']}")

    # Active decisions
    if memory.get("decisions"):
        lines.append("Active decisions:")
        for scope, item in list(memory["decisions"].items())[:5]:  # Max 5
            lines.append(f"  - ({scope}) {item['decision']}")

    lines.append("=== END SNAPSHOT ===")
    return "\n".join(lines)


def main():
    if not is_git_repo():
        sys.exit(0)

    memory = extract_memory_from_log()

    if not memory:
        sys.exit(0)

    # Check if there's anything worth snapshotting
    has_content = (
        memory.get("pending")
        or memory.get("blockers")
        or memory.get("decisions")
        or memory.get("last_context")
    )

    if has_content:
        snapshot = format_snapshot(memory)
        # Print to stdout so Claude receives it as context
        print(snapshot)

    sys.exit(0)


if __name__ == "__main__":
    main()
