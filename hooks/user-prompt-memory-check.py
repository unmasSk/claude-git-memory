#!/usr/bin/env python3
"""
UserPromptSubmit hook -- bootstrap + memory capture reminder.

Fires on every user message. Two responsibilities:
1. If git-memory is not configured: tell Claude to install it
2. If configured: remind Claude to boot (if not done) + check for memory-worthy content

Exit codes:
    0: Always (never blocks user input).
"""

import os
import sys

# ── Shared lib ────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.realpath(__file__))), "lib"))

from git_helpers import is_git_repo, run_git


def get_project_root() -> str | None:
    """Get the git repo root, or None."""
    code, toplevel = run_git(["rev-parse", "--show-toplevel"])
    return toplevel if code == 0 else None


def needs_install(root: str) -> bool:
    """Check if git-memory needs to be installed (CLAUDE.md missing or no managed block)."""
    claude_md = os.path.join(root, "CLAUDE.md")
    if not os.path.isfile(claude_md):
        return True
    with open(claude_md) as f:
        return "BEGIN claude-git-memory" not in f.read()


def needs_boot(root: str) -> bool:
    """Check if bin/ exists locally (install was run) but boot may not have happened."""
    return os.path.isfile(os.path.join(root, "bin", "git-memory-doctor.py"))


def main() -> None:
    """Print hook output for Claude to process."""
    if not is_git_repo():
        sys.exit(0)

    root = get_project_root()
    if not root:
        sys.exit(0)

    # Case 1: git-memory not installed yet — tell Claude to install
    if needs_install(root):
        print(
            "[git-memory-bootstrap] Git-memory plugin is active but NOT configured. "
            "BEFORE doing anything else:\n"
            "1. Run: cat ~/.claude/plugins/installed_plugins.json | python3 -c "
            "\"import sys,json; d=json.load(sys.stdin); "
            "print(d['plugins']['claude-git-memory@unmassk-claude-git-memory'][0]['installPath'])\"\n"
            "2. Run: python3 <that-path>/bin/git-memory-install.py --auto\n"
            "3. Then run: python3 bin/git-memory-doctor.py --json\n"
            "4. Show the user a boot summary.\n"
            "Do NOT greet the user first. Install and boot FIRST."
        )
        sys.exit(0)

    # Case 2: Installed — always remind about boot + memory check
    lines = []

    # Boot reminder on every message (Claude may not have booted yet)
    lines.append(
        "[git-memory-boot] If you have NOT yet loaded Skill(git-memory) "
        "and run the boot sequence this session, do it NOW before responding. "
        "Run: python3 bin/git-memory-doctor.py --json, then git log, then show summary."
    )

    # Memory capture check
    lines.append(
        "[memory-check] Evaluate this message: "
        "does it contain a decision, preference, requirement, or anti-pattern? "
        "If yes → propose a decision() or memo() commit. If not → do nothing."
    )

    print("\n".join(lines))
    sys.exit(0)


if __name__ == "__main__":
    main()
