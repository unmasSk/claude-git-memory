import { Database } from 'bun:sqlite';
import { DB_PATH } from '../config.js';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

let _db: Database | null = null;

/**
 * Returns the singleton SQLite database instance, creating it on first call.
 *
 * Applies WAL mode, busy_timeout=5000ms, and synchronous=NORMAL on first access.
 * WAL allows concurrent reads while an agent is writing. busy_timeout prevents
 * SQLITE_BUSY errors when up to 5 agents write concurrently (FIX 4).
 *
 * @returns The shared `bun:sqlite` Database instance
 */
export function getDb(): Database {
  if (_db) return _db;

  // Ensure data directory exists
  mkdirSync(dirname(DB_PATH), { recursive: true });

  _db = new Database(DB_PATH);

  // Enable WAL mode for concurrent reads during agent writes
  _db.exec('PRAGMA journal_mode = WAL;');
  // FIX 4: Wait up to 5 seconds on locked DB before throwing SQLITE_BUSY
  _db.exec('PRAGMA busy_timeout = 5000;');
  // Speed up writes (safe with WAL)
  _db.exec('PRAGMA synchronous = NORMAL;');

  return _db;
}
