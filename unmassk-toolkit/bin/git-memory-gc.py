#!/usr/bin/env python3
"""
git-memory-gc -- Garbage collector for stale Next: and Blocker: trailers.

Scans recent commits for pending items that are likely resolved or stale,
and creates a compensation commit with tombstone trailers.

Heuristics:
  H1 (Next: resolved): Scope match + >=2 keyword overlap with subsequent commits
  H2 (Blocker: stale): >N days without mention (default 30)
  H3 (Explicit resolution): Resolution: trailer references the item

Usage:
  git memory gc              # Interactive: shows candidates, asks before commit
  git memory gc --dry-run    # Just show what would be cleaned
  git memory gc --auto       # Auto-commit without asking
  git memory gc --days 60    # Custom TTL for blockers (default 30)

Exit codes:
  0: Success (or nothing to clean)
  1: Error
  2: Aborted by user
"""

import argparse
import os
import re
import sys
from datetime import datetime, timedelta
from typing import Any

# ── Shared lib ────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.realpath(__file__))), "lib"))
from git_helpers import run_git as _run_git
from parsing import parse_scope


def run_git(args: list[str]) -> tuple[int, str]:
    """Run a git command with a longer timeout (30s) for GC operations."""
    return _run_git(args, timeout=30)


# ── Config ────────────────────────────────────────────────────────────────

DEFAULT_SCAN_DEPTH = 200
DEFAULT_STALE_DAYS = 30
MIN_KEYWORD_OVERLAP = 2
MIN_KEYWORD_LENGTH = 3  # Ignore short words like "add", "the", "for"

STOP_WORDS = {
    "the", "and", "for", "with", "from", "into", "this", "that", "then",
    "when", "will", "should", "could", "would", "have", "been", "being",
    "also", "just", "more", "some", "only", "after", "before", "about",
    "como", "para", "con", "del", "los", "las", "una", "que", "por",
}


# ── Helpers ───────────────────────────────────────────────────────────────

def extract_keywords(text: str) -> set[str]:
    """Extract meaningful keywords from text, filtering out stop words and short tokens."""
    words = re.findall(r"[a-zA-Z0-9_-]+", text.lower())
    return {w for w in words if len(w) >= MIN_KEYWORD_LENGTH and w not in STOP_WORDS}


def parse_date(date_str: str) -> datetime | None:
    """Parse ISO date from git log."""
    try:
        return datetime.fromisoformat(date_str.replace("Z", "+00:00").split("+")[0])
    except (ValueError, IndexError):
        return None


# ── Core: Read commits ────────────────────────────────────────────────────

def scan_commits(depth: int) -> list[dict[str, Any]]:
    """Read the last N commits and extract structured data.

    Parses each commit's SHA, subject, body, date, scope, trailers,
    and keywords into a list of dicts (most recent first).
    """
    code, output = run_git([
        "log", "-n", str(depth),
        "--pretty=format:%h%x1f%s%x1f%b%x1f%aI%x1e",
    ])

    if code != 0 or not output:
        return []

    commits = []
    for raw in output.split("\x1e"):
        raw = raw.strip()
        if not raw:
            continue
        parts = raw.split("\x1f", 3)
        if len(parts) < 4:
            continue

        sha = parts[0].strip()
        subject = parts[1].strip()
        body = parts[2].strip()
        date = parse_date(parts[3].strip())
        scope = parse_scope(subject)

        # Extract trailers from body
        trailers = {}
        for line in body.split("\n"):
            line = line.strip()
            m = re.match(r"^([A-Z][a-z]+(?:-[A-Z][a-z]+)*):\s*(.+)$", line)
            if m:
                trailers[m.group(1)] = m.group(2).strip()

        commits.append({
            "sha": sha,
            "subject": subject,
            "body": body,
            "date": date,
            "scope": scope,
            "trailers": trailers,
            "keywords": extract_keywords(subject + " " + body),
        })

    return commits


# ── Core: Heuristics ──────────────────────────────────────────────────────

def find_stale_items(commits: list[dict[str, Any]], stale_days: int) -> list[dict[str, Any]]:
    """Apply heuristics H1/H2/H3 to find Next: and Blocker: items ready for cleanup.

    Args:
        commits: Parsed commit list from scan_commits().
        stale_days: TTL in days for Blocker: staleness (H2).

    Returns:
        List of candidate dicts with type, text, reason, and evidence.
    """
    now = datetime.now()
    candidates = []

    # Build list of all Next: and Blocker: items with their positions
    next_items = []
    blocker_items = []

    for i, c in enumerate(commits):
        if "Next" in c["trailers"]:
            next_items.append((i, c))
        if "Blocker" in c["trailers"]:
            blocker_items.append((i, c))

    # Check for existing tombstones (already GC'd items)
    existing_tombstones = set()
    for c in commits:
        for key in ("Resolved-Next", "Stale-Blocker"):
            if key in c["trailers"]:
                existing_tombstones.add(c["trailers"][key].lower().strip())

    # H3: Check for explicit Resolution: trailers that reference items
    resolution_texts = set()
    for c in commits:
        if "Resolution" in c["trailers"]:
            resolution_texts.add(c["trailers"]["Resolution"].lower())

    # ── H1: Next: resolved by keyword overlap ──
    for idx, commit in next_items:
        next_text = commit["trailers"]["Next"]

        # Skip if already tombstoned
        if next_text.lower().strip() in existing_tombstones:
            continue

        next_keywords = extract_keywords(next_text)
        next_scope = commit["scope"]

        # Look at commits AFTER this one (lower index = more recent)
        subsequent = commits[:idx]
        best_overlap = 0
        matching_commits = []

        for later in subsequent:
            # Must be same scope (if scope exists) or any scope
            if next_scope and later["scope"] and later["scope"] != next_scope:
                continue

            overlap = next_keywords & later["keywords"]
            if len(overlap) >= MIN_KEYWORD_OVERLAP:
                matching_commits.append(later)
                best_overlap = max(best_overlap, len(overlap))

        # H3: Check explicit resolution
        resolved_explicitly = any(
            kw in res for res in resolution_texts
            for kw in next_keywords if len(kw) > 4
        )

        if best_overlap >= MIN_KEYWORD_OVERLAP or resolved_explicitly:
            reason = f"keyword overlap ({best_overlap} words)" if best_overlap >= MIN_KEYWORD_OVERLAP else "explicit Resolution:"
            candidates.append({
                "type": "Resolved-Next",
                "original_sha": commit["sha"],
                "text": next_text,
                "reason": reason,
                "evidence": [c["sha"] + " " + c["subject"] for c in matching_commits[:3]],
            })

    # ── H2: Blocker: stale by TTL ──
    for idx, commit in blocker_items:
        blocker_text = commit["trailers"]["Blocker"]

        # Skip if already tombstoned
        if blocker_text.lower().strip() in existing_tombstones:
            continue

        if not commit["date"]:
            continue

        age_days = (now - commit["date"]).days

        # Check if mentioned recently
        blocker_keywords = extract_keywords(blocker_text)
        mentioned_recently = False
        for later in commits[:idx]:
            if later["date"] and (now - later["date"]).days < stale_days:
                overlap = blocker_keywords & later["keywords"]
                if len(overlap) >= MIN_KEYWORD_OVERLAP:
                    mentioned_recently = True
                    break

        # H3: Check explicit resolution
        resolved_explicitly = any(
            kw in res for res in resolution_texts
            for kw in blocker_keywords if len(kw) > 4
        )

        if resolved_explicitly:
            candidates.append({
                "type": "Resolved-Next",  # Resolved, not just stale
                "original_sha": commit["sha"],
                "text": blocker_text,
                "reason": "explicit Resolution:",
                "evidence": [],
            })
        elif age_days > stale_days and not mentioned_recently:
            candidates.append({
                "type": "Stale-Blocker",
                "original_sha": commit["sha"],
                "text": blocker_text,
                "reason": f">{age_days} days old, no recent mention",
                "evidence": [],
            })

    return candidates


# ── Core: Execute ─────────────────────────────────────────────────────────

def print_candidates(candidates: list[dict[str, Any]]) -> None:
    """Print GC candidates in a human-readable format."""
    if not candidates:
        print("\n🧹 Nothing to clean — all Next: and Blocker: items look active.")
        return

    print(f"\n🧹 Found {len(candidates)} candidate(s) for cleanup:\n")
    for i, c in enumerate(candidates, 1):
        icon = "✅" if "Resolved" in c["type"] else "⏰"
        print(f"  {i}. {icon} [{c['type']}] {c['text']}")
        print(f"     Reason: {c['reason']}")
        print(f"     Original: {c['original_sha']}")
        if c["evidence"]:
            print(f"     Evidence:")
            for ev in c["evidence"]:
                print(f"       → {ev}")
        print()


def create_gc_commit(candidates: list[dict[str, Any]]) -> bool:
    """Create an empty commit with tombstone trailers (Resolved-Next, Stale-Blocker).

    Returns:
        True if the commit was created successfully.
    """
    # Build trailer block
    trailer_lines = []
    for c in candidates:
        trailer_lines.append(f"{c['type']}: {c['text']}")

    body = "Why: automated memory garbage collection\n"
    body += "\n".join(trailer_lines)

    msg = f"🔧 chore(memory): gc — {len(candidates)} items cleaned\n\n{body}"

    code, output = run_git(["commit", "--allow-empty", "-m", msg])
    if code == 0:
        print(f"\n✅ GC commit created. {len(candidates)} items tombstoned.")
        # Show the new commit
        _, sha = run_git(["rev-parse", "--short", "HEAD"])
        print(f"   Commit: {sha}")
        print(f"   Revert with: git revert {sha}")
    else:
        print(f"\n❌ Failed to create GC commit: {output}", file=sys.stderr)
        return False
    return True


# ── Main ──────────────────────────────────────────────────────────────────

def main() -> None:
    """Entry point: parse args, scan commits, and run GC interactively or automatically."""
    parser = argparse.ArgumentParser(description="Garbage collector for stale trailers.")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be cleaned")
    parser.add_argument("--auto", action="store_true", help="Auto-commit without asking")
    parser.add_argument("--days", type=int, default=DEFAULT_STALE_DAYS, help="Custom TTL for blockers")
    args = parser.parse_args()
    dry_run = args.dry_run
    auto = args.auto
    stale_days = args.days

    # Verify we're in a git repo
    code, _ = run_git(["rev-parse", "--is-inside-work-tree"])
    if code != 0:
        print("Error: not inside a git repository", file=sys.stderr)
        sys.exit(1)

    print("=== git memory gc ===")
    print(f"Scanning last {DEFAULT_SCAN_DEPTH} commits (blocker TTL: {stale_days} days)...")

    commits = scan_commits(DEFAULT_SCAN_DEPTH)
    if not commits:
        print("No commits found.")
        sys.exit(0)

    print(f"Found {len(commits)} commits to analyze.")

    candidates = find_stale_items(commits, stale_days)
    print_candidates(candidates)

    if not candidates:
        sys.exit(0)

    if dry_run:
        print("(dry-run mode — no changes made)")
        sys.exit(0)

    if auto:
        create_gc_commit(candidates)
    else:
        # Interactive: ask user
        try:
            answer = input("Create GC commit? [y/N] ").strip().lower()
        except (EOFError, KeyboardInterrupt):
            print("\nAborted.")
            sys.exit(2)

        if answer in ("y", "yes", "s", "si", "sí"):
            create_gc_commit(candidates)
        else:
            print("Aborted.")
            sys.exit(2)


if __name__ == "__main__":
    main()
