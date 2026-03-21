---
name: chatroom-frontend-patterns
description: Recurring patterns, false positives, and conventions found in chatroom/apps/frontend/src/ — audited 2026-03-21
type: feedback
---

## Intentional Patterns (do NOT flag)

- `StrictMode WebSocket protection` — useWebSocket.ts uses 100ms deferred disconnect + connectingRoomId guard + AbortController. This is intentional, multi-layered. Do not flag as "unnecessary complexity".
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
- Zero frontend tests — no Vitest/RTL setup for chatroom/apps/frontend/ (still open)

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
