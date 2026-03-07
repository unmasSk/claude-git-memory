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


def needs_bootstrap() -> bool:
    """Check if git-memory needs to be installed (CLAUDE.md missing or no managed block)."""
    from git_helpers import run_git
    code, toplevel = run_git(["rev-parse", "--show-toplevel"])
    if code != 0:
        return False
    claude_md = os.path.join(toplevel, "CLAUDE.md")
    if not os.path.isfile(claude_md):
        return True
    with open(claude_md) as f:
        return "BEGIN claude-git-memory" not in f.read()


def main() -> None:
    """Print a short memory-check reminder for Claude."""
    if not is_git_repo():
        sys.exit(0)

    # Bootstrap: if git-memory is not installed yet, tell Claude to install it
    if needs_bootstrap():
        print(
            "[git-memory-bootstrap] Git-memory plugin is installed but NOT configured in this project. "
            "BEFORE doing anything else, you MUST:\n"
            "1. Read ~/.claude/plugins/installed_plugins.json to find installPath for claude-git-memory@unmassk-claude-git-memory\n"
            "2. Run: python3 <installPath>/bin/git-memory-install.py --auto\n"
            "3. Then load Skill(git-memory) and run the boot sequence\n"
            "Do NOT respond to the user until this is done."
        )
        sys.exit(0)

    print(
        "[memory-check] Evaluate this message: "
        "does it contain a decision, preference, requirement, or anti-pattern? "
        "If yes → propose a decision() or memo() commit. If not → do nothing."
    )
    sys.exit(0)


if __name__ == "__main__":
    main()
