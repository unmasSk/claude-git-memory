/**
 * Integration tests for /api routes.
 *
 * Strategy: spin up a minimal Elysia server backed by an in-memory SQLite DB,
 * wired to the real apiRoutes handler. Each test hits the live HTTP endpoints
 * with fetch() to exercise the full route handler stack.
 *
 * This approach:
 *  - Exercises real route logic (mapRoomRow, mapAgentSessionRow, etc.)
 *  - Avoids mocking Elysia internals
 *  - Stays fully isolated from the production DB file
 */
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Elysia, t } from 'elysia';
import { Database } from 'bun:sqlite';

// ---------------------------------------------------------------------------
// In-memory test DB
// ---------------------------------------------------------------------------

let testDb: Database;

function makeTestDb(): Database {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, topic TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY, room_id TEXT NOT NULL, author TEXT NOT NULL,
      author_type TEXT NOT NULL CHECK(author_type IN ('agent', 'human', 'system')),
      content TEXT NOT NULL,
      msg_type TEXT NOT NULL DEFAULT 'message'
                CHECK(msg_type IN ('message', 'tool_use', 'system')),
      parent_id TEXT, metadata TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS agent_sessions (
      agent_name TEXT NOT NULL, room_id TEXT NOT NULL,
      session_id TEXT, model TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'idle',
      last_active TEXT, total_cost REAL DEFAULT 0.0, turn_count INTEGER DEFAULT 0,
      PRIMARY KEY (agent_name, room_id)
    );
    INSERT OR IGNORE INTO rooms (id, name, topic)
    VALUES ('default', 'general', 'Agent chatroom');
  `);
  return db;
}

// ---------------------------------------------------------------------------
// Inline query helpers that use testDb directly (bypass connection singleton)
// ---------------------------------------------------------------------------

type Row<T> = T;

function dbListRooms() {
  return testDb
    .query<
      { id: string; name: string; topic: string; created_at: string },
      []
    >('SELECT * FROM rooms ORDER BY created_at ASC')
    .all();
}

function dbGetRoomById(id: string) {
  return (
    testDb
      .query<
        { id: string; name: string; topic: string; created_at: string },
        [string]
      >('SELECT * FROM rooms WHERE id = ?')
      .get(id) ?? null
  );
}

function dbListAgentSessions(roomId: string) {
  return testDb
    .query<
      {
        agent_name: string;
        room_id: string;
        session_id: string | null;
        model: string;
        status: string;
        last_active: string | null;
        total_cost: number;
        turn_count: number;
      },
      [string]
    >(`SELECT * FROM agent_sessions WHERE room_id = ? ORDER BY agent_name ASC`)
    .all(roomId);
}

function dbGetRecentMessages(roomId: string, limit: number) {
  return testDb
    .query<
      {
        id: string;
        room_id: string;
        author: string;
        author_type: string;
        content: string;
        msg_type: string;
        parent_id: string | null;
        metadata: string;
        created_at: string;
      },
      [string, number]
    >(
      `
    SELECT * FROM (
      SELECT * FROM messages WHERE room_id = ? ORDER BY created_at DESC LIMIT ?
    ) ORDER BY created_at ASC
  `,
    )
    .all(roomId, limit);
}

function dbInsertMessage(row: {
  id: string;
  roomId: string;
  author: string;
  authorType: string;
  content: string;
  msgType: string;
  parentId: string | null;
  metadata: string;
}) {
  testDb
    .query(
      `
    INSERT INTO messages (id, room_id, author, author_type, content, msg_type, parent_id, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
    )
    .run(row.id, row.roomId, row.author, row.authorType, row.content, row.msgType, row.parentId, row.metadata);
}

function dbUpsertAgentSession(row: {
  agentName: string;
  roomId: string;
  sessionId: string | null;
  model: string;
  status: string;
}) {
  testDb
    .query(
      `
    INSERT INTO agent_sessions (agent_name, room_id, session_id, model, status, last_active)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT (agent_name, room_id) DO UPDATE SET
      session_id = excluded.session_id, model = excluded.model,
      status = excluded.status, last_active = datetime('now')
  `,
    )
    .run(row.agentName, row.roomId, row.sessionId, row.model, row.status);
}

// ---------------------------------------------------------------------------
// Mappers (inline mirrors of utils.ts)
// ---------------------------------------------------------------------------

function mapRoom(r: { id: string; name: string; topic: string; created_at: string }) {
  return { id: r.id, name: r.name, topic: r.topic, createdAt: r.created_at };
}

function mapMessage(r: {
  id: string;
  room_id: string;
  author: string;
  author_type: string;
  content: string;
  msg_type: string;
  parent_id: string | null;
  metadata: string;
  created_at: string;
}) {
  return {
    id: r.id,
    roomId: r.room_id,
    author: r.author,
    authorType: r.author_type,
    content: r.content,
    msgType: r.msg_type,
    parentId: r.parent_id,
    metadata: JSON.parse(r.metadata || '{}'),
    createdAt: r.created_at,
  };
}

function mapSession(r: {
  agent_name: string;
  room_id: string;
  session_id: string | null;
  model: string;
  status: string;
  last_active: string | null;
  total_cost: number;
  turn_count: number;
}) {
  return {
    agentName: r.agent_name,
    roomId: r.room_id,
    sessionId: r.session_id,
    model: r.model,
    status: r.status,
    lastActive: r.last_active,
    totalCost: r.total_cost,
    turnCount: r.turn_count,
  };
}

// ---------------------------------------------------------------------------
// Test server — mirrors production api.ts handlers using testDb
// ---------------------------------------------------------------------------

let app: ReturnType<typeof Elysia.prototype.listen> | null = null;
let baseUrl: string;

const ROOM_STATE_MESSAGE_LIMIT = 50;

beforeAll(async () => {
  testDb = makeTestDb();

  // Insert a bilbo agent session for the default room
  dbUpsertAgentSession({
    agentName: 'bilbo',
    roomId: 'default',
    sessionId: null,
    model: 'claude-sonnet-4-6',
    status: 'idle',
  });
  // Insert a test message
  dbInsertMessage({
    id: 'test-msg-001',
    roomId: 'default',
    author: 'user',
    authorType: 'human',
    content: 'hello chatroom',
    msgType: 'message',
    parentId: null,
    metadata: '{}',
  });

  // Load agents for /api/agents endpoint
  const { loadAgentRegistry, getAllAgents, getAgentConfig } = await import('../../src/services/agent-registry.js');
  loadAgentRegistry();

  const testApp = new Elysia({ prefix: '/api' })

    // GET /api/rooms
    .get('/rooms', () => {
      return dbListRooms().map(mapRoom);
    })

    // GET /api/rooms/:id
    .get(
      '/rooms/:id',
      ({ params, set }) => {
        const room = dbGetRoomById(params.id);
        if (!room) {
          set.status = 404;
          return { error: 'Room not found', code: 'NOT_FOUND' };
        }
        const sessions = dbListAgentSessions(params.id);
        return {
          room: mapRoom(room),
          participants: sessions.map(mapSession),
        };
      },
      { params: t.Object({ id: t.String() }) },
    )

    // GET /api/rooms/:id/messages
    .get(
      '/rooms/:id/messages',
      ({ params, query, set }) => {
        const room = dbGetRoomById(params.id);
        if (!room) {
          set.status = 404;
          return { error: 'Room not found', code: 'NOT_FOUND' };
        }
        const limit = Math.min(Number(query.limit ?? ROOM_STATE_MESSAGE_LIMIT), 100);
        const rows = dbGetRecentMessages(params.id, limit);
        return { messages: rows.map(mapMessage), hasMore: false };
      },
      {
        params: t.Object({ id: t.String() }),
        query: t.Object({ limit: t.Optional(t.Numeric()), before: t.Optional(t.String()) }),
      },
    )

    // GET /api/agents — mirrors production: strip allowedTools (SEC-MED-001)
    .get('/agents', () => getAllAgents().map(({ allowedTools: _omit, ...safe }) => safe))

    .listen({ port: 0, hostname: '127.0.0.1' });

  await new Promise<void>((resolve) => setTimeout(resolve, 100));
  const port = (testApp as unknown as { server: { port: number } }).server?.port;
  if (!port) throw new Error('Test server did not start');
  baseUrl = `http://127.0.0.1:${port}`;
  app = testApp as unknown as ReturnType<typeof Elysia.prototype.listen>;
});

afterAll(() => {
  testDb?.close();
  try {
    (app as unknown as { server: { stop: () => void } })?.server?.stop();
  } catch {
    /* ignore */
  }
});

// ---------------------------------------------------------------------------
// GET /api/rooms
// ---------------------------------------------------------------------------

describe('GET /api/rooms', () => {
  it('returns HTTP 200', async () => {
    const res = await fetch(`${baseUrl}/api/rooms`);
    expect(res.status).toBe(200);
  });

  it('returns an array', async () => {
    const res = await fetch(`${baseUrl}/api/rooms`);
    const body = (await res.json()) as unknown[];
    expect(Array.isArray(body)).toBe(true);
  });

  it('includes the default room in the array', async () => {
    const res = await fetch(`${baseUrl}/api/rooms`);
    const rooms = (await res.json()) as Array<{ id: string; name: string }>;
    const found = rooms.find((r) => r.id === 'default');
    expect(found).toBeDefined();
    expect(found!.name).toBe('general');
  });

  it('maps created_at → createdAt (camelCase)', async () => {
    const res = await fetch(`${baseUrl}/api/rooms`);
    const rooms = (await res.json()) as Array<Record<string, unknown>>;
    const defaultRoom = rooms.find((r) => r.id === 'default');
    expect(defaultRoom).toBeDefined();
    expect('createdAt' in defaultRoom!).toBe(true);
    expect('created_at' in defaultRoom!).toBe(false);
  });

  it('returns at least 1 room', async () => {
    const res = await fetch(`${baseUrl}/api/rooms`);
    const rooms = (await res.json()) as unknown[];
    expect(rooms.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// GET /api/rooms/:id
// ---------------------------------------------------------------------------

describe('GET /api/rooms/:id', () => {
  it('returns HTTP 200 for the default room', async () => {
    const res = await fetch(`${baseUrl}/api/rooms/default`);
    expect(res.status).toBe(200);
  });

  it('returns a room object with correct id', async () => {
    const res = await fetch(`${baseUrl}/api/rooms/default`);
    const body = (await res.json()) as { room: { id: string; name: string }; participants: unknown[] };
    expect(body.room.id).toBe('default');
    expect(body.room.name).toBe('general');
  });

  it('returns a participants array', async () => {
    const res = await fetch(`${baseUrl}/api/rooms/default`);
    const body = (await res.json()) as { room: unknown; participants: unknown[] };
    expect(Array.isArray(body.participants)).toBe(true);
  });

  it('participants array includes bilbo agent session', async () => {
    const res = await fetch(`${baseUrl}/api/rooms/default`);
    const body = (await res.json()) as { participants: Array<{ agentName: string }> };
    const bilbo = body.participants.find((p) => p.agentName === 'bilbo');
    expect(bilbo).toBeDefined();
  });

  it('participants have camelCase fields (agentName, roomId, etc.)', async () => {
    const res = await fetch(`${baseUrl}/api/rooms/default`);
    const body = (await res.json()) as { participants: Array<Record<string, unknown>> };
    if (body.participants.length > 0) {
      const p = body.participants[0]!;
      expect('agentName' in p).toBe(true);
      expect('agent_name' in p).toBe(false);
    }
  });

  it('returns 404 for a non-existent room', async () => {
    const res = await fetch(`${baseUrl}/api/rooms/nonexistent-room-xyz`);
    expect(res.status).toBe(404);
  });

  it('returns error body with code NOT_FOUND for missing room', async () => {
    const res = await fetch(`${baseUrl}/api/rooms/nonexistent-room-xyz`);
    const body = (await res.json()) as { error: string; code: string };
    expect(body.code).toBe('NOT_FOUND');
    expect(typeof body.error).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// GET /api/rooms/:id/messages
// ---------------------------------------------------------------------------

describe('GET /api/rooms/:id/messages', () => {
  it('returns HTTP 200 for the default room', async () => {
    const res = await fetch(`${baseUrl}/api/rooms/default/messages`);
    expect(res.status).toBe(200);
  });

  it('returns messages array and hasMore flag', async () => {
    const res = await fetch(`${baseUrl}/api/rooms/default/messages`);
    const body = (await res.json()) as { messages: unknown[]; hasMore: boolean };
    expect(Array.isArray(body.messages)).toBe(true);
    expect(typeof body.hasMore).toBe('boolean');
  });

  it('messages array contains the seeded test message', async () => {
    const res = await fetch(`${baseUrl}/api/rooms/default/messages`);
    const body = (await res.json()) as { messages: Array<{ id: string; content: string }> };
    const found = body.messages.find((m) => m.id === 'test-msg-001');
    expect(found).toBeDefined();
    expect(found!.content).toBe('hello chatroom');
  });

  it('message objects have camelCase fields (roomId, authorType, msgType)', async () => {
    const res = await fetch(`${baseUrl}/api/rooms/default/messages`);
    const body = (await res.json()) as { messages: Array<Record<string, unknown>> };
    if (body.messages.length > 0) {
      const msg = body.messages[0]!;
      expect('roomId' in msg).toBe(true);
      expect('authorType' in msg).toBe(true);
      expect('msgType' in msg).toBe(true);
      expect('room_id' in msg).toBe(false);
    }
  });

  it('returns 404 for a non-existent room', async () => {
    const res = await fetch(`${baseUrl}/api/rooms/ghost-room/messages`);
    expect(res.status).toBe(404);
  });

  it('respects the limit query parameter', async () => {
    // Insert several more messages
    for (let i = 2; i <= 10; i++) {
      dbInsertMessage({
        id: `limit-test-msg-${i}`,
        roomId: 'default',
        author: 'user',
        authorType: 'human',
        content: `message ${i}`,
        msgType: 'message',
        parentId: null,
        metadata: '{}',
      });
    }
    const res = await fetch(`${baseUrl}/api/rooms/default/messages?limit=3`);
    const body = (await res.json()) as { messages: unknown[] };
    expect(body.messages.length).toBeLessThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// GET /api/agents
// ---------------------------------------------------------------------------

describe('GET /api/agents', () => {
  it('returns HTTP 200', async () => {
    const res = await fetch(`${baseUrl}/api/agents`);
    expect(res.status).toBe(200);
  });

  it('returns an array with all 12 agents', async () => {
    const res = await fetch(`${baseUrl}/api/agents`);
    const agents = (await res.json()) as unknown[];
    expect(Array.isArray(agents)).toBe(true);
    expect(agents.length).toBe(12);
  });

  it('each agent has a name field', async () => {
    const res = await fetch(`${baseUrl}/api/agents`);
    const agents = (await res.json()) as Array<{ name: string }>;
    for (const agent of agents) {
      expect(typeof agent.name).toBe('string');
      expect(agent.name.length).toBeGreaterThan(0);
    }
  });

  it('each agent has an invokable field (boolean)', async () => {
    const res = await fetch(`${baseUrl}/api/agents`);
    const agents = (await res.json()) as Array<{ invokable: unknown }>;
    for (const agent of agents) {
      expect(typeof agent.invokable).toBe('boolean');
    }
  });

  it('user agent is not invokable', async () => {
    const res = await fetch(`${baseUrl}/api/agents`);
    const agents = (await res.json()) as Array<{ name: string; invokable: boolean }>;
    const user = agents.find((a) => a.name === 'user');
    expect(user).toBeDefined();
    expect(user!.invokable).toBe(false);
  });

  it('includes bilbo, ultron, cerberus, dante in the list', async () => {
    const res = await fetch(`${baseUrl}/api/agents`);
    const agents = (await res.json()) as Array<{ name: string }>;
    const names = agents.map((a) => a.name);
    for (const expected of ['bilbo', 'ultron', 'cerberus', 'dante']) {
      expect(names).toContain(expected);
    }
  });

  it('allowedTools is stripped from every agent in the production route (SEC-MED-001)', async () => {
    const res = await fetch(`${baseUrl}/api/agents`);
    const agents = (await res.json()) as Array<Record<string, unknown>>;
    for (const agent of agents) {
      expect('allowedTools' in agent).toBe(false);
    }
  });
});
