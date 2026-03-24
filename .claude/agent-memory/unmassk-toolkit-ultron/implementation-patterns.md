---
name: implementation-patterns
description: Key patterns for chatroom backend WS handlers, process tracking, and protocol extension
type: project
---

## Bun.spawn type alias pattern (2026-03-23)

`Bun.SpawnOptions.Readable` is a union type (string | BunFile | ...), NOT an object/interface.
A TypeScript `interface` cannot `extends` a union type — TS2312.

**Wrong:**
```ts
interface BunSpawnOptionsWithDetached extends Bun.SpawnOptions.Readable { detached?: boolean; }
```

**Correct:** use `type` alias with `Bun.Spawn.SpawnOptions<In, Out, Err>` (which IS an interface extending BaseOptions):
```ts
type BunSpawnOptionsWithDetached = Bun.Spawn.SpawnOptions<"ignore", "pipe", "pipe"> & { detached?: boolean };
```

Note: `detached` is already in `BaseOptions` in bun-types 1.3.11, so the `& { detached?: boolean }` is redundant but harmless. The generic type params pin stdout/stderr to "pipe" so callers get the right ReadableStream types.

## Extending the WS protocol (Issue #24, 2026-03-21)

Adding new client message types requires 4 coordinated changes:

1. **`packages/shared/src/protocol.ts`** — add interface + extend `ClientMessage` union
2. **`packages/shared/src/schemas.ts`** — add Zod schema + extend `ClientMessageSchema` discriminated union
3. **`apps/backend/src/routes/ws-message-handlers.ts`** — add handler function + import new scheduler fns
4. **`apps/backend/src/routes/ws-handlers.ts`** — add case to switch; `parseAndValidate` must return `ClientMessage | null` (not `ReturnType<...> | null`) for tsc narrowing to work in the switch

### parseAndValidate return type fix
The switch `msg.type` narrowing works only when `msg` is typed as `ClientMessage` (the union).
`ReturnType<typeof ClientMessageSchema.safeParse>` includes the failed parse case where `data` is undefined — tsc can't narrow through it.
Pattern: return `result.data as ClientMessage` from `parseAndValidate`, typed as `ClientMessage | null`.

## Active subprocess registry (Issue #24, 2026-03-21)

`agent-queue.ts` exports `activeProcesses: Map<string, ActiveProcess>` keyed by `"${agentName}:${roomId}"`.
`agent-runner.ts` registers after `Bun.spawn` and removes after `readAgentStream` completes.
`agent-scheduler.ts` reads from `activeProcesses` in `killAgent()` to send SIGTERM.

Kill pattern:
```ts
// Unix: kill the entire process group (detached subprocess)
process.kill(-(proc.pid as number), 'SIGTERM');
// fallback:
proc.kill();
```

## Per-agent pause (Issue #24, 2026-03-21)

`_pausedAgents: Set<string>` in `agent-scheduler.ts` — keyed as `"${agentName}:${roomId}"`.
`pauseAgent/resumeAgent/isAgentPaused` exported from `agent-scheduler.ts` and re-exported via `agent-invoker.ts` facade.
`scheduleInvocation` checks `_pausedAgents` immediately after the room-level `_pausedRooms` check.

---

## Elysia WS upgrade context

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

### Issue #31: Queue merge for same-agent+room pending entries — tryMergeOrEnqueue
In `scheduleInvocation`, both the inFlight-lock path and the concurrency-cap path call the shared helper `tryMergeOrEnqueue(roomId, agentName, context, isRetry, priority, mergedLogMsg, mergedSysMsg, enqueuedSysMsg)`. The helper merges into an existing pending entry (appending triggerContent with `\n\n`) or enqueues a new entry. Callers pass distinct log/system message strings to preserve per-branch observability. Return type is `void` — caller always returns after calling it. Prevents N sequential runs when N messages arrive for a busy agent.

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
| `agent-scheduler.ts` | 299 | InvocationContext type, invokeAgents, invokeAgent, scheduleInvocation, tryMergeOrEnqueue, runInvocation, drainQueue, drainActiveInvocations, pauseInvocations, resumeInvocations, isPaused, clearQueue, inFlight, activeInvocations |
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

---

## Session 12: agent-prompt.ts — buildSystemPrompt split (2026-03-19)

`buildSystemPrompt` (95 LOC) split into three private sub-builders + a thin assembler:

| Function | Type | LOC | Responsibility |
|---|---|---|---|
| `buildIdentityBlock(name, role, isRespawn)` | private | 21 | Respawn notice block + identity line; strips U+2550 from inputs |
| `buildChatroomRules()` | private | 56 | @mention rules, silence, courtesy, human-priority, anti-spam |
| `buildSecurityRules()` | private | 24 | Git diff stat injection (Issue #29) + SECURITY block |
| `buildSystemPrompt(name, role, isRespawn)` | export | 8 | Assembler: spreads all three sub-builders |

### Key decisions
- `buildChatroomRules` is 56 LOC (over the ≤30 helper guideline) but is purely string literals — no logic to compress without arbitrary splits.
- `buildIdentityBlock` returns `string[]`, not `string` — callers spread it. Same pattern as respawnNotice array in the original.
- File target: <300 LOC. Final: 294 LOC.
- Golden tests: 114 assertions, all pass before and after.

---

## Session 13: ws-handlers.ts + ws-message-handlers.ts sub-function extraction — 2026-03-19

### ws-handlers.ts: open() decomposition

`open()` (110 LOC) → 4 helpers + 1 thin exported assembler:

| Function | Type | LOC | Responsibility |
|---|---|---|---|
| `rejectUpgrade(ws, logCtx, logMsg, msg?, code?)` | private helper | 6 | Shared close+log+send pattern for all upgrade rejections |
| `validateUpgrade(ws, roomId)` | private helper | 14 | Origin, rate limit, room cap, token checks — returns tokenName or null |
| `registerConnection(ws, roomId, tokenName)` | private helper | 24 | Assigns connId, updates state maps, subscribes to topic, broadcasts user list |
| `sendInitialState(ws, roomId)` | private helper | 26 | Fetches room/messages/agents, sends room_state; closes on ROOM_NOT_FOUND |
| `open(ws)` | **exported** | 9 | Assembler: calls validateUpgrade → registerConnection → sendInitialState |

`message()` (63 LOC) → 1 helper + thin dispatcher:

| Function | Type | LOC | Responsibility |
|---|---|---|---|
| `parseAndValidate(ws, rawMessage)` | private helper | 17 | JSON parse + Zod schema validation, sends errors, returns result or null |
| `message(ws, rawMessage)` | **exported** | 27 | Rate limit check → parseAndValidate → switch dispatch to handlers |

### ws-message-handlers.ts: handleEveryoneDirective decomposition

`handleEveryoneDirective` (64 LOC) → 1 extracted helper + compressed body:

| Function | Type | LOC | Responsibility |
|---|---|---|---|
| `insertAndBroadcastDirective(ws, roomId, safeDirective)` | private helper | 16 | Insert system directive to DB + broadcast to room; returns false on DB error |
| `handleEveryoneDirective(ws, roomId, content, authorName)` | private helper | 26 | Extract directive, check stop words, sanitize, delegate to insertAndBroadcastDirective, invoke agents |

### LOC summary (all within targets)

| Function | Type | LOC | Limit | Status |
|---|---|---|---|---|
| rejectUpgrade | helper | 6 | ≤30 | ✓ |
| validateUpgrade | helper | 14 | ≤30 | ✓ |
| registerConnection | helper | 24 | ≤30 | ✓ |
| sendInitialState | helper | 26 | ≤30 | ✓ |
| open | exported | 9 | ≤50 | ✓ |
| parseAndValidate | helper | 17 | ≤30 | ✓ |
| message | exported | 27 | ≤50 | ✓ |
| close | exported | 26 | ≤50 | ✓ |
| sendError | helper | 2 | ≤30 | ✓ |
| insertAndBroadcastDirective | helper | 16 | ≤30 | ✓ |
| handleEveryoneDirective | helper | 26 | ≤30 | ✓ |
| handleSendMessage | exported | 43 | ≤50 | ✓ |
| handleInvokeAgent | exported | 37 | ≤50 | ✓ |
| handleLoadHistory | exported | 13 | ≤50 | ✓ |

### Pattern: rejectUpgrade helper for guard clauses with close+log+send
When a function has 3+ guard clauses that all: (1) log warn, (2) optionally send error payload, (3) close socket and return null — extract a `rejectXxx(ws, logCtx, logMsg, msg?, code?)` helper. The optional msg+code params handle cases where no error payload is sent (e.g. bad origin just closes silently).

---

## Session 14: agent-runner.ts refactor — extract agent-stream.ts (2026-03-19)

`agent-runner.ts` (596 LOC) reduced to 259 LOC by extracting `agent-stream.ts` (385 LOC).

| Function | File | Type | LOC |
|---|---|---|---|
| `readAgentStream` | agent-stream.ts | export | 43 |
| `handleAgentResult` | agent-stream.ts | export | 25 |
| `readStderr` | agent-stream.ts | private | 14 |
| `processStreamLine` | agent-stream.ts | private | 29 |
| `applyResultEvent` | agent-stream.ts | private | 25 |
| `handleFailedResult` | agent-stream.ts | private | 30 |
| `handleEmptyResult` | agent-stream.ts | private | 29 |
| `persistAndBroadcast` | agent-stream.ts | private | 22 |
| `maybeTruncate` | agent-stream.ts | private | 7 |
| `buildAgentMessage` | agent-stream.ts | private | 23 |
| `scheduleChainMentions` | agent-stream.ts | private | 23 |
| `doInvoke` | agent-runner.ts | export | 48 |
| `spawnAndParse` | agent-runner.ts | export | 31 |
| `buildSpawnArgs` | agent-runner.ts | private | 21 |
| `makeTimeoutHandle` | agent-runner.ts | private | 18 |
| `postSystemMessage` | agent-runner.ts | export | 30 |
| `updateStatusAndBroadcast` | agent-runner.ts | export | 15 |

### Key extraction decisions
- `agent-stream.ts` imports `postSystemMessage` and `updateStatusAndBroadcast` from `agent-runner.ts` statically (no circular issue — stream is downstream of runner helpers)
- `spawnAndParse` reduced to: build args → spawn → make timeout → readAgentStream → handleAgentResult
- The `AgentStreamResult` interface carries all stdout parsed data; stderr piped into it via `readStderr` helper
- `lastToolBroadcastTime` state captured via closure setter `setTime` to avoid mutation across function call boundary
- awk LOC counts include function signature lines — "≤50 exported / ≤30 helper" measured from `function` keyword line through closing `}`

---

## Session 15: agent-runner/scheduler/stream cleanup — 2026-03-19

### Change 1: Merge duplicate db/queries.js imports in agent-runner.ts
`updateAgentStatus, getAgentSession` and `insertMessage` were two separate import lines from the same path. Merged into one: `import { updateAgentStatus, getAgentSession, insertMessage } from '../db/queries.js'`.

### Change 2: SpawnAndParseOptions interface (8-param to options object)
`spawnAndParse` replaced positional 8-arg signature with `opts: SpawnAndParseOptions`. Interface exported from agent-runner.ts. Call site in `doInvoke` uses object literal `{ roomId, agentName, model: agentConfig.model, ... }`. Destructure at top of function body.

### Change 3: agent-queue.ts extraction (scheduler LOC: 349 to 294)
Extracted `InvocationContext`, `QueueEntry`, `activeInvocations`, `inFlight`, `pendingQueue`, `MAX_QUEUE_SIZE`, `MAX_TRIGGER_CONTENT_BYTES`, `enqueue` into `agent-queue.ts`. Also imports and re-exports `MAX_CONCURRENT_AGENTS` from config. agent-scheduler.ts imports from agent-queue.ts and re-exports `activeInvocations`, `inFlight`, `InvocationContext` for backward compat.

### Change 4: sanitizePromptContent before insertMessage in handleInvokeAgent
`const safePrompt = sanitizePromptContent(prompt)` computed BEFORE `insertMessage` call. Both `insertMessage` content and `invokeAgent` call use `safePrompt`. Prevents injection from reaching DB.

### Change 5: sanitize error text before postSystemMessage
In `doInvoke` catch block: `sanitizePromptContent(err.message)` applied before posting. In `handleFailedResult`: `sanitizePromptContent(sr.resultText || ...)` applied to errorMsg.

### Change 6: resolveConnectionName removed from ws-state.ts (dead code)
Function was defined but never imported from production code. Tests had their own inline copy. NAME_RE constant (only used by the dead function) also removed. RESERVED_AGENT_NAMES export kept.

### Change 7: agent-registry.ts line 63 intentional non-use comment
Added `// NOTE: frontmatter 'model' is parsed but intentionally NOT used...` before the `if (key === 'model')` line. Edit tool failed to match; used Python string replace as workaround (Windows path issue with /c/Users/ vs C:/Users/).

### Change 8: JSDoc on AgentStreamResult, readAgentStream, handleAgentResult
Added property-level `@property` JSDoc on `AgentStreamResult` interface. Added `@param`/`@returns` to `readAgentStream` and `handleAgentResult`.

### Lesson: Edit tool path format on Windows
Edit tool requires Windows-style absolute paths (`C:\Users\...`). The `/c/Users/...` bash form causes "string not found" failures. If Edit fails with no error but string is visually correct, switch to the Windows path form.

---

## Session 17: Cerberus + Argus audit fixes — 2026-03-21

### killAgent: inFlight.delete + JSDoc fix (SEC-CRIT-002 + T2-02)
`killAgent` in `agent-scheduler.ts` now calls `inFlight.delete(key)` and `activeProcesses.delete(key)` BEFORE sending SIGTERM.
This releases the scheduler slot immediately so `drainQueue` can unblock waiting agents without waiting for the process to die.
JSDoc updated: removed incorrect "removes the in-flight lock" description; it now reads "releases the in-flight scheduler slot immediately".
The `proc.pid !== undefined` guard was already in place but is now documented with a SEC-CRIT-002 comment.

### drainQueue: respects _pausedAgents (T2-01)
`drainQueue` now skips entries where `_pausedRooms.has(e.roomId)` or `isAgentPaused(e.agentName, e.roomId)`.
Previously only skipped entries already in-flight — a paused agent's queued entries could sneak through when a concurrency slot opened.

### ws-control-handlers.ts extraction (T2-03)
`handleKillAgent`, `handlePauseAgent`, `handleResumeAgent`, `handleReadChat` extracted from `ws-message-handlers.ts` into new `ws-control-handlers.ts`.
ws-handlers.ts imports from both files now.
ws-message-handlers.ts: 403 → 241 LOC. ws-control-handlers.ts: 225 LOC.

### insertAndBroadcastReadChat helper (T2-04)
DB insert + broadcast in `handleReadChat` extracted to private helper `insertAndBroadcastReadChat(ws, roomId, agentName, messageCount): boolean`.
Follows the same pattern as `insertAndBroadcastDirective` in ws-message-handlers.ts.

### SEC-HIGH-002: sanitize msg.author in read_chat transcript
Transcript builder in `handleReadChat` now applies `sanitizePromptContent(msg.author)` in addition to `msg.content`.
Both are user-supplied and can carry trust-boundary delimiters.

### SEC-MED-002: No Out broadcast when killAgent returns false
`handleKillAgent` now returns early if `killAgent()` returns false (agent not running).
No spurious `AgentState.Out` broadcast when there is no active process.

### T1: ParticipantItem.tsx — Pause button toggles to Resume
`ParticipantItem.tsx` now uses `useState(false)` for `isPaused` local state.
`handlePauseOrResume` callback sends `pause_agent` when not paused, `resume_agent` when paused, and flips the local flag.
Button `aria-label` toggles between "Pause" and "Resume". Icon shows two bars (pause) or a right triangle (resume).

## Session 16: agent-stream/result/prompt/scheduler/utils cleanup — 2026-03-19

### Change 1: handleFailedResult + handleEmptyResult moved to agent-result.ts
Previously private in `agent-stream.ts`. Now exported from `agent-result.ts`. agent-stream.ts imports and delegates. Both functions required adding `clearAgentSession` and `CONTEXT_OVERFLOW_SIGNAL` imports to agent-result.ts. Removed now-unused imports from agent-stream.ts: `clearAgentSession`, `AGENT_TIMEOUT_MS`, `postSystemMessage`.

### Change 2: buildChatroomRules refactored — const arrays + spread
Extracted rule strings into 4 named `const` arrays: `MENTION_RULES`, `SILENCE_RULES`, `COURTESY_RULES`, `ANTI_SPAM_RULES`. `buildChatroomRules()` now returns `[...MENTION_RULES, ...SILENCE_RULES, ...COURTESY_RULES, ...ANTI_SPAM_RULES]` — 3 lines.

### Change 3: tryMergeOrEnqueue — canMerge inline const + signature compaction
Size-cap check extracted to `const canMerge = merged.length <= MAX_TRIGGER_CONTENT_BYTES`. Signature params compacted from 9-lines to 4-lines. Result: 26 lines total (≤30).

### Change 4: JSDoc @param/@returns on agent-result.ts functions
Added to: `maybeTruncate`, `buildAgentMessage`, `scheduleChainMentions`, `persistAndBroadcast`, `handleFailedResult`, `handleEmptyResult`.

### Change 5: JSDoc @param/@returns on agent-prompt.ts functions
Added to: `validateSessionId`, `sanitizePromptContent`, `buildPrompt`, `getGitDiffStat`, `formatToolDescription`.

### Change 6: JSON.parse in utils.ts mapMessageRow wrapped in try/catch
`JSON.parse(row.metadata || '{}')` → try/catch IIFE returning `{}` on parse failure + `logger.warn`. Required adding `import { createLogger }` and `const logger = createLogger('utils')`.

### Change 7: maybeTruncate — Buffer-safe truncation
`text.slice(0, MAX_AGENT_RESPONSE_BYTES)` → `Buffer.from(text).subarray(0, MAX_AGENT_RESPONSE_BYTES).toString('utf-8')`. Handles multi-byte UTF-8 chars safely — decoder skips incomplete trailing sequences.

## Infinite scroll — IntersectionObserver + scroll position preservation (2026-03-24)

In `MessageList.tsx`, the pattern for loading older messages on scroll-to-top:

1. **Sentinel div** at the very top of the scroll container (zero-height, zero-margin `<div ref={sentinelRef} />`).
2. **IntersectionObserver** with `root: containerRef.current` observes the sentinel. When it enters view, call `loadHistory()`.
3. **loadHistory** — guarded by `hasMoreHistory && !isLoadingHistory`. Captures `scrollHeight` into a ref (`prevScrollHeightRef`) BEFORE sending the WS message. Calls `setLoadingHistory(true)` then `send({ type: 'load_history', before: firstMessage.id, limit: 50 })`.
4. **Scroll restoration** — in the `useEffect` that fires on `messages.length` change: if `prevScrollHeightRef.current !== null` (meaning a prepend just happened), compute `delta = el.scrollHeight - prevScrollHeight` and set `el.scrollTop += delta`. Clear the ref after adjusting.
5. **Loading spinner** — `{isLoadingHistory && <div className="history-loader"><Loader2 className="history-loader-icon" /></div>}` between sentinel and messages. CSS: `@keyframes spin { from rotate(0) to rotate(360deg) }`, applied via `.history-loader-icon { animation: spin 1s linear infinite }`.
6. **Observer recreation guard** — `loadHistory` wrapped in `useCallback` with deps `[hasMoreHistory, isLoadingHistory, messages, send, setLoadingHistory]`. The `useEffect` for the observer depends on `[loadHistory]` so the observer is re-registered when deps change. This is intentional — avoids stale closure capturing old `hasMoreHistory`.

The `prependHistory` store action already sets `isLoadingHistory: false` — no manual reset needed after WS response. The `history_page` WS case in `ws-store.ts` calls `chatStore.prependHistory()` which handles both prepend and flag reset in one atomic store update.

## truncatePath helper in agent-prompt.ts (2026-03-21)

`truncatePath(path, maxLen=60)` lives just above `formatToolDescription` in `agent-prompt.ts`.
Logic: if path ≤ maxLen return as-is; otherwise slice the last maxLen chars, find first `/` in
that slice (if any) to cut at a clean segment boundary, prepend `…` (U+2026).
Applied only to `file_path` and `path` branches — `pattern` and `command` branches untouched.
Golden tests use short paths (< 60 chars) so they pass through unchanged — no test updates needed.
