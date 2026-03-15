---
name: omawamapas-backend-mock-patterns
description: Working mock patterns for omawamapas/backend — database query, logger, ESM hoisting
type: project
---

## Database Query Mock (ESM-safe)

```ts
const mockQuery = vi.hoisted(() => vi.fn());

vi.mock('../../../config/database.js', () => ({
  query: mockQuery,
}));
```

Helper for COUNT + DATA parallel queries:
```ts
const mockCountAndData = (totalCount: number, rows: Record<string, unknown>[]) => {
  mockQuery.mockResolvedValueOnce({ rows: [{ total: String(totalCount) }] });
  mockQuery.mockResolvedValueOnce({ rows });
};
```

Note: COUNT is always calls[0], DATA is calls[1] — matches Promise.all order in source.

## Logger Mock (ESM-safe)

```ts
const loggerMocks = vi.hoisted(() => {
  const instance = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() };
  return { loggerInstance: instance, createFn: vi.fn(() => instance) };
});

vi.mock('../../../config/logger.js', () => ({
  createLoggerWithContext: loggerMocks.createFn,
}));
```

Assert on logger: `expect(loggerMocks.loggerInstance.error).toHaveBeenCalledWith(...)`

## Why vi.hoisted() is required
ESM static analysis hoists `vi.mock()` to the top of the file. Any variable referenced inside
the mock factory must be declared with `vi.hoisted()` or it will be undefined at mock resolution
time. This is the primary source of "mockFn is not a function" errors in ESM test suites.

## Mock reset
Always `vi.clearAllMocks()` in `beforeEach` — resets call counts and return values between tests.
Do NOT use `vi.resetAllMocks()` (wipes implementations) or `vi.restoreAllMocks()` (restores spies).
