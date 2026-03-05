# WORKFLOW — Day to Day (dev + working branches)

## Branch Conventions

- Daily base: `dev`
- Branches:
  - `feat/<slug>` — features (e.g., `feat/filtro-fechas-presupuestos`)
  - `fix/<slug>` — bugs (e.g., `fix/boton-desalineado-modal`)
  - `chore/<slug>` — maintenance (e.g., `chore/upgrade-laravel-12`)
- 1 issue = 1 branch. Don't mix tasks.

## Commit Types (Conventional Commits + Memory)

| Emoji | Type | When | Example |
|-------|------|------|---------|
| ✨ | `feat` | New functionality | `✨ feat(auth): add OAuth2 login` |
| 🐛 | `fix` | Bug correction | `🐛 fix(api): handle null response from gateway` |
| ♻️ | `refactor` | Code restructure (no behavior change) | `♻️ refactor(service): extract validation helper` |
| ⚡ | `perf` | Performance improvement | `⚡ perf(query): add index to incidencias table` |
| 🧪 | `test` | Tests only | `🧪 test(auth): add login edge cases` |
| 📝 | `docs` | Documentation only | `📝 docs(readme): update setup instructions` |
| 🔧 | `chore` | Maintenance (deps, config, tools) | `🔧 chore(deps): bump laravel to 12.1` |
| 👷 | `ci` | Pipeline changes | `👷 ci(github): add phpstan to workflow` |
| 🚧 | `wip` | Checkpoint (temporary, feature branches only) | `🚧 wip: implementing payment flow` |
| 💾 | `context` | Session bookmark (always --allow-empty) | `💾 context(forms): pause section refactor` |
| 🧭 | `decision` | Architecture/design decision (always --allow-empty) | `🧭 decision(auth): use JWT over session cookies` |
| 📌 | `memo` | Soft knowledge: preference, requirement, anti-pattern (always --allow-empty) | `📌 memo(ui): client wants Notion-style filters` |

### Emoji is MANDATORY in the commit subject. Format: `<emoji> type(scope): description`

### Rules:
- `wip:` is NOT conventional commits; it's a local checkpoint
- `wip:` commits must NOT reach `staging` or `main` (squash before merge)
- `context()`, `decision()`, and `memo()` ALWAYS use `git commit --allow-empty`
- Final commits MUST use one of the standard types above
- Scope is optional but recommended: `(auth)`, `(api)`, `(forms)`

## Trailer Spec (Git Memory Format)

Every non-wip commit MUST include trailers in the footer.

### Format

```
<conventional subject>

<optional body>

Issue: CU-123 o #123
Why: reason for the change (1 line)
Touched: path1, path2 or glob/* (N files)
Decision: description of the decision taken (1 line)
Next: what remains pending (1 line)
Blocker: what blocks progress (1 line)
Risk: low|medium|high
Memo: category - description (1 line). Categories: preference, requirement, antipattern
Conflict: what conflict was resolved (1 line)
Resolution: how it was resolved (1 line)
Refs: PR-456, external link (comma-separated list)
```

### Canonical order (recommended for readability, not enforced):
`Issue → Why → Touched → Decision → Memo → Next → Blocker → Risk → Conflict → Resolution → Refs`

### Format rules (enforced by hooks):
- Keys are **case-sensitive** (Why:, not why: or WHY:)
- Each key **maximum once** per commit
- Values are **single-line** (no line breaks within a trailer value)
- Trailers go at the **end of the body** as a contiguous block (no blank lines between them)
- `Touched:` format: `path1, path2` or `glob/* (N files)` — if ≤10 files changed and glob is used, hook **warns** but does NOT block
- `Issue:` format regex: `CU-\d+` or `#\d+`
- `Risk:` exact values: `low`, `medium`, `high`
- `Refs:` is always optional and never blocks validation

### Obligatory trailers by commit type:

| Type | Why | Touched | Issue* | Next | Decision | Risk | Blocker |
|------|-----|---------|--------|------|----------|------|---------|
| `feat/fix/refactor/perf` | **YES** | **YES** | **YES** | if work remains | no | if applicable | if applicable |
| `chore/ci/test/docs` | **YES** | **YES** | **YES** | if work remains | no | no | if applicable |
| `context()` | **YES** | no (allow-empty) | if branch has issue | **YES** | no | no | if applicable |
| `decision()` | **YES** | no (allow-empty) | if branch has issue | no | **YES** | if applicable | no |
| `memo()` | optional | no (allow-empty) | if branch has issue | no | no | no | no |
| `wip:` | optional | optional | optional | optional | no | no | no |

*Issue: obligatory only if branch name contains `CU-xxx`, `issue-xxx`, or `#xxx`

### Example: standard commit

```
✨ feat(forms): add section version lock

Prevent structure edits when submissions already exist.

Issue: CU-214
Why: editing a form section after submissions breaks data integrity
Touched: app/Services/FormService.php, app/Models/FormSection.php, database/migrations/2026_03_05_add_version_lock.php
Next: add migration for existing templates
Risk: medium
```

### Example: context() commit

```
💾 context(forms): pause section refactor

Issue: CU-214
Why: switching machine
Next: rebase feat/forms on dev; run unit tests
Blocker: waiting for API keys from client
```

### Example: decision() commit

```
🧭 decision(auth): use JWT over session cookies

Why: mobile app cannot maintain server sessions; JWT allows stateless auth
Decision: JWT with 15min access token + 7d refresh token stored in secure device storage
Risk: medium
```

### Example: memo() commit

```
📌 memo(ui): client wants Notion-style filters

Memo: requirement - client requested Notion-like filter UX for all data views
Why: reduce onboarding friction, users already familiar with Notion
```

### Example: memo() for anti-pattern

```
📌 memo(api): never use moment.js

Memo: antipattern - moment.js causes timezone bugs and is 10x heavier than dayjs
```

### Example: memo() for user preference

```
📌 memo(global): always use arrow functions

Memo: preference - user prefers arrow functions over function declarations
```

## 0) Before Starting (always)

```bash
git status
git branch --show-current
git fetch --all --prune
```

## 1) Create Working Branch from dev

```bash
git checkout dev
git pull origin dev
git checkout -b feat/<slug>
# or:
git checkout -b fix/<slug>
```

## 2) Checkpoint (save progress)

```bash
git add -A
git commit -m "wip: <short message>"
git push -u origin HEAD
```

WIP commits may include partial trailers (Why:, Issue:, Next:) but they are not required.

## 3) Keep Branch Updated (merge, not rebase)

```bash
git checkout dev
git pull origin dev
git checkout <your-branch>
git merge dev
```

Default is **merge**, not rebase. Rebase only with explicit user request and risk acceptance.

## 4) Finish Work → Integrate into dev

```bash
git checkout dev
git pull origin dev
git merge --no-ff <your-branch>
git push origin dev

# Verify
git log --oneline -5
```

## 5) Cleanup

```bash
git branch -d <your-branch>
git push origin --delete <your-branch>
```

## Squash Policy (trailer inheritance)

When squashing WIPs before merge to dev:
- `Why:` → from the final commit (not from wips)
- `Touched:` → calculated from `git diff --name-only dev...HEAD` (real, not inherited)
- `Issue:` → from branch name
- `Decision:` → from the last `decision()` in the branch (if exists)
- `Next:` → **only if work remains post-merge**. No `Next:` = nothing pending.
- `Next:` from intermediate WIPs **are lost** on squash (correct: they were temporary checkpoints)

## Anti-mess Rules

- 1 issue = 1 branch
- Don't mix tasks in the same branch
- If touching many files or task is long: use `TodoWrite` before editing
