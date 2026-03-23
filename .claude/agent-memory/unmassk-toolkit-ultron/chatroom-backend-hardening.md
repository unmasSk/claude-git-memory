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

**SEC-OPEN-011** (auth-tokens.ts): Upgraded to per-source tracking via `authFailureBySource: Map<string, FailureWindow>`.
Key = first 8 chars of token (enough to distinguish probing sources, avoids storing full tokens).
Missing/short tokens use sentinel key `'unknown'`. `recordAuthFailure(token?)` now takes the token as argument.
GC for stale windows added in the existing 10-min setInterval (removes entries older than 2x window).
Call sites updated: `peekToken` and `validateToken` pass `token` to `recordAuthFailure(token)`.

**SEC-BOOT-001** (logger.ts line 16): Changed from blacklist (`!== 'production'`) to allowlist
(`=== 'development' || === 'test'`). Bootstrap exception applies — logger reads process.env
directly here because config.ts is not yet loaded. Allowlist is still required to prevent
staging/misconfigured envs from getting pretty-printed dev logs.

## Config cleanup — session 5 (2026-03-19)

**Dead exports removed from config.ts**: `LOG_LEVEL`, `WS_ROOM_TOPIC_PREFIX`, `BANNED_TOOLS`.
- `LOG_LEVEL` — only consumer was logger.ts which reads `process.env` directly (circular dep prevents import).
- `WS_ROOM_TOPIC_PREFIX` — no runtime consumers; only appeared in config-validation.test.ts (test removed).
- `BANNED_TOOLS` — moved to single source of truth in agent-registry.ts (exported there, imported by agent-invoker.ts and tests).

**BANNED_TOOLS pattern**: `export const BANNED_TOOLS: readonly string[] = ['Bash', 'computer']` in agent-registry.ts.
Internal `const BANNED_TOOLS_SET = new Set(BANNED_TOOLS)` for O(1) lookup in buildRegistry().
agent-invoker.ts imports from `./agent-registry.js`, tests import from `./agent-registry.js`.
config-validation.test.ts: removed 4 dead-export tests (WS_ROOM_TOPIC_PREFIX x1, BANNED_TOOLS x3).

**AGENT_DIR canonicalization**: Added `realpathSync` import to config.ts. Applied in all 3 branches of
`resolveAgentDir()`: env var path, globSync match, and fallback (only if path exists — no error if fallback is virtual).

**logger.ts LOG_LEVEL validation**: Added inline enum check before pino initialization.
Pattern: `LOG_LEVEL_ALLOWED` const array, `_rawLogLevel` from env, early exit with `process.stderr.write()`
and `process.exit(1)` if invalid. Uses string concatenation (NOT template literals) in the
`process.stderr.write()` call — template literals in that position caused the TS compiler to
emit a literal newline inside the string when the linter converted `\n` to CRLF. String concat avoids this.

**auth-tokens.ts size cap**: `AUTH_FAILURE_MAX_ENTRIES = 5_000` const. In `recordAuthFailure`,
before adding a new entry (when `!window`), check size and evict the oldest Map key if at capacity.
Map insertion order is FIFO so `keys().next().value` gives the oldest entry.

**auth-tokens.ts constant-time lookup**: Added `tokenBuf: Buffer` field to `TokenEntry` interface.
`issueToken` stores `Buffer.from(token)` in the entry. `peekToken` and `validateToken` both:
1. Call `Map.get(token)` to find the entry.
2. Create `givenBuf = Buffer.from(token)`.
3. Check `entry.tokenBuf.length !== givenBuf.length` first (timingSafeEqual throws on length mismatch).
4. Call `crypto.timingSafeEqual(entry.tokenBuf, givenBuf)` — defense-in-depth after the Map lookup.

**Linter behavior**: A linter/formatter runs on every file write and reverts content using CRLF.
When writing TypeScript files with string literals containing `\n`, use Python binary writes with
hex bytes (`b'\x5c\x6e'`) or string concatenation instead of template literals to avoid CRLF normalization
corrupting escape sequences. The Edit tool triggers the linter; batch Python writes survive if done
atomically before the linter fires.

**SEC-OPEN-012** (agent-invoker.ts): Wrap `stderrOutput.trim()` in `sanitizePromptContent()`
before calling `log()`. The safeStderr variable replaces the raw trim inline.

---

## Session 7 fixes — 2026-03-19 (Bilbo findings)

### Shared rate-limiter factory (services/rate-limiter.ts)
`createTokenBucket(max, windowMs)` returns a `(key: string) => boolean` closure.
Each caller gets its own Map — no shared state between API and WS limiters.
`api.ts` and `ws.ts` both import from this module instead of duplicating the inline implementation.
`checkUpgradeRateLimit` in `ws.ts` uses an IIFE wrapping `createTokenBucket` with a constant `'global'` key.

### WS ingress sanitization
In `ws.ts` `send_message` handler, the `@mention` path now calls
`sanitizePromptContent(msg.content)` before passing content to `invokeAgents`.
The `@everyone` directive path was already sanitized — this closes the gap for direct @mention invocations.

### getReservedAgentNames() shared function
`auth-tokens.ts` exports `getReservedAgentNames(): Set<string>` — returns the WS-layer
name-blocking set (excludes 'user' and 'claude', includes 'system' and all AGENT_BY_NAME keys).
`ws.ts` imports it instead of duplicating the construction. The auth-token issuance set
(also in auth-tokens.ts) uses a slightly different filter (excludes 'user' only).

### auth-tokens.ts setInterval .unref()
`setInterval(...).unref()` added so the GC timer does not prevent process exit
after all real work completes.

### drainActiveInvocations() — graceful shutdown
`agent-invoker.ts` exports `drainActiveInvocations(): Promise<void>` — waits on all
`activeInvocations` Map values via `Promise.allSettled`. Resolves immediately when empty.
`index.ts` imports it and `await drainActiveInvocations()` between `app.server?.stop()` and
`db.exec('PRAGMA wal_checkpoint')`. `gracefulShutdown` is now `async`. Signal handlers use
`void gracefulShutdown(...)` to silence the floating promise.

### Swagger restricted to development only
`index.ts`: `if (NODE_ENV === 'development')` — removed `|| NODE_ENV === 'test'`.
Swagger adds HTTP overhead and leaks API surface in test mode.

### Dead code removal
- `logger.ts`: `export default rootLogger` → `export { rootLogger }` (named export).
  `logger.test.ts` updated to `import { createLogger, rootLogger } from './logger.js'`.
- `utils.ts`: `formatTimeHHMM` removed. `utils.test.ts` describe block removed.
- `stream-parser.ts`: `StreamEvent` type alias made module-private (was exported but unused externally).
  `PermissionDenial` interface was already private after previous session.
- `mention-parser.ts`: `log()` unstructured wrapper removed; replaced with `logger.debug(...)` calls.

### Test renames and additions
- `routes/invite.test.ts` renamed to `routes/api-invite.test.ts`.
- `routes/api.test.ts`: test server handler updated to strip `allowedTools` (matching production).
  Old "each agent has an allowedTools array" test replaced with
  "allowedTools is stripped from every agent in the production route (SEC-MED-001)".

---

## Session 8 fixes — 2026-03-19

### readStderr try/catch (agent-stream.ts)
The async IIFE inside `readStderr` is now wrapped in try/catch. On any thrown error
from the stderr stream, `logger.warn({ err: err.message }, 'stderr stream error')` is
called and `result.stderrOutput` is set to `''`. This prevents an unhandled rejection
from propagating to the process-level rejection handler when the subprocess stderr stream
fails unexpectedly.

### BunSpawnOptionsWithDetached interface (agent-runner.ts)
Replaced `as any` cast on `Bun.spawn` with a typed interface:
```ts
interface BunSpawnOptionsWithDetached extends Bun.SpawnOptions.Readable {
  detached?: boolean;
}
```
`spawnOpts` is declared as `BunSpawnOptionsWithDetached`, then passed to `Bun.spawn`.
The `as any` cast comment was removed along with the cast itself.

---

## Session 9 fixes — 2026-03-21 (agent pause hardening)

### Fix 1: SIGSTOP/SIGCONT must target process GROUP (agent-queue.ts)
`process.kill(active.pid, 'SIGSTOP')` → `process.kill(-active.pid!, 'SIGSTOP')`.
Same for SIGCONT. Negative PID targets the entire process group (pgid == pid when
spawned with `detached: true`). Freezes MCP server children as well.

### Fix 2: SQLite CHECK constraint must include 'paused' (schema.ts)
Added `'paused'` to the status CHECK constraint in `agent_sessions`.
The existing `chatroom.db` (old constraint) must be deleted on deploy — the app
recreates it from scratch on next boot. Tests that inline the schema in
`tests/db/queries.test.ts` must be updated to match.

### Fix 3: Timeout must pause/resume with the agent (agent-queue.ts + agent-runner.ts)
`ActiveProcess` extended with three optional fields: `timeoutHandle`, `pausedAt`, `remainingTimeoutMs`.
`agent-runner.ts`: after `makeTimeoutHandle()`, store the handle in `activeEntry.timeoutHandle`
and set `activeEntry.remainingTimeoutMs = AGENT_TIMEOUT_MS`.
`pauseAgent()`: on successful SIGSTOP, clear the timeout, compute remaining time.
`resumeAgent()`: on successful SIGCONT, restart a new setTimeout with remaining budget.
`AGENT_TIMEOUT_MS` imported into `agent-queue.ts` from `../config.js`.

---

## Session 10 fixes — 2026-03-23 (Cerberus + Argus review findings)

### SEC-WARN-001: UNC path guard (api.ts)
After `isAbsolute()` check, add explicit UNC block before `statSync`:
```ts
if (cwd.startsWith('\\\\') || cwd.startsWith('//')) {
  set.status = 400;
  return { error: 'UNC paths are not permitted', code: 'INVALID_CWD' };
}
```
UNC paths pass `isAbsolute()` on Windows but point to attacker-controlled network shares.

### SEC-WARN-002: sanitize cwd before embedding in system prompt (agent-runner.ts)
`roomCwd` is sanitized via `sanitizePromptContent` before passing to `buildSystemPrompt`:
```ts
const sanitizedRoomCwd = roomCwd !== undefined ? sanitizePromptContent(roomCwd) : undefined;
```
`sanitizePromptContent` is already imported in `agent-runner.ts` from `./agent-prompt.js`.

### Cerberus: stdin type mismatch (agent-runner.ts line 55)
`BunSpawnOptionsWithDetached` type parameter for stdin was `"ignore"` but runtime uses `"inherit"`.
Fixed to `Bun.Spawn.SpawnOptions<"inherit", "pipe", "pipe">`.

### Cerberus: Pin Bun version in CI (.github/workflows/chatroom-ci.yml)
Both `oven-sh/setup-bun@v2` steps now have `with: bun-version: "1.3.11"` to prevent
non-deterministic builds from floating Bun version upgrades.

---

## Session 11 fixes — 2026-03-23 (stdin-prompt + delta-messages)

### FIX: stdin instead of -p for prompt (agent-runner.ts)
Removed `-p` and the prompt string from `buildSpawnArgs()`. The prompt is now passed
via `stdin: new TextEncoder().encode(prompt)` in `spawnOpts`. Avoids Windows CreateProcess
command-line limit (~32 767 chars) which caused ENAMETOOLONG on long chat histories.

`BunSpawnOptionsWithDetached` was changed from the generic `SpawnOptions<...>` alias to
a plain `interface` with explicit fields (`stdin: Uint8Array`, `stdout: 'pipe'`, `stderr: 'pipe'`,
`detached?: boolean`, `cwd?: string`). This avoids the bun-types `ArrayBufferView` constraint
conflict (`DataView` is in the union but `ArrayBufferView<ArrayBufferLike>` != `DataView`).
The generic alias approach does NOT work for non-string stdin — use plain interface instead.

`buildSpawnArgs()` signature: removed `prompt: string` parameter.
Call site in `spawnAndParse()`: removed `prompt` from `buildSpawnArgs(...)` call.

### FIX: delta-messages — only send new messages to agents (multi-file)

**schema.ts**: Added migration:
```ts
'ALTER TABLE agent_sessions ADD COLUMN last_seen_message_id TEXT DEFAULT NULL'
```
Uses try/catch pattern already in place — safe for existing DBs.

**types.ts**: Added `last_seen_message_id: string | null` to `AgentSessionRow`.

**queries.ts**: Added two new functions:
- `getMessagesSince(roomId, sinceMessageId, limit=200)` — when sinceMessageId is null,
  returns all messages (first invocation); otherwise returns messages created after that ID's timestamp.
- `updateLastSeenMessage(agentName, roomId, messageId)` — updates `last_seen_message_id`.

**agent-prompt.ts**: `buildPrompt(roomId, triggerContent, historyLimit?, agentName?)` — new
optional `agentName` param. When provided and `historyLimit` is not set (no respawn override),
calls `getAgentSession(agentName, roomId)?.last_seen_message_id` and passes it to `getMessagesSince`.
Respawn path (`historyLimit = 2000`) bypasses delta logic — always uses full window.

**agent-result.ts**: In `persistAndBroadcast`, after `insertMessage`, calls
`updateLastSeenMessage(agentName, roomId, message.id)` to advance the checkpoint.
The agent's own message ID is the natural upper bound.

**agent-runner.ts**: `doInvoke` passes `agentName` as 4th arg to `buildPrompt`.

---

## Session 12 fixes — 2026-03-23 (Argus + Moriarty T1 findings)

### FIX 1 (BREAK-1/BREAK-2/SEC-CRIT-001): getMessagesSince uses rowid, not created_at (queries.ts)

Changed `getMessagesSince` to use `rowid` instead of `created_at`. Two bugs fixed:
1. 1-second timestamp granularity (BREAK-2): same-second messages were excluded by strict `>`.
2. Deleted checkpoint (BREAK-1): subquery returning NULL caused `created_at > NULL` = false → 0 rows.

New query for sinceMessageId branch:
```sql
SELECT * FROM messages
WHERE room_id = ?
  AND (? IS NULL OR rowid > COALESCE((SELECT rowid FROM messages WHERE id = ?), 0))
ORDER BY rowid ASC LIMIT ?
```
COALESCE(..., 0): if checkpoint deleted → rowid > 0 → all messages returned (safe fallback).

For the null branch (first invocation), the subquery must include `rowid` in SELECT list so
outer ORDER BY can reference it:
```sql
SELECT * FROM (SELECT rowid, * FROM messages WHERE room_id = ? ORDER BY rowid DESC LIMIT ?) ORDER BY rowid ASC
```
Without `rowid` in subquery SELECT, SQLite errors: "no such column: rowid" at outer ORDER BY.

### FIX 2 (SEC-CRIT-002): updateLastSeenMessage moved after scheduleChainMentions (agent-result.ts)

In `persistAndBroadcast`, `updateLastSeenMessage` was called between `insertMessage` and `broadcast`.
Moved to after `scheduleChainMentions` so chained agents see the full context including the triggering
message when they run. Order is now: insertMessage → broadcast → scheduleChainMentions → updateLastSeenMessage.

### FIX 3 (SEC-HIGH-001): attachment filename/mime_type sanitized (agent-prompt.ts)

Applied `sanitizePromptContent` to `att.filename` and `att.mime_type` before embedding in prompt.
User-supplied attachment metadata could have contained prompt injection markers.

### FIX 4 (SEC-HIGH-002): system prompt CLI length guard (agent-runner.ts)

Added `MAX_SYSTEM_PROMPT_CLI_LENGTH = 8000` constant. In `buildSpawnArgs`, if `systemPrompt.length > 8000`,
log a warn and truncate. Windows CreateProcess limit is ~32K but prompt + other args stack up.

### FIX 5 (SEC-MED-002): migration catch narrowed (schema.ts)

Changed `catch { /* ignore */ }` to re-throw all errors except `'duplicate column name'`.
Prevents silently swallowing corrupt DB, permission errors, or malformed SQL.

### FIX 6 (T2/SEC-MED-001): getMessagesSince returns { messages, hasMore } (queries.ts + agent-prompt.ts)

`getMessagesSince` now returns `{ messages: MessageRow[], hasMore: boolean }` instead of `MessageRow[]`.
`hasMore` is true when result count equals the limit.
In `buildPrompt`, if `hasMore` is true, a note is prepended: `[Note: Some older messages were omitted...]`.
All callers and tests updated.

### FIX 7 (SEC-LOW-001): model validated against regex before spawn (agent-runner.ts)

Added `MODEL_RE = /^claude-[a-z0-9-.]+$/` check in `buildSpawnArgs`. Throws if model does not match.
Uses regex, not hardcoded model names, so new models are automatically valid.

---

## Session 13 fixes — 2026-03-23 (Cerberus + Argus + Moriarty round 2)

### FIX 1 (SEC-HIGH-003): storage_path sanitized before embedding in prompt (agent-prompt.ts)
Applied `sanitizePromptContent(att.storage_path)` alongside filename and mime_type.
The storage_path field was the only user-influenced attachment field not yet sanitized.
Pattern: always sanitize ALL attachment fields before prompt embedding, not just filename/type.

### FIX 2 (T2): Generic throw Error leaks raw model value (agent-runner.ts)
Changed error message from `model "${model}" does not match...` to
`Invalid model identifier — does not match allowed pattern` (no raw model in message).
The caller's catch already calls sanitizePromptContent() on the error message, but
not leaking the raw value is defense-in-depth.

### FIX 3 (T2): Dead `? IS NULL` branch removed from getMessagesSince non-null path (queries.ts)
The sinceMessageId non-null branch had `AND (? IS NULL OR rowid > COALESCE(...))` with
3 bind params. Since the branch only runs when sinceMessageId is not null, `? IS NULL`
is always false. Simplified to `AND rowid > COALESCE(...)` with 2 bind params.
If you see a 3-param call in tests, update to 2-param.

### FIX 4 (T2): SELECT rowid, * kept in subquery only; base query uses SELECT * (queries.ts)
Non-null branch now uses `SELECT *` — SQLite allows ORDER BY rowid on the base table
without projecting rowid into SELECT (rowid is implicit on base table queries).
The null branch (subquery) MUST keep `SELECT rowid, *` because outer ORDER BY rowid
on a derived table requires rowid to be projected into the subquery result set.

### FIX 5 (T3): Comments added (agent-result.ts + tests/db/queries.test.ts)
- queries.test.ts top-level docblock: explains why tests inline schema SQL instead of
  importing the production migration runner (decouples from migration side-effects).
- agent-result.ts: comment above handleFailedResult noting checkpoint is intentionally
  NOT advanced on failed/empty results — only persistAndBroadcast advances it.

### FIX 6 (T2/Moriarty): Truncation changed to slice from END (agent-runner.ts)
`systemPrompt.slice(0, MAX_SYSTEM_PROMPT_CLI_LENGTH)` → `systemPrompt.slice(-MAX_SYSTEM_PROMPT_CLI_LENGTH)`.
Security rules are appended last by buildSystemPrompt, so slicing from the end
preserves them. Silently dropping security rules is worse than dropping preamble.
Log level changed from warn to error (T2 obligation — not just a note).

### FIX 7 (T2): MODEL_RE tightened to block leading dot/hyphen (agent-runner.ts)
Changed `/^claude-[a-z0-9-.]+$/` to `/^claude-[a-z0-9][a-z0-9-.]*$/`.
The first char after `claude-` must be alphanumeric. Blocks `claude-..--shell` while
still matching `claude-3.5-sonnet`, `claude-opus-4-5`, etc.

### Fix 4: Completion handlers must not overwrite Paused status (agent-result.ts + agent-stream.ts)
Import `isAgentPaused` from `agent-queue.ts` in both files.
Guard every `updateStatusAndBroadcast(Done/Error)` call with `if (!isAgentPaused(...))`.
Affected locations: `handleFailedResult`, `handleEmptyResult`, `persistAndBroadcast` (agent-result.ts),
SKIP path in `handleAgentResult` (agent-stream.ts).
`upsertAgentSession` in `persistAndBroadcast` uses `finalStatus = isAgentPaused ? 'paused' : 'done'`.
