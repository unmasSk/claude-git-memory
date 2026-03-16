# Prompt Templates — Dante (Audit)

> Templates for the orchestrator. Fill in the fields in brackets.

---

## Template 1: Golden Tests

```markdown
## Task: Golden tests for [FILE] — 97%+ coverage

### Context
- Module: `backend/src/[MODULE]/`
- Issue: #[N]
- Source file: `backend/src/[MODULE]/[FILE].ts`
- Existing tests: [TEST_FILE or "none"]

### Exports to cover

[LIST of public exports from the file — extracted from the step 1 scan]

- `exportA()`
- `exportB()`

### Integrations

[Which other modules/files this one integrates with — extracted from the step 1 scan]

- Imports from: `[module1]`, `[module2]`
- Consumed by: `[module3]`

### Enterprise test reference

Tests approved by Yoda — use as style and structure model:
- `backend/src/api/[REFERENCE_MODULE]/__tests__/[reference_test].ts`

### Verification
1. `cd backend && npx vitest run src/[MODULE]/__tests__/[TEST_FILE] --coverage`
2. If < 97%: identify uncovered branches
3. `cd backend && npx vitest run src/[MODULE]/__tests__/`
4. Run TWICE
```

---

## Template 2: Adversarial Tests

```markdown
## Task: Adversarial tests for [MODULE] based on adversarial validation report

### Context
- Module: `backend/src/[MODULE]/`
- Issue: #[N]

### Adversarial report

[PASTE SUMMARY of the report — confirmed breaks and attacks that held]

| Phase | Attack | Result | File:line |
|-------|--------|--------|-----------|
| BREAK | ... | BROKEN | ... |
| ABUSE | ... | HELD | ... |

### Output file
- `backend/src/[MODULE]/__tests__/[MODULE].adversarial.test.ts`

### Verification
1. `cd backend && npx vitest run src/[MODULE]/__tests__/[MODULE].adversarial.test.ts`
2. `cd backend && npx vitest run src/[MODULE]/__tests__/`
3. Run TWICE
```
