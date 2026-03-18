import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { PORT, HOST } from './config.js';
import { initializeSchema } from './db/schema.js';
import { loadAgentRegistry } from './services/agent-registry.js';
import { apiRoutes } from './routes/api.js';
import { wsRoutes } from './routes/ws.js';
import { createLogger } from './logger.js';

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
    origin: process.env.NODE_ENV === 'development'
      ? ['http://localhost:4201', 'http://127.0.0.1:4201']
      : false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  }))
  .use(apiRoutes)
  .use(wsRoutes)
  .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }));

// FIX 10: Mount static plugin in production only
if (process.env.NODE_ENV === 'production') {
  const { staticPlugin } = await import('@elysiajs/static');
  app.use(staticPlugin({ assets: '../frontend/dist', prefix: '/' }));
}

app.listen({ port: PORT, hostname: HOST }, () => {
  logger.info({ host: HOST, port: PORT, env: process.env.NODE_ENV ?? 'development' }, 'server started');
});

export type App = typeof app;
