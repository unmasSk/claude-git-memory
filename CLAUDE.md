# CLAUDE.md — Git Memory System

This repo uses **Git Memory** (commit trailers + hooks) as the single source of truth.
Git = memory. Zero extra documentation files. Everything lives in commits.

## On session start (AUTO-BOOT)

Run the git-memory skill AUTO-BOOT automatically:
1. `git log -n 30` — extract Next, Blocker, Decision, Memo, last context()
2. `git status --porcelain` — detect uncommitted state
3. Show compact resume (≤18 lines)
4. If nothing pending: "Repo up to date. What are we working on?"

## Commit rules

- Every non-wip code commit MUST include trailers: `Why:`, `Touched:`, `Issue:` (if branch has CU-xxx/#xxx)
- `context()`, `decision()`, `memo()` MUST use `--allow-empty`
- If hooks block a command: fix the commit message, NEVER bypass
- Calculate `Touched:` from `git diff --name-only` (real diff, not guessed)
- Extract `Issue:` from branch name automatically

## Memory search before asking

Before asking the user "why / which / what was decided":
1. `git log --all --grep="Decision:" --pretty=format:"%h %s %b"` — search decisions
2. `git log --all --grep="Memo:" --pretty=format:"%h %s %b"` — search memos
3. Check this file and `~/.claude/MEMORY.md` (if exists) for global preferences
4. Only if no match: ask the user

## Conversational memory capture

- User says "let's go with X" / "decidido X" → `decision()` immediately
- User says "always X" / "never Y" → `memo()` with appropriate category
- User says "the client wants X" → `memo()` with `Memo: requirement - ...`
- If ambiguous → ask "register as decision/memo?" (1 line, no ceremony)

## Global user preferences

If `~/.claude/MEMORY.md` exists, read it for cross-project preferences.
