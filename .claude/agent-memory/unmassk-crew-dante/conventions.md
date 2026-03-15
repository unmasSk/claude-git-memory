---
name: omawamapas-backend-test-conventions
description: Test conventions for omawamapas/backend — Vitest, ESM, file structure, naming patterns
type: project
---

## Framework
- Vitest with `@vitest-environment node` directive at top of every test file
- ESM modules — all mocks MUST use `vi.hoisted()` before `vi.mock()`, imports come AFTER mock declarations

## File Organization
- Tests in `src/api/<module>/__tests__/`
- Naming: `<module>.<concern>.test.ts`
- Adversarial tests get their own file: `<module>.adversarial.test.ts`
- Golden tests: `<module>.queries.test.ts`, `<module>.service.test.ts`, etc.

## Import Order (MANDATORY for ESM)
1. `vi.hoisted()` declarations
2. `vi.mock()` calls
3. Actual imports from source

## Assertion Style
- Standard Vitest `expect(...).toBe/toEqual/toContain/toThrow/toHaveBeenCalledWith`
- `it.each()` for parametrized cases (SQL injection payloads, role lists)
- `describe` nesting for RBAC role groups

## Test Structure
- `beforeEach(() => vi.clearAllMocks())` in every describe that uses mocks
- Arrange-Act-Assert with inline comments on non-obvious assertions
- `mockQuery.mock.calls[0][0]` for SQL string, `[0][1]` for params array

## Coverage Target
- 97%+ per enterprise audit standard (Step 3 golden tests gate)

## Hard Rules
- Never hardcode role lists — import from `search.schemas.js` (SEARCH_USER_ACCESS_ROLES)
- Never hardcode error messages — assert with `toThrow('partial message')`
- COUNT query is `calls[0]`, DATA query is `calls[1]` (Promise.all order)
