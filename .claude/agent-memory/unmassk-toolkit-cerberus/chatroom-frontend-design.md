---
name: chatroom-frontend-design
description: Design patterns, token values, contrast failures, and review findings specific to chatroom/design-mocks/ frontend mockups
type: project
---

## Design Reference: option-b-cursor-style.html

This is the DEFINITIVE design reference for the chatroom frontend as of 2026-03-21.
Audited under the unmassk-design skill. Score: 68/110.

### What is correct and intentional

- No glassmorphism, no bubbles, no blur — explicitly stated in line 10 comment. Do not flag as missing features.
- Cursor IDE warm-gray aesthetic: `--bg-body: #050505`, sidebar `#141414`, chat `#0e0e0e`.
- Agent identity via color only, on names and avatar borders. No avatars, no profile pictures.
- Monospace font for system chrome (labels, metrics, timestamps), sans-serif for message text.
- WoW class palette agent colors: ultron=blue, cerberus=orange, dante=purple, bilbo=green, house=neon-green, yoda=teal, alexandria=purple, gitto=yellow, argus=tan, moriarty=red.
- `prefers-reduced-motion` block covers main animations (90% complete — card transition not yet covered).
- Thinking dots (`.t-dots`), shimmer bar (`.bar-fill`), neon-glow text animation — all intentional.
- `cubic-bezier(0.16, 1, 0.3, 1)` for card hover expand is intentional spring ease, not a bounce.

### Confirmed bugs (open as of 2026-03-21)

- `--text-3: #585858` fails WCAG AA on ALL surfaces (2.32–2.86:1). Needs to become ~#858585.
- `--bg-app` is undefined — `.app-shell background: var(--bg-app)` is a broken reference.
- Disconnected card icons at stroke `#3a3a3a` produce 1.62:1 — effectively invisible.
- Input `:focus-within` border `#333333` is DARKER than idle `#3d3d3d` — inverted focus.
- `.agent-list { overflow: hidden }` silently clips agents — should be `overflow-y: auto`.
- Placeholder text uses `--text-3` = 2.32:1 on `--bg-input`. WCAG AA requires 4.5:1.
- Agent colors ultron (#0070DD), moriarty (#C41E3A), alexandria (#A330C9) fail 4.5:1 as body text on dark surfaces.

### Contrast truth table (computed 2026-03-21)

| Token | Value | On #141414 | On #0e0e0e | On #1f1f1f |
|-------|-------|-----------|-----------|-----------|
| text-1 | #ececec | 15.59 PASS | 16.34 PASS | 13.95 PASS |
| text-2 | #aeaeae | 8.30 PASS | 8.70 PASS | 7.43 PASS |
| text-3 | #585858 | 2.59 FAIL | 2.71 FAIL | 2.32 FAIL |
| text-dim | #7d7d7d | — | 4.69 PASS | — |
| text-icon | #747474 | 3.94 (UI:PASS, body:FAIL) | — | — |
| color-ultron | #0070DD | 3.83 FAIL | 4.01 FAIL | — |
| color-cerberus | #FF7C0A | 7.14 PASS | — | — |
| color-moriarty | #C41E3A | 3.15 FAIL | 3.30 FAIL | — |
| color-alexandria | #A330C9 | 3.35 FAIL | 3.51 FAIL | — |

### Missing states (not designed as of 2026-03-21)

- Agent error / crash state
- Send button disabled state
- Empty chat (zero messages)
- Network error banner
- Rate-limited user feedback (ironic given mock content)

### Color system structure

Two parallel systems exist (should be unified):
1. Hex WoW palette: `--color-<agent>` — used in HTML
2. OKLCH semantic colors: `--c-<agent>` — correct approach, unused in mockup
3. OKLCH avatar backgrounds: `--av-<agent>` — correct approach
Fix: replace hex system with OKLCH system in implementation.
