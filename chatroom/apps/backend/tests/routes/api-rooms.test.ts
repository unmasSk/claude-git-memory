/**
 * Integration tests for room management endpoints:
 *   POST   /api/rooms          — create room + seed agents (requires auth)
 *   DELETE /api/rooms/:id      — delete room (requires auth)
 *
 * Uses an isolated in-memory SQLite DB. Mock is registered BEFORE imports
 * that transitively load db/connection.js.
 */

import { mock } from 'bun:test';
import { Database } from 'bun:sqlite';

// ---------------------------------------------------------------------------
// In-memory DB — created and mocked BEFORE any other imports
// ---------------------------------------------------------------------------

const _db = new Database(':memory:');
_db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, topic TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES rooms(id),
    author TEXT NOT NULL,
    author_type TEXT NOT NULL CHECK(author_type IN ('agent', 'human', 'system')),
    content TEXT NOT NULL,
    msg_type TEXT NOT NULL DEFAULT 'message'
              CHECK(msg_type IN ('message', 'tool_use', 'system')),
    parent_id TEXT REFERENCES messages(id),
    metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS agent_sessions (
    agent_name TEXT NOT NULL, room_id TEXT NOT NULL,
    session_id TEXT, model TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'idle',
    last_active TEXT, total_cost REAL DEFAULT 0.0, turn_count INTEGER DEFAULT 0,
    PRIMARY KEY (agent_name, room_id)
  );
  CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES rooms(id),
    message_id TEXT REFERENCES messages(id),
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  INSERT OR IGNORE INTO rooms (id, name, topic)
  VALUES ('default', 'general', 'Agent chatroom');
`);

mock.module('../../src/db/connection.js', () => ({
  getDb: () => _db,
}));

// ---------------------------------------------------------------------------
// Imports AFTER mock
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { apiRoutes } from '../../src/routes/api.js';
import { issueToken } from '../../src/services/auth-tokens.js';
import { Elysia } from 'elysia';

// ---------------------------------------------------------------------------
// Test server
// ---------------------------------------------------------------------------

const app = new Elysia().use(apiRoutes);

beforeAll(async () => {
  await app.listen(0);
});

afterAll(async () => {
  await app.stop();
});

const base = () => `http://localhost:${(app.server as { port: number }).port}`;

/** Issue a real token to use as Bearer auth in tests. */
function authHeader(): { Authorization: string } {
  const issued = issueToken('test-user');
  if (!issued) throw new Error('Could not issue test token');
  return { Authorization: `Bearer ${issued.token}` };
}

// ---------------------------------------------------------------------------
// POST /api/rooms
// ---------------------------------------------------------------------------

describe('POST /api/rooms', () => {
  it('creates a room with an auto-generated adjective-animal name', async () => {
    const res = await fetch(`${base()}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { room: { id: string; name: string; topic: string } };
    // Name must match adjective-animal slug format
    expect(body.room.name).toMatch(/^[a-z]+-[a-z]+$/);
    expect(body.room.topic).toBe('');
    expect(typeof body.room.id).toBe('string');
    expect(body.room.id.length).toBeGreaterThan(0);
  });

  it('seeds agent sessions into the new room', async () => {
    const res = await fetch(`${base()}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(201);
    const { room } = (await res.json()) as { room: { id: string } };

    // Verify agents were seeded via GET /api/rooms/:id
    const detail = await fetch(`${base()}/api/rooms/${room.id}`);
    expect(detail.status).toBe(200);
    const data = (await detail.json()) as { participants: { agentName: string }[] };
    expect(data.participants.length).toBeGreaterThan(0);
  });

  it('each created room gets a unique ID', async () => {
    const ids = await Promise.all(
      [1, 2, 3].map(async () => {
        const res = await fetch(`${base()}/api/rooms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader() },
          body: JSON.stringify({}),
        });
        const body = (await res.json()) as { room: { id: string } };
        return body.room.id;
      }),
    );
    expect(new Set(ids).size).toBe(3);
  });

  it('returns 401 when Authorization header is missing', async () => {
    const res = await fetch(`${base()}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when Bearer token is invalid', async () => {
    const res = await fetch(`${base()}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer not-a-real-token' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('UNAUTHORIZED');
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/rooms/:id
// ---------------------------------------------------------------------------

describe('DELETE /api/rooms/:id', () => {
  it('deletes an existing room', async () => {
    // Create a room first
    const createRes = await fetch(`${base()}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({}),
    });
    const { room } = (await createRes.json()) as { room: { id: string } };

    const delRes = await fetch(`${base()}/api/rooms/${room.id}`, {
      method: 'DELETE',
      headers: authHeader(),
    });
    expect(delRes.status).toBe(200);
    const body = (await delRes.json()) as { deleted: string };
    expect(body.deleted).toBe(room.id);

    // Verify it's gone
    const getRes = await fetch(`${base()}/api/rooms/${room.id}`);
    expect(getRes.status).toBe(404);
  });

  it('returns 404 when room does not exist', async () => {
    const res = await fetch(`${base()}/api/rooms/nonexistent-room-id`, {
      method: 'DELETE',
      headers: authHeader(),
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('NOT_FOUND');
  });

  it('deletes the default room successfully', async () => {
    const res = await fetch(`${base()}/api/rooms/default`, {
      method: 'DELETE',
      headers: authHeader(),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { deleted: string };
    expect(body.deleted).toBe('default');
  });

  it('also removes agent sessions when room is deleted', async () => {
    const createRes = await fetch(`${base()}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({}),
    });
    const { room } = (await createRes.json()) as { room: { id: string } };

    await fetch(`${base()}/api/rooms/${room.id}`, {
      method: 'DELETE',
      headers: authHeader(),
    });

    // Verify cascade directly — query the DB, don't infer from 404
    // T2 fix: a bug in DELETE order could leave orphaned rows even if the room row is gone
    const sessions = _db.query('SELECT * FROM agent_sessions WHERE room_id = ?').all(room.id);
    expect(sessions.length).toBe(0);
    const messages = _db.query('SELECT * FROM messages WHERE room_id = ?').all(room.id);
    expect(messages.length).toBe(0);
  });

  it('returns 401 when Authorization header is missing', async () => {
    const res = await fetch(`${base()}/api/rooms/some-room-id`, { method: 'DELETE' });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when Bearer token is invalid', async () => {
    const res = await fetch(`${base()}/api/rooms/some-room-id`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer bad-token' },
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('UNAUTHORIZED');
  });
});

// ---------------------------------------------------------------------------
// POST /api/rooms/:id/reset — endpoint removed, verify it's gone
// ---------------------------------------------------------------------------

describe('POST /api/rooms/:id/reset (removed)', () => {
  it('returns 404 — reset endpoint was removed from the API', async () => {
    const res = await fetch(`${base()}/api/rooms/default/reset`, { method: 'POST' });
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Moriarty findings — security gaps and edge cases
// ---------------------------------------------------------------------------

describe('DELETE /api/rooms/:id — moriarty findings', () => {
  it('case-sensitivity bypass: DELETE /api/rooms/DEFAULT — documents gap', async () => {
    // Moriarty finding: case-insensitive IDs could bypass protection
    // Elysia passes the raw param — 'DEFAULT' !== 'default', so 401 (no auth) or 404 (no such room)
    // Auth check fires first now, so an unauthenticated request gets 401
    const res = await fetch(`${base()}/api/rooms/DEFAULT`, {
      method: 'DELETE',
      headers: authHeader(),
    });
    // 404 means no bypass occurred (the room doesn't exist with that casing)
    expect(res.status).toBe(404);
  });

  it('concurrent DELETE of same room ID — both calls resolve without unhandled error', async () => {
    // Moriarty finding #4: race condition between two DELETEs of the same ID
    // Arrange: create a room to delete
    const createRes = await fetch(`${base()}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({}),
    });
    const { room } = (await createRes.json()) as { room: { id: string } };

    // Act: fire two concurrent DELETEs
    const [res1, res2] = await Promise.all([
      fetch(`${base()}/api/rooms/${room.id}`, { method: 'DELETE', headers: authHeader() }),
      fetch(`${base()}/api/rooms/${room.id}`, { method: 'DELETE', headers: authHeader() }),
    ]);

    const statuses = [res1.status, res2.status].sort();
    // One should succeed (200), one should get 404 (room already gone)
    // deleteRoom now uses db.transaction() — race condition is fixed
    expect(statuses).toContain(200);
    // Either way no crash — server must not throw 500
    expect([200, 404]).toContain(res1.status);
    expect([200, 404]).toContain(res2.status);
  });
});

describe('POST /api/rooms — auth enforcement', () => {
  it('returns 401 without auth — auth is now enforced', async () => {
    // Auth is now required — previously this was an open endpoint
    const res = await fetch(`${base()}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(401);
  });

  it('DELETE /api/rooms/:id returns 401 without auth — auth is now enforced', async () => {
    // Auth is now required for DELETE too
    const createRes = await fetch(`${base()}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({}),
    });
    const { room } = (await createRes.json()) as { room: { id: string } };

    const deleteRes = await fetch(`${base()}/api/rooms/${room.id}`, { method: 'DELETE' });
    expect(deleteRes.status).toBe(401);
  });
});
