# Frontend — Agent Working Guide

## Stack

| Component | Technology |
|---|---|
| Runtime | Vite + React 18 |
| State | Zustand |
| Styling | Plain CSS (split per component) |
| Tests | Vitest |
| Icons | lucide-react |

## Dev

```bash
bun run dev   # from chatroom root — starts backend + frontend concurrently
```

Frontend: http://localhost:4201

Hot reload is active — no restart needed for frontend-only changes.

## Component Map

```
App.tsx                    Root layout. Mounts on load: loadRooms(), useWebSocket()
├── Titlebar.tsx           macOS-style header: room tabs, +/× controls, user name, settings
├── ParticipantPanel.tsx   Sidebar with agent cards (three visual states)
│   └── ParticipantItem.tsx
├── ChatArea.tsx           Chat display + input area
│   ├── MessageList.tsx
│   │   ├── MessageLine.tsx     User/agent message with mention color rendering
│   │   ├── ToolLine.tsx        Tool use display — RTL truncation via flex:1, min-width:0
│   │   └── SystemMessage.tsx
│   └── MessageInput.tsx   Text input, @mention autocomplete, file attach buttons (image + doc), stop button
│       └── MentionDropdown.tsx
└── StatusBar.tsx          Connection status, retry button
```

## Stores

### room-store.ts

Manages room list, active room, and two-step delete confirmation.

| State | Type | Description |
|---|---|---|
| `rooms` | `Room[]` | All rooms fetched from backend |
| `activeRoomId` | `string` | Currently displayed room (default: `'default'`) |
| `pendingDeleteId` | `string \| null` | Room marked for deletion on first × click |

Key methods:
- `loadRooms()` — fetches `/api/rooms`, called on app mount
- `createRoom()` — obtains Bearer token via `getAuthToken()`, POSTs to `/api/rooms`, adds room and activates it
- `confirmDelete(id)` — obtains Bearer token, DELETEs `/api/rooms/:id`, falls back to `'default'` if the deleted room was active
- `markForDelete(id)` / `cancelDelete()` — two-step delete UX (first × marks, tab body click cancels, second × confirms)

`getAuthToken()` — always fetches a fresh one-time token from `/api/auth/token`. Tokens are single-use — do not cache.

### agent-store.ts

Agent registry and per-agent status. Updated from WS events.

### chat-store.ts

Message list for the active room. Handles pagination and WS message streaming.

### ws-store.ts

WebSocket lifecycle: connect, circuit breaker (3 consecutive auth failures → offline mode), reconnect.

## Room Tab UX

- Click tab body → switch room (also cancels pending delete)
- Click `×` → `markForDelete(id)` — tab enters pending-delete state, tooltip changes
- Click `×` again → `confirmDelete(id)` — deletes room
- `default` room has no close button
- `+` button → `createRoom()` — new room auto-selected

## Mention Colors

Agent names appearing as `@name` in messages are rendered in the agent's CSS color variable. Colors are defined as CSS custom properties (`--color-agent-<name>`). Do not hardcode hex values — use the CSS variable.

## Agent Card States

Three visual states in the sidebar:
1. **Active** — agent is currently in Thinking or ToolUse (card glow active)
2. **Invoked** — agent is running but not in an active tool/thinking phase
3. **Never-invoked** — agent has no session yet (gray name, no glow)

## Stop Button

`MessageInput.tsx` shows a stop button when an agent is running. Stop sends a SIGSTOP signal to the agent process via the WS. Do not add a kill button — SIGKILL is forbidden (causes Cursor RAM crash when sent from inside Claude Code).

## File Attachments

`MessageInput.tsx` has two attach buttons (paperclip for docs, image icon for images). Files are staged as `PendingFile` entries (UUID-keyed to avoid key collisions) and uploaded via `POST /api/rooms/:id/upload` with a fresh auth token. Attachment IDs are sent alongside the message in the WS payload. Max 5 files per message, max 10 MB per file.

- Never reuse auth tokens across uploads — fetch a fresh one per `getUploadToken()` call.
- Attachment display in `MessageLine.tsx` uses `sanitizeHref` to allow `/api/uploads/` paths — do not widen the allowlist.
- `formatBytes` is defined in `src/lib/format.ts` — do not redefine it inline.

## Styling Conventions

- CSS is split per component into `src/styles/components/`
- Agent colors live in CSS custom properties — never inline
- `text-align: left; flex: 1; min-width: 0` on path-displaying elements — prevents RTL truncation from hiding the filename

## Do Not

- Use `console.log` — check browser devtools only
- Hardcode agent colors — use CSS variables
- Cache auth tokens — always fetch fresh
- Kill agent processes — use SIGSTOP/SIGCONT (stop button) only
- Touch `apps/backend/` from frontend changes
- Widen `sanitizeHref` allowlist beyond `/api/uploads/`
- Duplicate `formatBytes` — it lives in `src/lib/format.ts`

## Tests

```bash
cd apps/frontend
bun test
```

Vitest, 78+ cases. Pattern: Arrange / Act / Assert. Stores tested with mock WS.
