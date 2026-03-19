import { Elysia, t } from 'elysia';
import { open, message, close } from './ws-handlers.js';

// ---------------------------------------------------------------------------
// Constants re-exported for tests that import them from this module.
// ---------------------------------------------------------------------------
export { EVERYONE_PATTERN, MAX_CONNECTIONS_PER_ROOM } from './ws-state.js';

// ---------------------------------------------------------------------------
// WS route
// ---------------------------------------------------------------------------

export const wsRoutes = new Elysia().ws('/ws/:roomId', {
  params: t.Object({ roomId: t.String() }),
  query: t.Object({
    name: t.Optional(t.String()),
    token: t.Optional(t.String()),
  }),

  // SEC-HIGH-001: Hard ceiling on WS frame size — enforced by uWebSockets before handler runs
  maxPayloadLength: 64 * 1024, // 64KB

  open,
  message,
  close,
});
