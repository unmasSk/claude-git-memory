# Backend — Agent Working Guide

## Stack

| Component | Technology |
|---|---|
| Runtime | Bun 1.x |
| HTTP + WS | Elysia |
| Database | `bun:sqlite` WAL mode |
| Logging | pino — `createLogger('module-name')` from `./logger.ts` |
| HTTP validation | Elysia typebox (`t.Object`) |
| WS validation | Zod (`ClientMessageSchema`) |

## Run Tests

```bash
bun test   # from apps/backend/
```

535+ tests. All must pass before merging.

## Key Patterns

### Routes

```ts
.post('/path', handler, { body: t.Object({ field: t.String() }) })
```

All routes use Elysia typebox validation. Never skip body/params/headers schemas.

### Auth — one-time tokens

- `POST /api/auth/token` issues a UUID token (rate: 20/min, global bucket `auth-token`)
- Token is consumed on WS upgrade — single use
- HTTP routes that mutate state use `peekToken()` — validates without consuming
- `Authorization: Bearer <token>` header required on: `POST /api/rooms`, `DELETE /api/rooms/:id`, `POST /api/rooms/:id/invite`

### Rate limiting

Named token buckets — each route has its own so one cannot starve another:

| Bucket key | Endpoint | Limit |
|---|---|---|
| `auth-token` | POST /api/auth/token | 20/min |
| `invite` | POST /api/rooms/:id/invite | 20/min |
| `rooms-create` | POST /api/rooms | 20/min |
| `rooms-delete` | DELETE /api/rooms/:id | 20/min |

Global key (not per-IP): X-Forwarded-For is trivially spoofed.

### Room endpoints

| Method | Path | Returns | Notes |
|---|---|---|---|
| GET | /api/rooms | `Room[]` | All rooms ordered by created_at |
| GET | /api/rooms/:id | `{ room, participants }` | sessionId stripped from participants (SEC-MED-002) |
| GET | /api/rooms/:id/messages | `{ messages, hasMore }` | `?limit=50&before=<id>` for pagination |
| POST | /api/rooms | `{ room }` 201 | Creates room + seeds all agents. Requires Bearer. |
| DELETE | /api/rooms/:id | `{ deleted }` 200 | Cascade delete in transaction. 403 on `default`. Requires Bearer. |
| POST | /api/rooms/:id/invite | `{ added, skipped }` 201 | Dedup agents array before upsert. Requires Bearer. |

### deleteRoom — transaction pattern

`queries.ts` wraps `deleteRoom` in a transaction:
1. DELETE agent_sessions WHERE room_id = id
2. DELETE messages WHERE room_id = id
3. DELETE rooms WHERE id = id

The query also guards `if (id === 'default') return false` — defense in depth beyond the route 403.

### seedAgentSessions — idempotent, preserves state

Uses `INSERT ON CONFLICT DO NOTHING` (via `insertAgentSessionIfMissing`). Safe to call on every startup or room creation. Does NOT reset `done` agents to `idle` on restart. `upsertAgentSession` (used by `/invite`) DOES reset status to `idle` — this is intentional for re-invite but is a semantic inconsistency worth knowing.

### Logging

```ts
const logger = createLogger('module-name');
logger.info({ ... }, 'message');
```

Never use `console.log`. Enforced by lint and code review.

### Error responses

Always return:
```ts
{ error: string, code: string }
```

Never leak stack traces. The global `onError` handler maps validation errors to 422.

### Agent invocation

```ts
Bun.spawn(['claude', '-p', prompt, '--session-id', id, ...])
```

Never concatenate shell strings. Always array args. Call `sanitizePromptContent()` on any user-supplied content before it enters a prompt.

### Config

Never read `process.env` directly. Use `config.ts` exports only.

## Do Not

- Use `console.log` anywhere
- Access `process.env` directly
- Build shell strings for agent invocation — use array args
- Return `new Response(...)` from Elysia WS upgrade hooks — use `context.set.status` + return string
- Commit secrets or `.env` files
- Touch `apps/frontend/` from backend changes

## Testing Conventions

- Framework: `bun:test`
- Database: in-memory SQLite (`:memory:`)
- Pattern: Arrange / Act / Assert
- Wrap assertions in `try/finally` when cleanup is needed
- Cascade deletes must be verified with direct `_db` queries, not inferred from 404 responses
