#!/usr/bin/env python3
"""
session-start-boot -- Auto-boot hook for SessionStart.

Runs automatically when Claude starts a new session. Executes doctor
silently, extracts memory from recent commits, and prints a compact
summary that Claude receives as context.

Exit codes:
  0: Always (never blocks session start)
"""

import json
import os
import re
import subprocess
import sys


# Trailer keys we care about for memory extraction
MEMORY_KEYS = {"Decision", "Memo", "Next", "Blocker", "Resolved-Next", "Stale-Blocker"}
TRAILER_RE = re.compile(r"^([A-Z][a-z]+(?:-[A-Z][a-z]+)*):\s*(.+)$")


def scan_trailers(body: str) -> dict[str, str]:
    """Scan entire body for memory-relevant trailers (not just bottom-up).

    Unlike parse_trailers() which stops at the first non-trailer line
    from the bottom, this scans all lines. Needed because Co-Authored-By
    at the end breaks bottom-up parsing.
    """
    found: dict[str, str] = {}
    for line in body.splitlines():
        match = TRAILER_RE.match(line.strip())
        if match:
            key, value = match.group(1), match.group(2).strip()
            if key in MEMORY_KEYS and key not in found:
                found[key] = value
    return found


def normalize(text: str) -> str:
    """Lowercase, collapse whitespace, strip."""
    return re.sub(r"\s+", " ", text.lower().strip())


SCAN_DEPTH = 30
MAX_PENDING = 2
MAX_BLOCKERS = 2
MAX_DECISIONS = 3
MAX_MEMOS = 2


def run_git(args: list[str]) -> tuple[int, str]:
    """Run a git command and return (returncode, stdout)."""
    try:
        result = subprocess.run(
            ["git"] + args,
            capture_output=True, text=True, timeout=10,
        )
        return result.returncode, result.stdout.strip()
    except Exception:
        return 1, ""


def run_doctor() -> dict:
    """Run doctor silently and return parsed JSON."""
    plugin_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    doctor = os.path.join(plugin_root, "bin", "git-memory-doctor.py")
    if not os.path.isfile(doctor):
        return {"status": "skip", "checks": []}
    try:
        result = subprocess.run(
            [sys.executable, doctor, "--json"],
            capture_output=True, text=True, timeout=15,
        )
        if result.returncode == 0:
            return json.loads(result.stdout)
    except Exception:
        pass
    return {"status": "error", "checks": []}


def run_repair() -> bool:
    """Run repair silently. Returns True if successful."""
    plugin_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    repair = os.path.join(plugin_root, "bin", "git-memory-repair.py")
    if not os.path.isfile(repair):
        return False
    try:
        result = subprocess.run(
            [sys.executable, repair, "--auto"],
            capture_output=True, text=True, timeout=15,
        )
        return result.returncode == 0
    except Exception:
        return False


def extract_memory() -> dict:
    """Extract memory from recent commits."""
    code, log_output = run_git([
        "log", f"-n{SCAN_DEPTH}",
        "--pretty=format:%h\x1f%s\x1f%b\x1e"
    ])
    if code != 0 or not log_output:
        return {}

    # Parse tombstones first (GC cleanup markers)
    tombstones: set[str] = set()
    commits = log_output.split("\x1e")

    for entry in commits:
        entry = entry.strip()
        if not entry:
            continue
        parts = entry.split("\x1f", 2)
        if len(parts) < 3:
            continue
        body = parts[2]
        trailers = scan_trailers(body)
        for key in ("Resolved-Next", "Stale-Blocker"):
            if key in trailers:
                tombstones.add(normalize(trailers[key]))

    # Now extract active memory
    pending: list[str] = []
    blockers: list[str] = []
    decisions: list[tuple[str, str]] = []  # (scope, text)
    memos: list[tuple[str, str]] = []      # (scope, text)
    last_context: str = ""
    decision_scopes: set[str] = set()
    memo_scopes: set[str] = set()

    for entry in commits:
        entry = entry.strip()
        if not entry:
            continue
        parts = entry.split("\x1f", 2)
        if len(parts) < 3:
            continue
        sha, subject, body = parts[0], parts[1], parts[2]
        trailers = scan_trailers(body)

        # Last context bookmark
        if not last_context and "context(" in subject.lower():
            last_context = f"{sha} {subject}"

        # Pending items
        if "Next" in trailers and len(pending) < MAX_PENDING:
            text = trailers["Next"]
            if normalize(text) not in tombstones:
                pending.append(f"{sha}: {text}")

        # Blockers
        if "Blocker" in trailers and len(blockers) < MAX_BLOCKERS:
            text = trailers["Blocker"]
            if normalize(text) not in tombstones:
                blockers.append(f"{sha}: {text}")

        # Decisions (one per scope)
        if "Decision" in trailers and len(decisions) < MAX_DECISIONS:
            scope = ""
            if "(" in subject and ")" in subject:
                scope = subject.split("(")[1].split(")")[0]
            if scope not in decision_scopes:
                decision_scopes.add(scope)
                label = f"({scope})" if scope else "(global)"
                decisions.append((label, trailers["Decision"]))

        # Memos (one per scope)
        if "Memo" in trailers and len(memos) < MAX_MEMOS:
            scope = ""
            if "(" in subject and ")" in subject:
                scope = subject.split("(")[1].split(")")[0]
            if scope not in memo_scopes:
                memo_scopes.add(scope)
                label = f"({scope})" if scope else "(global)"
                memos.append((label, trailers["Memo"]))

    return {
        "last_context": last_context,
        "pending": pending,
        "blockers": blockers,
        "decisions": decisions,
        "memos": memos,
    }


def main() -> None:
    """Auto-boot: doctor + memory extraction + summary output."""
    # Check if we're in a git repo
    code, _ = run_git(["rev-parse", "--is-inside-work-tree"])
    if code != 0:
        sys.exit(0)

    lines: list[str] = []

    # 1. Silent doctor
    doctor_result = run_doctor()
    if doctor_result.get("status") == "error":
        repaired = run_repair()
        if repaired:
            lines.append("Memory system had issues — auto-repaired.")
        else:
            lines.append("WARNING: Memory system has issues. Run doctor for details.")

    # 2. Branch info
    _, branch = run_git(["branch", "--show-current"])
    lines.append(f"Branch: {branch or '(detached HEAD)'}")

    # 3. Uncommitted changes
    _, status = run_git(["status", "--porcelain"])
    if status:
        count = len([l for l in status.splitlines() if l.strip()])
        lines.append(f"Uncommitted changes: {count} files")

    # 4. Memory extraction
    memory = extract_memory()
    if not memory:
        lines.append("No memory found in recent commits.")
        print("\n".join(lines))
        sys.exit(0)

    if memory.get("last_context"):
        lines.append(f"Last session: {memory['last_context']}")

    if memory.get("pending"):
        lines.append("Pending:")
        for item in memory["pending"]:
            lines.append(f"  - {item}")

    if memory.get("blockers"):
        lines.append("Blockers:")
        for item in memory["blockers"]:
            lines.append(f"  - {item}")

    if memory.get("decisions"):
        lines.append("Active decisions:")
        for scope, text in memory["decisions"]:
            lines.append(f"  - {scope} {text}")

    if memory.get("memos"):
        lines.append("Active memos:")
        for scope, text in memory["memos"]:
            lines.append(f"  - {scope} {text}")

    # 5. Reminder about memory capture
    lines.append("")
    lines.append("Remember: if the user makes a decision, states a preference, or")
    lines.append("says 'always/never X' → create a decision() or memo() commit.")

    print("\n".join(lines))
    sys.exit(0)


if __name__ == "__main__":
    main()
