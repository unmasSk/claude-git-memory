# CLAUDE.md — claude-git-memory

<!-- BEGIN claude-git-memory (managed block — do not edit) -->
## Git Memory Active

This project uses claude-git-memory v2.
Git is the memory. Every commit is resumable across sessions and machines.

### What the hooks do (you receive their output automatically)

**SessionStart hook** — fires once when you start. Its output starts with "Branch:".
When you see it: display the FULL hook output to the user as your first response. Do NOT summarize or condense — show every line the hook produced (branch, pending items, decisions, memos, blockers). If a section has content (e.g. "Active decisions:"), you MUST include it. Only omit sections that are empty. If it says "WARNING" or "auto-repaired", tell the user.

**UserPromptSubmit hook** — fires on every user message. Its output starts with "[git-memory-boot]" or "[memory-check]".
When you see "[git-memory-boot]": follow the boot steps provided. The hook includes the exact script paths to use.
When you see "[memory-check]": silently evaluate the user's message for memory-worthy content (see "Continuous Memory Capture" below). Do NOT mention the hook to the user.

**Stop hook** — fires when you end. Never blocks.
When it detects uncommitted changes: it tells you to create a silent wip commit. Do it immediately without asking the user.
When it detects accumulated wips: it suggests you propose a proper commit or squash to the user. Use your judgement — only suggest at natural milestones, not after every small change.

### MANDATORY: First action on EVERY session start

**BEFORE responding to the user's first message (even if it's just "hi" or "buenas"), you MUST:**
1. Use the Skill tool with skill="git-memory" — this is a TOOL CALL, not a bash command
2. Follow the boot steps from the [git-memory-boot] hook output (it provides the exact paths)
3. Show the boot summary to the user
4. THEN respond to the user's actual message

The hooks automatically provide the correct paths to run scripts.
Never hardcode paths like `python3 bin/...` — always use the paths from hook output.

If you skip this and just greet the user, you are violating these instructions. This is not optional.
2. Never ask the user to run memory system commands — run them yourself
3. If the user says "install/repair/uninstall/doctor/status" → read skill `git-memory-lifecycle` and act
4. If the user says "what do you remember" → run the doctor (path from hook output) and show extended summary
5. If something breaks: run the repair script (path from hook output) before trying manual fixes
6. System in alpha: verify everything, report failures to the user

### Wip Commit Strategy
- wip commits are silent checkpoints. Create them freely without asking the user.
- Use descriptive subjects: "wip: refactor auth middleware" not just "wip"
- After 3+ consecutive wips, evaluate if it's a good time to suggest a real commit to the user.
- A "real commit" means: squash the wips, write a proper subject, add trailers (Why, Touched, etc.)
- Only suggest squash/commit at natural milestones — completing a feature, fixing a bug, finishing a refactor.
- Never interrupt the user's flow for trivial wips. Use your judgement.

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

### Context Checkpoint Commits (CRITICAL for session continuity)
A context() commit is a rich snapshot of what you've been working on. It is the PRIMARY way the next AI session understands what happened. Without it, the next session starts blind.

**When to create a context() commit:**
- After completing a significant piece of work (feature, fix, refactor)
- When the hook reminds you (every ~20 messages)
- When context is about to be compacted (the PreCompact hook will tell you)
- Before the user ends the session (if you know they're leaving)

**What a GOOD context commit looks like:**
```
git commit --allow-empty -m "💾 context(scope): what was accomplished

Next: specific next step to continue
Next: another pending task if any
Decision: any decision made during this session
Memo: preference - any user preference learned
Blocker: anything blocking progress"
```

**Rules:**
- NEVER make a vague context commit like "context(): work done". Be specific.
- Include ALL relevant trailers: Next, Decision, Memo, Blocker
- The subject line should summarize what was accomplished, not what's pending
- A successor AI reading ONLY this commit should understand what happened and what to do next
<!-- END claude-git-memory -->
