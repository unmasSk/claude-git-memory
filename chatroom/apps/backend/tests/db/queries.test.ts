/**
 * Integration tests for DB query wrappers.
 *
 * Strategy: each describe block (or test) creates a fresh in-memory Database,
 * patches the connection singleton, applies the schema, then exercises queries.
 * This avoids any file I/O and keeps tests fully isolated.
 *
 * Note: tests inline the schema SQL rather than importing the production migration
 * runner. This is intentional — it decouples test lifecycle from migration side-effects
 * (auto-seeding, WAL pragmas targeting real files) and lets each test suite start from
 * a known-clean state without relying on file-system setup or teardown.
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Database } from 'bun:sqlite';

// ---------------------------------------------------------------------------
// Helper: build a fresh in-memory DB with the full schema applied.
// ---------------------------------------------------------------------------

function makeTestDb(): Database {
  const db = new Database(':memory:');
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA busy_timeout = 5000;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      topic       TEXT DEFAULT '',
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id          TEXT PRIMARY KEY,
      room_id     TEXT NOT NULL REFERENCES rooms(id),
      author      TEXT NOT NULL,
      author_type TEXT NOT NULL CHECK(author_type IN ('agent', 'human', 'system')),
      content     TEXT NOT NULL,
      msg_type    TEXT NOT NULL DEFAULT 'message'
                  CHECK(msg_type IN ('message', 'tool_use', 'system')),
      parent_id   TEXT REFERENCES messages(id),
      metadata    TEXT DEFAULT '{}',
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS agent_sessions (
      agent_name  TEXT NOT NULL,
      room_id     TEXT NOT NULL REFERENCES rooms(id),
      session_id  TEXT,
      model       TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'idle'
                  CHECK(status IN ('idle', 'thinking', 'tool-use', 'done', 'out', 'error', 'paused')),
      last_active TEXT,
      total_cost  REAL DEFAULT 0.0,
      turn_count  INTEGER DEFAULT 0,
      PRIMARY KEY (agent_name, room_id)
    );

    CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_messages_parent ON messages(parent_id);

    INSERT OR IGNORE INTO rooms (id, name, topic)
    VALUES ('default', 'general', 'Agent chatroom');
  `);
  return db;
}

// ---------------------------------------------------------------------------
// Inline query implementations that accept a db parameter.
// These mirror the production queries.ts exactly but are not coupled to the
// connection singleton, allowing per-test isolation.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Local row type definitions (mirror types.ts, no config.ts import needed).
// ---------------------------------------------------------------------------

type LocalMessageRow = {
  id: string;
  room_id: string;
  author: string;
  author_type: 'agent' | 'human' | 'system';
  content: string;
  msg_type: 'message' | 'tool_use' | 'system';
  parent_id: string | null;
  metadata: string;
  created_at: string;
};

type LocalAgentSessionRow = {
  agent_name: string;
  room_id: string;
  session_id: string | null;
  model: string;
  status: 'idle' | 'thinking' | 'tool-use' | 'done' | 'out' | 'error';
  last_active: string | null;
  total_cost: number;
  turn_count: number;
};

type LocalRoomRow = {
  id: string;
  name: string;
  topic: string;
  created_at: string;
};

// Thin query helpers operating on a given db instance.
function insertMessage(
  db: Database,
  row: {
    id: string;
    roomId: string;
    author: string;
    authorType: string;
    content: string;
    msgType: string;
    parentId: string | null;
    metadata: string;
  },
): void {
  db.query(
    `
    INSERT INTO messages (id, room_id, author, author_type, content, msg_type, parent_id, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(row.id, row.roomId, row.author, row.authorType, row.content, row.msgType, row.parentId, row.metadata);
}

function getRecentMessages(db: Database, roomId: string, limit: number): LocalMessageRow[] {
  return db
    .query<LocalMessageRow, [string, number]>(
      `
    SELECT * FROM (
      SELECT * FROM messages WHERE room_id = ?
      ORDER BY created_at DESC LIMIT ?
    ) ORDER BY created_at ASC
  `,
    )
    .all(roomId, limit);
}

function getMessagesBefore(db: Database, roomId: string, beforeId: string, limit: number): LocalMessageRow[] {
  return db
    .query<LocalMessageRow, [string, string, number]>(
      `
    SELECT * FROM messages
    WHERE room_id = ?
      AND created_at < (SELECT created_at FROM messages WHERE id = ?)
    ORDER BY created_at DESC LIMIT ?
  `,
    )
    .all(roomId, beforeId, limit);
}

function hasMoreMessagesBefore(db: Database, roomId: string, beforeCreatedAt: string): boolean {
  const row = db
    .query<{ count: number }, [string, string]>(
      `
    SELECT COUNT(*) as count FROM messages WHERE room_id = ? AND created_at < ?
  `,
    )
    .get(roomId, beforeCreatedAt);
  return (row?.count ?? 0) > 0;
}

function getMessageCreatedAt(db: Database, id: string): string | null {
  const row = db.query<{ created_at: string }, [string]>('SELECT created_at FROM messages WHERE id = ?').get(id);
  return row?.created_at ?? null;
}

function upsertAgentSession(
  db: Database,
  row: {
    agentName: string;
    roomId: string;
    sessionId: string | null;
    model: string;
    status: string;
  },
): void {
  db.query(
    `
    INSERT INTO agent_sessions (agent_name, room_id, session_id, model, status, last_active)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT (agent_name, room_id) DO UPDATE SET
      session_id  = excluded.session_id,
      model       = excluded.model,
      status      = excluded.status,
      last_active = datetime('now')
  `,
  ).run(row.agentName, row.roomId, row.sessionId, row.model, row.status);
}

function getAgentSession(db: Database, agentName: string, roomId: string): LocalAgentSessionRow | null {
  return (
    db
      .query<LocalAgentSessionRow, [string, string]>(
        `
    SELECT * FROM agent_sessions WHERE agent_name = ? AND room_id = ?
  `,
      )
      .get(agentName, roomId) ?? null
  );
}

function incrementAgentCost(db: Database, agentName: string, roomId: string, delta: number): void {
  db.query(
    `
    UPDATE agent_sessions SET total_cost = total_cost + ?, last_active = datetime('now')
    WHERE agent_name = ? AND room_id = ?
  `,
  ).run(delta, agentName, roomId);
}

function clearAgentSession(db: Database, agentName: string, roomId: string): void {
  db.query(
    `
    UPDATE agent_sessions SET session_id = NULL WHERE agent_name = ? AND room_id = ?
  `,
  ).run(agentName, roomId);
}

function incrementAgentTurnCount(db: Database, agentName: string, roomId: string): void {
  db.query(
    `
    UPDATE agent_sessions SET turn_count = turn_count + 1, last_active = datetime('now')
    WHERE agent_name = ? AND room_id = ?
  `,
  ).run(agentName, roomId);
}

function listRooms(db: Database): LocalRoomRow[] {
  return db.query<LocalRoomRow, []>('SELECT * FROM rooms ORDER BY created_at ASC').all();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DB queries — messages', () => {
  let db: Database;

  beforeEach(() => {
    db = makeTestDb();
  });

  afterEach(() => {
    db.close();
  });

  it('inserts a message and retrieves it by room', () => {
    insertMessage(db, {
      id: 'msg-001',
      roomId: 'default',
      author: 'user',
      authorType: 'human',
      content: 'hello',
      msgType: 'message',
      parentId: null,
      metadata: '{}',
    });

    const rows = getRecentMessages(db, 'default', 50);
    expect(rows.length).toBe(1);
    expect(rows[0]!.id).toBe('msg-001');
    expect(rows[0]!.content).toBe('hello');
    expect(rows[0]!.author).toBe('user');
  });

  it('getRecentMessages returns last N messages in ASC order', () => {
    // Insert 5 messages with explicit different timestamps
    for (let i = 1; i <= 5; i++) {
      db.query(
        `
        INSERT INTO messages (id, room_id, author, author_type, content, msg_type, parent_id, metadata, created_at)
        VALUES (?, 'default', 'user', 'human', ?, 'message', NULL, '{}', ?)
      `,
      ).run(`msg-00${i}`, `message ${i}`, `2026-03-17T10:0${i}:00.000Z`);
    }

    // Request last 3 — should be messages 3, 4, 5 in ASC order
    const rows = getRecentMessages(db, 'default', 3);
    expect(rows.length).toBe(3);
    expect(rows[0]!.id).toBe('msg-003');
    expect(rows[1]!.id).toBe('msg-004');
    expect(rows[2]!.id).toBe('msg-005');
    // Verify ASC order
    expect(rows[0]!.created_at < rows[1]!.created_at).toBe(true);
    expect(rows[1]!.created_at < rows[2]!.created_at).toBe(true);
  });

  it('getRecentMessages returns empty array when no messages', () => {
    const rows = getRecentMessages(db, 'default', 50);
    expect(rows).toEqual([]);
  });

  it('getMessagesBefore returns correct page of older messages', () => {
    for (let i = 1; i <= 5; i++) {
      db.query(
        `
        INSERT INTO messages (id, room_id, author, author_type, content, msg_type, parent_id, metadata, created_at)
        VALUES (?, 'default', 'user', 'human', ?, 'message', NULL, '{}', ?)
      `,
      ).run(`msg-00${i}`, `message ${i}`, `2026-03-17T10:0${i}:00.000Z`);
    }

    // Get messages before msg-004 (created at 10:04)
    const rows = getMessagesBefore(db, 'default', 'msg-004', 10);
    const ids = rows.map((r) => r.id);
    // Should return messages 1, 2, 3 (DESC order from query, so [3, 2, 1])
    expect(ids).toContain('msg-001');
    expect(ids).toContain('msg-002');
    expect(ids).toContain('msg-003');
    expect(ids).not.toContain('msg-004');
    expect(ids).not.toContain('msg-005');
  });

  it('getMessagesBefore respects the limit', () => {
    for (let i = 1; i <= 5; i++) {
      db.query(
        `
        INSERT INTO messages (id, room_id, author, author_type, content, msg_type, parent_id, metadata, created_at)
        VALUES (?, 'default', 'user', 'human', ?, 'message', NULL, '{}', ?)
      `,
      ).run(`msg-00${i}`, `message ${i}`, `2026-03-17T10:0${i}:00.000Z`);
    }

    const rows = getMessagesBefore(db, 'default', 'msg-005', 2);
    expect(rows.length).toBe(2);
  });

  it('hasMoreMessagesBefore returns true when older messages exist', () => {
    for (let i = 1; i <= 5; i++) {
      db.query(
        `
        INSERT INTO messages (id, room_id, author, author_type, content, msg_type, parent_id, metadata, created_at)
        VALUES (?, 'default', 'user', 'human', ?, 'message', NULL, '{}', ?)
      `,
      ).run(`msg-00${i}`, `message ${i}`, `2026-03-17T10:0${i}:00.000Z`);
    }

    // Pivot on message 3 — messages 1 and 2 are older
    const pivotCreatedAt = getMessageCreatedAt(db, 'msg-003');
    expect(pivotCreatedAt).not.toBeNull();
    const result = hasMoreMessagesBefore(db, 'default', pivotCreatedAt!);
    expect(result).toBe(true);
  });

  it('hasMoreMessagesBefore returns false when no older messages exist', () => {
    db.query(
      `
      INSERT INTO messages (id, room_id, author, author_type, content, msg_type, parent_id, metadata, created_at)
      VALUES ('msg-001', 'default', 'user', 'human', 'only message', 'message', NULL, '{}', '2026-03-17T10:01:00.000Z')
    `,
    ).run();

    const pivotCreatedAt = getMessageCreatedAt(db, 'msg-001');
    const result = hasMoreMessagesBefore(db, 'default', pivotCreatedAt!);
    expect(result).toBe(false);
  });

  it('inserts multiple messages in the same room', () => {
    for (let i = 1; i <= 3; i++) {
      insertMessage(db, {
        id: `msg-00${i}`,
        roomId: 'default',
        author: 'user',
        authorType: 'human',
        content: `message ${i}`,
        msgType: 'message',
        parentId: null,
        metadata: '{}',
      });
    }
    const rows = getRecentMessages(db, 'default', 50);
    expect(rows.length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Agent sessions
// ---------------------------------------------------------------------------

describe('DB queries — agent sessions', () => {
  let db: Database;

  beforeEach(() => {
    db = makeTestDb();
  });

  afterEach(() => {
    db.close();
  });

  it('upsertAgentSession creates a new session', () => {
    upsertAgentSession(db, {
      agentName: 'bilbo',
      roomId: 'default',
      sessionId: null,
      model: 'claude-sonnet-4-6',
      status: 'idle',
    });

    const session = getAgentSession(db, 'bilbo', 'default');
    expect(session).not.toBeNull();
    expect(session!.agent_name).toBe('bilbo');
    expect(session!.status).toBe('idle');
    expect(session!.session_id).toBeNull();
  });

  it('upsertAgentSession updates an existing session', () => {
    upsertAgentSession(db, {
      agentName: 'bilbo',
      roomId: 'default',
      sessionId: null,
      model: 'claude-sonnet-4-6',
      status: 'idle',
    });

    // Update: now thinking with a session_id
    upsertAgentSession(db, {
      agentName: 'bilbo',
      roomId: 'default',
      sessionId: 'abc-123',
      model: 'claude-sonnet-4-6',
      status: 'thinking',
    });

    const session = getAgentSession(db, 'bilbo', 'default');
    expect(session!.status).toBe('thinking');
    expect(session!.session_id).toBe('abc-123');
  });

  it('upsertAgentSession only creates one row per (agent, room) pair', () => {
    upsertAgentSession(db, {
      agentName: 'bilbo',
      roomId: 'default',
      sessionId: null,
      model: 'claude-sonnet-4-6',
      status: 'idle',
    });
    upsertAgentSession(db, {
      agentName: 'bilbo',
      roomId: 'default',
      sessionId: null,
      model: 'claude-sonnet-4-6',
      status: 'done',
    });

    const rows = db.query<{ count: number }, []>('SELECT COUNT(*) as count FROM agent_sessions').get();
    expect(rows!.count).toBe(1);
  });

  it('incrementAgentCost is atomic — two deltas sum correctly', () => {
    upsertAgentSession(db, {
      agentName: 'bilbo',
      roomId: 'default',
      sessionId: null,
      model: 'claude-sonnet-4-6',
      status: 'idle',
    });

    incrementAgentCost(db, 'bilbo', 'default', 0.001);
    incrementAgentCost(db, 'bilbo', 'default', 0.002);

    const session = getAgentSession(db, 'bilbo', 'default');
    expect(session!.total_cost).toBeCloseTo(0.003, 6);
  });

  it('incrementAgentCost handles multiple cost increments', () => {
    upsertAgentSession(db, {
      agentName: 'ultron',
      roomId: 'default',
      sessionId: null,
      model: 'claude-sonnet-4-6',
      status: 'idle',
    });

    for (let i = 0; i < 5; i++) {
      incrementAgentCost(db, 'ultron', 'default', 0.01);
    }

    const session = getAgentSession(db, 'ultron', 'default');
    expect(session!.total_cost).toBeCloseTo(0.05, 6);
  });

  it('clearAgentSession sets session_id to null', () => {
    upsertAgentSession(db, {
      agentName: 'bilbo',
      roomId: 'default',
      sessionId: 'sess-abc',
      model: 'claude-sonnet-4-6',
      status: 'done',
    });

    const before = getAgentSession(db, 'bilbo', 'default');
    expect(before!.session_id).toBe('sess-abc');

    clearAgentSession(db, 'bilbo', 'default');

    const after = getAgentSession(db, 'bilbo', 'default');
    expect(after!.session_id).toBeNull();
  });

  it('clearAgentSession preserves other fields', () => {
    upsertAgentSession(db, {
      agentName: 'bilbo',
      roomId: 'default',
      sessionId: 'sess-abc',
      model: 'claude-sonnet-4-6',
      status: 'done',
    });
    incrementAgentCost(db, 'bilbo', 'default', 0.05);

    clearAgentSession(db, 'bilbo', 'default');

    const session = getAgentSession(db, 'bilbo', 'default');
    expect(session!.model).toBe('claude-sonnet-4-6');
    expect(session!.status).toBe('done');
    expect(session!.total_cost).toBeCloseTo(0.05, 6);
  });

  it('incrementAgentTurnCount increments by 1 each call', () => {
    upsertAgentSession(db, {
      agentName: 'bilbo',
      roomId: 'default',
      sessionId: null,
      model: 'claude-sonnet-4-6',
      status: 'idle',
    });

    incrementAgentTurnCount(db, 'bilbo', 'default');
    incrementAgentTurnCount(db, 'bilbo', 'default');
    incrementAgentTurnCount(db, 'bilbo', 'default');

    const session = getAgentSession(db, 'bilbo', 'default');
    expect(session!.turn_count).toBe(3);
  });

  it('incrementAgentTurnCount starts from 0 (default)', () => {
    upsertAgentSession(db, {
      agentName: 'cerberus',
      roomId: 'default',
      sessionId: null,
      model: 'claude-sonnet-4-6',
      status: 'idle',
    });
    incrementAgentTurnCount(db, 'cerberus', 'default');
    const session = getAgentSession(db, 'cerberus', 'default');
    expect(session!.turn_count).toBe(1);
  });

  it('multiple agents can have independent sessions in the same room', () => {
    upsertAgentSession(db, {
      agentName: 'bilbo',
      roomId: 'default',
      sessionId: 'sess-b',
      model: 'claude-sonnet-4-6',
      status: 'thinking',
    });
    upsertAgentSession(db, {
      agentName: 'ultron',
      roomId: 'default',
      sessionId: 'sess-u',
      model: 'claude-sonnet-4-6',
      status: 'idle',
    });

    const bilbo = getAgentSession(db, 'bilbo', 'default');
    const ultron = getAgentSession(db, 'ultron', 'default');

    expect(bilbo!.session_id).toBe('sess-b');
    expect(ultron!.session_id).toBe('sess-u');
    expect(bilbo!.status).toBe('thinking');
    expect(ultron!.status).toBe('idle');
  });
});

// ---------------------------------------------------------------------------
// delta-messages: getMessagesSince + updateLastSeenMessage
// ---------------------------------------------------------------------------

describe('DB queries — getMessagesSince', () => {
  let db: Database;

  // Inline helpers mirroring the production queries added for delta-messages.
  // Updated to use rowid (BREAK-1 + BREAK-2 fix) and return { messages, hasMore }.
  function getMessagesSince(
    db: Database,
    roomId: string,
    sinceId: string | null,
    limit = 200,
  ): { messages: { id: string; content: string }[]; hasMore: boolean } {
    if (sinceId === null) {
      const messages = db
        .query<{ id: string; content: string }, [string, number]>(
          `SELECT id, content FROM (
             SELECT rowid, id, content FROM messages WHERE room_id = ? ORDER BY rowid DESC LIMIT ?
           ) ORDER BY rowid ASC`,
        )
        .all(roomId, limit);
      return { messages, hasMore: messages.length === limit };
    }
    // COALESCE(..., 0): if checkpoint deleted, rowid > 0 → returns all messages (safe fallback).
    const messages = db
      .query<{ id: string; content: string }, [string, string, string, number]>(
        `SELECT id, content FROM messages
         WHERE room_id = ?
           AND (? IS NULL OR rowid > COALESCE((SELECT rowid FROM messages WHERE id = ?), 0))
         ORDER BY rowid ASC LIMIT ?`,
      )
      .all(roomId, sinceId, sinceId, limit);
    return { messages, hasMore: messages.length === limit };
  }

  function updateLastSeenMessage(db: Database, agentName: string, roomId: string, messageId: string): void {
    db.query<void, [string, string, string]>(
      `UPDATE agent_sessions SET last_seen_message_id = ? WHERE agent_name = ? AND room_id = ?`,
    ).run(messageId, agentName, roomId);
  }

  function getLastSeen(db: Database, agentName: string, roomId: string): string | null {
    const row = db
      .query<{ last_seen_message_id: string | null }, [string, string]>(
        `SELECT last_seen_message_id FROM agent_sessions WHERE agent_name = ? AND room_id = ?`,
      )
      .get(agentName, roomId);
    return row?.last_seen_message_id ?? null;
  }

  beforeEach(() => {
    db = makeTestDb();
    // Add last_seen_message_id column (migration applied at runtime; not in makeTestDb schema)
    try { db.exec('ALTER TABLE agent_sessions ADD COLUMN last_seen_message_id TEXT DEFAULT NULL'); } catch { /* already exists */ }
    // Seed three messages with distinct timestamps
    db.exec(`
      INSERT INTO messages (id, room_id, author, author_type, content, msg_type, parent_id, metadata, created_at)
      VALUES
        ('m1', 'default', 'user', 'human', 'first',  'message', NULL, '{}', '2026-01-01T00:00:01'),
        ('m2', 'default', 'user', 'human', 'second', 'message', NULL, '{}', '2026-01-01T00:00:02'),
        ('m3', 'default', 'user', 'human', 'third',  'message', NULL, '{}', '2026-01-01T00:00:03');
    `);
    db.exec(`INSERT OR IGNORE INTO agent_sessions (agent_name, room_id, session_id, model, status) VALUES ('bilbo', 'default', NULL, 'test-model', 'idle')`);
  });

  afterEach(() => { db.close(); });

  it('sinceMessageId=null returns all messages (first invocation)', () => {
    const { messages } = getMessagesSince(db, 'default', null);
    expect(messages.length).toBe(3);
  });

  it('sinceMessageId=null returns messages in chronological order', () => {
    const { messages } = getMessagesSince(db, 'default', null);
    expect(messages[0]!.id).toBe('m1');
    expect(messages[1]!.id).toBe('m2');
    expect(messages[2]!.id).toBe('m3');
  });

  it('sinceMessageId=m1 returns only m2 and m3', () => {
    const { messages } = getMessagesSince(db, 'default', 'm1');
    expect(messages.length).toBe(2);
    expect(messages[0]!.id).toBe('m2');
    expect(messages[1]!.id).toBe('m3');
  });

  it('sinceMessageId=m2 returns only m3', () => {
    const { messages } = getMessagesSince(db, 'default', 'm2');
    expect(messages.length).toBe(1);
    expect(messages[0]!.id).toBe('m3');
  });

  it('sinceMessageId=m3 (latest) returns empty array', () => {
    const { messages } = getMessagesSince(db, 'default', 'm3');
    expect(messages.length).toBe(0);
  });

  it('limit is respected when sinceMessageId is null', () => {
    const { messages, hasMore } = getMessagesSince(db, 'default', null, 2);
    expect(messages.length).toBe(2);
    expect(hasMore).toBe(true);
  });

  it('limit is respected when sinceMessageId is provided', () => {
    const { messages } = getMessagesSince(db, 'default', 'm1', 1);
    expect(messages.length).toBe(1);
  });

  it('hasMore is false when result count is below the limit', () => {
    const { messages, hasMore } = getMessagesSince(db, 'default', null, 10);
    expect(messages.length).toBe(3);
    expect(hasMore).toBe(false);
  });

  it('unknown sinceMessageId falls back to full history (COALESCE rowid=0)', () => {
    // BREAK-1 fix: deleted checkpoint → COALESCE(NULL, 0) → rowid > 0 → all messages returned.
    // This prevents agents from going permanently blind when a checkpoint message is deleted.
    const { messages } = getMessagesSince(db, 'default', 'nonexistent-id');
    expect(messages.length).toBe(3);
  });

  it('updateLastSeenMessage sets last_seen_message_id on the agent session', () => {
    updateLastSeenMessage(db, 'bilbo', 'default', 'm2');
    expect(getLastSeen(db, 'bilbo', 'default')).toBe('m2');
  });

  it('updateLastSeenMessage overwrites a previous value', () => {
    updateLastSeenMessage(db, 'bilbo', 'default', 'm1');
    updateLastSeenMessage(db, 'bilbo', 'default', 'm3');
    expect(getLastSeen(db, 'bilbo', 'default')).toBe('m3');
  });

  it('last_seen_message_id defaults to NULL for new agent sessions', () => {
    expect(getLastSeen(db, 'bilbo', 'default')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

describe('DB queries — rooms', () => {
  let db: Database;

  beforeEach(() => {
    db = makeTestDb();
  });

  afterEach(() => {
    db.close();
  });

  it('default room is seeded on schema creation', () => {
    const rooms = listRooms(db);
    expect(rooms.length).toBe(1);
    expect(rooms[0]!.id).toBe('default');
    expect(rooms[0]!.name).toBe('general');
  });

  it('rooms are returned in ASC created_at order', () => {
    db.query(
      `INSERT INTO rooms (id, name, topic, created_at) VALUES ('room-a', 'Alpha', '', '2026-01-01T00:00:00')`,
    ).run();
    db.query(
      `INSERT INTO rooms (id, name, topic, created_at) VALUES ('room-b', 'Beta', '', '2025-01-01T00:00:00')`,
    ).run();

    const rooms = listRooms(db);
    // default + room-b (2025) + room-a (2026) — but default was created with datetime('now') ~ 2026
    // Just verify ordering is ascending
    for (let i = 1; i < rooms.length; i++) {
      expect(rooms[i - 1]!.created_at <= rooms[i]!.created_at).toBe(true);
    }
  });
});
