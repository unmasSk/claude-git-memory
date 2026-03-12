# CLAUDE.md — claude-git-memory

<!-- BEGIN claude-git-memory (managed block — do not edit) -->
## Git Memory Active

This project uses **claude-git-memory**. Git is the memory.

**On every session start**, you MUST:
1. Use the Skill tool with `skill="git-memory"` (TOOL CALL, not bash)
2. Follow the boot steps from the `[git-memory-boot]` hook output
3. Show the boot summary, then respond to the user

**On every user message**, the `[memory-check]` hook fires. Follow the skill instructions.

**On session end**, the Stop hook fires. Follow its instructions (wip commits, etc).

All rules, commit types, trailers, capture behavior, and protocol are in the **git-memory skill**.
If the user says "install/repair/uninstall/doctor/status" → use skill `git-memory-lifecycle`.
Never ask the user to run commands — run them yourself.
<!-- END claude-git-memory -->
