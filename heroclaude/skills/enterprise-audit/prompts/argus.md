# Prompt Template — Argus (Audit Security)

> Template for the orchestrator.

```markdown
## Task: Deep security audit of module [MODULE]

### Context
- Module: `backend/src/[MODULE]/`
- Issue: #[N]
- Runs in parallel with Cerberus (step 4)

### Scope

All .ts files in `backend/src/[MODULE]/` (source code, not tests).

### Focus areas

1. OWASP patterns relevant to this module
2. Auth and authorization design (role checks, permission validation)
3. Data flow traceability (where critical data enters, flows, exits)
4. Secrets handling (hardcoded values, logging exposure)
5. Input validation completeness (Zod coverage, edge cases)
6. SQL injection surface (parameterization, ORDER BY whitelist)
7. Environment guard patterns (allowlist vs blacklist)

### Rules
- Do NOT duplicate Cerberus surface-level checklist — go deeper
- Do NOT exploit (that is Moriarty's job) — audit patterns
- Classify every finding by tier (T1/T2/T3)
- ONLY report — never fix

### Verification
1. `cd backend && npx vitest run src/[MODULE]/__tests__/`
2. Run TWICE
```
