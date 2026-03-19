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

### RACE-002: retryScheduled flag prevents double-delete in stale session retry
`InvocationContext.retryScheduled?: boolean` — set to `true` before calling `scheduleInvocation` in the stale session path.
The `.finally()` in `runInvocation` checks `!context.retryScheduled` before deleting from `inFlight`/`activeInvocations`.
Without this, the outer finally would delete the entry that the retry had just added.

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
