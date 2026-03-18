---
name: chatroom-frontend-patterns
description: Patterns and lessons from Phase 5 polish of the Agent Chatroom frontend (React + Vite + Zustand + lucide-react)
type: project
---

## Scroll lock threshold
MessageList uses 50px from bottom as the auto-scroll lock threshold (plan-specified).
`setIsScrollLocked(distanceFromBottom > 50)` — re-enables automatically when user scrolls back to bottom.

## SystemMessage icon mapping
Icons from lucide-react selected by keyword scan of message content (lowercase):
- "joined" / "started" / "session" → LogIn
- "left" / "disconnected" → LogOut
- "error" / "failed" / "timeout" → AlertCircle
- "queued" / "queue" → Clock
- "stale" / "resume" / "reconnect" → RefreshCw
- default → Info

## CSS pulse animation
Already present in globals.css. No changes needed.
- `.status-thinking { animation: pulse 1.5s ease-in-out infinite; }`
- `.status-tool { animation: pulse 2s ease-in-out infinite; }`
- `@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }`

## .gitignore
Root chatroom/.gitignore covers all plan requirements: node_modules/, dist/, *.db, *.db-shm, *.db-wal, data/, .env.

## Build commands (from chatroom root)
- Backend start: `bun run --cwd apps/backend src/index.ts` — binds to 127.0.0.1:3001
- Frontend build: `bunx vite build` from apps/frontend — outputs to dist/
- All tests: `bun test` — 450 pass / 8 fail (pre-existing, Windows path + source-scan env issues) as of 2026-03-18

## user_list_update broadcast pattern (2026-03-18)
When a WS connection opens or closes, broadcast the updated user list to all room subscribers:
- In open(): after `ws.subscribe(topic)`, call `ws.publish(topic, userListJson)` AND `ws.send(userListJson)` (publish excludes sender)
- In close(): after cleaning up connStates/roomConns, call `ws.publish(topic, userListJson)` BEFORE `ws.unsubscribe()`
- Protocol type `ServerUserListUpdate` added to protocol.ts union and schemas.ts discriminatedUnion
- Frontend handles it in ws-store.ts `handleServerMessage` as `case 'user_list_update'`

## ParticipantPanel claude identity (2026-03-18)
- ConnectedUser with `name.toLowerCase() === 'claude'` renders: role='orchestrator', avatar class='av-claude', icon=Bot (not User)
- All other users: role='human', avatar class='av-user', icon=User
- React key uses `u.name + '-' + u.connectedAt` to avoid duplicate key collisions (multiple connections same name)

## T1 bug fixes applied (2026-03-17, by Cerberus review)
All three were already in the codebase when Ultron was invoked — fixes had been pre-applied:
- T1-01 (MessageInput.tsx): `submit` useCallback declared before `handleKeyDownWrapper` — TDZ resolved.
- T1-02 (api.ts): REST GET /rooms/:id/messages now chains `.map(safeMessage)` on both paginated paths.
- T1-03 (ws.ts): `invoke_agent` case now calls `broadcastSync()` with the trigger message before `invokeAgent()`.

## ws.test.ts source-scan test vs production code mismatch (known, pre-existing)
`ws.test.ts` line 693 expects `return new Response('Forbidden', { status: 403 })` in source.
Production code correctly uses `context.set.status = 403; return 'Forbidden'` (Elysia idiom).
This test fails when run in the full suite alongside other files — passes in isolation.
Root cause: bun test isolation issue with mock.module across files; both test files pass individually.
Do NOT change production ws.ts to match the test expectation — the Elysia pattern is correct.

## Lessons
- Memory writes must use `$GIT_ROOT` = `/Users/unmassk/Workspace/claude-toolkit`, not the cwd subdirectory.
  The cwd was `chatroom/apps/frontend` but git root is two levels up.
- When Cerberus reports T1 bugs and Ultron is invoked, always read the files first — fixes may already be applied.
- Transient test failures in `bun test` full run (closed DB, mock leakage between files) resolve on re-run.
  Confirm with a second run before investigating.
