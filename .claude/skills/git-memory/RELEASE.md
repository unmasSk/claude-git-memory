# RELEASE — Promotions and Production

## Policy

- **PR mandatory: `dev -> staging`**
- Production from `staging` to `main` with release protocol
- `Next:` trailer is NOT allowed in commits on `main` (unless explicit follow-up documented)
- `Risk:` trailer is ALWAYS required on hotfix commits

## A) Promote `dev -> staging` (PR)

### 1) Prepare dev

```bash
git checkout dev
git pull origin dev
```

### 2) Create PR dev→staging

Checklist before opening PR:
- Tests pass
- No debug code (`dd`, `dump`, `console.log`)
- No secrets
- All commits have required trailers

```bash
gh pr create --base staging --head dev --title "promote: dev -> staging" --body "$(cat <<'EOF'
## Release candidate

### Commits included
[Auto-generated from commit subjects]

### Decisions
[Auto-generated from Decision: trailers in included commits]

### Pending
[Auto-generated from Next: trailers if any exist]

### Validation steps
- [ ] Smoke test: login, critical routes
- [ ] Check logs for errors
- [ ] Verify critical endpoints
EOF
)"
```

**PR body auto-generation rule:**
- Claude reads trailers from all commits included in the PR
- Aggregates `Decision:` trailers into a "Decisions" section
- Aggregates `Next:` trailers into a "Pending" section (if any)
- Lists commit subjects as changelog

### 3) Validate in staging

- Smoke test critical flows
- If fails: fix in `fix/*` branch → merge to `dev` → PR updates automatically

## B) Publish `staging -> main` (release)

```bash
git checkout staging
git pull origin staging
```

PR recommended (even if main is not protected — it's your logbook):

```bash
gh pr create --base main --head staging --title "release: staging -> main" --body "Production release"
```

### Optional tag

```bash
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

### Trailer rules for main:
- No `Next:` in commits on main (work should be complete)
- `Risk:` required on any hotfix commit
- `Decision:` survives from staging commits (inherited through merge)

## C) Hotfix (urgent in prod)

### 1) Create branch from main

```bash
git checkout main
git pull origin main
git checkout -b hotfix/<slug>
```

### 2) Fix + commit with trailers

Hotfix commits MUST include:
- `Why:` — what broke
- `Touched:` — what was changed
- `Risk: high` — always high for hotfixes (production impact)
- `Issue:` — if applicable

### 3) Merge to main (PR recommended)

```bash
gh pr create --base main --head hotfix/<slug> --title "hotfix: <description>" --body "Emergency fix"
```

### 4) Back-merge to dev (mandatory)

```bash
git checkout dev
git pull origin dev
git merge main
git push origin dev
```

### Hotfix checklist:
- [ ] Minimal change (only the fix)
- [ ] Tests added/updated
- [ ] `Risk: high` trailer present
- [ ] PR to main with clear description
- [ ] Back-merged to dev immediately
- [ ] Monitoring after deploy
