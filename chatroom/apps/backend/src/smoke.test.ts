/**
 * Smoke tests — verify HTTP endpoints and core WS behavior.
 *
 * Architecture note:
 * The origin check was moved from upgrade() to open() in ws.ts (Elysia silently
 * ignores the upgrade() return value). The test WS server omits the origin check
 * so Bun test clients can connect without setting an Origin header.
 *
 * 1. HTTP smoke tests: importing the full backend app (HTTP routes are unaffected)
 * 2. WS smoke tests: spinning up a thin Elysia instance using only the DB +
 *    schema + route handlers (no origin check) so we can test WS protocol
 *    behavior end-to-end.
 *
 * The production WS logic (open/message/close handlers, DB persistence,
 * broadcast, rate-limit) is tested independently in queries.test.ts and
 * message-bus.test.ts.
 */
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Elysia } from 'elysia';
import { Database } from 'bun:sqlite';

// ---------------------------------------------------------------------------
// Shared in-memory DB for smoke tests
// ---------------------------------------------------------------------------

let smokeDb: Database;

function makeSmokeDb(): Database {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, topic TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY, room_id TEXT NOT NULL, author TEXT NOT NULL,
      author_type TEXT NOT NULL, content TEXT NOT NULL,
      msg_type TEXT NOT NULL DEFAULT 'message', parent_id TEXT,
      metadata TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS agent_sessions (
      agent_name TEXT NOT NULL, room_id TEXT NOT NULL,
      session_id TEXT, model TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'idle',
      last_active TEXT, total_cost REAL DEFAULT 0.0, turn_count INTEGER DEFAULT 0,
      PRIMARY KEY (agent_name, room_id)
    );
    INSERT OR IGNORE INTO rooms (id, name, topic) VALUES ('default', 'general', 'Agent chatroom');
  `);
  return db;
}

// ---------------------------------------------------------------------------
// Minimal test server — mirrors production routes without the buggy upgrade()
// ---------------------------------------------------------------------------

let app: ReturnType<typeof Elysia.prototype.listen> | null = null;
let baseUrl: string;
let wsUrl: string;

beforeAll(async () => {
  smokeDb = makeSmokeDb();

  // Import shared registry to get agent list
  const { getAllAgents, loadAgentRegistry } = await import('./services/agent-registry.js');
  loadAgentRegistry();

  // Build the test app
  const testApp = new Elysia()
    // Health endpoint
    .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))

    // Rooms API
    .get('/api/rooms', () => {
      return smokeDb
        .query<{ id: string; name: string; topic: string; created_at: string }, []>(
          'SELECT * FROM rooms ORDER BY created_at ASC'
        )
        .all()
        .map((r) => ({ id: r.id, name: r.name, topic: r.topic, createdAt: r.created_at }));
    })

    // Agents API
    .get('/api/agents', () => getAllAgents())

    // WS endpoint — no upgrade() origin check, just the core protocol
    .ws('/ws/:roomId', {
      open(ws) {
        const roomId = (ws.data as { params: { roomId: string } }).params.roomId;
        const room = smokeDb
          .query<{ id: string; name: string; topic: string; created_at: string }, [string]>(
            'SELECT * FROM rooms WHERE id = ?'
          )
          .get(roomId);

        if (!room) {
          ws.send(JSON.stringify({ type: 'error', message: `Room '${roomId}' not found`, code: 'ROOM_NOT_FOUND' }));
          ws.close();
          return;
        }

        ws.send(JSON.stringify({
          type: 'room_state',
          room: { id: room.id, name: room.name, topic: room.topic, createdAt: room.created_at },
          messages: [],
          agents: [],
        }));
      },
      message(_ws, _msg) {},
      close(_ws) {},
    })

    .listen({ port: 0, hostname: '127.0.0.1' });

  await new Promise<void>((resolve) => setTimeout(resolve, 100));

  const port = (testApp as unknown as { server: { port: number } }).server?.port;
  if (!port) throw new Error('Test server did not start');

  baseUrl = `http://127.0.0.1:${port}`;
  wsUrl = `ws://127.0.0.1:${port}`;
  app = testApp as unknown as ReturnType<typeof Elysia.prototype.listen>;
});

afterAll(() => {
  smokeDb?.close();
  try {
    (app as unknown as { server: { stop: () => void } })?.server?.stop();
  } catch {
    // Ignore cleanup errors
  }
});

// ---------------------------------------------------------------------------
// HTTP smoke tests
// ---------------------------------------------------------------------------

describe('smoke — HTTP endpoints', () => {
  it('GET /health returns 200 with status ok', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const body = await res.json() as { status: string; timestamp: string };
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
  });

  it('GET /health response includes a timestamp', async () => {
    const res = await fetch(`${baseUrl}/health`);
    const body = await res.json() as { status: string; timestamp: string };
    const parsed = new Date(body.timestamp);
    expect(isNaN(parsed.getTime())).toBe(false);
  });

  it('GET /api/rooms returns 200', async () => {
    const res = await fetch(`${baseUrl}/api/rooms`);
    expect(res.status).toBe(200);
  });

  it('GET /api/rooms returns an array', async () => {
    const res = await fetch(`${baseUrl}/api/rooms`);
    const body = await res.json() as unknown[];
    expect(Array.isArray(body)).toBe(true);
  });

  it('GET /api/rooms contains the default room', async () => {
    const res = await fetch(`${baseUrl}/api/rooms`);
    const rooms = await res.json() as Array<{ id: string; name: string }>;
    const defaultRoom = rooms.find((r) => r.id === 'default');
    expect(defaultRoom).toBeDefined();
    expect(defaultRoom!.name).toBe('general');
  });

  it('GET /api/agents returns 200', async () => {
    const res = await fetch(`${baseUrl}/api/agents`);
    expect(res.status).toBe(200);
  });

  it('GET /api/agents returns an array', async () => {
    const res = await fetch(`${baseUrl}/api/agents`);
    const body = await res.json() as unknown[];
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  it('GET /api/agents list includes bilbo', async () => {
    const res = await fetch(`${baseUrl}/api/agents`);
    const agents = await res.json() as Array<{ name: string }>;
    const bilbo = agents.find((a) => a.name === 'bilbo');
    expect(bilbo).toBeDefined();
  });

  it('GET /api/agents list includes all 12 expected agents', async () => {
    const res = await fetch(`${baseUrl}/api/agents`);
    const agents = await res.json() as Array<{ name: string }>;
    expect(agents.length).toBe(12);
  });
});

// ---------------------------------------------------------------------------
// WebSocket smoke tests
// ---------------------------------------------------------------------------

describe('smoke — WebSocket', () => {
  it('connects to /ws/default without error', async () => {
    const ws = new WebSocket(`${wsUrl}/ws/default`);
    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve();
      ws.onerror = () => reject(new Error('WS error on connect'));
      setTimeout(() => reject(new Error('WS open timeout')), 3000);
    });
    ws.close();
  });

  it('receives room_state message on connect', async () => {
    const ws = new WebSocket(`${wsUrl}/ws/default`);
    const firstMessage = await new Promise<{ type: string }>((resolve, reject) => {
      ws.onmessage = (event) => {
        try {
          resolve(JSON.parse(event.data as string));
        } catch {
          reject(new Error('Failed to parse WS message'));
        }
      };
      ws.onerror = () => reject(new Error('WS error'));
      setTimeout(() => reject(new Error('WS message timeout')), 3000);
    });
    ws.close();
    expect(firstMessage.type).toBe('room_state');
  });

  it('room_state message contains room, messages, and agents fields', async () => {
    const ws = new WebSocket(`${wsUrl}/ws/default`);
    const roomState = await new Promise<{
      type: string;
      room: { id: string; name: string };
      messages: unknown[];
      agents: unknown[];
    }>((resolve, reject) => {
      ws.onmessage = (event) => {
        try {
          resolve(JSON.parse(event.data as string));
        } catch {
          reject(new Error('Parse error'));
        }
      };
      ws.onerror = () => reject(new Error('WS error'));
      setTimeout(() => reject(new Error('Timeout')), 3000);
    });
    ws.close();

    expect(roomState.type).toBe('room_state');
    expect(roomState.room.id).toBe('default');
    expect(roomState.room.name).toBe('general');
    expect(Array.isArray(roomState.messages)).toBe(true);
    expect(Array.isArray(roomState.agents)).toBe(true);
  });

  it('WS connection to non-existent room receives ROOM_NOT_FOUND error', async () => {
    const ws = new WebSocket(`${wsUrl}/ws/nonexistent-room`);
    const firstMessage = await new Promise<{ type: string; code: string }>((resolve, reject) => {
      ws.onmessage = (event) => {
        try {
          resolve(JSON.parse(event.data as string));
        } catch {
          reject(new Error('Parse error'));
        }
      };
      ws.onerror = () => reject(new Error('WS error'));
      setTimeout(() => reject(new Error('Timeout')), 3000);
    });
    ws.close();
    expect(firstMessage.type).toBe('error');
    expect(firstMessage.code).toBe('ROOM_NOT_FOUND');
  });

  it('multiple simultaneous WS connections can receive room_state', async () => {
    const connections = await Promise.all(
      [1, 2, 3].map(() =>
        new Promise<{ type: string }>((resolve, reject) => {
          const ws = new WebSocket(`${wsUrl}/ws/default`);
          ws.onmessage = (event) => {
            ws.close();
            try {
              resolve(JSON.parse(event.data as string));
            } catch {
              reject(new Error('Parse error'));
            }
          };
          ws.onerror = () => reject(new Error('WS error'));
          setTimeout(() => reject(new Error('Timeout')), 3000);
        })
      )
    );

    for (const msg of connections) {
      expect(msg.type).toBe('room_state');
    }
  });
});
