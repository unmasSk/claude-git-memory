---
name: test-conventions
description: Test conventions for chatroom/apps/backend — bun:test, ESM, SQLite, WebSocket
type: project
---

## Framework

- Runtime: **Bun** (not Node)
- Test framework: `bun:test` (NOT Vitest, NOT Jest)
- Import: `import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'`
- Run: `bun test` from `chatroom/apps/backend/`
- Coverage: `bun test --coverage`

## File Structure

```
src/
  services/
    foo.test.ts          # Unit tests for services/foo.ts
    foo-bar.test.ts      # Additional coverage file (e.g., file-reading paths)
  db/
    queries-real.test.ts # Real module tests with in-memory DB mock
    connection.test.ts   # DB initialization path
  routes/
    api.test.ts          # HTTP route integration tests
    ws.test.ts           # WebSocket integration tests
  utils.test.ts
```

## Naming Conventions

- File: `<module-name>.test.ts` or `<module-name>-<variant>.test.ts`
- Describe: `'<module> — <function name>'` or `'<feature>'`
- It: `'<does what> when <condition>'` or `'<assertion>'`

## mock.module() Ordering Rule (CRITICAL)

In Bun, `mock.module()` MUST be called BEFORE any static import of the module being mocked (or any module that imports it transitively). Pattern:

```ts
import { mock } from 'bun:test';
import { Database } from 'bun:sqlite';

// 1. Declare all mock.module() calls
mock.module('./connection.js', () => ({ getDb: () => _db }));

// 2. THEN import the code under test
import { insertMessage } from './queries.js';
```

## Assertion Style

- `expect(x).toBe(y)` — strict equality
- `expect(x).toEqual(y)` — deep equality
- `expect(x).toContain(y)` — substring or array element
- `expect(x).toBeNull()` / `expect(x).toBeDefined()`
- `expect(x).toBeGreaterThan(n)` / `toBeCloseTo(n, precision)`
- No `toHaveBeenCalledWith` — use captured arrays instead

## Test Isolation

- Each DB test: `beforeEach(() => { currentDb = makeDb(); })` + `afterEach(() => currentDb.close())`
- Do NOT close the DB used by another test file's mock — use SEPARATE DB instances
- WS tests: spin up server + close in afterAll; each test opens its own WebSocket
- Never share mutable state between tests without explicit reset

## Coverage Targets

- Target: 97% lines overall
- Achieved: ~97%+ conceptual lines (2026-03, session 4)
- Test count: 646 tests, 0 failures (up from 526 pass / 9 fail)
- Remaining gap: `agent-invoker.ts` subprocess code (lines 267-479) — requires real claude binary, not testable in unit tests
- `index.ts` gracefulShutdown — requires SIGTERM signal, not testable in unit tests
- Everything else: 97-100%

## Windows Path Compatibility

On Windows, two patterns fail:
1. `result.startsWith('/')` — use `/^[A-Za-z]:[/\\]/.test(result)` as fallback
2. `new URL('./foo.ts', import.meta.url).pathname` — produces `/C:/path`, strip leading slash: `if (/^\/[A-Za-z]:\//.test(p)) p = p.slice(1)`
3. `p.startsWith('/fake/dir')` in fs mocks — normalize with `.replace(/\\\\/g, '/')` on both sides before comparing

Always add Windows fallback when asserting on path format.

## Hard Rules

- NEVER use `Object.defineProperty` on ESM namespace bindings — use `mock.module()` instead
- NEVER use `require()` for ESM-first modules (use dynamic `import()` if needed)
- NEVER mark tests as `skip` — fix them or remove them
- NEVER write tautological assertions like `expect(true).toBe(true)`
- Test behavior, not implementation details

## Non-exported Functions

When a function is not exported (e.g., `resolveConnectionName` in ws.ts), inline a copy of the logic
in the test file with a comment noting the source. Add a note that if ws.ts changes the rules,
tests must be updated manually. Do NOT test implementation details of other modules via source-file reads.

## config.ts Testing

`resolveAgentDir()` is not exported. Test it by:
1. Inlining the logic with env overrides passed as a parameter
2. Testing the sort-descending version selection with simulated path arrays
3. Testing the fallback path string construction directly
Do NOT try to reload ESM modules with modified env vars — Bun caches them.
