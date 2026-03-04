# CONFLICTS — Safe Resolution with Memory

## Principle

- If conflict: **stop**, don't improvise
- Default to merge, not rebase (safer and auditable)
- For mistake recovery (amend, reset, revert, stash): see **UNDO.md**
- Every conflict resolution commit MUST include `Conflict:` + `Resolution:` trailers

## 1) Conflict in Your Branch when Bringing dev

### Steps

```bash
git status
git checkout dev
git pull origin dev
git checkout <your-branch>
git merge dev
```

If conflicts appear:

```bash
git status
# Open marked files and resolve
git add <resolved-files>
git commit -m "$(cat <<'EOF'
chore: resolve merge conflicts from dev

Issue: CU-xxx
Why: dev advanced while working on feature branch
Touched: <list of resolved files>
Conflict: <what clashed — e.g., both branches modified FormService validation logic>
Resolution: <what was chosen — e.g., kept feature branch validation + added dev's new field>
Risk: low
EOF
)"
git push
```

## 2) Conflict in PR `dev -> staging`

This means staging has commits that clash with dev.

### Diagnostic

```bash
git fetch --all --prune
git log --oneline --decorate --graph --max-count=30 dev staging
```

### Common causes:
- Someone committed directly to staging (FORBIDDEN)
- Hotfix applied to main and not back-merged to dev
- Staging was manually edited (NEVER DO THIS)

### Resolution

```bash
# Option 1: Bring staging changes to dev first (SAFE)
git checkout dev
git pull origin dev
git merge staging
# Resolve conflicts — commit with Conflict: + Resolution: trailers
git push origin dev
# Then PR dev→staging will be clean

# Option 2: Reset staging to dev (DANGEROUS — needs explicit approval)
# Only if staging changes were mistakes
git checkout staging
git reset --hard origin/dev
git push --force origin staging
```

Option 2 requires:
- Explicit user approval
- `Risk: high` trailer on the context commit documenting the reset
- Documented reason

## 3) Dangerous Operations (require confirmation)

If any of these are proposed:
- `git rebase`
- `git push --force`
- `git reset --hard`

=> **STOP.** Only proceed with explicit user request and risk acceptance.

### Required confirmation protocol:

```
DANGEROUS OPERATION: <command>
Branch: <branch-name>
Risk: <specific risk>

This can cause:
- <consequence 1>
- <consequence 2>

Type "I understand the risk, proceed" to continue.
```

### Conflict resolution trailer rules:

| Trailer | Required | Description |
|---------|----------|-------------|
| `Conflict:` | **YES** on any merge conflict resolution | What clashed (1 line) |
| `Resolution:` | **YES** on any merge conflict resolution | What was chosen (1 line) |
| `Risk:` | **YES** if force-push or reset involved | `low`, `medium`, or `high` |
| `Why:` | **YES** always | Why the conflict existed |
| `Touched:` | **YES** always | Files that were resolved |

### NEVER:
- Force push to `main`
- Force push to `staging` (unless explicit approval + documented reason)
- Rebase branches others are working on
- Reset without backup
