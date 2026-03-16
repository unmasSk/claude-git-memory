# Prompt Templates — Cerberus (Audit)

> Templates for the orchestrator. Fill in the fields in brackets.

---

## Template 1: Enterprise Audit (Step 4)

> Scope: COMPLETE module, not diff. Cerberus normally works with diff —
> this prompt changes its scope to a full module read.

```markdown
## Task: Audit module [MODULE] against enterprise standards

### Context
- Module: `backend/src/[MODULE]/`
- Issue: #[N]
- Scope: COMPLETE module read (not diff)

### Files to audit

[EXACT LIST — only those assigned to this agent]

- `backend/src/[MODULE]/[file1].ts` ([LOC] LOC)
- `backend/src/[MODULE]/[file2].ts` ([LOC] LOC)

### Problems already detected in scan

[PASTE scan observations from step 1 relevant to these files]

### Standards reference

Evaluate against `docs/ENTERPRISE-STANDARDS.md`:
- Security: §4.5 (SQL), §7 (auth), §1 (tiers)
- Error handling: §4.3
- Structure: §3 (LOC), §6 (splits)
- Testing: §6
- Maintainability: §5 (JSDoc), §11 (anti-patterns)

### Weighted score

| Dimension | Weight |
|-----------|--------|
| Security | x3 |
| Error handling | x3 |
| Structure | x2 |
| Testing | x2 |
| Maintainability | x1 |
| **Total** | **/110** |

Do NOT invent criteria outside ENTERPRISE-STANDARDS.md.
Do NOT fix anything — report only.

### Critical rule: verify external context before reporting auth/routing

Before reporting auth bypass findings, missing middleware, or unprotected routes:
1. Verify whether middleware is applied globally at the router mount point (read `config/routes/`)
2. Check `config/routes/auth.ts` and `config/routes/protected.ts` to understand what middlewares apply before the request reaches the module
3. If middleware is already applied upstream, do NOT report it as a module finding — it is valid external context
```

---

## Template 2: Re-Audit (Step 10)

> Scope: COMPLETE module post-fixes. Compare score before/after.

```markdown
## Task: Re-audit module [MODULE] post-fixes

### Context
- Module: `backend/src/[MODULE]/`
- Issue: #[N]
- Scope: COMPLETE module read (not diff)

### Previous findings

[PASTE FINDINGS TABLE from step 4 — to verify which ones were closed]

| ID | Tier | Description | Expected status |
|----|------|-------------|-----------------|
| F1 | T1   | ...         | Closed          |

### Previous score: [XX/110]

### Verification
1. `cd backend && npx vitest run src/[MODULE]/__tests__/`
2. Run TWICE
3. `cd backend && npx prettier --check "src/[MODULE]/**/*.ts"`
4. `cd backend && npx eslint src/[MODULE]/`

### Critical rule: verify external context before reporting auth/routing

Before reporting auth bypass findings, missing middleware, or unprotected routes:
1. Verify whether middleware is applied globally at the router mount point (read `config/routes/`)
2. Check `config/routes/auth.ts` and `config/routes/protected.ts` to understand what middlewares apply before the request reaches the module
3. If middleware is already applied upstream, do NOT report it as a module finding — it is valid external context

### Expected output
- Closed findings: X/Y
- New findings (if any, with tier)
- Score: before ([XX]/110) → after ([YY]/110)
- Prose evaluation per dimension (2-3 sentences each)
```
