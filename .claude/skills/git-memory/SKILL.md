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
4. Never make `context()` or `decision()` without `--allow-empty`
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
     - Scope = the `(scope)` from the conventional commit subject
     - If no scope exists, scope = `global`
3. Show compact summary (~10-15 lines max):
   ```
   BOOT — Resuming session
   Branch: feat/filtro-fechas
   Last context: "pause forms refactor" (2h ago)
   Pending: rebase feat/forms on dev; run unit tests
   Active decisions: D-014 (section version lock)
   Recommended action: git checkout feat/filtro-fechas && git merge dev
   ```
4. If nothing pending: "Repo up to date. What are we working on?"

### Context window impact: ~15 lines (not 30 commits x N lines)

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
- Starting session → AUTO-BOOT
