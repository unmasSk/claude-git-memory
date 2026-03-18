import type { ServerMessage, Message } from '@agent-chatroom/shared';
import { createLogger } from '../logger.js';

const logger = createLogger('message-bus');

// ---------------------------------------------------------------------------
// Message bus
// ---------------------------------------------------------------------------

/**
 * FIX 3: Import the Elysia app singleton lazily (at call time, not module load).
 * This avoids circular import issues during startup and lets index.ts fully
 * initialize before any broadcast call happens.
 */
async function getApp() {
  const { app } = await import('../index.js');
  return app;
}

/**
 * Strip sessionId from message metadata before broadcasting.
 * SEC-FIX 5: Session IDs are server-internal and must never reach the frontend.
 */
function stripSessionId(event: ServerMessage): ServerMessage {
  if (event.type === 'new_message') {
    const { sessionId: _omit, ...safeMetadata } = event.message.metadata;
    return {
      ...event,
      message: {
        ...event.message,
        metadata: safeMetadata,
      } as Message,
    };
  }

  if (event.type === 'room_state') {
    return {
      ...event,
      messages: event.messages.map((msg) => {
        const { sessionId: _omit, ...safeMetadata } = msg.metadata;
        return { ...msg, metadata: safeMetadata };
      }),
    };
  }

  return event;
}

/**
 * Broadcast a server message to all WebSocket clients subscribed to a room.
 *
 * FIX 3: Uses app.server!.publish() via lazy singleton import.
 * SEC-FIX 5: Strips metadata.sessionId before broadcasting.
 */
export async function broadcast(roomId: string, event: ServerMessage): Promise<void> {
  const app = await getApp();

  if (!app.server) {
    logger.warn({ roomId, eventType: event.type }, 'broadcast called before server is ready — dropping event');
    return;
  }

  const safeEvent = stripSessionId(event);
  const topic = `room:${roomId}`;
  app.server.publish(topic, JSON.stringify(safeEvent));
}

/**
 * Synchronous broadcast variant for use within WS handlers where the server
 * is guaranteed to be live. Avoids async overhead in hot path.
 */
export function broadcastSync(roomId: string, event: ServerMessage, server: { publish: (topic: string, data: string) => void }): void {
  const safeEvent = stripSessionId(event);
  const topic = `room:${roomId}`;
  server.publish(topic, JSON.stringify(safeEvent));
}
