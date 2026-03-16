# Issue Template

## Title Format

```
[TYPE] short description
```

**Types:**
- `[BUG]` — Bug fix
- `[FEAT]` — New feature
- `[ENH]` — Enhancement / improvement
- `[REFACTOR]` — Code refactoring
- `[SEC]` — Security fix
- `[DOCS]` — Documentation
- `[PERF]` — Performance improvement

**Examples:**
- `[BUG] Login validation fails on empty email`
- `[FEAT] Add date range filter to reports`
- `[REFACTOR] Split user.service.ts (500+ lines)`
- `[SEC] Validate input in auth controller`

---

## Body Template

```markdown
## Problem / Objective
- What happens or what we want to achieve (1-3 bullets)
- Be specific, not vague

## Context
- Where it occurs (screen, endpoint, module)
- Why it matters (impact on users/system)
- When it happens (always, sometimes, specific conditions)

## Scope
- **Includes:**
  - What IS part of this issue
  - Specific files/features affected
- **Does not include:**
  - What is OUT of scope
  - Related work that should be a separate issue

## Likely files
- `path/to/affected/file.ts`
- `path/to/related/test.ts`

## Implementation checklist
- [ ] Step 1: specific action
- [ ] Step 2: specific action
- [ ] Tests
- [ ] Quality gates (lint, format, test)

## Definition of Done (DoD)
- [ ] Tests pass
- [ ] No debug code left
- [ ] No cosmetic refactor (stay focused)
- [ ] Quality gates pass
- [ ] Summary written + how to test

## How to validate
1) Step-by-step instructions to verify the fix/feature
2) Expected result
3) Edge cases to check

## Risks
- Breaking changes (if applicable)
- Performance impact (if applicable)
- Migration needed (if applicable)
```

---

## Complete Example

### Title
```
[REFACTOR] Split user.service.ts (500+ lines)
```

### Body
```markdown
## Problem / Objective
- user.service.ts has 500+ lines (recommended limit: 300)
- Mixes responsibilities: CRUD + validation + business logic
- Hard to maintain and test

## Context
- File: `src/api/users/user.service.ts`
- Impacts maintainability and onboarding
- Accumulates logic that should be separated

## Scope
- **Includes:**
  - Extract validation logic to `user-validation.service.ts`
  - Extract complex queries to `user-query.service.ts`
  - Maintain compatibility with existing controller
- **Does not include:**
  - Frontend changes
  - Database schema changes

## Likely files
- `src/api/users/user.service.ts` (split)
- `src/api/users/user-validation.service.ts` (new)
- `src/api/users/user-query.service.ts` (new)
- `src/api/users/user.controller.ts` (update imports)
- `src/api/users/__tests__/*.test.ts` (update)

## Implementation checklist
- [ ] Create user-validation.service.ts
- [ ] Create user-query.service.ts
- [ ] Move validation functions
- [ ] Move query functions
- [ ] Update controller imports
- [ ] Unit tests for each new service
- [ ] Integration tests for endpoints
- [ ] Quality gates

## Definition of Done (DoD)
- [ ] Tests pass
- [ ] Each service < 300 lines
- [ ] No debug code
- [ ] Quality gates pass
- [ ] Summary + risks documented

## How to validate
1) Run tests
2) Verify line counts: `wc -l src/api/users/*.service.ts`
3) Run lint/format
4) Test endpoints manually

## Risks
- Breaking changes in imports (mitigate with re-exports)
- Existing tests may need import updates
- Shared functions between services (use shared types)
```

### Labels
`refactor, medium, backend`
