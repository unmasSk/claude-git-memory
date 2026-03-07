#!/usr/bin/env python3
"""
UserPromptSubmit hook -- memory capture reminder.

Fires on every user message. Prints a short reminder so Claude always
evaluates whether the message contains a decision, preference, or
requirement worth saving as a decision() or memo() commit.

Zero logic — Claude's natural language understanding decides relevance.

Exit codes:
    0: Always (never blocks user input).
"""

import os
import sys

# ── Shared lib ────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.realpath(__file__))), "lib"))

from git_helpers import is_git_repo


def main() -> None:
    """Print a short memory-check reminder for Claude."""
    if not is_git_repo():
        sys.exit(0)

    print(
        "[memory-check] Evaluate this message: "
        "does it contain a decision, preference, requirement, or anti-pattern? "
        "If yes → propose a decision() or memo() commit. If not → do nothing."
    )
    sys.exit(0)


if __name__ == "__main__":
    main()
