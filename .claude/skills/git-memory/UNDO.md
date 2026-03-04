# UNDO — Git Mistake Recovery with Risk Tagging

## Before You Undo Anything

**ALWAYS run these first:**

```bash
git status
git log -5 --oneline
git branch --show-current
```

Confirm you're on the right branch before proceeding.

## Risk Levels

Every undo operation has a risk level. Operations tagged `Risk: high` require explicit user confirmation before execution.

| Operation | Risk | Requires confirmation |
|-----------|------|----------------------|
| `git reset --soft HEAD~1` | low | No |
| `git stash push` | low | No |
| `git stash pop` | low | No |
| `git revert <sha>` | low | No (creates new commit) |
| `git commit --amend` (before push) | low | No |
| `git commit --amend` (after push) | **high** | **YES** |
| `git reset --hard HEAD~1` | **high** | **YES** |
| `git reset --hard HEAD~N` | **high** | **YES** |
| `git push --force-with-lease` | **high** | **YES** |
| `git push --force` | **FORBIDDEN on main/staging** | N/A |

## A) Amend Last Commit

### Before push (SAFE — Risk: low)

```bash
git add <forgotten-file>
git commit --amend --no-edit
```

To change the message too:

```bash
git commit --amend -m "new message with trailers"
```

### After push (Risk: high — REQUIRES CONFIRMATION)

```bash
git add <forgotten-file>
git commit --amend --no-edit
git push --force-with-lease origin HEAD
```

Requirements:
- Branch is NOT `staging` or `main`
- No one else is working on this branch
- User explicitly approves `--force-with-lease`

### Recovery commit trailer:

```
Why: amending previous commit to add forgotten file/fix message
Risk: high
```

## B) Undo Last Commit (keep changes) — Risk: low

```bash
git reset --soft HEAD~1
```

Changes remain staged, ready to recommit. Use when splitting one commit into multiple.

## C) Undo Last Commit (discard changes) — Risk: high

```bash
git reset --hard HEAD~1
```

**STOP and confirm:**
1. Show what will be lost: `git show HEAD`
2. User must acknowledge: "I understand this deletes changes permanently, proceed"
3. Only then execute

**Safer alternative:** create backup first

```bash
git branch backup-before-reset
git reset --hard HEAD~1
```

### Recovery commit trailer (if documenting the reset):

```
Why: discarding broken commit that introduced regression
Risk: high
```

## D) Revert Pushed Commit (SAFE — Risk: low)

```bash
git log --oneline -10
# Find the commit SHA to revert
git revert <commit_sha>
git push
```

**Preferred method for:**
- Commits already on `staging` or `main`
- Shared branches with multiple developers
- When audit trail is needed

## E) Stash Work in Progress — Risk: low

```bash
git stash push -m "wip: <reason>"
```

View stashes:

```bash
git stash list
```

Apply most recent:

```bash
git stash pop
```

Apply specific:

```bash
git stash apply stash@{2}
```

## F) Undo Multiple Commits — Risk: high

```bash
git reset --soft HEAD~3  # Keep changes staged
# or
git reset --hard HEAD~3  # Discard all changes
```

**REQUIRES EXPLICIT APPROVAL**

Confirmation protocol:
1. Show commits that will be undone: `git log HEAD~3..HEAD`
2. Explain impact
3. User must acknowledge: "I understand the risk, proceed"

## Decision Tree

```
Pushed to main/staging?
├─ YES → Use `git revert` (safe, auditable) — Risk: low
└─ NO
   ├─ Want to keep changes?
   │  └─ YES → `git reset --soft HEAD~1` — Risk: low
   └─ Want to discard changes?
      └─ YES → `git reset --hard HEAD~1` — Risk: high (CONFIRM)
```

## Emergency: Recover Lost Commits

If `reset --hard` was done and recovery is needed:

```bash
git reflog
# Find the commit SHA before the reset
git reset --hard <sha>
```

Reflog keeps commits for ~30 days.

### Recovery commit trailer:

```
Why: recovering commits lost during accidental hard reset
Risk: high
Refs: reflog SHA used for recovery
```

## Rules Summary

- `reset --hard` → ALWAYS require confirmation + show what will be lost
- `--force` → NEVER on `main/staging`
- `--force-with-lease` → Only on feature branches, with confirmation
- Prefer `revert` over `reset` on shared branches
- When in doubt → `revert` is safer than `reset`
- All recovery operations should be documented with `Risk:` + `Why:` trailers
