import { Database } from 'bun:sqlite';
import { DB_PATH } from '../config.js';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

let _db: Database | null = null;

/**
 * Returns the singleton SQLite database instance.
 * Applies WAL mode and busy_timeout on first access.
 * FIX 4: busy_timeout = 5000 prevents SQLITE_BUSY under 5 concurrent agents.
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
