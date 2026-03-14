# Prompt Templates — House (Diagnostic)

> Templates for the orchestrator.

---

## Template 1: New Investigation

```markdown
## Task: Diagnose [ISSUE_SUMMARY]

### Context
- Module: `backend/src/[MODULE]/`
- Issue: #[N] (if applicable)

### Symptoms

- Expected: [what should happen]
- Actual: [what actually happens]
- Errors: [error messages, stack traces — paste verbatim]
- Reproduction: [exact steps to trigger]
- Timeline: [when it started, what changed recently]

### Debug session file
Create: `docs/debugging/DIAG-[MODULE]-[SLUG].md`

### Verification
1. `cd backend && npx vitest run src/[MODULE]/__tests__/`
2. Run TWICE
```

---

## Template 2: Continue Investigation (after context reset)

```markdown
## Task: Continue diagnosing [SLUG]

### Prior state
Debug session file: `docs/debugging/DIAG-[MODULE]-[SLUG].md`

Read the file. It contains: current focus, symptoms, eliminated hypotheses, and evidence collected so far. Resume from `next_action`.

### Verification
1. `cd backend && npx vitest run src/[MODULE]/__tests__/`
2. Run TWICE
```

---

## Template 3: Re-diagnose (after Ultron fix failed)

```markdown
## Task: Re-diagnose [ISSUE_SUMMARY] — previous fix by Ultron did not resolve the issue

### Context
- Module: `backend/src/[MODULE]/`
- Previous diagnosis: [PASTE ROOT CAUSE from previous House report]
- Fix applied: [PASTE what Ultron changed]
- Result: [still failing / new error / partial fix]

### New symptoms after fix

- Expected: [what the fix should have achieved]
- Actual: [what actually happened after the fix]
- Errors: [new or persisting error messages]

### Debug session file
Continue: `docs/debugging/DIAG-[MODULE]-[SLUG].md` (append to existing evidence)

### Verification
1. `cd backend && npx vitest run src/[MODULE]/__tests__/`
2. Run TWICE
```
