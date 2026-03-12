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
4. If conflict/risky op → stop (see Conflict Resolution section below)
5. Claude writes trailers automatically — never ask the user to write them

## Memory Policy

> "Write little, read often, confirm when it hurts to be wrong."

Write ONLY if: user asked explicitly, affects future sessions, prevents real loss, or is a confirmed decision.
Do NOT write: provisional observations, weak inferences, session-only context.

## Auto-Boot (every session start — Claude executes all of this, never asks the user to)

### Finding scripts

Scripts live in the plugin cache, NOT at the project root. The `[git-memory-boot]` hook output provides the plugin root path on every user message.

Use that path to run scripts: `python3 <plugin-root>/bin/git-memory-doctor.py --json`

**NEVER hardcode paths** like `python3 bin/...` — the project root has NO bin/, hooks/, skills/, or lib/ directories from the plugin.

### MANDATORY: Use wrapper scripts for git commit and git log

**NEVER use `git commit` or `git log` directly.** A PreToolUse hook will BLOCK them.

**For commits**, use:
```
python3 <plugin-root>/bin/git-memory-commit.py <type> <scope> <message> [--body TEXT] [--trailer KEY=VALUE]... [--push]
```

Examples:
```
python3 <plugin-root>/bin/git-memory-commit.py decision auth "usar JWT" --trailer "Decision=JWT over cookies" --trailer "Why=stateless API"
python3 <plugin-root>/bin/git-memory-commit.py memo api "preference - async/await" --trailer "Memo=preference - async/await everywhere"
python3 <plugin-root>/bin/git-memory-commit.py feat forms "add date picker" --trailer "Why=users need it" --trailer "Touched=src/forms/" --push
python3 <plugin-root>/bin/git-memory-commit.py context forms "validation done" --trailer "Next=wire to API" --push
python3 <plugin-root>/bin/git-memory-commit.py wip forms "half-done picker"
```

**For logs**, use:
```
python3 <plugin-root>/bin/git-memory-log.py [N]          # last N commits (default 10)
python3 <plugin-root>/bin/git-memory-log.py --all        # only memory commits
python3 <plugin-root>/bin/git-memory-log.py --type memo  # only memos
```

These scripts produce clean, colored output for the user instead of raw git output.

### Boot sequence

1. `git fetch --quiet` — sync remote refs silently. If no network or no remote, continues without error.
2. Run `python3 <plugin-root>/bin/git-memory-doctor.py --json` silently. If errors → run `python3 <plugin-root>/bin/git-memory-repair.py --auto` and tell the user what was fixed.
3. `git log -n 30 --pretty=format:"%h%x1f%s%x1f%b%x1e"` → extract Next, Blocker, Decision, Memo, last context()
4. `git status --porcelain` → detect uncommitted state
5. Show compact summary (≤18 lines):
   - Branch + last context + pending (max 2) + blockers (max 2) + decisions (max 3) + memos (max 2)
   - Overflow: last slot becomes `+ N more`
6. If nothing: "Repo up to date. What are we working on?"

**Critical**: Never ask the user to run CLI commands. Claude runs everything. The user only sees results.

## Hierarchical Scopes

Use **hierarchical scopes** separated by `/` in commit subjects. Max 2 levels deep.

Examples:
- `feat(backend/api): add rate limiting`
- `decision(frontend/ux): usar glassmorphic style`
- `memo(backend/auth): preference - JWT over sessions`
- `fix(infra/ci): pipeline timeout`

**Where to find the scope map:**
- If `.claude/git-memory-scopes.json` exists, read it for the project's scope hierarchy
- If it doesn't exist, use the `scope-scout` agent to generate it (or ask the user)
- You can use unlisted scopes — the map is a guide, not a constraint
- For simple changes that don't fit a hierarchy, flat scopes are fine (`chore(docs): ...`)

**On first install or "scan scopes":** launch the `scope-scout` agent to analyze the project and generate the scope map.

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
| 🚧 | `wip` | Silent checkpoint (auto-created, no trailers needed, squash before merge) |
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
| Code changes + stop hook fires | `wip:` silent auto-commit (NEVER ask the user) |
| 3+ consecutive wips accumulated | Evaluate: suggest squash or proper commit at natural milestones |
| Task complete | Squash WIPs + final commit + merge to dev |
| "I'm done" / "tomorrow" | `context()` with Next/Blocker |
| Design choice made | `decision()` |
| Preference/requirement stated | `memo()` |
| Dev advanced | Merge dev into current branch |

Confirmations: `wip:` always silent. `decision()`/`memo()` → commit immediately, inform in one line. Squash/final/context → show message, wait for "ok".

## Wip Strategy

wip commits are silent checkpoints. The stop hook creates them automatically when it detects uncommitted changes. Rules:
- Use descriptive subjects: `wip: refactor auth middleware` not just `wip`
- Never ask the user before creating a wip — they are noise-free by design
- After 3+ consecutive wips, the stop hook suggests a checkpoint. Evaluate with judgement:
  - If you just completed a feature/fix/refactor → suggest squashing into a real commit with trailers
  - If the user is mid-flow → let the wips accumulate, don't interrupt
  - Squashing means: `git reset --soft HEAD~N` + proper commit with Why/Touched/etc. trailers
- wip commits NEVER have trailers. They are temporary by definition.

## Conversational Capture (CONTINUOUS — enforced by UserPromptSubmit hook)

A `UserPromptSubmit` hook fires on EVERY user message and injects a `[memory-check]` reminder into Claude's context. When you see this reminder, evaluate the user's message:

**Decision signals** → `decision()` immediately:
- "let's go with X", "decided", "we'll use Y", "go with Z"
- "the approach is X", "final answer: Y"

**Memo signals** → `memo()` with category:
- "always X" / "never Y" / "from now on" → `memo(preference)`
- "client wants X" / "it must" / "mandatory" → `memo(requirement)`
- "don't ever do X again" / "that broke because" → `memo(antipattern)`

**Not memory-worthy** (ignore silently):
- Questions, brainstorming, "what if", "maybe", "let's explore"
- Temporary debugging, one-off instructions
- Already captured in an existing decision/memo

**When detected**:
1. Create the `decision()` or `memo()` commit immediately with `--allow-empty`
2. Inform the user in ONE line: "📌 memo saved: [summary]" or "🧭 decision saved: [summary]"
3. Do NOT ask for confirmation. Do NOT propose. Just do it.

Ambiguous cases → still commit. Better to capture and be wrong than to miss and lose context.

## Memory Search (before asking the user)

1. `git log --all --grep="Decision:" --pretty=format:"%h %s %b" | grep -i "<keyword>"`
2. `git log --all --grep="Memo:" --pretty=format:"%h %s %b" | grep -i "<keyword>"`
3. Check CLAUDE.md and `~/.claude/MEMORY.md`
4. Only if no match: ask the user

Contradiction detection: before creating decision/memo, search same scope. Warn if conflict exists.

## Routing

- Install, doctor, repair, uninstall → `git-memory-lifecycle` skill

## Protocol

### Authority Hierarchy

1. User instruction in conversation (highest)
2. Confirmed memory (decisions/memos with commit)
3. CLAUDE.md of the project
4. Other context files (.cursorrules, docs)
5. Code inferences (lowest)

If conflict between sources: acknowledge openly, defer to most recent user confirmation.

### Noise Levels

| Level | When | Action |
|-------|------|--------|
| **silent** | All OK | Zero output |
| **inline** | Warning, not blocking | Mention only if asked or relevant |
| **interrupt** | Capacity loss (hooks broken, runtime absent) | Warn before working |

### Confidence Levels

| Level | Example | Action |
|-------|---------|--------|
| Fact | "Uses TypeScript 5.3" | `memo(stack)` |
| Hypothesis | "Seems like monorepo" | Do NOT save without confirmation |
| Decision | "Use dayjs" | `decision()` only if user confirms |
| Preference | "Always async/await" | `memo(preference)` |

### Releases

- PR mandatory: `dev → staging`. Production: `staging → main` with release protocol.
- No `Next:` on main commits. `Risk:` always required on hotfixes.
- PR body auto-generated from trailers: changelog from subjects, `Decision:` aggregated, `Next:` as pending.
- Hotfix flow: branch from main → fix → PR to main → back-merge to dev immediately.

### Conflict Resolution

- Default: merge, not rebase. If conflict: **stop**, don't improvise.
- Resolution commits MUST include: `Conflict:` + `Resolution:` + `Why:` + `Touched:` + `Risk:`
- Force push to `main`: **FORBIDDEN**.
- Force push to `staging`: only with explicit approval + documented reason + `Risk: high`.
- Rebase: only with explicit user request and risk acceptance.

### Undo Operations

| Operation | Risk | Confirm? |
|-----------|------|----------|
| `reset --soft HEAD~1` | low | No |
| `stash push/pop` | low | No |
| `revert <sha>` | low | No (creates new commit) |
| `amend` (before push) | low | No |
| `amend` (after push) | **high** | YES |
| `reset --hard` | **high** | YES — show what will be lost first |
| `push --force-with-lease` | **high** | YES — feature branches only |
| `push --force` main/staging | **FORBIDDEN** | N/A |

Decision tree: Pushed to main/staging → `revert`. Not pushed, keep changes → `reset --soft`. Discard → `reset --hard` (confirm + backup branch first).

Any `rebase`, `push --force`, `reset --hard` → **STOP**. Show: command, branch, risk, consequences. Require explicit "I understand the risk, proceed".

## Recovery

### Modes of Operation

| Mode | When | Does | Doesn't |
|------|------|------|---------|
| **Normal** | Standard git repo | Full runtime: hooks + trailers + CLI | — |
| **Compatible** | CI/commitlint rejects trailers | git notes or local store instead | Touch commit messages |
| **Read-only** | No write perms, external repo | Read existing memory | Create commits |
| **Abort** | No git | Explain why and stop | Force anything |

Detected during install inspection. Stored in manifest. If uncertain, ask.

### Self-Healing (rebase/reset detection)

On boot, compare known commit hashes with current tree. If amnesia detected (memory commits missing):

> "Seems like a rebase happened. I've rebuilt memory from current state, but prior design context may be missing."

Don't dramatize. Don't fake normalcy. Rebuild conservatively, be honest about gaps.

### Force Push Handling

- Detect history rewrite (known SHAs missing from tree)
- Don't assume "most recent = best"
- Conservative resolution — never invent missing context
- Log what was lost if detectable

### Branch-Aware Decisions

Decisions have scope: repo / branch / path / environment. Don't deduplicate across branches. Treat differing decisions on different branches as branch-specific context.

### CI Compatibility

Check compatibility BEFORE activating writes. If commitlint is active, use compatible mode or allowed namespace. Alternative: git notes for local memory.

### Contradiction Detection

Before creating a new decision/memo, search existing:

1. `git log --all --grep="Decision:" --pretty=format:"%h %s %b" | grep -i "<topic>"`
2. `git log --all --grep="Memo:" --pretty=format:"%h %s %b" | grep -i "<topic>"`

- Memo (antipattern) vs new Decision using that thing → warn: "Contradicts memo [sha]. Confirm override?"
- Decision vs new Decision (same scope) → warn: "Overrides decision [sha]. Confirm?"
- If confirmed → create. Most recent always wins. False positives OK — better to warn than miss.

### Emergency: Lost Commits

```bash
git reflog                    # find SHA before the reset
git reset --hard <sha>        # recover (reflog keeps ~30 days)
```

Document recovery with `Risk: high` + `Why:` trailers. Create backup branch before any destructive recovery: `git branch backup-before-recovery`
