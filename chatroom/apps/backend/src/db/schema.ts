import { getDb } from './connection.js';
import { insertAgentSessionIfMissing } from './queries.js';
import { createLogger } from '../logger.js';

const logger = createLogger('schema');

/**
 * Creates all tables and indexes if they do not exist, then seeds the default room.
 *
 * Idempotent — safe to call on every startup. Must run before any query
 * touches `rooms`, `messages`, or `agent_sessions`.
 *
 * @throws If the SQLite exec fails (e.g. corrupt DB, permission error)
 */
export function initializeSchema(): void {
  const db = getDb();

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

    CREATE TABLE IF NOT EXISTS attachments (
      id           TEXT PRIMARY KEY,
      room_id      TEXT NOT NULL REFERENCES rooms(id),
      message_id   TEXT REFERENCES messages(id),
      filename     TEXT NOT NULL,
      mime_type    TEXT NOT NULL,
      size_bytes   INTEGER NOT NULL,
      storage_path TEXT NOT NULL,
      created_at   TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_messages_parent ON messages(parent_id);
    CREATE INDEX IF NOT EXISTS idx_attachments_message ON attachments(message_id);
  `);

  // Idempotent migrations — add columns to existing DBs.
  // ALTER TABLE fails with "duplicate column" if already present, so we catch and ignore.
  const migrations = [
    'ALTER TABLE agent_sessions ADD COLUMN last_input_tokens INTEGER DEFAULT 0',
    'ALTER TABLE agent_sessions ADD COLUMN last_output_tokens INTEGER DEFAULT 0',
    'ALTER TABLE agent_sessions ADD COLUMN last_context_window INTEGER DEFAULT 0',
    'ALTER TABLE agent_sessions ADD COLUMN last_duration_ms INTEGER DEFAULT 0',
    'ALTER TABLE agent_sessions ADD COLUMN last_num_turns INTEGER DEFAULT 0',
    'ALTER TABLE rooms ADD COLUMN cwd TEXT DEFAULT NULL',
    // delta-messages: tracks the last message this agent has already seen.
    // NULL on first invocation → full history is sent; set after each response.
    'ALTER TABLE agent_sessions ADD COLUMN last_seen_message_id TEXT DEFAULT NULL',
  ];
  for (const sql of migrations) {
    try {
      db.exec(sql);
    } catch (err: unknown) {
      // SEC-MED-002: only swallow expected "duplicate column" errors from idempotent
      // ALTER TABLE migrations. All other errors (corrupt DB, permission denied, etc.)
      // are re-thrown so the server fails fast rather than silently masking data loss.
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('duplicate column name')) {
        throw err;
      }
    }
  }
}

/**
 * Seed all registered agents into `agent_sessions` for the given room.
 *
 * Idempotent via INSERT … ON CONFLICT DO NOTHING — only inserts rows that do
 * not already exist. Existing rows (and their status) are left untouched so a
 * server restart does not reset a `done` agent back to `idle`, which would
 * break `@everyone` invocation (which only targets thinking/tool-use/done).
 *
 * Excludes the 'user' entry because users are human participants, not agent sessions.
 * Called once after `initializeSchema()` so the sidebar shows all agents on first load.
 *
 * @param agents - Agent definitions to seed (name + model)
 * @param roomId - Room to seed into
 */
export function seedAgentSessions(
  agents: ReadonlyArray<{ name: string; model: string }>,
  roomId: string,
): void {
  let count = 0;
  for (const agent of agents) {
    if (agent.name === 'user') continue;
    insertAgentSessionIfMissing(agent.name, roomId, agent.model);
    count++;
  }
  logger.info({ count, roomId }, 'agent sessions seeded');
}

// Allow running this file directly to initialize the schema
// e.g. bun run src/db/schema.ts
if (import.meta.main) {
  initializeSchema();
  const tables = getDb().query("SELECT name FROM sqlite_master WHERE type='table'").all();
  logger.info({ tables }, 'schema initialized');
}
