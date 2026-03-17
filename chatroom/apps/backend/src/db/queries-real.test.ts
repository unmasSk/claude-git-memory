/**
 * Coverage tests for db/queries.ts using the REAL module functions.
 *
 * We use bun:test's mock() to override the connection module's getDb()
 * export so the real query functions operate on a fresh in-memory DB.
 *
 * Pattern (Bun ESM-safe):
 *   1. mock() the module BEFORE importing the code under test
 *   2. All imports come AFTER mock declarations
 */
import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { Database } from 'bun:sqlite';

// ---------------------------------------------------------------------------
// Shared test DB — rotated per test
// ---------------------------------------------------------------------------

let currentDb: Database;

function makeDb(): Database {
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
// Mock the connection module BEFORE importing queries.ts
// The mock factory must reference `currentDb` via closure so it can be
// rotated per-test. Bun evaluates the factory lazily on first import.
// ---------------------------------------------------------------------------

mock.module('./connection.js', () => ({
  getDb: () => currentDb,
}));

// ---------------------------------------------------------------------------
// Now import the REAL query functions (they will call our mocked getDb)
// ---------------------------------------------------------------------------

import {
  getRoomById,
  listRooms,
  insertMessage,
  getRecentMessages,
  getMessagesBefore,
  getMessageCreatedAt,
  hasMoreMessagesBefore,
  getAgentSession,
  listAgentSessions,
  upsertAgentSession,
  updateAgentStatus,
  incrementAgentCost,
  incrementAgentTurnCount,
  clearAgentSession,
} from './queries.js';

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

describe('queries.ts — real module — rooms', () => {
  beforeEach(() => { currentDb = makeDb(); });
  afterEach(() => { currentDb.close(); });

  it('listRooms returns the default seeded room', () => {
    const rooms = listRooms();
    expect(rooms.length).toBe(1);
    expect(rooms[0].id).toBe('default');
    expect(rooms[0].name).toBe('general');
  });

  it('getRoomById returns the default room', () => {
    const room = getRoomById('default');
    expect(room).not.toBeNull();
    expect(room!.id).toBe('default');
    expect(room!.name).toBe('general');
  });

  it('getRoomById returns null for unknown room', () => {
    expect(getRoomById('ghost')).toBeNull();
  });

  it('listRooms returns rooms in ascending created_at order', () => {
    currentDb.query(`INSERT INTO rooms (id, name, topic, created_at) VALUES ('a-room', 'A', '', '2025-01-01')`).run();
    const rooms = listRooms();
    for (let i = 1; i < rooms.length; i++) {
      expect(rooms[i - 1].created_at <= rooms[i].created_at).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

describe('queries.ts — real module — messages', () => {
  beforeEach(() => { currentDb = makeDb(); });
  afterEach(() => { currentDb.close(); });

  it('insertMessage persists a row retrievable by getRecentMessages', () => {
    insertMessage({
      id: 'qr-001',
      roomId: 'default',
      author: 'user',
      authorType: 'human',
      content: 'hello real queries',
      msgType: 'message',
      parentId: null,
      metadata: '{}',
    });
    const rows = getRecentMessages('default', 50);
    expect(rows.length).toBe(1);
    expect(rows[0].id).toBe('qr-001');
    expect(rows[0].content).toBe('hello real queries');
    expect(rows[0].author).toBe('user');
  });

  it('insertMessage stores metadata as a JSON string', () => {
    insertMessage({
      id: 'qr-meta',
      roomId: 'default',
      author: 'bilbo',
      authorType: 'agent',
      content: 'tool result',
      msgType: 'tool_use',
      parentId: null,
      metadata: '{"tool":"Read","filePath":"/foo.ts"}',
    });
    const rows = getRecentMessages('default', 50);
    expect(rows[0].metadata).toBe('{"tool":"Read","filePath":"/foo.ts"}');
  });

  it('insertMessage supports a parentId', () => {
    insertMessage({ id: 'parent-msg', roomId: 'default', author: 'user', authorType: 'human', content: 'parent', msgType: 'message', parentId: null, metadata: '{}' });
    insertMessage({ id: 'child-msg', roomId: 'default', author: 'bilbo', authorType: 'agent', content: 'child', msgType: 'message', parentId: 'parent-msg', metadata: '{}' });
    const rows = getRecentMessages('default', 50);
    const child = rows.find((r) => r.id === 'child-msg');
    expect(child!.parent_id).toBe('parent-msg');
  });

  it('getRecentMessages returns last N in ASC order', () => {
    for (let i = 1; i <= 5; i++) {
      currentDb.query(`
        INSERT INTO messages (id, room_id, author, author_type, content, msg_type, parent_id, metadata, created_at)
        VALUES (?, 'default', 'user', 'human', ?, 'message', NULL, '{}', ?)
      `).run(`qr-r-00${i}`, `m${i}`, `2026-03-17T10:0${i}:00.000Z`);
    }
    const rows = getRecentMessages('default', 3);
    expect(rows.length).toBe(3);
    expect(rows[0].id).toBe('qr-r-003');
    expect(rows[2].id).toBe('qr-r-005');
    expect(rows[0].created_at < rows[2].created_at).toBe(true);
  });

  it('getRecentMessages returns empty array when no messages', () => {
    expect(getRecentMessages('default', 50)).toEqual([]);
  });

  it('getMessagesBefore returns messages older than the pivot', () => {
    for (let i = 1; i <= 5; i++) {
      currentDb.query(`
        INSERT INTO messages (id, room_id, author, author_type, content, msg_type, parent_id, metadata, created_at)
        VALUES (?, 'default', 'user', 'human', ?, 'message', NULL, '{}', ?)
      `).run(`qr-b-00${i}`, `m${i}`, `2026-03-17T10:0${i}:00.000Z`);
    }
    const rows = getMessagesBefore('default', 'qr-b-004', 10);
    const ids = rows.map((r) => r.id);
    expect(ids).toContain('qr-b-001');
    expect(ids).toContain('qr-b-003');
    expect(ids).not.toContain('qr-b-004');
    expect(ids).not.toContain('qr-b-005');
  });

  it('getMessagesBefore respects the limit', () => {
    for (let i = 1; i <= 5; i++) {
      currentDb.query(`
        INSERT INTO messages (id, room_id, author, author_type, content, msg_type, parent_id, metadata, created_at)
        VALUES (?, 'default', 'user', 'human', ?, 'message', NULL, '{}', ?)
      `).run(`qr-lim-00${i}`, `m${i}`, `2026-03-17T10:0${i}:00.000Z`);
    }
    const rows = getMessagesBefore('default', 'qr-lim-005', 2);
    expect(rows.length).toBe(2);
  });

  it('getMessageCreatedAt returns timestamp for known message', () => {
    currentDb.query(`
      INSERT INTO messages (id, room_id, author, author_type, content, msg_type, parent_id, metadata, created_at)
      VALUES ('qr-ts', 'default', 'user', 'human', 'hi', 'message', NULL, '{}', '2026-03-17T10:01:00.000Z')
    `).run();
    const ts = getMessageCreatedAt('qr-ts');
    expect(ts).toBe('2026-03-17T10:01:00.000Z');
  });

  it('getMessageCreatedAt returns null for unknown ID', () => {
    expect(getMessageCreatedAt('no-such-id')).toBeNull();
  });

  it('hasMoreMessagesBefore returns true when older messages exist', () => {
    for (let i = 1; i <= 3; i++) {
      currentDb.query(`
        INSERT INTO messages (id, room_id, author, author_type, content, msg_type, parent_id, metadata, created_at)
        VALUES (?, 'default', 'user', 'human', ?, 'message', NULL, '{}', ?)
      `).run(`qr-hm-00${i}`, `m${i}`, `2026-03-17T10:0${i}:00.000Z`);
    }
    const pivotTs = getMessageCreatedAt('qr-hm-003');
    expect(hasMoreMessagesBefore('default', pivotTs!)).toBe(true);
  });

  it('hasMoreMessagesBefore returns false when no older messages', () => {
    currentDb.query(`
      INSERT INTO messages (id, room_id, author, author_type, content, msg_type, parent_id, metadata, created_at)
      VALUES ('qr-solo', 'default', 'user', 'human', 'only', 'message', NULL, '{}', '2026-03-17T10:01:00.000Z')
    `).run();
    const ts = getMessageCreatedAt('qr-solo');
    expect(hasMoreMessagesBefore('default', ts!)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Agent sessions
// ---------------------------------------------------------------------------

describe('queries.ts — real module — agent sessions', () => {
  beforeEach(() => { currentDb = makeDb(); });
  afterEach(() => { currentDb.close(); });

  it('upsertAgentSession creates a new session', () => {
    upsertAgentSession({ agentName: 'bilbo', roomId: 'default', sessionId: null, model: 'claude-sonnet-4-6', status: 'idle' });
    const sess = getAgentSession('bilbo', 'default');
    expect(sess).not.toBeNull();
    expect(sess!.agent_name).toBe('bilbo');
    expect(sess!.status).toBe('idle');
    expect(sess!.session_id).toBeNull();
  });

  it('upsertAgentSession updates an existing session (UPSERT)', () => {
    upsertAgentSession({ agentName: 'bilbo', roomId: 'default', sessionId: null, model: 'claude-sonnet-4-6', status: 'idle' });
    upsertAgentSession({ agentName: 'bilbo', roomId: 'default', sessionId: 'sess-abc', model: 'claude-sonnet-4-6', status: 'thinking' });
    const sess = getAgentSession('bilbo', 'default');
    expect(sess!.status).toBe('thinking');
    expect(sess!.session_id).toBe('sess-abc');
  });

  it('getAgentSession returns null for unknown agent', () => {
    expect(getAgentSession('nobody', 'default')).toBeNull();
  });

  it('listAgentSessions returns all sessions for a room in ASC order', () => {
    upsertAgentSession({ agentName: 'ultron', roomId: 'default', sessionId: null, model: 'claude-sonnet-4-6', status: 'idle' });
    upsertAgentSession({ agentName: 'bilbo', roomId: 'default', sessionId: null, model: 'claude-sonnet-4-6', status: 'idle' });
    const sessions = listAgentSessions('default');
    expect(sessions.length).toBe(2);
    expect(sessions[0].agent_name).toBe('bilbo');
    expect(sessions[1].agent_name).toBe('ultron');
  });

  it('listAgentSessions returns empty array when no sessions', () => {
    expect(listAgentSessions('default')).toEqual([]);
  });

  it('updateAgentStatus changes the status field', () => {
    upsertAgentSession({ agentName: 'dante', roomId: 'default', sessionId: null, model: 'claude-sonnet-4-6', status: 'idle' });
    updateAgentStatus('dante', 'default', 'thinking');
    const sess = getAgentSession('dante', 'default');
    expect(sess!.status).toBe('thinking');
  });

  it('incrementAgentCost accumulates via delta (not overwrite)', () => {
    upsertAgentSession({ agentName: 'cerberus', roomId: 'default', sessionId: null, model: 'claude-sonnet-4-6', status: 'idle' });
    incrementAgentCost('cerberus', 'default', 0.01);
    incrementAgentCost('cerberus', 'default', 0.02);
    const sess = getAgentSession('cerberus', 'default');
    expect(sess!.total_cost).toBeCloseTo(0.03, 6);
  });

  it('incrementAgentTurnCount starts from 0 and increments per call', () => {
    upsertAgentSession({ agentName: 'argus', roomId: 'default', sessionId: null, model: 'claude-sonnet-4-6', status: 'idle' });
    incrementAgentTurnCount('argus', 'default');
    incrementAgentTurnCount('argus', 'default');
    incrementAgentTurnCount('argus', 'default');
    const sess = getAgentSession('argus', 'default');
    expect(sess!.turn_count).toBe(3);
  });

  it('clearAgentSession sets session_id to null', () => {
    upsertAgentSession({ agentName: 'house', roomId: 'default', sessionId: 'sess-xyz', model: 'claude-sonnet-4-6', status: 'done' });
    clearAgentSession('house', 'default');
    const sess = getAgentSession('house', 'default');
    expect(sess!.session_id).toBeNull();
  });

  it('clearAgentSession preserves model, status, and cost fields', () => {
    upsertAgentSession({ agentName: 'yoda', roomId: 'default', sessionId: 'sess-yoda', model: 'claude-opus-4-6', status: 'done' });
    incrementAgentCost('yoda', 'default', 0.05);
    clearAgentSession('yoda', 'default');
    const sess = getAgentSession('yoda', 'default');
    expect(sess!.model).toBe('claude-opus-4-6');
    expect(sess!.status).toBe('done');
    expect(sess!.total_cost).toBeCloseTo(0.05, 6);
  });
});
