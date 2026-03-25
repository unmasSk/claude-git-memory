/**
 * Tests for seedAgentSessions — verifies that boot-time seeding populates
 * agent_sessions for all non-user agents in the registry.
 *
 * Pattern: mock connection.js BEFORE imports, use in-memory SQLite.
 */
import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { Database } from 'bun:sqlite';

// ---------------------------------------------------------------------------
// Shared test DB
// ---------------------------------------------------------------------------

let currentDb: Database;

function makeDb(): Database {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, topic TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS agent_sessions (
      agent_name TEXT NOT NULL, room_id TEXT NOT NULL REFERENCES rooms(id),
      session_id TEXT, model TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'idle'
        CHECK(status IN ('idle', 'thinking', 'tool-use', 'done', 'out', 'error', 'paused')),
      last_active TEXT, total_cost REAL DEFAULT 0.0, turn_count INTEGER DEFAULT 0,
      PRIMARY KEY (agent_name, room_id)
    );
    INSERT OR IGNORE INTO rooms (id, name, topic)
    VALUES ('default', 'general', 'Agent chatroom');
  `);
  return db;
}

// Mock connection BEFORE importing schema or queries
mock.module('../../src/db/connection.js', () => ({
  getDb: () => currentDb,
}));

// Import after mock is registered
import { seedAgentSessions } from '../../src/db/schema.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type AgentSessionRow = {
  agent_name: string;
  room_id: string;
  session_id: string | null;
  model: string;
  status: string;
};

function getAllSessions(db: Database): AgentSessionRow[] {
  return db.query<AgentSessionRow, []>('SELECT * FROM agent_sessions').all();
}

function getSession(db: Database, agentName: string, roomId: string): AgentSessionRow | null {
  return (
    db
      .query<AgentSessionRow, [string, string]>(
        'SELECT * FROM agent_sessions WHERE agent_name = ? AND room_id = ?',
      )
      .get(agentName, roomId) ?? null
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('seedAgentSessions', () => {
  beforeEach(() => {
    currentDb = makeDb();
  });

  afterEach(() => {
    currentDb.close();
  });

  const SAMPLE_AGENTS = [
    { name: 'user', model: 'claude-sonnet-4-6' },
    { name: 'claude', model: 'claude-opus-4-6' },
    { name: 'bilbo', model: 'claude-sonnet-4-6' },
    { name: 'ultron', model: 'claude-sonnet-4-6' },
  ];

  it('seeds all non-user agents as idle', () => {
    seedAgentSessions(SAMPLE_AGENTS, 'default');

    const sessions = getAllSessions(currentDb);
    // 'user' must be excluded; 3 agent sessions expected
    expect(sessions.length).toBe(3);
    const names = sessions.map((s) => s.agent_name).sort();
    expect(names).toEqual(['bilbo', 'claude', 'ultron']);
  });

  it('sets status to idle for every seeded agent', () => {
    seedAgentSessions(SAMPLE_AGENTS, 'default');

    const sessions = getAllSessions(currentDb);
    for (const session of sessions) {
      expect(session.status).toBe('idle');
    }
  });

  it('sets session_id to null for every seeded agent', () => {
    seedAgentSessions(SAMPLE_AGENTS, 'default');

    const sessions = getAllSessions(currentDb);
    for (const session of sessions) {
      expect(session.session_id).toBeNull();
    }
  });

  it('persists the correct model from the agent definition', () => {
    seedAgentSessions(SAMPLE_AGENTS, 'default');

    const claude = getSession(currentDb, 'claude', 'default');
    expect(claude?.model).toBe('claude-opus-4-6');

    const bilbo = getSession(currentDb, 'bilbo', 'default');
    expect(bilbo?.model).toBe('claude-sonnet-4-6');
  });

  it('is idempotent — calling twice does not duplicate rows', () => {
    seedAgentSessions(SAMPLE_AGENTS, 'default');
    seedAgentSessions(SAMPLE_AGENTS, 'default');

    const sessions = getAllSessions(currentDb);
    expect(sessions.length).toBe(3);
  });

  it('does not overwrite an existing row — preserves status and session_id on restart', () => {
    // Simulate an agent that finished a turn before the server restarted
    currentDb
      .query(
        `INSERT INTO agent_sessions (agent_name, room_id, session_id, model, status)
         VALUES ('claude', 'default', 'sess-abc', 'claude-opus-4-6', 'done')`,
      )
      .run();

    // Boot-time seed must not reset existing rows — ON CONFLICT DO NOTHING
    seedAgentSessions(SAMPLE_AGENTS, 'default');

    const claude = getSession(currentDb, 'claude', 'default');
    // Status must remain 'done' so @everyone can still invoke the agent
    expect(claude?.status).toBe('done');
    // session_id must be unchanged
    expect(claude?.session_id).toBe('sess-abc');
  });

  it('seeds into the specified room when roomId is provided', () => {
    // Create an alternate room first
    currentDb
      .query(`INSERT INTO rooms (id, name, topic) VALUES ('room-2', 'secondary', '')`)
      .run();

    seedAgentSessions(SAMPLE_AGENTS, 'room-2');

    const sessions = currentDb
      .query<AgentSessionRow, []>(`SELECT * FROM agent_sessions WHERE room_id = 'room-2'`)
      .all();
    expect(sessions.length).toBe(3);
  });

  it('handles an empty agent list without error', () => {
    seedAgentSessions([], 'default');
    const sessions = getAllSessions(currentDb);
    expect(sessions.length).toBe(0);
  });

  it('handles a list containing only the user entry', () => {
    seedAgentSessions([{ name: 'user', model: 'claude-sonnet-4-6' }], 'default');
    const sessions = getAllSessions(currentDb);
    expect(sessions.length).toBe(0);
  });
});
