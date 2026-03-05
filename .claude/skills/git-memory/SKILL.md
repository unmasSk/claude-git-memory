---
name: git-memory
description: Use this skill when user mentions git, branches, merge, PR, pull, push, rebase, conflict, staging, pre, main, dev, release, hotfix, rollback, promotion, commit, memory, resume, context, decision, or when starting a new session in a git repository.
---

# Git Memory — Skill Router

## Objective

Git is the memory. Every commit is resumable across machines.
**Claude adapts to the user, not the other way around. Everything is automatic.**

Maintain a deterministic git flow where:
- Daily work happens in `feat/*`, `fix/*`, `chore/*` branches from `dev`
- PR mandatory: `dev -> staging`
- Production from `staging` to `main` with release protocol (see RELEASE.md)
- Every commit carries structured trailers that serve as portable memory
- Claude handles git operations automatically — the user focuses on the work

## Sacred Rules

1. Never direct commit/push to `main`
2. Never invent commands: if unsure, stop and ask
3. Never commit without trailers (enforced by hooks — see Commit Memory Rules)
4. Never make `context()`, `decision()`, or `memo()` without `--allow-empty`
5. Large or multi-step changes: use `TodoWrite` first
6. If conflict: stop and follow `CONFLICTS.md`
7. If risky (rebase, force push, reset): request explicit confirmation
8. If hooks block a commit for missing trailers: fix the message, never bypass

## AUTO-BOOT (runs on first interaction in a repo)

### When it triggers
- First interaction in a git repository during a session
- After a `git pull` or HEAD change is detected

### What it does

1. Run: `git log -n 30 --pretty=format:"%h %s%n%b%n---"`
2. **Do NOT dump raw log.** Extract ONLY:
   - Commits with `Next:` → pending work items
   - Commits with `Blocker:` → active blockers
   - Last `context()` commit → where previous session left off
   - Latest `Decision:` per scope → active decisions
   - Latest `Memo:` per scope → active preferences/requirements/anti-patterns
     - Scope = the `(scope)` from the conventional commit subject
     - If no scope exists, scope = `global`
   - Also run `git status --porcelain` to detect any uncommitted state
3. Show compact summary (**≤18 lines**, budget below):
   ```
   BOOT — Resuming session
   Branch: feat/filtro-fechas
   Last context: "pause forms refactor" (2h ago)
   Pending: rebase feat/forms on dev; run unit tests
   Active decisions: D-014 (section version lock)
   Recommended action: git checkout feat/filtro-fechas && git merge dev
   ```
4. If nothing pending: "Repo up to date. What are we working on?"

### Snapshot line budget (shared with PreCompact hook):
- Header + Branch + Last context: 3 lines
- Pending header + max 2 items + overflow: 4 lines
- Blockers header + max 2 items: 3 lines
- Decisions header + max 3 items: 4 lines
- Memos header + max 2 items: 3 lines
- Footer: 1 line
- **Worst case (all sections present): 3+4+3+4+3+1 = 18 lines**

### Overflow rule:
When any section has more items than its max, the last slot becomes `+ N more` (e.g., `+ 5 older items`). This preserves visibility that truncated data exists without blowing the budget.

## Memory Search (before asking the user)

When Claude doesn't know something (why a decision was made, what pattern to use, user preferences), it MUST search git memory BEFORE asking the user:

### Search protocol (in order):
0. `git fetch --all --prune` — ensure local refs are fresh before deep search
1. `git log --all --grep="Decision:" --pretty=format:"%h %s %b" | grep -i "<keyword>"` — search decisions
2. `git log --all --grep="Memo:" --pretty=format:"%h %s %b" | grep -i "<keyword>"` — search memos
3. Check CLAUDE.md and `~/.claude/MEMORY.md` (if exists) for global preferences
4. **Only if no match found**: ask the user

### Match priority:
- Same Issue/branch → highest relevance
- Same scope → high relevance
- Same touched paths → medium relevance
- Most recent → tiebreaker

### Example:
```
Junior: "Why do we use dayjs?"
Claude: [searches] git log --all --grep="Decision:.*dayjs"
Found: 🧭 decision(forms): use dayjs over moment — "moment is deprecated and 10x heavier"
Claude: "We decided to use dayjs because moment is deprecated and 10x heavier. This was decided in commit 92e0f0d."
```

Claude NEVER says "I don't know" without searching git first.

### Contradiction detection:
When a new `decision()` or `memo()` is about to be created, Claude searches for existing entries with **same scope OR same Issue**:
- `git log --all --grep="Decision:" --pretty=format:"%h %s %b" | grep -i "<keyword>"` (keyword = main topic word)
- `git log --all --grep="Memo:" --pretty=format:"%h %s %b" | grep -i "<keyword>"`
- If a Memo (antipattern) exists and a Decision proposes using that same thing → warn: "This contradicts memo [sha]: [description]. Confirm override?"
- If a Decision exists and a new Decision on the same scope contradicts it → warn: "This overrides decision [sha]: [description]. Confirm?"
- If confirmed → create the new entry. The most recent always wins.
- If not confirmed → do not create.
- False positives are OK (better to warn than miss). User can say "no conflict" and proceed.

## Conversational Memory Detection

Claude must capture knowledge from conversation, not just from code changes.

### Decision detector — when user says:
- "vamos con X" / "usemos X" / "let's go with X" → `decision()` immediately
- "decidido: X" / "decided: X" → `decision()` immediately
- "nunca uses X" / "never use X" → `memo()` with `Memo: antipattern - ...`
- "siempre X" / "always X" (coding preference) → `memo()` with `Memo: preference - ...`
- "el cliente quiere X" / "the client wants X" → `memo()` with `Memo: requirement - ...`

### When ambiguous:
- Claude asks: "¿Lo registro como decisión/memo?" (1 line, no ceremony)
- If user says yes → commit immediately
- If user says no → move on

### Rules:
- Claude proposes the commit message and waits for "ok"
- Memos and decisions are NEVER silently committed — always show + confirm
- Multiple memos can be batched in a single `memo()` commit if they happen close together

## Commit Memory Rules

Every commit Claude generates MUST include trailers per the spec in WORKFLOW.md.

### Trailer generation is automatic:
- Claude calculates `Touched:` from the actual diff
- Claude infers `Issue:` from the branch name
- Claude writes `Why:` based on what was done and the user's intent
- Claude adds `Next:` if work remains incomplete
- Claude adds `Decision:` when a design/architecture choice was made
- Claude adds `Risk:` for operations that could break things
- Claude adds `Blocker:` when progress is blocked by external factors
- Claude adds `Memo:` when user states a preference, requirement, or anti-pattern

### Trailer automation — BEFORE proposing a commit:
1. Run `git diff --name-only HEAD` (or `--cached`) → build `Touched:` from real diff
2. Parse branch name for `CU-xxx` or `#xxx` → auto-fill `Issue:`
3. Never ask the user to write or verify trailers. Claude writes them.

### Claude NEVER asks the user to write trailers. Claude writes them.

## Auto-Git Behavior (Claude decides when to commit)

Claude executes git by default. If the user executes git manually, hooks still apply.

### Automatic triggers:

| Detected situation | Claude action | Type |
|--------------------|---------------|------|
| Significant code changes made | `wip:` with partial trailers. Commit without asking (reversible). Push requires quick confirmation after passing secrets-scan. | checkpoint |
| Task/feature complete | Squash WIPs + final commit with full trailers + merge to dev | final commit |
| User says "I'm done" / "tomorrow" / "switching machine" | `context()` --allow-empty with Next: + Blocker: | bookmark |
| User makes design/architecture decision | `decision()` --allow-empty with Decision: + Why: | decision |
| User states preference/requirement/anti-pattern | `memo()` --allow-empty with Memo: category - description | soft knowledge |
| Conflict resolved | Commit with Conflict: + Resolution: + Risk: | resolution |
| Dev branch advanced and current branch is behind | Merge dev into current branch | sync |
| Work ready for staging | PR dev→staging with auto-generated body | promotion |

### Confirmation rules:
- `wip:` checkpoints: commit without asking (reversible), but **push requires quick confirmation** + secrets-scan pass
- Final commits, context(), decision(): Claude shows message + trailers and waits for "ok" or corrections
- User can edit trailers before confirming
- Claude NEVER pushes to staging or main without explicit confirmation

## Mandatory Output (every activation)

1. **Status**: current branch + `git status` (summarized)
2. **Exact next command** (one only)
3. **Why** (1 line)
4. **Risk** (if applicable) + "need confirmation" if dangerous
5. **Trailers preview** (when proposing a commit)

## Operational Documents

| Document | When to use |
|----------|-------------|
| WORKFLOW.md | Day-to-day: branches, commits, trailers, squash |
| RELEASE.md | Promotions: dev→staging, staging→main, hotfix |
| CONFLICTS.md | Conflict resolution with memory trailers |
| UNDO.md | Mistake recovery with risk tagging |

## Quick Decision

- "I'm working" → WORKFLOW (create branch, commits with trailers, merge to dev)
- "Need to push to staging" → RELEASE (PR dev→staging)
- "Conflict" → CONFLICTS
- "Something urgent in prod" → RELEASE (hotfix)
- "I'm done for now" → Auto context() commit
- "Let's go with option A" → Auto decision() commit
- "Always use X" / "Never use Y" / "The client wants Z" → Auto memo() commit
- "Why did we...?" → Memory Search (git log --grep) before answering
- Starting session → AUTO-BOOT

## Forward Compatibility (adding new commit types)

If a new type is needed (e.g., `policy()`), follow this checklist:

1. **WORKFLOW.md**: Add emoji + type to commit types table, add trailer to spec, add row to obligatory trailers table, add example
2. **SKILL.md**: Add to AUTO-BOOT extraction, trigger table, Quick Decision routing, conversational detector
3. **Hooks** (pre + post validate): Add key to `VALID_KEYS`, type to `MEMORY_TYPES`, validation block in `validate_trailers()`
4. **precompact-snapshot.py**: Add extraction in `extract_memory_from_log()`, display section in `format_snapshot()`, respect budget (steal lines from existing sections or reduce one max by 1)
5. **Parsing hardening**: Apply emoji strip (`re.sub(r"^[^\w#]+", "", subject)`), dedup by scope (latest per scope wins), overflow rule (`+ N more`)
6. **Drift test**: Add generation + assertions for the new type
7. **Contradiction detection**: Include in search protocol (same scope + same Issue + keyword match)
