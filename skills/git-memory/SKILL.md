---
name: git-memory
description: Use this skill when user mentions git, branches, merge, PR, pull, push, rebase, conflict, staging, pre, main, dev, release, hotfix, rollback, promotion, commit, memory, resume, context, decision, or when starting a new session in a git repository.
---

# Git Memory — Core

Git is the memory. Every commit is resumable. Claude handles git — the user focuses on work.

## Rules

1. Never commit to `main` directly
2. Never commit without trailers (hooks enforce it for Claude; humans get warnings only)
3. `context()`, `decision()`, `memo()` always use `--allow-empty`
4. If conflict/risky op → stop, see PROTOCOL.md
5. Claude writes trailers automatically — never ask the user to write them

## Memory Policy

> "Write little, read often, confirm when it hurts to be wrong."

Write ONLY if: user asked explicitly, affects future sessions, prevents real loss, or is a confirmed decision.
Do NOT write: provisional observations, weak inferences, session-only context.

## Auto-Boot (every session start — Claude executes all of this, never asks the user to)

All scripts are at `$CLAUDE_PLUGIN_ROOT/bin/`. This env var is set by Claude Code when the plugin loads.

1. Run `python3 $CLAUDE_PLUGIN_ROOT/bin/git-memory-doctor.py --json` silently. If errors → run `python3 $CLAUDE_PLUGIN_ROOT/bin/git-memory-repair.py --auto` and tell the user what was fixed.
2. `git log -n 30 --pretty=format:"%h%x1f%s%x1f%b%x1e"` → extract Next, Blocker, Decision, Memo, last context()
3. `git status --porcelain` → detect uncommitted state
4. Show compact summary (≤18 lines):
   - Branch + last context + pending (max 2) + blockers (max 2) + decisions (max 3) + memos (max 2)
   - Overflow: last slot becomes `+ N more`
5. If nothing: "Repo up to date. What are we working on?"

**Critical**: Never ask the user to run CLI commands. Claude runs everything. The user only sees results.

## Branches

Base: `dev`. Work in `feat/*`, `fix/*`, `chore/*`. 1 issue = 1 branch. Default merge (not rebase).

## Commit Types

| Emoji | Type | When |
|-------|------|------|
| ✨ | `feat` | New functionality |
| 🐛 | `fix` | Bug fix |
| ♻️ | `refactor` | Restructure, no behavior change |
| ⚡ | `perf` | Performance |
| 🧪 | `test` | Tests only |
| 📝 | `docs` | Docs only |
| 🔧 | `chore` | Maintenance |
| 👷 | `ci` | Pipeline |
| 🚧 | `wip` | Checkpoint (feature branches only, squash before merge) |
| 💾 | `context` | Session bookmark (--allow-empty) |
| 🧭 | `decision` | Architecture/design choice (--allow-empty) |
| 📌 | `memo` | Soft knowledge (--allow-empty) |

Format: `<emoji> type(scope): description`. Emoji mandatory.

## Trailer Spec

Every non-wip commit. Trailers at end of body, contiguous block, no blank lines between them.

| Key | Format | Required for |
|-----|--------|-------------|
| `Issue:` | CU-xxx or #xxx | All if branch has issue ref |
| `Why:` | 1 line | code/context/decision commits |
| `Touched:` | paths from real diff | code commits |
| `Decision:` | 1 line | decision() |
| `Next:` | 1 line | context() + if work remains |
| `Blocker:` | 1 line | if blocked |
| `Risk:` | low/medium/high | if applicable |
| `Memo:` | category - desc | memo() (preference/requirement/antipattern) |
| `Conflict:` + `Resolution:` | 1 line each | merge conflict resolution |

Keys are case-sensitive, max once per commit, single-line values.

## Auto-Git Triggers

| Situation | Action |
|-----------|--------|
| Code changes | `wip:` checkpoint (no ask). Push needs confirmation |
| Task complete | Squash WIPs + final commit + merge to dev |
| "I'm done" / "tomorrow" | `context()` with Next/Blocker |
| Design choice made | `decision()` |
| Preference/requirement stated | `memo()` |
| Dev advanced | Merge dev into current branch |

Confirmations: `wip:` auto-commit. Final/context/decision → show message, wait for "ok".

## Conversational Capture

- "let's go with X" / "decidido" → `decision()` immediately
- "always X" / "never Y" → `memo()` with category
- "client wants X" → `memo(requirement)`
- Ambiguous → ask "register as decision/memo?" (1 line, no ceremony)
- Always show proposed message + wait for "ok". Never silently commit decisions/memos.

## Memory Search (before asking the user)

1. `git log --all --grep="Decision:" --pretty=format:"%h %s %b" | grep -i "<keyword>"`
2. `git log --all --grep="Memo:" --pretty=format:"%h %s %b" | grep -i "<keyword>"`
3. Check CLAUDE.md and `~/.claude/MEMORY.md`
4. Only if no match: ask the user

Contradiction detection: before creating decision/memo, search same scope. Warn if conflict exists.

## Routing

- Releases, conflicts, undo, authority, conduct → `git-memory-protocol` skill
- Install, doctor, repair, uninstall → `git-memory-lifecycle` skill
- Rebase, reset, force push, self-healing, CI → `git-memory-recovery` skill
