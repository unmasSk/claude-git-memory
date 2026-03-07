# CLAUDE.md — claude-git-memory

<!-- BEGIN claude-git-memory (managed block — do not edit) -->
## Git Memory Active

This project uses claude-git-memory v2.
Git is the memory. Every commit is resumable across sessions and machines.

### Instructions for Claude (not for the user)
1. On session start: read the `git-memory` skill and run AUTO-BOOT + doctor automatically
2. Run `python3 $CLAUDE_PLUGIN_ROOT/bin/git-memory-doctor.py --json` on start. If errors, repair with `python3 $CLAUDE_PLUGIN_ROOT/bin/git-memory-repair.py --auto`
3. Never ask the user to run memory system commands — run them yourself
4. If the user says "install/repair/uninstall/doctor/status" → read skill `git-memory-lifecycle` and act
5. If the user says "what do you remember" → run extended boot
6. System in alpha: verify everything, report failures to the user, do not assume it works
<!-- END claude-git-memory -->

## System in Alpha — Claude Verifies Everything

This system is in **alpha phase**. You (Claude) are responsible for verifying it works:

- On session start: run `python3 $CLAUDE_PLUGIN_ROOT/bin/git-memory-doctor.py --json` silently. If errors, tell the user and run repair yourself.
- If something fails: run `python3 $CLAUDE_PLUGIN_ROOT/bin/git-memory-repair.py --auto` before attempting manual fixes.
- Never ask the user to run memory system commands. Run them yourself.
- If you find a reproducible bug, explain it to the user with steps to reproduce.
- Do not assume everything works — validate results of each operation.
