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

35 test files, 1200+ tests. All must pass before merging.

## Key Patterns

### Routes

```ts
.post('/path', handler, { body: t.Object({ field: t.String() }) })
```

All routes use Elysia typebox validation. Never skip body/params/headers schemas.

### WS message types

All client-to-server WS messages are validated against `ClientMessageSchema` (Zod, in `@agent-chatroom/shared`) before dispatch. Types:

| Type | Purpose |
|---|---|
| `send_message` | User sends a chat message (with optional `attachmentIds`, `mode`) |
| `invoke_agent` | Directly invoke a specific agent |
| `kill_agent` | Send SIGTERM to the running agent subprocess, clear its queue |
| `pause_agent` | Send SIGSTOP to the agent process group |
| `resume_agent` | Send SIGCONT to resume a paused agent |
| `read_chat` | Fetch message history over WS (alternative to HTTP) |
| `clear_queue` | Drain the pending invocation queue for a room (used by Stop button before kill) |
| `stop_all` | Kill all active agents and clear all queues for a room |

### Auth — one-time tokens

- `POST /api/auth/token` issues a UUID token (rate: 20/min, global bucket `auth-token`)
- Token is consumed on WS upgrade — single use
- HTTP routes that mutate state use `peekToken()` — validates without consuming
- `Authorization: Bearer <token>` header required on: `POST /api/rooms`, `DELETE /api/rooms/:id`, `POST /api/rooms/:id/invite`, `POST /api/rooms/:id/upload`

### Rate limiting

Named token buckets — each route has its own so one cannot starve another:

| Bucket key | Endpoint | Limit |
|---|---|---|
| `auth-token` | POST /api/auth/token | 20/min |
| `invite` | POST /api/rooms/:id/invite | 20/min |
| `rooms-create` | POST /api/rooms | 20/min |
| `rooms-delete` | DELETE /api/rooms/:id | 20/min |
| `upload` | POST /api/rooms/:id/upload | 30/min |

Global key (not per-IP): X-Forwarded-For is trivially spoofed.

### Room endpoints

| Method | Path | Returns | Notes |
|---|---|---|---|
| GET | /api/rooms | `Room[]` | All rooms ordered by created_at |
| GET | /api/rooms/:id | `{ room, participants }` | sessionId stripped from participants (SEC-MED-002) |
| GET | /api/rooms/:id/messages | `{ messages, hasMore }` | `?limit=50&before=<id>` for pagination. Messages include linked attachments. |
| POST | /api/rooms | `{ room }` 201 | Creates room + seeds all agents. Requires Bearer. |
| DELETE | /api/rooms/:id | `{ deleted }` 200 | Cascade delete in transaction. Requires Bearer. |
| POST | /api/rooms/:id/invite | `{ added, skipped }` 201 | Dedup agents array before upsert. Requires Bearer. |
| POST | /api/rooms/:id/upload | `{ attachment }` 201 | Multipart file upload. Max 10 MB. Requires Bearer. |
| GET | /api/uploads/:roomId/:fileId | file bytes | Serve uploaded file. No auth — UUIDs are unguessable. Immutable cache headers. |

### File uploads — attachment flow

Files are stored on disk under `UPLOADS_DIR` (env: `UPLOADS_DIR`, default: `data/uploads/{roomId}/`). The `attachments` table tracks metadata; files are served via the immutable GET endpoint. Allowed MIME types: `image/png`, `image/jpeg`, `image/gif`, `image/webp`, `text/plain`, `text/markdown`, `application/pdf`, `text/x-typescript`, `text/javascript`, `application/json`, `text/yaml`.

Agent prompts receive attachment references as file-system paths so agents can `Read()` them directly:
```
[Attachment: filename.png (image/png, 12345 bytes) → /abs/path/to/file]
```

`linkAndFetchAttachments()` in `routes/ws-message-handlers.ts` links attachment IDs to messages in the DB and returns the attachment metadata. Called when a human posts a message with `attachmentIds` in the WS payload.

### deleteRoom — transaction pattern

`queries.ts` wraps `deleteRoom` in a transaction:
1. DELETE agent_sessions WHERE room_id = id
2. DELETE messages WHERE room_id = id
3. DELETE rooms WHERE id = id

The query cascades in a transaction: agent_sessions → messages → rooms.

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
Bun.spawn(['claude', '-p', prompt, '--model', model, '--allowedTools', tools, ...])
```

Never concatenate shell strings. Always array args (enforced in `agent-runner.ts::buildSpawnArgs`). Call `sanitizePromptContent()` on any user-supplied content before it enters a prompt — it lives in `services/agent-prompt.ts` and is re-exported via `services/agent-invoker.ts`.

`agent-invoker.ts` is a thin facade re-exporting from three split modules:
- `agent-prompt.ts` — `sanitizePromptContent`, `buildPrompt`, `buildSystemPrompt`, `validateSessionId`, `getGitDiffStat`
- `agent-runner.ts` — `doInvoke`, `spawnAndParse`, `postSystemMessage`, `updateStatusAndBroadcast`
- `agent-scheduler.ts` — `invokeAgents`, `scheduleInvocation`, `pauseAgent`, `resumeAgent`, etc.

### Brainstorm vs Execute mode

WS messages carry an optional `mode` field: `'execute'` (default) or `'brainstorm'`.

- `execute` — agents can use all their `allowedTools` and write code.
- `brainstorm` — agents get only read-only tools (`Read`, `Grep`, `Glob`, `Agent`) regardless of their configured `allowedTools`. The system prompt includes a `MODE: brainstorm` block that tells the agent to analyze and propose but not execute.

`buildModeBlock(mode)` in `agent-system-prompt.ts` builds the mode block. `buildSpawnArgs` in `agent-runner.ts` filters tools when `mode === 'brainstorm'`.

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
