import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { PORT, HOST, NODE_ENV } from './config.js';
import { initializeSchema, seedAgentSessions } from './db/schema.js';
import { loadAgentRegistry, getAllAgents } from './services/agent-registry.js';
import { listRooms, createRoom } from './db/queries.js';
import { apiRoutes } from './routes/api.js';
import { wsRoutes } from './routes/ws.js';
import { createLogger } from './logger.js';
import { getDb } from './db/connection.js';
import { drainActiveInvocations } from './services/agent-invoker.js';

const logger = createLogger('index');

// Initialize database schema on startup (no longer seeds default room)
initializeSchema();

// Load agent registry from disk
loadAgentRegistry();

// First-ever boot: if no rooms exist, create the default room.
// Subsequent boots after the room was deleted: room stays deleted.
const existingRooms = listRooms();
if (existingRooms.length === 0) {
  createRoom('default', 'general', 'Agent chatroom');
  logger.info('first boot — default room created');
}

// Seed all registered agents as idle in every existing room so the sidebar
// shows every agent immediately — not just those that have been invoked.
const allRooms = listRooms();
const agents = getAllAgents();
for (const room of allRooms) {
  seedAgentSessions(agents, room.id);
}

/**
 * Elysia application singleton.
 *
 * Exported so message-bus.ts can lazily import it and call
 * `app.server!.publish()` without needing a live WS instance in scope (FIX 3).
 * Bound to `127.0.0.1` by default — set `HOST=0.0.0.0` for LAN/Docker (SEC-FIX 2).
 */
export const app = new Elysia()
  .use(
    cors({
      origin:
        NODE_ENV === 'development' || NODE_ENV === 'test' ? ['http://localhost:4201', 'http://127.0.0.1:4201'] : false,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    }),
  )
  .onError(({ code, error, set }) => {
    const statusMap: Record<string, number> = { NOT_FOUND: 404, VALIDATION: 422, PARSE: 400 };
    const status = statusMap[code] ?? 500;
    logger.error({ code, err: error, status }, 'Unhandled error');
    set.status = status;
    return { error: status < 500 ? String(error) : 'Internal server error', code };
  })
  .use(apiRoutes)
  .use(wsRoutes)
  .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }));

// SEC-OPEN-001: Mount swagger only in development — never in test or production.
// In test mode swagger adds unnecessary HTTP overhead and leaks API surface.
if (NODE_ENV === 'development') {
  app.use(
    swagger({
      path: '/docs',
      documentation: {
        info: {
          title: 'Chatroom API',
          version: '0.1.0',
          description: 'Multi-agent chatroom backend',
        },
      },
    }),
  );
}

// FIX 10: Mount static plugin in production only
if (NODE_ENV === 'production') {
  const { staticPlugin } = await import('@elysiajs/static');
  app.use(staticPlugin({ assets: '../frontend/dist', prefix: '/' }));
}

app.listen({ port: PORT, hostname: HOST }, () => {
  logger.info({ host: HOST, port: PORT, env: NODE_ENV }, 'server started');
});

/**
 * Drain connections, checkpoint WAL, and exit cleanly on SIGTERM/SIGINT.
 *
 * Order: stop server → drain agent invocations → WAL checkpoint → close DB → exit 0.
 * Awaiting `drainActiveInvocations` prevents a subprocess from writing a result
 * row after `db.close()` has been called. Force-exits with code 1 after 5s.
 *
 * @param signal - Signal name for logging ('SIGTERM' or 'SIGINT')
 */
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutting down gracefully...');

  const forceTimer = setTimeout(() => {
    logger.error('Graceful shutdown timed out after 5s — forcing exit');
    process.exit(1);
  }, 5000);
  // Do not keep the process alive just for this timer
  forceTimer.unref();

  try {
    // Close all active WebSocket connections with a close frame
    app.server?.stop();

    // Drain in-progress agent invocations before closing the DB.
    // Without this, a subprocess writing a result row can race with db.close().
    await drainActiveInvocations();

    // Checkpoint the WAL file so all pages are in the main DB file
    const db = getDb();
    db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    db.close();
  } catch (err) {
    logger.error({ err }, 'Error during shutdown cleanup');
  }

  clearTimeout(forceTimer);
  process.exit(0);
}

process.on('SIGTERM', () => {
  void gracefulShutdown('SIGTERM');
});
process.on('SIGINT', () => {
  void gracefulShutdown('SIGINT');
});

export type App = typeof app;
