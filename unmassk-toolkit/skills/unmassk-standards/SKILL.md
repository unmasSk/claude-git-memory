---
name: unmassk-standards
description: Use EVERY TIME code is written, reviewed, tested, audited, or fixed. Provides enterprise quality criteria — tier classification (T1/T2/T3), scoring weights (/110), OWASP patterns, code quality checklists, anti-patterns, React patterns, TypeScript strict rules, async patterns, API contracts, concurrency, and accessibility. Loaded by ALL agents on boot. Stack-agnostic — applies to any project, any language, any framework. If you are touching code, you need these standards.
---

# Enterprise Quality Standards

Stack-agnostic quality standards for software auditing and review. These standards define the tiers, scoring weights, and checklists that agents use to evaluate code quality.

## How agents use this

All 10 agents load this skill on boot. Each uses it differently:

- **Cerberus** — classify findings by tier, scoring in audit mode
- **Argus** — security tier classification, OWASP checklist
- **Yoda** — scoring dimensions and weighted evaluation
- **Ultron** — prioritize fixes by tier
- **Dante** — know what coverage targets and test quality rules apply
- **Moriarty** — know which attack surfaces are T1 vs T2
- **Bilbo** — flag anti-patterns during exploration
- **House** — classify bug severity
- **Alexandria** — document which standards apply to the module
- **Gitto** — query past findings by tier from git history

## Reference

The complete standards are in `references/standards.md`. Load it when you need:

- Tier system (T1/T2/T3) and what blocks merge
- Finding classification table
- Execution priority (business order)
- Scoring dimensions and weights (Security x3, Error handling x3, Structure x2, Testing x2, Maintainability x1 = /110)
- OWASP patterns
- Anti-patterns catalog
- Code quality checklists

## Sections covered

The standards document covers 33 sections + OWASP A10 amendment:

- Sections 1-24: Backend patterns (tiers, error handling, security, OWASP, testing, structure, API design, anti-patterns, scoring)
- Section 25: React Component Patterns (components, hooks, error boundaries, forms, a11y)
- Section 26: Frontend State & Data Fetching
- Section 27: Frontend Testing
- Section 28: CSS / Styling
- Section 29: Frontend File Structure
- Section 30: TypeScript Strict Config & Type Safety
- Section 31: Async Patterns
- Section 32: API Response Contract & Pagination
- Section 33: Concurrency & Idempotency
- Amendment: OWASP A10 (SSRF)
