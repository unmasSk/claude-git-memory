# Chatroom — Agent Working Guide

## Project

Multi-agent chatroom backend. Real-time WebSocket server where Claude Code agents are invoked as subprocesses and collaborate in chat rooms.

## Stack

| Component | Technology |
|---|---|
| Runtime | Bun 1.x |
| HTTP + WS framework | Elysia |
| Database | `bun:sqlite` with WAL mode |
| Logging | pino — always `createLogger('module-name')` from `./logger.ts` |
| Validation | Elysia typebox (`t.Object`) on HTTP routes; Zod (`ClientMessageSchema`) on WS messages |

## Run Tests

```bash
bun test          # from apps/backend/
```

535+ tests. All must pass before merging.

## Key Patterns

**Routes** — all HTTP routes use Elysia typebox validation:
```ts
.post('/path', handler, { body: t.Object({ field: t.String() }) })
```

**WS messages** — validated via `ClientMessageSchema` (Zod) before any processing.

**Auth** — one-time-use UUID tokens issued via `POST /api/auth/token`, consumed on WS upgrade. The bridge connects as a normal named-token client (same auth flow as any other participant).

**Logging** — never use `console.log`. Always:
```ts
const logger = createLogger('module-name');
logger.info({ ... }, 'message');
```

**Error responses** — always return this exact shape:
```ts
{ error: string, code: string }
```

**Agent invocation** — never build shell strings. Always array args:
```ts
Bun.spawn(['claude', '-p', prompt, '--session-id', id, ...])
```

**Prompt injection defense** — call `sanitizePromptContent()` (from `agent-invoker.ts`) on any user-supplied content before it enters a prompt.

**Rate limiting** — token bucket enforced on WS (5 messages / 10s) and API (`/auth/token` 20/min, `/invite` 20/min — each has its own named bucket so one cannot exhaust the other's quota). Do not bypass.

**Config** — never read `process.env` directly. Use `config.ts` exports.

## Do Not

- Touch frontend code (`apps/frontend/`).
- Use `console.log` anywhere.
- Access `process.env` directly — use `config.ts`.
- Commit secrets or `.env` files.
- Return `new Response(...)` from Elysia WS upgrade hooks — use `context.set.status` + return string.

## Testing Conventions

- Framework: `bun:test`
- Database: in-memory SQLite (`:memory:`)
- Pattern: Arrange / Act / Assert
- Wrap assertions in `try/finally` when cleanup is needed
