#!/usr/bin/env python3
"""
UserPromptSubmit hook -- bootstrap + memory capture reminder.

Fires on every user message. Two responsibilities:
1. If git-memory is not configured: tell Claude to install it
2. If configured: remind Claude to boot (if not done) + check for memory-worthy content

Exit codes:
    0: Always (never blocks user input).
"""

import json
import os
import sys
import time

# ── Shared lib ────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.realpath(__file__))), "lib"))

from git_helpers import is_git_repo, run_git

# Plugin root — derived from this script's location in the cache.
# hooks/user-prompt-memory-check.py → go up one level → plugin root.
PLUGIN_ROOT = os.path.dirname(os.path.dirname(os.path.realpath(__file__))).replace(os.sep, "/")


def get_project_root() -> str | None:
    """Get the git repo root, or None."""
    code, toplevel = run_git(["rev-parse", "--show-toplevel"])
    return toplevel if code == 0 else None


def needs_install(root: str) -> bool:
    """Check if git-memory CLAUDE.md managed block is present."""
    claude_md = os.path.join(root, "CLAUDE.md")
    if not os.path.isfile(claude_md):
        return True
    with open(claude_md) as f:
        return "BEGIN claude-git-memory" not in f.read()


def needs_upgrade(root: str) -> bool:
    """Check if the CLAUDE.md managed block has outdated content.

    Detects old-style instructions that reference hardcoded paths like
    'python3 bin/' instead of dynamic paths from hook output.
    """
    claude_md = os.path.join(root, "CLAUDE.md")
    if not os.path.isfile(claude_md):
        return False  # needs_install handles this
    with open(claude_md) as f:
        content = f.read()
    if "BEGIN claude-git-memory" not in content:
        return False  # needs_install handles this
    # Old-style markers: hardcoded bin/ paths in the managed block
    begin = content.find("BEGIN claude-git-memory")
    end = content.find("END claude-git-memory")
    if begin == -1 or end == -1:
        return False
    block = content[begin:end]
    return "python3 bin/" in block or "Context Checkpoint Commits" not in block


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
            f'1. Run: python3 "{PLUGIN_ROOT}/bin/git-memory-install.py" --auto\n'
            '2. Use the Skill tool with skill="git-memory" to load the memory rules\n'
            "3. Show the user a boot summary from the SessionStart output above.\n"
            "Do NOT greet the user first. Install and boot FIRST.\n"
            "CRITICAL: Step 2 means calling the Skill tool — "
            "this is a tool call, not a bash command."
        )
        sys.exit(0)

    # Case 1.5: Installed but CLAUDE.md managed block is outdated — auto-upgrade
    if needs_upgrade(root):
        import subprocess
        install_script = os.path.join(PLUGIN_ROOT, "bin", "git-memory-install.py")
        subprocess.run(
            [sys.executable, install_script, "--auto"],
            capture_output=True, text=True, cwd=root, timeout=15,
        )

    # Case 2: Installed — check if session already booted
    lines = []
    booted_flag = os.path.join(root, ".claude", ".session-booted")
    session_booted = os.path.isfile(booted_flag)

    if not session_booted:
        # First message — boot instructions (SessionStart already provided all context)
        lines.append(
            f"[git-memory-boot] Plugin root: {PLUGIN_ROOT}\n"
            "Do these steps NOW before responding to the user:\n"
            '  Step 1: Use the Skill tool with skill="git-memory" '
            "(this is a TOOL CALL, not a bash command)\n"
            "  Step 2: Show the user a boot summary from the SessionStart output above\n"
            f'After booting, run: touch "{booted_flag}"'
        )
    else:
        # Already booted — just plugin root for reference
        lines.append(f"[git-memory] root: {PLUGIN_ROOT}")

    # Memory capture check — always present, covers all memory commit types
    lines.append(
        "[memory-check] Evaluate this message: "
        "does it contain a decision, preference, requirement, anti-pattern, "
        "or personality/working-style note? "
        "If yes → create the appropriate commit: decision(), memo(), or remember(). "
        "If not → do nothing."
    )

    # Context window warning — read .context-status.json if it exists
    ctx_status_path = os.path.join(root, ".claude", ".context-status.json")
    if os.path.isfile(ctx_status_path):
        try:
            with open(ctx_status_path) as f:
                ctx = json.load(f)
            ts = ctx.get("timestamp", 0)
            age = time.time() - ts
            used = ctx.get("used_percentage")
            remaining = ctx.get("remaining_percentage")
            # Only use data fresher than 15 minutes
            if age < 900 and used is not None and remaining is not None:
                if used >= 75:
                    lines.append(
                        f"[CONTEXT CRITICAL] {used:.0f}% used ({remaining:.0f}% remaining). "
                        "Auto-compact imminent (~80%). Create a context() commit NOW "
                        "to preserve session state before compaction."
                    )
                elif used >= 60:
                    lines.append(
                        f"[context-warning] {used:.0f}% used ({remaining:.0f}% remaining). "
                        "Consider creating a context() commit to checkpoint your work."
                    )
                else:
                    lines.append(f"[context] {used:.0f}%")
        except (json.JSONDecodeError, OSError, ValueError):
            pass

    # Periodic context commit reminder.
    # Count messages via a temp file. Every 20 messages, remind Claude
    # to create a context() commit if it hasn't made one recently.
    counter_file = os.path.join(root, ".claude", ".message-counter")
    msg_count = 0
    try:
        os.makedirs(os.path.dirname(counter_file), exist_ok=True)
        if os.path.isfile(counter_file):
            with open(counter_file) as f:
                msg_count = int(f.read().strip() or "0")
        msg_count += 1
        with open(counter_file, "w") as f:
            f.write(str(msg_count))
    except (ValueError, OSError):
        pass

    if msg_count > 0 and msg_count % 20 == 0:
        # Check if there's a recent context commit (within last 5 commits)
        code, recent = run_git(["log", "-5", "--pretty=format:%s"])
        has_recent_context = False
        if code == 0 and recent:
            for subj in recent.split("\n"):
                cleaned = subj.strip().lstrip("🔧💾📌🧭✨🐛♻️🔥📝🚀 ")
                if cleaned.lower().startswith("context"):
                    has_recent_context = True
                    break
        if not has_recent_context:
            commit_script = os.path.join(PLUGIN_ROOT, "bin", "git-memory-commit.py")
            lines.append(
                "[context-reminder] You have exchanged ~20 messages without "
                "creating a context() commit. Create one NOW to checkpoint your work. "
                f'Use: python3 "{commit_script}" context <scope> "<summary>" '
                "--trailer \"Next=<pending tasks>\" --trailer \"Decision=<decisions made>\""
            )

    print("\n".join(lines))
    sys.exit(0)


if __name__ == "__main__":
    main()
