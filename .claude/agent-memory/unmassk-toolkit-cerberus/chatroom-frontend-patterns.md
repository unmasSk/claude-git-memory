---
name: chatroom-frontend-patterns
description: Recurring patterns, false positives, and conventions found in chatroom/apps/frontend/src/ — audited 2026-03-21
type: feedback
---

## Intentional Patterns (do NOT flag)

- `getRepoName(cwd)` helper in Titlebar.tsx — normalizes both `\` and `/` separators, strips trailing slashes, returns last segment. Works correctly for Windows and Unix paths. Fallback `?? room.name` handles null cwd. This is the canonical tab display name function. Old adjective-animal name code from commit fcd6e9c was fully replaced — `room.name` is only kept as a fallback, not the primary display. Do not flag `room.name` fallback as dead code — it handles the no-cwd case.
- `room.cwd` field — comes from `RoomSchema` in `@agent-chatroom/shared` as `z.string().nullish()`. Frontend type infers `string | null | undefined`. The `getRepoName` signature correctly accepts all three states.


- `StrictMode WebSocket protection` — ws-store.ts uses connectingRoomId guard + AbortController. The old 2s debounce was removed (incompatible with StrictMode). Do not flag as "unnecessary complexity".
- `circuit breaker in ws-store` — `consecutiveAuthFailures` counter, resets ONLY on `room_state` message (not onopen — phantom Vite proxy opens are not proof of backend availability). `AbortSignal.any([signal, AbortSignal.timeout(5000)])` on auth fetch is intentional and correct. Do not flag as over-engineering.
- `reconnectAttempts` not reset in `onopen` — intentional: phantom proxy onopen fires before backend is ready. Only `room_state` resets it. Do not flag.
- `timeout: 5000` + `proxyTimeout: 5000` on Vite proxy `/ws` entry — known open concern: any quiet WS connection >5s gets dropped. Monitor if spurious disconnects appear.
- `memo()` on MessageLine, MessageList, ParticipantItem, ToolLine, SystemMessage, QueueGroup — correct. ChatArea, App, Titlebar, StatusBar deliberately NOT memoized (structural, cheap). Do not suggest memoizing them.
- `seenIds` module-level Set in chat-store.ts — intentional dedup guard for StrictMode double-mount WS duplicate messages. Not a singleton anti-pattern.
- `as CSSProperties` in agentCardStyle() — needed for CSS custom property injection (`--ac`, `--agent-tint`). Not a type escape.
- `useCallback` on handleChange, submit, handleKeyDownWrapper, handleSelectAgent in MessageInput — justified: these are passed as props to child components and memoized children depend on reference stability.
- Traffic light hex colors in Titlebar.css (#FF5F57, #FFBD2E, #28C840) — intentional macOS system colors, not from design token system.
- `e.preventDefault()` on mousedown in MentionDropdown — intentional to fire before textarea blur closes dropdown.

## Known Open Violations — updated 2026-03-21 (after CSS fix batch)

### T2 (blocking)
- globals.css: 736 LOC — still over 800 limit? No — 736 < 800, T2 CLOSED. Monitoring: keep under 800.
- AGENT_COLOR Record in ParticipantItem.tsx duplicates --color-<agent> CSS variable system — DRY violation (still open)
- `as unknown as React.KeyboardEvent<HTMLInputElement>` in MessageInput.tsx — RESOLVED (cast removed, comment added at line 59)
- Zero frontend tests — PARTIALLY RESOLVED: ws-store.test.ts added (81 tests pass). Full RTL component tests still missing.

### T3 (non-blocking)
- TopBar.tsx — dead export, never imported (still open)
- AGENT_COLOR_VAR in colors.ts — exported but never used; also references undefined --agent-* CSS vars (still open)
- Old sidebar CSS in globals.css: .panel, .participant, .status-indicator etc. — dead, replaced by Sidebar.css (still open)
- Legacy .msg-content CSS blocks in globals.css — dead, components use .msg-text (still open)
- Hardcoded hex colors in AgentCard.css (#3d3d3d, #555555, #1a1a1a etc.) and ChatInput.css — still open
- MentionDropdown: missing ARIA combobox pattern (no role=listbox, no aria-expanded on textarea) (still open)
- ParticipantItem action buttons: no :focus-within CSS to reveal buttons on keyboard focus (still open)
- `mode` state in MessageInput never sent in WS payload — YAGNI (still open — send-btn color changes work, but mode is UI-only)
- `_detail` param in agent-store updateStatus accepted but ignored — remove from interface (still open)

### RESOLVED in 2026-03-21 CSS fix batch
- globals.css LOC: 962 → 736 (T2 CLOSED — under 800 limit)
- Duplicate CSS: .scroll-bottom and .send-btn removed from globals.css — confirmed absent (T2 CLOSED)
- --color-claude token added to tokens.css (T3 CLOSED)
- .card-wrap.agent-claude added to AgentCard.css — all 11 agents now have CSS accent classes (T3 CLOSED)
- 6 Claude CSS classes in globals.css now reference var(--color-claude) (T3 CLOSED)
- position:relative on .chat-input — scroll-bottom button can now anchor correctly (T3 CLOSED)
- MessageInput.tsx: send-btn receives .send-brainstorm class on brainstorm mode — color changes wired (T3 CLOSED)

## Scoring Baseline — 2026-03-21 (after CSS fix batch)

Score: 70/110 (+2 from 68)
- Security: 9/9 (full marks — unchanged)
- Error Handling: 6/9 (unchanged)
- Structure: 8/8 (+2: globals.css LOC resolved, duplicate CSS resolved)
- Testing: 0/8 (no test suite — unchanged)
- Maintainability: 3/5 (unchanged — AGENT_COLOR DRY violation still open)

**Why:** Structure dimension now full marks. Testing remains the biggest drag.
**How to apply:** On re-audit after test suite is added, re-score Testing from 0. After AGENT_COLOR DRY fix, +1 Maintainability.

## Re-Audit 2026-03-24 — MessageList infinite scroll + chat-store ceiling fixes

### All 10 original findings verified RESOLVED
- F-001 (T2): 10s timeout on loadHistory — RESOLVED. historyTimeoutRef setTimeout(10000) present.
- F-002 (T2): useCallback on handleScroll — RESOLVED. useCallback with empty deps [] correct.
- F-003 (T2): useCallback on handleScrollToBottom — RESOLVED. useCallback with empty deps [] correct.
- F-004 (T2): isPrependingRef replacing null-check race — RESOLVED. useRef(false) used throughout; no null race.
- SEC-MED-001 (backend): before validated with regex + getMessageCreatedAt scoped by roomId — RESOLVED. schemas.ts line 102: /^[A-Za-z0-9_-]{16}$/ present; queries.ts line 196–201: two-param scoped query present.
- SEC-LOW-001: 1000ms client-side throttle on load_history — RESOLVED. lastHistoryRequestRef + 1000ms guard at lines 134–136.
- SEC-LOW-002: MAX_STORED_MESSAGES = 2000 ceiling with tail trim — RESOLVED. chat-store.ts line 7 + slice(0,2000) + seenIds eviction.
- F-006 (T3): rootMargin '100px 0px 0px 0px' — RESOLVED. layout.css line 173.
- F-008 (T3): aria-hidden="true" on sentinel — RESOLVED. MessageList.tsx line 205.
- F-009 (T3): z-index: 3 on .history-loader — RESOLVED. layout.css line 90.
- F-010 (T3): @keyframes spin → history-spin — RESOLVED. layout.css line 94/97.

### New finding (T3 — non-blocking)
- MessageList.tsx:155: `loadHistory` useCallback includes `messages` (full array) in deps. `messages` is a new reference on every WS message received. This causes `loadHistory` to be recreated on every message, which causes the IntersectionObserver useEffect (dep: loadHistory) to disconnect and reconnect its observer on every message. Use `messages[0]?.id` (primitive) as the dep instead of `messages`.

### Score after fixes: 76/110 (+6 from 68, +4 from 70 post-CSS baseline)
- Security: 9/9 (full marks — SEC-MED-001 + SEC-LOW-001 + SEC-LOW-002 all confirmed)
- Error Handling: 8/9 (+2: timeout guard + isPrependingRef race)
- Structure: 8/8 (unchanged full marks)
- Testing: 2/8 (+2: chat-store.test.ts covers prependHistory, dedupe, setLoadingHistory)
- Maintainability: 3/5 (unchanged)

### Intentional patterns (do NOT flag)
- `messages` in loadHistory useCallback dep array: technically causes observer churn but is functionally correct. Observer re-registers before next scroll event. T3 only — do not treat as T2.
- MAX_STORED_MESSAGES trim slices oldest-first (keeps [0..2000]): correct — fresh prepended messages are at index 0; evicting the tail removes the newest-in-store, not the messages the user just loaded.
- `seenIds` eviction loop: O(n) on every prepend over 2000 messages — acceptable for this workload.

## WS Reconnect Fix — Round 1 Issues (RESOLVED in Round 2)

- T2: `offline` status has no escape path — RESOLVED: retryOffline() + visibilitychange + sb-retry-btn added
- T2: Two offline-setting paths inconsistent — RESOLVED: both paths now set `roomId: null`
- T3: Misleading comment — RESOLVED: comment now correctly describes behavior

## Intentional Patterns from WS Reconnect Fix (Round 2 — do NOT flag)

- `timeout: 30000, proxyTimeout: 5000` on Vite proxy `/ws` entry — intentional: `timeout` is the handshake timeout, `proxyTimeout` is the per-message timeout. Asymmetry is correct design.
- `lastKnownRoomId` not cleared after recovery — intentional: harmless stale module var; retryOffline() guard (`if (!lastKnownRoomId) return`) prevents double-fire. Not a memory leak.
- `document` guard on visibility listener — correct SSR/test guard. Do not flag.
- Module-level visibility listener never removed — intentional: ws-store is a singleton module, never unmounted.
- `MAX_CONSECUTIVE_AUTH_FAILURES = 3` (down from 5) — intentional threshold change, not a magic number.

## Open Issues — WS Reconnect Fix Round 2

### T1 (blocking — bug)
- `fetch('/api/health', ...)` in ws-store.ts:58 — WRONG PATH. Backend health endpoint is at `/health` (root, not under `/api` prefix). Vite proxy maps `/api/*` → backend `/api/*`. Request will get 404, health check never recovers.

### T3 (non-blocking)
- `lastKnownRoomId` never reset to `null` after successful recovery — stale after reconnect but harmless (guarded by status check in retryOffline). Low priority.
- `sb-retry-btn` has no `aria-label` — button text "Retry" is sufficient for screen readers but adding `aria-label="Retry WebSocket connection"` would be more explicit.
- `SIDEBAR_ORDER` in ParticipantPanel.tsx is a module-level constant with 10 hardcoded agent names — claude is missing from the list (agents falling outside the list sort to end). Not a bug but worth noting.
