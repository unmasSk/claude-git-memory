---
name: lessons
description: Failed hypotheses and investigation lessons to avoid repeating dead ends
type: feedback
---

## Lesson: Check ALL schema sources, not just schema.sql

When investigating schema-code divergence, check:
1. schema.sql (pg_dump of actual DB)
2. Migration files (may contain CREATE TABLE)
3. supabase_migration.sql (deployment SQL)
4. The migration runner config (Knex, etc.)

In omawamapas, the Knex migration was a no-op stub, and supabase_migration.sql matched schema.sql exactly. This confirmed that the missing tables were never created anywhere.

## Lesson: Zustand v5 + Map state — static analysis has limits

When investigating "Zustand store updates but component doesn't re-render," the code path (Map replacement, selector comparison, memo check) can appear logically correct at every step. Zustand v5 uses `useSyncExternalStore` with `Object.is` comparison on selector results. A new Map reference SHOULD trigger re-render. If static analysis confirms correctness but the bug persists, the issue requires runtime verification:

1. Add `console.error` in the WS message handler to confirm message arrival
2. Use React DevTools profiler to check if the component re-renders
3. Check Network tab WebSocket frames for the expected messages
4. Add Zustand devtools middleware temporarily

Do not spend more than 3 hypotheses on static analysis when the data flow appears correct. Escalate to runtime investigation.

## Lesson: Always check `overflow: hidden` ancestry for invisible elements

Before assuming a React/state bug when a component "doesn't render," inspect whether the DOM element exists but is visually clipped. CSS `overflow: hidden` on ancestors combined with `position: absolute` on the element can make it invisible while React state is entirely correct. Check with browser DevTools element inspector first.
