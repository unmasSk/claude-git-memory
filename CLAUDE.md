# CLAUDE.md — claude-git-memory

<!-- BEGIN claude-git-memory (managed block — do not edit) -->
## Git Memory Active

This project uses claude-git-memory v2.
Git is the memory. Every commit is resumable across sessions and machines.

### What the hooks do (you receive their output automatically)

**SessionStart hook** — fires once when you start. Its output starts with "Branch:".
When you see it: display the FULL hook output to the user as your first response. Do NOT summarize or condense — show every line the hook produced (branch, pending items, decisions, memos, blockers). If a section has content (e.g. "Active decisions:"), you MUST include it. Only omit sections that are empty. If it says "WARNING" or "auto-repaired", tell the user.

**UserPromptSubmit hook** — fires on every user message. Its output starts with "[memory-check]".
When you see it: silently evaluate the user's message for memory-worthy content (see "Continuous Memory Capture" below). Do NOT mention the hook to the user.

**Stop hook** — fires when you end. Blocks exit if there are uncommitted changes.
When it blocks: present the options menu to the user and wait for their choice.

### Instructions for Claude
1. Never ask the user to run memory system commands — run them yourself
2. If the user says "install/repair/uninstall/doctor/status" → read skill `git-memory-lifecycle` and act
3. If the user says "what do you remember" → run `python3 bin/git-memory-doctor.py --json` and show extended summary
4. If something breaks: run `python3 bin/git-memory-repair.py --auto` before trying manual fixes
5. System in alpha: verify everything, report failures to the user

### Continuous Memory Capture (enforced by UserPromptSubmit hook)
After EVERY user message, silently evaluate if it contains memory-worthy content:

**Capture** (propose commit, wait for "ok"):
- Decisions: "let's use X", "go with Y", "decided"
- Preferences: "always X", "never Y", "I prefer Z", "from now on"
- Requirements: "the client wants", "it must", "it's mandatory"
- Anti-patterns: "don't ever do X again", "lesson learned"

**Ignore** (noise):
- Questions, brainstorming, provisional ideas
- Session-only context, one-off instructions
- Things already captured in a previous decision/memo

**How to capture**:
1. Detect the signal in the user's message
2. Propose: "Saving as decision/memo: [one-line summary]. Ok?"
3. Wait for confirmation — never silently commit
4. Create the `decision()` or `memo()` commit with `--allow-empty`
<!-- END claude-git-memory -->
