import { getDb } from './connection.js';

/**
 * Creates all tables and indexes if they don't exist.
 * Seeds the default room.
 * Run this at startup before any queries.
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
                  CHECK(status IN ('idle', 'thinking', 'tool-use', 'done', 'out', 'error')),
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
}

// Allow running this file directly to initialize the schema
// e.g. bun run src/db/schema.ts
if (import.meta.main) {
  initializeSchema();
  console.log('Schema initialized successfully.');
  console.log('Tables:', getDb().query("SELECT name FROM sqlite_master WHERE type='table'").all());
}
