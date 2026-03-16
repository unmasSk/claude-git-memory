#!/usr/bin/env python3
"""
git-memory-log — Pretty git log for git-memory.

Prints recent commits with colored type indicators.

Usage:
  git-memory-log.py [N]          # last N commits (default 10)
  git-memory-log.py --all        # all memory commits (decision, memo, context)
  git-memory-log.py --type memo  # only memos

Exit codes:
  0: OK
  1: Error
"""

import argparse
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.realpath(__file__))), "lib"))

# ANSI colors
RESET = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
BLUE = "\033[34m"
MAGENTA = "\033[35m"

CYAN = "\033[36m"

TYPE_COLORS = {
    "decision": YELLOW, "memo": BLUE, "context": GREEN,
    "remember": CYAN,
    "feat": MAGENTA, "fix": MAGENTA, "refactor": MAGENTA,
    "perf": MAGENTA, "test": MAGENTA, "docs": MAGENTA,
    "chore": MAGENTA, "ci": MAGENTA, "wip": DIM,
}

# Pattern to parse: "emoji type(scope): message"
SUBJECT_RE = re.compile(r"^(.+?)\s+(feat|fix|refactor|perf|test|docs|chore|ci|wip|context|decision|memo|remember)\(([^)]+)\):\s*(.+)$")


def main() -> None:
    parser = argparse.ArgumentParser(description="Pretty git log for git-memory")
    parser.add_argument("count", nargs="?", type=int, default=10, help="Number of commits (default 10)")
    parser.add_argument("--all", action="store_true", help="Show only memory commits (decision, memo, context)")
    parser.add_argument("--type", dest="filter_type", default=None, help="Filter by commit type")
    args = parser.parse_args()

    # Get commits
    n = args.count if not args.all else 100
    result = subprocess.run(
        ["git", "log", f"-n{n}", "--pretty=format:%h %s"],
        capture_output=True, text=True, timeout=15,
    )

    if result.returncode != 0:
        print(f"Error: git log failed", file=sys.stderr)
        sys.exit(1)

    lines = result.stdout.strip().split("\n") if result.stdout.strip() else []

    print()
    shown = 0
    for line in lines:
        if not line.strip():
            continue

        sha = line[:7]
        subject = line[8:] if len(line) > 8 else ""

        m = SUBJECT_RE.match(subject)
        if m:
            emoji, type_, scope, msg = m.group(1), m.group(2), m.group(3), m.group(4)
        else:
            emoji, type_, scope, msg = "", "?", "", subject

        # Filters
        if args.all and type_ not in ("decision", "memo", "context", "remember"):
            continue
        if args.filter_type and type_ != args.filter_type:
            continue

        color = TYPE_COLORS.get(type_, RESET)
        if scope:
            print(f"  {emoji} {color}{BOLD}{type_}{RESET}{DIM}({scope}){RESET}: {msg} {DIM}[{sha}]{RESET}")
        else:
            print(f"  {DIM}[{sha}]{RESET} {subject}")

        shown += 1

    if shown == 0:
        print(f"  {DIM}(no commits found){RESET}")

    print()


if __name__ == "__main__":
    main()
