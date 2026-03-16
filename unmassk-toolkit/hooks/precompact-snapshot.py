#!/usr/bin/env python3
"""
Pre-compact snapshot hook.

Before Claude compresses context, extracts critical memory from recent
commits and re-injects it as a compact summary. This ensures Next:,
Decision:, and Blocker: trailers survive context compression.

Exit codes:
    0: Always (non-blocking, injects context via stdout).
"""

import os
import re
import sys
from typing import Any

# ── Shared lib ────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.realpath(__file__))), "lib"))

from git_helpers import run_git, is_git_repo, is_shallow_clone
from parsing import normalize, scan_trailers_memory


def extract_memory_from_log() -> dict[str, Any]:
    """Read the last 30 commits and extract memory trailers.

    Collects Next:, Blocker:, Decision:, and Memo: trailers. Respects
    GC tombstones (Resolved-Next:, Stale-Blocker:) to skip resolved items.

    Returns:
        Dict with keys: pending, blockers, decisions, memos, last_context.
        Empty dict if git log fails.
    """
    # Use ASCII Unit Separator (\x1f) and Record Separator (\x1e) as delimiters.
    # These are impossible to type in commit messages, preventing delimiter collision
    # if a message accidentally contains "|---END---|" or "|" characters.
    code, output = run_git([
        "log", "-n", "30",
        "--pretty=format:%h%x1f%s%x1f%b%x1e",
    ])

    if code != 0 or not output:
        return {}

    memory: dict[str, Any] = {
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
        trailers = scan_trailers_memory(body)
        for key in ("Resolved-Next", "Stale-Blocker"):
            if key in trailers:
                tombstones.add(normalize(trailers[key]))

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

        # Extract trailers from body using shared parser
        trailers = scan_trailers_memory(body)

        if "Next" in trailers:
            next_text = trailers["Next"]
            if normalize(next_text) not in tombstones:
                memory["pending"].append({
                    "sha": sha, "subject": subject, "next": next_text,
                })

        if "Blocker" in trailers:
            blocker_text = trailers["Blocker"]
            if normalize(blocker_text) not in tombstones:
                existing = [b["blocker"].lower() for b in memory["blockers"]]
                if blocker_text.lower() not in existing:
                    memory["blockers"].append({
                        "sha": sha, "blocker": blocker_text,
                    })

        if "Decision" in trailers:
            if scope not in memory["decisions"]:
                memory["decisions"][scope] = {
                    "sha": sha, "subject": subject,
                    "decision": trailers["Decision"],
                }

        if "Memo" in trailers:
            if scope not in memory["memos"]:
                memory["memos"][scope] = {
                    "sha": sha, "memo": trailers["Memo"],
                }

        if "Remember" in trailers:
            text = trailers["Remember"]
            if "remembers" not in memory:
                memory["remembers"] = {}
            if text.lower() not in {r["remember"].lower() for r in memory.get("remembers", {}).values()}:
                memory["remembers"][f"{scope}:{text[:20]}"] = {
                    "sha": sha, "remember": text,
                }

    return memory


def format_snapshot(memory: dict[str, Any]) -> str:
    """Format memory data as a compact text snapshot for re-injection.

    Produces a short summary (max ~18 lines) covering branch, last session,
    pending items, blockers, decisions, and memos.

    Args:
        memory: Structured memory dict from extract_memory_from_log().

    Returns:
        Multi-line string ready to print to stdout.
    """
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

    def trunc(text: str, limit: int = 200) -> str:
        """Truncate text to limit chars, appending '...' if needed."""
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

    # Remember notes (personality/working-style notes between sessions)
    if memory.get("remembers"):
        lines.append("Remember (personality notes):")
        for key, item in list(memory["remembers"].items())[:3]:
            lines.append(f"  🧠 {trunc(item['remember'])}")

    lines.append("=== END SNAPSHOT ===")
    return "\n".join(lines)


def main() -> None:
    """Entry point. Extracts memory from git log and prints a snapshot to stdout."""
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

    # After compaction, Claude receives this output. Instruct it to
    # create a context commit so the next session (or post-compaction
    # continuation) has a rich checkpoint in git history.
    print()
    plugin_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    commit_script = os.path.join(plugin_root, "bin", "git-memory-commit.py")
    print(
        "CRITICAL — CONTEXT CHECKPOINT REQUIRED: "
        "Your context was just compacted. "
        "IMMEDIATELY create a context() commit capturing what you worked on this session. "
        f'Use: python3 "{commit_script}" context <scope> "<summary>" '
        '--trailer "Next=<what to do next>" '
        '--trailer "Decision=<any decisions made>" '
        '--trailer "Memo=<any preferences or patterns learned>" '
        '--trailer "Blocker=<any blockers>" '
        "Include ALL relevant trailers. This is how the next session picks up your work. "
        "Do this BEFORE responding to the user."
    )

    sys.exit(0)


if __name__ == "__main__":
    main()
