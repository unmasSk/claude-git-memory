# CLAUDE.md — unmassk-gitmemory

<!-- BEGIN unmassk-gitmemory (managed block — do not edit) -->
## Git Memory Active

This project uses **unmassk-gitmemory**. Git is the memory.

**On every session start**, you MUST:
1. Use the Skill tool with `skill="unmassk-gitmemory"` (TOOL CALL, not bash)
2. Read the `[git-memory-boot]` SessionStart output already in your context (do NOT run doctor or git-memory-log)
3. Show the boot summary, then respond to the user

**On every user message**, the `[memory-check]` hook fires. Follow the skill instructions.

**On session end**, the Stop hook fires. Follow its instructions (wip commits, etc).

All rules, commit types, trailers, capture behavior, and protocol are in the **git-memory skill**.
If the user says "install/repair/uninstall/doctor/status" -> use skill `unmassk-gitmemory-lifecycle`.
Never ask the user to run commands -- run them yourself.
<!-- END unmassk-gitmemory -->
