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

35 test files, 1200+ tests. All must pass before merging.

## Key Patterns

**Routes** — all HTTP routes use Elysia typebox validation:
```ts
.post('/path', handler, { body: t.Object({ field: t.String() }) })
```

**WS messages** — validated via `ClientMessageSchema` (Zod) before any processing.

**Auth** — one-time-use UUID tokens issued via `POST /api/auth/token`, consumed on WS upgrade. All participants use the same token flow.

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

**Prompt injection defense** — call `sanitizePromptContent()` (from `agent-prompt.ts`, re-exported via `agent-invoker.ts`) on any user-supplied content before it enters a prompt.

**File uploads** — `POST /api/rooms/:id/upload` accepts multipart form data (max 10 MB, allowlisted MIME types). Files stored on disk; metadata in `attachments` table. Served via `GET /api/uploads/:roomId/:fileId` (immutable, no auth). Agents receive storage paths in their prompts so they can `Read()` files directly.

**Rate limiting** — token bucket enforced on WS (5 messages / 10s) and API (`/auth/token` 20/min, `/invite` 20/min, `/upload` 30/min — each has its own named bucket so one cannot exhaust the other's quota). Do not bypass.

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
