# Changelog

All notable changes to the chatroom are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Planned
- `POST /api/rooms/:id/reset` — reset room messages and agents to idle
- `@everyone` only invokes agents in `done` state
- Tauri desktop app packaging
- Sidebar metrics: duration, tokens, cost from `claude -p` output

---

## [0.4.0] — Room Management

### Added
- `POST /api/rooms` — create room with auto-generated adjective-animal name (e.g. `powerful-salamander`). Seeds all 10 registered agents automatically. Requires Bearer token. Rate limit: `rooms-create` bucket (20/min).
- `DELETE /api/rooms/:id` — delete room and cascade-remove all messages and agent_sessions in a transaction. `default` room returns 403. Requires Bearer token. Rate limit: `rooms-delete` bucket (20/min).
- `utils-name.ts` — adjective-animal room name generator
- Room tabs in Titlebar: click to switch, `×` to mark for deletion, second `×` to confirm delete, click tab body to cancel
- `+` button in Titlebar to create new room from the UI
- `room-store.ts` — Zustand store for room list, active room, and pending-delete state
- `getAuthToken()` helper in room store: fetches a fresh one-time Bearer token before each create/delete HTTP call, same pattern as the WS auth flow
- Mention colors: agent `@name` references in messages are rendered in the agent's color
- Stop button in MessageInput to interrupt a running agent
- Guard in `deleteRoom` query: `if (id === 'default') return false` — defense in depth beyond the route-level 403
- Dedup in `/invite` body: `[...new Set(body.agents)]` — prevents duplicate upserts within a single request

### Fixed
- `seedAgentSessions` was calling `agents.filter(...).length` (two passes); replaced with a loop counter
- `deleteRoom` now wraps agent_session + message + room deletes in a single SQLite transaction
- Cascade test in `api-rooms.test.ts` queries `_db` directly to verify deletions instead of inferring from a 404
- Tool path display in ToolLine: RTL truncation replaced with `text-align:left; flex:1; min-width:0` — shows the filename end, not the path root; `unicode-bidi` removed

### Tests
- `tests/routes/api-rooms.test.ts` — 22 tests for all room endpoints (create, delete, cascade, auth, rate limit, guard)
- `tests/utils-name.test.ts` — name generator correctness and format tests

---

## [0.3.0] — WebSocket Circuit Breaker & Pause/Resume

### Added
- WS circuit breaker: frontend enters offline mode after 3 consecutive auth failures (`MAX_CONSECUTIVE_AUTH_FAILURES = 3`)
- Health check: `GET /api/health` for frontend connectivity probing
- Retry UI: connection status indicator and manual reconnect button in the frontend
- SIGSTOP/SIGCONT pause-resume for agent processes (targets process group, not just the spawned PID)
- Bridge process removed from `concurrently` dev script — replaced by direct HTTP calls to the backend API

### Fixed
- DB constraint violation on agent session upsert during concurrent spawns
- Timeout budget accounting during agent pause periods
- Completion guard: prevents double-completion when an agent exits
- `id` field added to `ServerToolEventSchema` — Zod was stripping it, breaking the activity log sidebar
- Card border glow hidden correctly when agent is not in active state

---

## [0.2.0] — Frontend Visual Layer

### Added
- Agent sidebar cards: three states — active (Thinking/ToolUse in progress), invoked (running, not active), never-invoked (gray name)
- `@everyone` in mention dropdown invokes only active agents, not all 10
- `@claude` alias removed
- Send button color: different color in brainstorm vs direct mode
- Autocomplete mention dropdown with arrow-key navigation
- CSS variables for agent colors (replaced `AGENT_COLOR` inline map)
- 78 Vitest frontend tests: stores, hooks, components
- Metrics pipeline end-to-end: duration, tokens, cost from `claude -p` stdout

### Fixed
- Sidebar agent order: bilbo, ultron, cerberus, argus, moriarty, dante, yoda, house, alexandria, gitto
- Sidebar status updates from WS events wired correctly
- Autocomplete dropdown broken after CSS refactor — restored

---

## [0.1.0] — Foundation

### Added
- Elysia HTTP + WebSocket server on Bun 1.x
- SQLite database with WAL mode: tables `rooms`, `messages`, `agent_sessions`
- `initializeSchema()` — idempotent DDL, seeds `default` room on every startup
- `seedAgentSessions()` — `INSERT ON CONFLICT DO NOTHING` preserves existing agent status on restart (does not reset `done` agents to `idle`)
- 10 registered agents: bilbo, ultron, cerberus, argus, moriarty, dante, yoda, house, alexandria, gitto
- `POST /api/auth/token` — one-time-use UUID token for WS upgrade and HTTP Bearer auth (rate: 20/min, global bucket)
- `POST /api/rooms/:id/invite` — add agents to a room; named rate-limit bucket `invite` independent of `auth-token`
- `GET /api/rooms`, `GET /api/rooms/:id`, `GET /api/rooms/:id/messages` (paginated)
- `GET /api/agents` — public registry, strips `allowedTools`
- WS upgrade: token consumed on connect, single-use
- `sanitizePromptContent()` — applied to all user content before it enters agent prompts
- `validateName()` — blocks reserved names from being claimed as participants
- `peekToken()` — validates a token without consuming it (used by authenticated HTTP routes)
- Pino logging via `createLogger('module-name')` — `console.log` banned project-wide
- `bun test` suite with in-memory SQLite (`:memory:`), Arrange/Act/Assert pattern

## [Unreleased — prior]

### Added

- Graceful shutdown on `SIGTERM`/`SIGINT`: the server drains active connections, runs a SQLite WAL checkpoint, and exits cleanly — preventing data loss on container stop or process manager restart.
- Environment validation at startup: all required env vars are checked via `config.ts` before the server binds; the process exits with a descriptive error on invalid config rather than failing silently at runtime.
- Swagger UI at `/docs` via `@elysiajs/swagger`: all HTTP routes are now self-documenting and explorable without reading source.
- `.env.example` with all supported environment variables and inline comments.
- `README.md` covering project purpose, setup steps, and development workflow.
- Context exhaustion auto-respawn: when an agent hits "Prompt is too long", the system clears the session, spawns a fresh instance with the last 2000 messages as history, and posts a RESPAWN NOTICE in the room so other agents know they are talking to a new instance of the same agent.
- Human message priority queue: messages from human users go to the front of the invocation queue (`unshift`), ensuring human input is never delayed by a chain of agent-to-agent mentions.
- Queue merge for duplicate entries: when the same agent+room already has a pending queue entry, new triggers merge instead of duplicating — with priority escalation and a 16 KB cap on trigger content to prevent unbounded memory growth.
- Git diff stat in agent system prompt: agents now see recent repository changes (30-second cached, whitelist-filtered, sanitized) so they have ambient awareness of ongoing work without reading the full diff.
- `contextWindow` fallback: when the Claude CLI reports 0 for the context window, the system infers a safe value from the model name (Opus → 1 M tokens, Sonnet/Haiku → 200 K tokens).
- `peekToken`: validates an auth token without consuming it, used by the `/invite` endpoint to authenticate without invalidating the token.
- Rate limiting on `/invite`: the invite endpoint now shares the same global token bucket as `/auth/token`, preventing brute-force discovery of invite codes.
- 54 new tests covering: sanitizer correctness, context-overflow detection, respawn flow, priority queue ordering, `@everyone` injection guard, `peekToken` validation, and invite-endpoint auth (535 total, 526 passing, 9 pre-existing failures, 0 new failures).

### Changed

- `config.ts` refactored to centralize and validate all `process.env` reads; application code no longer accesses `process.env` directly.
- Global `onError` handler added to Elysia: all unhandled errors return `{ error, code }` JSON instead of leaking stack traces. Validation and parse errors map to `422` rather than `500`.
- `sanitizePromptContent` is now a shared function applied consistently to all content that enters agent prompts — chat history, trigger content, and `@everyone` directives — replacing scattered ad-hoc sanitization.
- RESPAWN section delimiters upgraded to U+2550 (double-line box-drawing character) to make prompt-injection harder.
- `retryScheduled` refactored to a pure return-boolean pattern, removing the context mutation that made call sites unpredictable.
- Queue entries for the same agent+room now escalate to the higher priority on merge rather than keeping the original priority.

### Fixed

- README documented port corrected from `3001` to `3000`.
- Phantom environment variables removed from config and documentation.
- `@everyone` directive content is now sanitized before injection, closing a prompt-injection vector.
- Git diff output is whitelisted to safe characters and sanitized before being included in agent system prompts.
- Double-invoke guard: agent chains (agent-to-agent mentions) now go to the back of the queue (`push`) so a high-volume agent chain cannot starve human messages.
