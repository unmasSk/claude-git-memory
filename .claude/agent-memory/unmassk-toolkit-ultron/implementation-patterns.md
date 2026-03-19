---
name: elysia-ws-upgrade-context
description: Elysia .ws() upgrade hook receives an Elysia Context, not a Request object
type: project
---

Elysia's `.ws()` upgrade hook parameter is an **Elysia Context**, not a Web API `Request`.

- `context.headers` is a plain `Record<string, string>` — use bracket access: `context.headers['origin'] ?? ''`
- Do NOT call `.get()` on headers — that is a `Headers` API method absent on Elysia's plain object
- To reject an upgrade, use `context.set.status = 403; return 'Forbidden'` — do NOT return `new Response(...)` from the Elysia hook
- To accept and annotate the connection, return `{ data: { ...extraFields } }`

**Why:** House diagnosed a T1 bug (2026-03-17) where `request.headers.get('origin')` threw a TypeError on every WS upgrade, causing HTTP 500.

**How to apply:** Any time the `.ws({ upgrade })` hook is written or modified in this codebase.

---

## Agent-to-agent @mention chain depth pattern (2026-03-18)

The chatroom uses a server-side `depth` counter to bound recursive agent invocation chains.

### Key design decisions

- `depth` lives only in `InvocationContext` — never in WS protocol or DB
- Human messages always start at `depth: 0`
- Each agent response that triggers another agent increments: `context.depth + 1`
- `extractMentions(content, depth)` returns empty set when `depth >= 3` — `authorType` param was removed (T1-01/Cerberus 2026-03-18)
- `NEVER_INVOKE = new Set(['user', 'system', 'claude'])` — claude filtered to prevent @claude loops (T1-02)
- The depth-cap system message fires only when the agent *would have* triggered mentions (checked with depth=0) but is blocked by the cap — avoids false positives
- `invokeAgents` and `invokeAgent` both carry depth; `invokeAgent` (explicit invoke from WS) always starts at 0

### inFlight key is composite: `${agentName}:${roomId}` (T2-05, 2026-03-18)
Previously `inFlight` was keyed by agent name alone, blocking same-agent cross-room invocations. Now keyed as `${agentName}:${roomId}`.
All `.has()`, `.add()`, `.delete()` calls use the composite key.
`drainQueue` also checks `${e.agentName}:${e.roomId}`.

### RACE-002: retryScheduled signal — now a return value, not a context mutation (Issue #36, 2026-03-19)
`spawnAndParse` returns `Promise<boolean>` — true when a retry was scheduled.
`doInvoke` returns `Promise<boolean>` — propagates the retryScheduled signal upward.
`runInvocation` uses `.then(retryScheduled => { if (!retryScheduled) { cleanup } })` — no longer reads from context.
`InvocationContext.retryScheduled` was removed. `isRespawn` and `rateLimitRetry` remain as context fields (they are config, not race signals).

### Files involved
- `mention-parser.ts` — depth param only (no authorType), NEVER_INVOKE set for 'user'/'system'/'claude'
- `agent-invoker.ts` — `InvocationContext.depth + retryScheduled`, composite inFlight key, chain detection
- `routes/ws.ts` — explicit `0` at human message entry point (no authorType arg)

---

## @everyone stop — pause/clear pattern (2026-03-18)

Server-side enforcement for `@everyone stop` directives.

### agent-invoker.ts exports
- `clearQueue(roomId)` — removes all pendingQueue entries for a room, returns count removed
- `pauseInvocations()` / `resumeInvocations()` / `isPaused()` — module-level `_paused` flag
- `scheduleInvocation` checks `_paused` at the very top (before inFlight check) and returns early

### ws.ts wiring
- Stop words regex: `/\b(stop|para|callaos|silence|quiet)\b/i` applied to the directive portion (content after stripping `@everyone`)
- On stop: call `clearQueue(roomId)` then `pauseInvocations()`
- Resume: in the `else if (isPaused())` branch of the non-`@everyone` path — `resumeInvocations()` called before `extractMentions`

### auth-tokens.ts token store limit (2026-03-18)
- `issueToken` returns `null` when `tokens.size >= 10_000`
- Caller in `api.ts` returns HTTP 503 with `{ error, code: 'TOKEN_STORE_FULL' }`

### auth-tokens.ts reserved names — SEC-AUTH-002 (2026-03-18)
- "claude" and "user" MUST be in RESERVED_AGENT_NAMES (in addition to AGENT_BY_NAME keys)
- "claude" = orchestrator bridge identity — impersonation via public token endpoint is a security hole
- "user" = default fallback name — block explicit claim, allow implicit (empty rawName → returns 'user' directly, bypasses the reserved check)
- Pattern: `const EXTRA_RESERVED = new Set(['claude', 'user']); const RESERVED_AGENT_NAMES = new Set([...AGENT_BY_NAME.keys(), ...EXTRA_RESERVED]);`
- Bridge authenticates with a pre-shared token (BRIDGE_TOKEN), not via this endpoint

### useMentionAutocomplete.ts — everyone special entry (2026-03-18)
- `EVERYONE_ENTRY: AgentDefinition` — synthetic entry with `invokable: false`, name='everyone'
- `ALL_AUTOCOMPLETE = [...INVOKABLE_AGENTS, EVERYONE_ENTRY]`
- Filter uses `ALL_AUTOCOMPLETE` — `everyone` appears when user types `@e` or `@ev`

---

## Session 4 fixes — 2026-03-19

### FIX: "Prompt is too long" = context overflow — respawn with full history (2026-03-19)
In `agent-invoker.ts` stale-session detection block:
- `isContextOverflow = resultText.includes('Prompt is too long') || stderrOutput.includes('Prompt is too long')`
- `isStaleSession = isContextOverflow || ...` (context overflow is a superset of stale session)
- When overflow: post visible `🔄 {AgentName} reinvocado (contexto agotado, nueva sesión)` system message
- Set `context.isRespawn = true` on the context before scheduling retry
- `doInvoke` checks `context.isRespawn`: passes `historyLimit=2000` to `buildPrompt` (full history instead of AGENT_HISTORY_LIMIT=20)
- `buildSystemPrompt(agentName, role, isRespawn)`: when `isRespawn=true`, prepends RESPAWN NOTICE block instructing agent to read history and orient silently
- `InvocationContext.isRespawn?: boolean` added to the interface
- `buildPrompt(roomId, trigger, historyLimit?)` — third param is optional override
- `buildSystemPrompt(agentName, role, isRespawn=false)` — third param defaults to false
- Plain stale session (not overflow) still posts generic "retrying fresh" message and does NOT set isRespawn

### FIX: @everyone + @mention double-invoke guard
In `ws.ts` `send_message` handler, compute `everyoneProcessed = /@everyone\b/i.test(msg.content)` BEFORE calling `extractMentions`. If `everyoneProcessed`, set `mentions = new Set<string>()` (skip extractMentions). This prevents agents named in the @everyone message from being invoked twice.

### FIX: /invite endpoint auth — peekToken pattern
Added `peekToken(token)` to `auth-tokens.ts` — validates token without consuming it (unlike `validateToken` which is one-time-use for WS upgrades).
Invite endpoint reads `Authorization: Bearer <token>` header, calls `peekToken`, returns 401 on failure.
Import: `import { ..., peekToken } from '../services/auth-tokens.js'`

### FIX: Human-priority queue
Added `priority: boolean` field to `QueueEntry`. `invokeAgents` accepts a new `priority = false` parameter and passes it to `scheduleInvocation`. `scheduleInvocation` uses `pendingQueue.unshift(entry)` for priority=true, `push` for priority=false. All human-originated calls from `ws.ts` pass `priority = true`. Agent-chained calls (inside `doInvoke`) do not pass priority (defaults to false).

---

## Session 5 security fixes — 2026-03-19 (Cerberus + Argus review)

### FIX 1: Case-insensitive "Prompt is too long" detection
`const CONTEXT_OVERFLOW_SIGNAL = 'prompt is too long'` at module scope.
Use `resultText.toLowerCase().includes(CONTEXT_OVERFLOW_SIGNAL)` — prevents Claude version variation in capitalisation breaking detection.

### FIX 2: Elysia typed header schema on /invite
Add `headers: t.Object({ authorization: t.Optional(t.String()) })` to the route config.
Access via `headers.authorization` (typed) — no more `(headers as Record<string, string | undefined>)` cast.

### FIX 3: sanitizePromptContent shared function
`export function sanitizePromptContent(s: string): string` in `agent-invoker.ts` — strips all trust boundary delimiters (CHATROOM HISTORY, PRIOR AGENT OUTPUT, ORIGINAL TRIGGER, DIRECTIVE FROM USER) via gi regex chain.
Applied to: `triggerContent`, every `msg.content` and `msg.author` in the history loop, and `@everyone` directive content before storage.
Import in `ws.ts`: `import { sanitizePromptContent } from '../services/agent-invoker.js'`

### FIX 4: Hardened RESPAWN NOTICE delimiters
`RESPAWN_DELIMITER_BEGIN/END` use box-drawing U+2550 characters — cannot appear in user text or agent metadata.
`buildSystemPrompt` strips U+2550 from `agentName` and `role` before interpolation (declared before use).

### FIX 5: Sanitize @everyone directive before storage
`const safeDirective = sanitizePromptContent(directive)` in ws.ts — stored message and `invokeAgents` call both use `safeDirective`.

### FIX 6: Rate limit on /invite endpoint
`checkApiRateLimit('global')` at top of `/invite` handler — same bucket/window as `/auth/token`. Returns 429 if exceeded.

### FIX 7: Respawn retry passes priority=true
`scheduleInvocation(roomId, agentName, context, true, true)` — priority flag preserves queue position on context-overflow respawn.

### FIX 8: enqueue at module scope
`function enqueue(entry: QueueEntry)` moved to module scope (after `pendingQueue` declaration). Captures nothing per-call. Inner closure in `scheduleInvocation` removed.

### FIX 9: EVERYONE_PATTERN constant
`const EVERYONE_PATTERN = /@everyone\b/i` at module scope in `ws.ts`. Both `.test()` calls updated to use it.

### FIX 10: peekToken brace style
`if (!entry)` in `peekToken` expanded to multi-line format matching the rest of `auth-tokens.ts`.

### FIX 11: Test isolation try/finally
historyLimit test in `agent-invoker.test.ts` now wraps assertions in `try/finally` — cleanup rows are deleted even if assertions throw.

---

## Session 6 backlog fixes — 2026-03-19

### Issue #36: retryScheduled mutation removed from InvocationContext
`retryScheduled` deleted from `InvocationContext`. `spawnAndParse` and `doInvoke` now return `Promise<boolean>`. `runInvocation` reads the boolean in `.then()` to decide whether to clean up inFlight/activeInvocations. The `.catch()` guard handles unexpected rejections (always cleans up). `.finally()` always drains queue.

### Issue #31: Queue merge for same-agent+room pending entries
In `scheduleInvocation`, before adding a new queue entry, check `pendingQueue.find(e => e.agentName === agentName && e.roomId === roomId)`. If found, append the new trigger content with `\n\n` separator instead of adding a new entry. Applied in both the inFlight-lock path and the concurrency-cap path. Prevents N sequential runs when N messages arrive for a busy agent.

### Issue #29: git diff stat injected into agent system prompt
`getGitDiffStat()` runs `Bun.spawnSync(['git', 'diff', '--stat', 'HEAD~3'])` synchronously. Output capped at 50 lines. Injected as a `RECENT CODE CHANGES` section in `buildSystemPrompt` just before the SECURITY section. Non-fatal — empty string returned on any error.

### contextWindow 0% fallback: infer from model name
`inferContextWindow(modelUsage)` in `stream-parser.ts`: iterates modelUsage keys, matches 'opus' → 1_000_000, 'sonnet'/'haiku' → 200_000. Called in `parseResultEvent` when rawContextWindow is 0.

### Issue #25 closed
`gh issue close 25 --comment "Implemented: human messages use unshift for queue priority"`

---

## Session 7 ws.ts hardening — 2026-03-19

### FIX 1: Remove log() wrapper — structured logger throughout
Deleted `function log(...)` shim. All call sites replaced with `logger.warn/info/debug({ key: val }, 'msg')` structured form. No more string concatenation.

### FIX 2: @everyone — clearQueue/pauseInvocations moved AFTER stop-directive check
`clearQueue` and `pauseInvocations` now run ONLY inside `if (isStopDirective)`, not before the check. Previously ran unconditionally on any `@everyone` message.

### FIX 3: @everyone + @mention — non-stop @everyone still processes individual mentions
Removed the blanket `mentions = new Set()` when `everyoneProcessed` is true for non-stop directives. Variable renamed to `everyonePresent`. Mentions are skipped only because `@everyone` already called `invokeAgents` for all active agents — double-invoke for specific agents in the message is still avoided.

### FIX 4: ?? 'user' fallback replaced with error log + early return
`connStates.get(connId)?.name ?? 'user'` in `send_message` and `invoke_agent` replaced with:
```ts
const connState = connStates.get(connId);
if (!connState) {
  logger.error({ connId, roomId }, 'WS send_message: connState missing for active connId — closing');
  ws.close();
  return;
}
const authorName = connState.name;
```
Same pattern for `invoke_agent` using `invokeConnState`.

### FIX 5: SQLite error handling — try/catch around insertMessage
All three `insertMessage` calls (send_message user msg, @everyone system directive, invoke_agent user msg) wrapped in `try/catch`. On failure: `logger.error`, send `{ type: 'error', code: 'DB_ERROR' }` WS message, then `return` (or `break` for directive).

### FIX 6: WS upgrade rate limit — global counter, 50 upgrades/second
Implemented as a `createTokenBucket(50, 1_000)` IIFE-wrapped function. Called `checkUpgradeRateLimit()` at the top of `open()`, after origin check, before room/token checks. On failure: send `UPGRADE_RATE_LIMIT` error + close.

### FIX 7: resolvedName alias removed
`const resolvedName = tokenName` line removed. `tokenName` used directly throughout `open()`.

### rate-limiter.ts — shared factory extracted
`createTokenBucket(max, windowMs)` exported from `services/rate-limiter.ts`. Used by `ws.ts` for both per-connection (5/10s) and upgrade (50/1s) limits. The per-connection bucket is now closure-managed — `buckets.delete(connId)` in `close()` removed (not needed).

### getReservedAgentNames() — single source of truth
`export function getReservedAgentNames(): ReadonlySet<string>` added to `auth-tokens.ts`. `ws.ts` imports and uses it instead of duplicating the set construction with `AGENT_BY_NAME`. `AGENT_BY_NAME` import removed from `ws.ts`.

---

## Session 9 Prettier + tsc setup — 2026-03-19

### Prettier setup
- Install at workspace root: `cd chatroom && bun add -d prettier`
- `.prettierrc` in `apps/backend/`: `{ "singleQuote": true, "trailingComma": "all", "printWidth": 120, "semi": true }`
- `.prettierignore`: `node_modules`, `dist`, `data`, `*.db`
- Scripts in `package.json`: `"format": "prettier --write src/"`, `"format:check": "prettier --check src/"`
- Run format first, then fix tsc, then rerun format:check to verify clean

### tsc error categories in this codebase (noUncheckedIndexedAccess + strict)
1. **Array index access `arr[n]`** → `arr[n]!` in test files (all access after `.length` guard)
2. **RegExpMatchArray capture groups** → `match[1]!` after `if (!match) return` guard
3. **Map spread from destructuring** → `const [first] = arr.splice(idx, 1); if (!first) return;`
4. **`AgentState` enum** — all status comparisons and assignments must use `AgentState.Thinking` etc., not string literals. Tests that use `toBe('thinking')` must use `AgentState.Thinking`
5. **`MessageMetadata` extension** — add new fields to shared protocol.ts when agent-invoker adds metrics
6. **Bun.spawn stderr** — type is `undefined` at compile time when spawn options have conditional spread; cast via `proc.stderr as unknown as ReadableStream<Uint8Array>`
7. **Map key type** — `ws.id` in Elysia ws handlers is `string`, not `number` — Map type must match

### AgentState enum usage
`AgentState` is exported from `@agent-chatroom/shared`. Import as: `import { AgentState } from '@agent-chatroom/shared'`
Values: `.Idle`, `.Thinking`, `.ToolUse`, `.Done`, `.Out`, `.Error`

---

## Session 8 agent-invoker.ts targeted fixes — 2026-03-19

### FIX 1: sanitizePromptContent — NFKC + zero-width strip
Replaced manual Unicode bracket list (`[\uFF3B\u27E6...]`) with:
```ts
.normalize('NFKC')
.replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
```
NFKC covers a far wider homoglyph surface in one pass. Zero-width chars (ZWSP/ZWNJ/ZWJ/BOM) stripped immediately after.

### FIX 2: Rate-limit retry starvation — release inFlight before 12s wait
In the rate-limit branch of `spawnAndParse`:
- Delete from `inFlight` and `activeInvocations` immediately (before `setTimeout`)
- Call `drainQueue()` to unblock waiting agents
- `setTimeout` calls `scheduleInvocation` which re-acquires the lock when it runs
- Return `false` (not `true`) — the lock was already released; `runInvocation` must clean up normally
- **Why:** Without this, `inFlight` held the key for 12s, starving any queued work for that agent+room.

### FIX 3: Remove log() wrapper
Deleted `function log(...args: unknown[])` shim. All 20 call sites replaced with `logger.debug/info/warn/error({ structured }, 'msg')`. Errors use `logger.error`, timeouts and stale sessions use `logger.warn`, normal flow uses `logger.debug`.

### FIX 4: buildPrompt inside try/catch
Moved `buildPrompt` and `buildSystemPrompt` calls inside the existing `try/catch` block in `doInvoke`. DB errors or sanitization failures are now caught and surfaced as agent error messages instead of uncaught rejections.

### FIX 5: Double getAgentConfig() at upsertAgentSession
`model: getAgentConfig(agentName)?.model ?? 'unknown'` → `model,`
The `model` parameter is already in scope (passed from `doInvoke` via `agentConfig.model`).

### FIX 6: Agent response size cap before DB insert
```ts
const MAX_AGENT_RESPONSE_BYTES = 256_000;
// ... before insertMessage:
const responseByteLength = Buffer.byteLength(resultText, 'utf8');
if (responseByteLength > MAX_AGENT_RESPONSE_BYTES) {
  logger.warn({ agentName, roomId, byteLength: responseByteLength }, 'agent response exceeds size cap — truncating');
  resultText = resultText.slice(0, MAX_AGENT_RESPONSE_BYTES) + '\n[...truncated]';
}
```
Applied AFTER the SKIP check, BEFORE `insertMessage`. Truncation logged as warn.

---

## Session 10: ws.ts split into 4 modules — 2026-03-19

Original `ws.ts` (628 LOC) split into 4 files, each under 300 LOC:

| File | LOC | Responsibility |
|---|---|---|
| `ws-state.ts` | 112 | ALLOWED_ORIGINS, rate-limiter instances, connection Maps, helpers (getConnectedUsers, resolveConnectionName, nextConnId), WsData type |
| `ws-message-handlers.ts` | 227 | handleSendMessage, handleInvokeAgent, handleLoadHistory + private handleEveryoneDirective + sendError helper |
| `ws-handlers.ts` | 246 | open(), message() dispatcher, close() — imports state + message handlers |
| `ws.ts` | 26 | Elysia route definition only; re-exports EVERYONE_PATTERN and MAX_CONNECTIONS_PER_ROOM for consumers |

### Key decisions
- `logger` exported from `ws-state.ts` (not `createLogger` re-called per module) — shared structured logger instance
- Handler functions use flat positional args (not object bags) to keep call sites compact
- `sendError(ws, message, code)` private helper in ws-message-handlers.ts reduces repetitive `JSON.stringify` boilerplate
- Test that reads ws.ts source and checks for `ALLOWED_ORIGINS.has(origin)` updated to read `ws-handlers.ts` instead

### Test update needed when splitting WS route
Any test that reads the source file path `../../src/routes/ws.ts` to verify logic strings must be updated to the module where that logic now lives.

---

## Session 11: agent-invoker.ts split into 4 modules — 2026-03-19

Original `agent-invoker.ts` (1181 LOC) split into 4 files:

| File | LOC | Responsibility |
|---|---|---|
| `agent-prompt.ts` | 333 | validateSessionId, sanitizePromptContent, buildPrompt, buildSystemPrompt, formatToolDescription, getGitDiffStat, RESPAWN constants, CONTEXT_OVERFLOW_SIGNAL |
| `agent-runner.ts` | 596 | doInvoke, spawnAndParse, postSystemMessage, updateStatusAndBroadcast |
| `agent-scheduler.ts` | 327 | InvocationContext type, invokeAgents, invokeAgent, scheduleInvocation, runInvocation, drainQueue, drainActiveInvocations, pauseInvocations, resumeInvocations, isPaused, clearQueue, inFlight, activeInvocations |
| `agent-invoker.ts` | 56 | Thin facade — re-exports everything for backward compat |

### Circular import resolution — dynamic imports
scheduler ← runner is the problematic direction (scheduler calls runner for doInvoke and postSystemMessage; runner calls scheduler for scheduleInvocation, invokeAgents, inFlight, activeInvocations, drainQueue).

Solution:
- Static import direction: runner → prompt only (clean)
- scheduler uses `import('./agent-runner.js')` dynamic inside `runInvocation` and `postSystemMessageAsync`
- runner uses `import('./agent-scheduler.js')` dynamic for stale-session retry, rate-limit path, and agent chaining
- `import type { InvocationContext }` in runner is type-only — erased at runtime, safe to keep static

### Test update pattern (same as ws.ts split)
Tests that read source file path `../../src/services/agent-invoker.ts` to verify literal strings (e.g., `[PRIOR AGENT OUTPUT]`) must be updated to read `../../src/services/agent-prompt.ts` — that is where the prompt builder strings now live.
