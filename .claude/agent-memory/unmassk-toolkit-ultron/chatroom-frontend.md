---
name: chatroom-frontend-patterns
description: Patterns and lessons from the Agent Chatroom frontend (React + Vite + Zustand + lucide-react), through Phase 7 chat area redesign
type: project
---

## Room tab display name (2026-03-23)

Tab shows `getRepoName(room.cwd) ?? room.name`. `getRepoName` is a module-level helper in `Titlebar.tsx` — no `node:path` import, pure string split on `/` and `\`. The `Room` type (from `RoomSchema` in shared) has `cwd: string | null | undefined` (`.nullish()`). When `cwd` is set, the basename of the path is shown; otherwise falls back to the random adjective-animal name. Both the visible label (`#displayName`) and the `title` attribute use `displayName`.

## Bug fix — Claude agent card accent color (2026-03-21)

### Root cause
`--color-claude` CSS variable was missing from `tokens.css`. All Claude-related CSS classes (`.c-claude`, `.av-claude`, `.bg-claude`, `.te-claude`, `.mention-claude`) fell back to `--color-ultron` as a workaround. AgentCard.css had no `.card-wrap.agent-claude` rule, so `--ac` and `--agent-tint` were unset on Claude's card.

### Effect
Claude's card had no visible active-card tint (radial gradient used transparent fallback) and no border highlight on hover. The data flow (ws-store → agent-store → ParticipantPanel) was actually correct; the bug was purely visual.

### Fix
- Added `--color-claude: #A78BFA` to `tokens.css` `:root`
- Added `.card-wrap.agent-claude { --ac: var(--color-claude); --agent-tint: ... }` to `AgentCard.css`
- Updated all 6 Claude CSS entries in `globals.css` to use `--color-claude` instead of `--color-ultron`

### Lesson
When adding a new agent or special participant, ALWAYS add its `--color-{name}` variable to `tokens.css` AND its `.card-wrap.agent-{name}` rule to `AgentCard.css` at the same time. Missing the token causes silent fallback to an unrelated color.

## Phase 7 — Chat area redesign (2026-03-21)

### Message structure (new — no bubbles)
`MessageLine` renders `.msg` > `.msg-head` (`.msg-name` + `.msg-time`) + `.msg-text`.
Human messages (`authorType === 'human'`) get `.msg.human` (card style: bg-input, border #3d3d3d, border-radius 14px).
Agent name colored via `c-{agent}` class on `.msg-name`. Time in `.msg-time` (monospace, text-3).
`msg-text` is a block `<div>` — ReactMarkdown goes inside it.

### Tool events (new)
`ToolLine` renders `.tool-event.te-{agent}` > `.te-agent.c-{agent}` + `.te-arrow` + `.te-badge` + `.te-desc`.
Agent CSS classes (`te-ultron`, `te-cerberus`, etc.) in globals.css set `border-left-color`, `background`, and `.te-badge` color/bg via CSS — NO inline rgba.
`te-{agent}` classes cover 10 agents + `te-claude` + `te-default` fallback.

### System pills / invocations (new)
Invocation events (content matching `/invoc|invoked|started by|spawned/i`) render as `.tool-event.te-{agent}` with "invocado" badge — same visual as tool events.
Non-invocation system events keep the centered `.system-pill` / `.system-pill-inner` pill style.

### Thinking dots (new)
`ThinkingDots` component inside `MessageList` — rendered for agents with `AgentState.Thinking` from `agent-store`.
DOM: `.thinking` > `.t-name.c-{agent}` + `.t-dots` > 3 `<span>` elements with `backgroundColor: currentColor`.
`currentColor` picks up the `color` from `c-{agent}` class → no inline rgba needed.

### Scroll-to-bottom button (new)
Rendered conditionally in `MessageList` when `isScrollLocked === true`.
Uses `position: absolute` on `.chat` (which has `position: relative`), `bottom: 80px`, `left: 50%`, `transform: translateX(-50%)`.
`MessageList` renders `<>messages div + button</>` fragment — button is sibling of `.messages`, not inside it.

### Code blocks in ReactMarkdown (new)
Custom `pre` renderer → `MdCodeBlock` component with copy button (Copy/Check icons from lucide).
Copy uses `navigator.clipboard.writeText()` + 2s "copied" feedback state.
CSS class: `.msg-code-block` (border-radius 14px, bg-code), `.msg-code-copy` (top-right, opacity 0 → 1 on hover).

### Scroll mask at top of chat
`.chat` has `position: relative` + `::before` pseudo-element (height 16px, bg-chat, z-index 2) to fade edge.
In globals.css, not a separate component. The `.chat` div in `ChatArea.tsx` gets `position: relative` via CSS (no inline style needed).

### noUncheckedIndexedAccess and array indexing
Bun/TS strict config has `noUncheckedIndexedAccess` → `array[i]` returns `T | undefined`.
Fix: use non-null assertion `array[i]!` when you know the index is valid (guarded by while loop bounds check).
`extractAgent` regex match: use `match?.[1]?.toLowerCase() ?? null` instead of `match[1].toLowerCase()`.

## Phase 6 — CSS component migration (2026-03-21)

### Component CSS import convention
Each component imports its own CSS file at the top:
`import '../styles/components/Titlebar.css'` etc.
`globals.css` is imported only in `App.tsx`.

### Titlebar replaces TopBar
`Titlebar.tsx` (new) renders the macOS-style titlebar with traffic lights, room tab, and user info.
`TopBar.tsx` (old) is no longer used — App.tsx now imports Titlebar.
`TopBar.tsx` is kept in the repo but not referenced.

### ParticipantPanel sidebar migration
Old: `<div className="panel">` with `.section-label` and flat `.participant` list.
New: `<aside className="sidebar">` with `.sb-section` label and `.agent-list` scroll container.
No header — room info is now in the titlebar.

### ParticipantItem card grid layout
Old: flat `.participant` row with avatar + info columns.
New: `.card-wrap` > `.card-buttons` + `.card active-card/off-card` using CSS grid:
  - `.cell-name` (icon-role + name + model) — grid col 1 row 1
  - `.cell-bar` (bar-track/bar-fill) — grid col 1 row 2
  - `.cell-metrics` (role + model-badge) — grid col 1 row 3
  - `.cell-status` (icon-status, spans rows 1-4) — grid col 2
LucideIcon components accept `className` directly: `<Icon className="icon-role" />` — do NOT wrap in `<svg>`.
Agent accent color via `--ac` and `--agent-tint` inline CSS custom properties on `.card-wrap`.
AGENT_COLOR map lives in ParticipantItem.tsx (not exported) — 10 agent colors.

### MessageInput textarea + ChatInput.css
Old: `<input>` inside `.input-area`, single `send-btn`.
New: `.chat-input` > `.input-box` > `<textarea>` + `.input-bottom` row.
Bottom row: `.input-controls` (mode-badge mode-execute/mode-brainstorm) + `.input-icons` (Paperclip, Image, ArrowRight send).
Mode state is local (`useState<InputMode>`) — toggles execute/brainstorm on click.
`autoResize()` helper sets textarea height from scrollHeight on every change.
handleKeyDown: typed as `React.KeyboardEvent<HTMLInputElement>` (cast via `as unknown`) because `useMentionAutocomplete` signature uses input — works fine at runtime.

### StatusBar new classes
Old: `.statusbar-left` / `.statusbar-right` / `.statusbar-item`.
New: `.sb-left` / `.sb-right` / `.sb-item` (from Statusbar.css).
Git info uses `.sb-git` + `.sb-branch` + `.sb-git-stat`.
Agents count uses `.sb-agents` with `<span>` for the colored number.

### LucideIcon className pattern
Lucide v5 icons accept `className` and render their own `<svg>`.
The AgentCard.css targets `svg.icon-role` and `svg.icon-status` — these work because lucide renders an svg with whatever className you pass.
Never nest `<Icon>` inside a manually created `<svg>` — it would double-wrap.

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

## WS reconnection circuit breaker (2026-03-21)

### Problem solved
Cursor IDE RAM spike (2.27GB, 171% CPU) caused by unbounded WS reconnect storm when backend server stops.

### Root causes
1. Debounce (`CONNECT_DEBOUNCE_MS = 2000`) was incompatible with 100ms StrictMode delay in useWebSocket.ts — removed.
2. `reconnectAttempts` was reset in `onopen`, but Vite proxy fires phantom `onopen` events (accepts WS upgrade before backend connects) — reset defeats `MAX_RECONNECT_ATTEMPTS`.
3. No fetch timeout: `fetch('/api/auth/token')` hangs indefinitely when backend is unreachable without TCP RST.
4. No proxy timeouts in vite.config.ts.

### Fix implemented
- **Circuit breaker**: `consecutiveAuthFailures` module-level counter. Increments on every auth fetch failure. Resets ONLY on `room_state` message. After 3 failures (was 5): status = `'offline'`, stop reconnecting.
- **`lastKnownRoomId`**: module-level var saved when entering offline mode — because roomId is set to null on offline entry, `retryOffline()` uses this instead of `get().roomId`.
- **WsStatus** extended with `'offline'` value.
- **onopen** does NOT reset counters. Only `room_state` message resets both `reconnectAttempts` and `consecutiveAuthFailures`.
- **`disconnect()`** resets both counters and calls `clearHealthCheck()` (clean slate for fresh connect).
- **Fetch timeout**: `AbortSignal.any([signal, AbortSignal.timeout(5000)])` — 5s cap on auth fetch.
- **vite.config.ts**: `/api` proxy: `timeout: 5000, proxyTimeout: 5000`. `/ws` proxy: `timeout: 30000, proxyTimeout: 5000` — 30s socket timeout is safe for idle WS connections.

### Offline recovery (added 2026-03-21)
- **`retryOffline()`**: Zustand action. Resets `consecutiveAuthFailures = 0`, `reconnectAttempts = 0`, calls `clearHealthCheck()`, then calls `connect(lastKnownRoomId)`.
- **Health check**: `setInterval(10s)` started when entering offline mode. `fetch('/api/health', AbortSignal.timeout(3000))` — on 200, calls `retryOffline()`. Cleared in `disconnect()` and by `retryOffline()` before reconnecting.
- **Visibility listener**: `document.addEventListener('visibilitychange', ...)` at module level (outside React). Calls `retryOffline()` when tab becomes visible AND status is 'offline'. Guard: `typeof document !== 'undefined'`.
- **StatusBar Retry button**: When `status === 'offline'`, renders inline "Retry" text button calling `useWsStore.getState().retryOffline()`. CSS class `.sb-retry-btn`. Dot class `.statusbar-dot.offline` with `#ef4444` red.

### Key invariant
`consecutiveAuthFailures` is the primary circuit breaker. `reconnectAttempts` is the secondary (exponential backoff counter). Both are module-level (not Zustand state) — they survive Zustand store resets.

### Tests
Circuit breaker test updated to 3 failures. Test uses `vi.advanceTimersByTimeAsync(N)` instead of `vi.runAllTimersAsync()` to avoid infinite loop when health check setInterval is active.

### Test runner
Frontend tests: `npx vitest run` from `apps/frontend/` (NOT `bun test` — that calls vitest but vi.stubGlobal fails with bun's test runner). Run from `apps/frontend/`, not from chatroom root.

## AgentState.Paused — end-to-end pattern (2026-03-21)

### What was added
`Paused = 'paused'` added to `AgentState` enum in `packages/shared/src/constants.ts`.
Both `AgentStatusSchema` and `ServerAgentStatusSchema` in `schemas.ts` include `AgentState.Paused` in their enum arrays.

### Backend broadcast pattern
`handlePauseAgent()` calls `updateStatusAndBroadcast(agentName, roomId, AgentState.Paused)` after `pauseAgent()`.
`handleResumeAgent()` calls `updateStatusAndBroadcast(agentName, roomId, AgentState.Thinking)` after `resumeAgent()` — the real state arrives via the next `agent_status` event from the subprocess.

### Frontend visual state (ParticipantItem.tsx)
- `isPausedFromServer = agent.status === AgentState.Paused` (derived directly from server)
- `isActive` excludes Paused (only Thinking | ToolUse)
- `cardClass`: `active-card` when `isActive || isPausedFromServer` — tinted background but no animation
- Status icon cell: 3-way branch — neon-active (isActive) | static agent-colored (isPausedFromServer) | dim (off)
- Name: `opacity: 0.6` when paused (not dimmed to text-3 like neverInvoked)
- `useEffect` syncs `isPaused` local state: sets `true` on `Paused`, clears on `Thinking|ToolUse|Done`

### Button enabled states
- `playEnabled = isPaused || isPausedFromServer`
- `pauseEnabled = isActive && !isPaused`
- `stopEnabled = isActive || isPaused || isPausedFromServer`
- `chatEnabled = !isActive && !isPaused && !isPausedFromServer`

### Pre-existing test failures in shared package
4 tests fail before and after this change (content max 10000 vs 50000, and tool_event missing id field). Do not fix these unless asked.

## Build commands (from chatroom root)
- Backend start: `bun run --cwd apps/backend src/index.ts` — binds to 127.0.0.1:3001
- Frontend build: `bunx vite build` from apps/frontend — outputs to dist/
- All tests: `bun test` — 1140 pass / 0 fail as of 2026-03-21 (backend); shared: 72 pass / 4 fail (4 pre-existing)

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

## react-markdown in MessageLine (Issue #26, 2026-03-18)
`bun add react-markdown` (v10) in `apps/frontend`.
Custom components: `p` → `<span className="md-para">` (inline, not block), `code` → inline or block by `className` presence, `pre` → `<pre className="md-pre">`, `ul/ol/li` with md- prefixed classes.
Timestamp and author spans are NOT inside ReactMarkdown — only `msg-content` wraps it.
CSS classes: `.md-para`, `.md-code-inline`, `.md-pre`, `.md-code-block`, `.md-ul`, `.md-ol`, `.md-li` in globals.css.

## @mention highlighting in ReactMarkdown (2026-03-18)
`splitMentions(text)` was disconnected — MdParagraph was not calling it.
Fix: add `highlightMentionsInNode(node, keyPrefix)` that recursively walks React node tree:
- string leaf with `@` → calls `splitMentions(text)` → highlighted spans
- array → recurse each child
- ReactElement → recurse props.children, spread-clone only if changed
MdParagraph calls `Children.map(children, (child, i) => highlightMentionsInNode(child, \`mp-\${i}\`))`.
This correctly handles mentions inside bold/italic sibling nodes too.
Imports needed: `Children, isValidElement` from 'react'.

## SystemMessage formatContent — duplicate agent name fix (2026-03-23)

`formatContent` previously replaced `Agent X` with the capitalized name, causing the name to appear twice:
once in `.te-agent` (from `extractAgent`) and once at the start of `.te-desc`.

Fixed by stripping the `Agent X` prefix entirely:
```ts
return content.replace(/^Agent\s+\w+\s*/i, '').replace(/^\.\s*/, '');
```
The second `.replace` handles the edge case `"Agent Foo. Some message."` where a lone period+space is left over.

Test file: `src/test/components/SystemMessage.test.tsx` (8 cases, pure DOM assertions via `document.querySelector`).

## Lessons
- Memory writes must use `$GIT_ROOT` = `/Users/unmassk/Workspace/claude-toolkit`, not the cwd subdirectory.
  The cwd was `chatroom/apps/frontend` but git root is two levels up.
- When Cerberus reports T1 bugs and Ultron is invoked, always read the files first — fixes may already be applied.
- Transient test failures in `bun test` full run (closed DB, mock leakage between files) resolve on re-run.
  Confirm with a second run before investigating.
