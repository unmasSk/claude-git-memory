# Prompt Template — Moriarty (Audit)

> Template for the orchestrator.

```markdown
## Task: Adversarial validation of module [MODULE] post-fixes

### Context
- Module: `backend/src/[MODULE]/`
- Issue: #[N]

### Module files

[LIST of all .ts files in the module — source code + tests]

### Previous audit findings

[PASTE SUMMARY of findings that were fixed — so REGRESSION has context]

### Verification
1. `cd backend && npx vitest run src/[MODULE]/__tests__/`
2. Run TWICE
```
