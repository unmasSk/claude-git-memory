---
name: chatroom-bridge-patterns
description: Implementation patterns for claude-bridge.ts — the Bun WS+HTTP bridge connecting Claude CLI to the Agent Chatroom
type: project
---

## Location
`chatroom/apps/bridge/claude-bridge.ts` — single file, no package.json, no dependencies on @agent-chatroom/shared.

## Architecture
```
Claude CLI  <->  HTTP 127.0.0.1:3002  <->  WS 127.0.0.1:3001/ws/default?name=claude
                 (claude-bridge.ts)         (chatroom backend)
```

## Key design decisions

### Inline types
The bridge does NOT import from `@agent-chatroom/shared` to stay a single portable file.
Types are inlined verbatim from protocol.ts. Keep them in sync if protocol.ts changes.

### Singleton guard
At startup, `fetch("http://127.0.0.1:3002/health")` — if HTTP 200 is returned, another bridge is running, exit(1).
Uses `AbortSignal.timeout(1000)` to avoid hanging.

### Token generation
`crypto.getRandomValues(new Uint8Array(32))` → hex string. Printed to stdout as `BRIDGE_TOKEN=<hex>` if env var not set.
Auth header: `Authorization: Bearer <token>` — checked on every request including /health.

### WS reconnect
Exponential backoff: `Math.min(1000 * 2^attempt, 30000)`. Max 20 attempts.
Counter resets on `onopen`. Pending timer is cleared on graceful shutdown.
On reconnect, the old socket's `onclose` is nulled before closing to prevent recursive schedule.

### Ring buffer
`ringBuffer: Message[]` — plain array, `shift()` when over 200.
`tool_event` server messages are converted to synthetic `Message` objects (msgType='tool_use').
`room_state` seeds the buffer by clearing and pushing the last 200 messages.

### GET /messages?since=<id>
Scans buffer with `findIndex(m => m.id === since)` — O(n) but buffer is max 200 items.
Returns everything after the found index. Falls back to last 20 if id not found.

### Graceful shutdown
`process.on('SIGTERM'/'SIGINT', shutdown)`. Nulls WS handlers before closing to avoid reconnect loop.
Calls `server.stop()` on the Bun.serve instance.

## Dev script integration
Added to `chatroom/package.json`:
- `dev` script: now starts backend + frontend + bridge with concurrently (3 panes, yellow for bridge)
- `dev:bridge`: `cd apps/bridge && bun run claude-bridge.ts`

## windowsHide / detached fix (2026-03-18)
In `chatroom/apps/backend/src/services/agent-invoker.ts`:
- On Windows: `detached: true` was causing a new console window for every agent spawn. Fix: conditionally omit `detached` on Windows.
- Pattern: `...(process.platform !== 'win32' ? { detached: true } : {})`
- On Windows, kill is direct: `proc.kill()`. On Unix, kill is process-group: `process.kill(-(proc.pid), 'SIGTERM')`.
- `windowsHide: true` remains for both platforms.

## Singleton check must send auth token (DECEPTION-002, 2026-03-18)
The `/health` probe at startup must include `Authorization: Bearer ${BRIDGE_TOKEN}` — without it, the probe always gets 401 and the singleton guard never triggers. Pattern: always auth the probe.

## Token to stderr (SEC-HIGH-002, 2026-03-18)
`BRIDGE_TOKEN=...` must be printed to `console.error` (stderr), not `console.log` (stdout). Stdout may be captured by callers expecting structured output.

## Timing-safe auth (SEC-HIGH-001, 2026-03-18)
`checkAuth` uses `timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))` from `node:crypto`. Length check first to avoid timing oracle on mismatched lengths.
