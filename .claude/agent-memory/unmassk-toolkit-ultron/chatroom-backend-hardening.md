---
name: chatroom-backend-hardening
description: Patterns for graceful shutdown, onError hook, and env validation in the chatroom backend (config.ts / index.ts)
type: project
---

## Graceful shutdown pattern (2026-03-19)

`app.server?.stop()` closes all active Elysia WS connections with a close frame.
Sequence: `app.server?.stop()` → WAL checkpoint → `db.close()` → `process.exit(0)`.
Force-exit timer: `setTimeout(..., 5000).unref()` — `.unref()` prevents the timer from
keeping the process alive on its own; it only fires if the shutdown hangs.

```ts
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
```

`getDb()` is imported from `db/connection.ts` to reach the singleton DB instance.

## onError hook placement (2026-03-19)

`.onError()` must be chained BEFORE `.use(apiRoutes)` and `.use(wsRoutes)` so it
catches errors from all downstream plugins. Shape: `{ error: string, code: string }`.
Never leak stack traces — only 'Not found' or 'Internal server error' as the message.

## Env validation in config.ts (2026-03-19)

Three helpers: `requireIntEnv(name, default, min, max)`, `requireEnumEnv(name, default, allowed[])`,
`stringEnv(name, default)`. All call `process.exit(1)` on invalid values after logging
a structured pino error. No new dependencies needed — built on `Number.isInteger` and
array `.includes()`.

`LOG_LEVEL` and `NODE_ENV` are validated as enums and exported from config.ts.
They cannot be imported back into logger.ts (circular dependency — logger.ts is imported
by config.ts). logger.ts must continue reading `process.env.LOG_LEVEL` directly.
This is intentional: config.ts exits on invalid values before any real work begins.

`WS_ALLOWED_ORIGINS` validation: parse each comma-separated entry via `new URL(entry)`,
check `url.protocol === 'http:' || 'https:'`, exit(1) on bad format.

`AGENT_DIR` validation: when set via env, call `existsSync(dir)` — exit(1) if not found.
Auto-discovery fallback is unchanged.

`_isDev` in config.ts uses the validated `NODE_ENV` constant (not `process.env.NODE_ENV`).

## PORT default change

Original default was 3001. Changed to 3000 to match `.env.example` and spec.
Update `.env.example` and start scripts if the port needs to differ.

## Argus security fixes — session 4 (2026-03-19)

**SEC-OPEN-001** (index.ts): Swagger mounted conditionally — move `app.use(swagger(...))` out of
the chain into a post-construction `if (NODE_ENV === 'development' || NODE_ENV === 'test')` block,
matching the existing pattern for static plugin. Import `swagger` at top stays (tree-shaken in prod).

**SEC-OPEN-002** (api.ts): Rate-limit buckets split — `'auth-token'` for `/api/auth/token`,
`'invite'` for `/api/rooms/:id/invite`. Previously both shared `'global'`, letting one exhaust the other.

**SEC-OPEN-006** (agent-invoker.ts `sanitizePromptContent`): Two replacement lines prepended before
existing bracket patterns — strip U+FF3B, U+27E6, U+2E22, U+3010 → `(` and U+FF3D, U+27E7, U+2E23,
U+3011 → `)`. Must be first so homoglyphs cannot bypass subsequent bracket-pattern checks.

**SEC-OPEN-008** (ws.ts): `MAX_CONNECTIONS_PER_ROOM = 20` const. In `open()`, after token
validation, check `roomConns.get(roomId)?.size >= MAX_CONNECTIONS_PER_ROOM` — send error
`ROOM_FULL` + close. Uses `logger.warn` (structured) not `log` (unstructured).

**SEC-OPEN-010** (ws.ts): In the rate-limit `if` block in `message()`, add
`logger.warn({ connId, roomId }, 'WS rate limit exceeded')` before the error send.
Use `logger` (pino instance) not `log` (unstructured wrapper) to get structured fields.

**SEC-OPEN-011** (auth-tokens.ts): Simple sliding-window counter `authFailureWindow` —
incremented in `peekToken` and `validateToken` on every failure path. When count >= 10,
emit `logger.error({ failCount }, '...')`. Window resets when gap > 60s.

**SEC-OPEN-012** (agent-invoker.ts): Wrap `stderrOutput.trim()` in `sanitizePromptContent()`
before calling `log()`. The safeStderr variable replaces the raw trim inline.
