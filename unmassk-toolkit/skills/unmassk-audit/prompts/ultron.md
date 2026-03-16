# Prompt Template — Ultron (Audit Fix)

> Template for the orchestrator. Fill in the fields in brackets.

```
## Task: Fix findings in module [MODULE]

### Context
- Module: `backend/src/[MODULE]/`
- Issue: #[N]
- Branch: `chore/audit-[MODULE]-[N]`

### Findings to fix

[PASTE FINDINGS TABLE — ordered T1 first, T2 second, T3 last]

| ID | Tier | File:line | Description | Recommended fix |
|----|------|-----------|-------------|-----------------|
| F1 | T1   | file.ts:45 | ...        | ...             |

### Files in scope

[EXACT LIST of files this agent may touch]

- `backend/src/[MODULE]/[file1].ts`
- `backend/src/[MODULE]/[file2].ts`

### 10/10 reference

Enterprise code approved by Yoda — use as model:
- `backend/src/api/[REFERENCE_MODULE]/[reference_file].ts`

### Verification
1. `cd backend && npx vitest run src/[MODULE]/__tests__/`
2. Run TWICE
3. `cd backend && npx prettier --check "src/[MODULE]/**/*.ts"`
4. `cd backend && npx eslint src/[MODULE]/`

### Expected output
For each fixed finding:
- Finding ID
- Root cause
- Fix applied
- Modified files with LOC before/after

Verification results (paste real output, do not summarize).
```
