import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { PORT, HOST, NODE_ENV } from './config.js';
import { initializeSchema } from './db/schema.js';
import { loadAgentRegistry } from './services/agent-registry.js';
import { apiRoutes } from './routes/api.js';
import { wsRoutes } from './routes/ws.js';
import { createLogger } from './logger.js';
import { getDb } from './db/connection.js';

const logger = createLogger('index');

// Initialize database schema on startup
initializeSchema();

// Load agent registry from disk
loadAgentRegistry();

/**
 * FIX 3: Export app as a singleton so message-bus.ts can import it
 * and call app.server!.publish() without needing a ws instance in scope.
 * SEC-FIX 2: Bind to 127.0.0.1 only — no external access.
 */
export const app = new Elysia()
  .use(cors({
    origin: (NODE_ENV === 'development' || NODE_ENV === 'test')
      ? ['http://localhost:4201', 'http://127.0.0.1:4201']
      : false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  }))
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

// SEC-OPEN-001: Mount swagger only in non-production environments — never expose docs in prod
if (NODE_ENV === 'development' || NODE_ENV === 'test') {
  app.use(swagger({
    path: '/docs',
    documentation: {
      info: {
        title: 'Chatroom API',
        version: '0.1.0',
        description: 'Multi-agent chatroom backend',
      },
    },
  }));
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
 * Graceful shutdown handler.
 * Closes all active WebSocket connections, checkpoints the WAL file,
 * closes the database, then exits 0.
 * If shutdown takes longer than 5s, force-exits with code 1.
 */
function gracefulShutdown(signal: string): void {
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

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export type App = typeof app;
