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

### Continuous Memory Capture (active throughout every conversation)
After EVERY user message, silently evaluate if it contains memory-worthy content:

**Capture immediately** (propose commit, wait for "ok"):
- Decisions: "let's use X", "go with Y", "decided", "we'll do Z this way"
- Preferences: "always X", "never Y", "I prefer Z", "from now on"
- Requirements: "the client wants", "it must", "it's mandatory that"
- Anti-patterns: "don't ever do X again", "that broke because", "lesson learned"

**Do NOT capture** (noise — ignore):
- Questions, brainstorming, provisional ideas ("what if", "maybe", "let's explore")
- Session-only context (temporary debugging, one-off instructions)
- Things already captured in a previous decision/memo

**How to capture**:
1. Detect the signal in the user's message
2. Propose: "Saving as decision/memo: [one-line summary]. Ok?"
3. Wait for confirmation — never silently commit decisions or memos
4. Create the `decision()` or `memo()` commit with `--allow-empty`

This evaluation happens CONTINUOUSLY, not just at session start or end.

**How it works**: A `UserPromptSubmit` hook fires on every user message and injects a `[memory-check]` reminder into Claude's context. Claude's own judgment decides if the message is memory-worthy — no keyword filtering.
<!-- END claude-git-memory -->

## System in Alpha — Claude Verifies Everything

This system is in **alpha phase**. You (Claude) are responsible for verifying it works:

- On session start: run `python3 $CLAUDE_PLUGIN_ROOT/bin/git-memory-doctor.py --json` silently. If errors, tell the user and run repair yourself.
- If something fails: run `python3 $CLAUDE_PLUGIN_ROOT/bin/git-memory-repair.py --auto` before attempting manual fixes.
- Never ask the user to run memory system commands. Run them yourself.
- If you find a reproducible bug, explain it to the user with steps to reproduce.
- Do not assume everything works — validate results of each operation.
