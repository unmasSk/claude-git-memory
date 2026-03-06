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


def is_shallow_clone() -> bool:
    """Check if the repository is a shallow clone."""
    code, output = run_git(["rev-parse", "--is-shallow-repository"])
    return code == 0 and output == "true"


def extract_memory_from_log() -> dict:
    """
    Read last 30 commits and extract memory trailers.
    Returns structured memory data.
    """
    # Use ASCII Unit Separator (\x1f) and Record Separator (\x1e) as delimiters.
    # These are impossible to type in commit messages, preventing delimiter collision
    # if a message accidentally contains "|---END---" or "|" characters.
    code, output = run_git([
        "log", "-n", "30",
        "--pretty=format:%h%x1f%s%x1f%b%x1e",
    ])

    if code != 0 or not output:
        return {}

    memory = {
        "pending": [],       # Next: items
        "blockers": [],      # Blocker: items
        "decisions": {},     # scope → Decision: (latest per scope)
        "memos": {},         # scope → Memo: (latest per scope)
        "last_context": None,  # Last context() commit
    }

    commits = [c for c in output.split("\x1e") if c.strip()]

    # First pass: collect GC tombstones (Resolved-Next:, Stale-Blocker:)
    tombstones = set()
    for commit in commits:
        parts = commit.strip().split("\x1f", 2)
        if len(parts) < 3:
            continue
        body = parts[2].strip()
        for line in body.split("\n"):
            line = line.strip()
            ts_match = re.match(r"^(Resolved-Next|Stale-Blocker):\s*(.+)$", line)
            if ts_match:
                tombstones.add(ts_match.group(2).strip().lower())

    # Second pass: extract memory, skipping tombstoned items
    for commit in commits:
        parts = commit.strip().split("\x1f", 2)
        if len(parts) < 3:
            continue

        sha = parts[0].strip()
        subject = parts[1].strip()
        body = parts[2].strip() if len(parts) > 2 else ""

        # Strip emoji prefix before parsing type/scope
        cleaned = re.sub(r"^[^\w#]+", "", subject).strip()

        # Extract scope from subject
        scope_match = re.match(r"^\w+\(([^)]+)\)", cleaned)
        scope = scope_match.group(1) if scope_match else "global"

        # Check if context commit
        if cleaned.lower().startswith("context"):
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
                next_text = next_match.group(1)
                # Skip if tombstoned by GC
                if next_text.strip().lower() not in tombstones:
                    memory["pending"].append({
                        "sha": sha,
                        "subject": subject,
                        "next": next_text,
                    })

            blocker_match = re.match(r"^Blocker:\s*(.+)$", line)
            if blocker_match:
                blocker_text = blocker_match.group(1)
                # Skip if tombstoned by GC
                if blocker_text.strip().lower() in tombstones:
                    continue
                # Dedup: skip if a similar blocker already exists
                existing = [b["blocker"].lower() for b in memory["blockers"]]
                if blocker_text.lower() not in existing:
                    memory["blockers"].append({
                        "sha": sha,
                        "blocker": blocker_text,
                    })

            decision_match = re.match(r"^Decision:\s*(.+)$", line)
            if decision_match:
                if scope not in memory["decisions"]:
                    memory["decisions"][scope] = {
                        "sha": sha,
                        "subject": subject,
                        "decision": decision_match.group(1),
                    }

            memo_match = re.match(r"^Memo:\s*(.+)$", line)
            if memo_match:
                if scope not in memory["memos"]:
                    memory["memos"][scope] = {
                        "sha": sha,
                        "memo": memo_match.group(1),
                    }

    return memory


def format_snapshot(memory: dict) -> str:
    """Format memory data as a compact snapshot for re-injection."""
    lines = []
    lines.append("=== GIT MEMORY SNAPSHOT (pre-compact) ===")

    # Shallow clone warning
    if is_shallow_clone():
        lines.append("!!! WARNING: Shallow clone detected. Memory may be incomplete. !!!")

    # Branch
    code, branch = run_git(["branch", "--show-current"])
    if code == 0:
        lines.append(f"Branch: {branch}")

    # Last context
    if memory.get("last_context"):
        ctx = memory["last_context"]
        lines.append(f"Last session: {ctx['sha']} {ctx['subject']}")

    # Helper to truncate
    def trunc(text: str, limit: int = 200) -> str:
        return (text[:limit] + "...") if len(text) > limit else text

    # Pending items — prioritize context() Next: first, then others
    if memory.get("pending"):
        ctx_sha = memory["last_context"]["sha"] if memory.get("last_context") else None
        # Split: context Next first, then unique others
        ctx_next = [p for p in memory["pending"] if p["sha"] == ctx_sha]
        other_next = [p for p in memory["pending"] if p["sha"] != ctx_sha]
        # Dedup others by text similarity (skip if already covered by context Next)
        ctx_texts = {n["next"].lower() for n in ctx_next}
        unique_others = []
        for item in other_next:
            if item["next"].lower() not in ctx_texts:
                unique_others.append(item)
        ordered = ctx_next + unique_others
        if ordered:
            lines.append("Pending:")
            for item in ordered[:2]:  # Max 2 items to stay ≤18 lines total
                marker = " (current)" if item["sha"] == ctx_sha else ""
                lines.append(f"  - [{item['sha']}] {trunc(item['next'])}{marker}")
            if len(ordered) > 2:
                lines.append(f"  + {len(ordered) - 2} older items")

    # Blockers (deduped by text — overflow rare, capped at 2)
    if memory.get("blockers"):
        lines.append("Blockers:")
        for item in memory["blockers"][:2]:  # Max 2 to stay compact
            lines.append(f"  - [{item['sha']}] {trunc(item['blocker'])}")

    # Active decisions (1 per scope — overflow only if >3 scopes in last 30 commits)
    if memory.get("decisions"):
        lines.append("Active decisions:")
        for scope, item in list(memory["decisions"].items())[:3]:  # Max 3 to stay ≤18 lines total
            lines.append(f"  - ({scope}) {trunc(item['decision'])}")

    # Active memos (1 per scope — overflow only if >2 scopes in last 30 commits)
    if memory.get("memos"):
        lines.append("Active memos:")
        for scope, item in list(memory["memos"].items())[:2]:  # Max 2 to stay ≤18 lines total
            lines.append(f"  - ({scope}) {trunc(item['memo'])}")

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
        or memory.get("memos")
        or memory.get("last_context")
    )

    if has_content:
        snapshot = format_snapshot(memory)
        # Print to stdout so Claude receives it as context
        print(snapshot)

    sys.exit(0)


if __name__ == "__main__":
    main()
