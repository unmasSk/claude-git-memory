# Prompt Template — Bilbo (Audit Scan)

> Template for the orchestrator.

```markdown
## Task: Deep scan of module [MODULE] for enterprise audit

### Context
- Module: `backend/src/[MODULE]/`
- Issue: #[N]

### Exploration scope

1. List ALL .ts files in the module (including subfolders)
2. Count LOC per file
3. List existing tests in `__tests__/`
4. Map imports/exports and inter-module dependencies
5. Run existing tests: `cd backend && npx vitest run src/[MODULE]/`
6. Flag: files >500 LOC, missing tests, visible anti-patterns, broken tests

### Output expected

Summary table:

| File | LOC | Existing tests | Imports from | Consumed by | Visible problems |
|------|-----|----------------|-------------|-------------|------------------|

Plus:
- Broken tests (if any) with error output
- Files needing split (>500 LOC)
- Inter-module dependencies (what other modules does this one touch)
- Risk assessment for the audit
```
