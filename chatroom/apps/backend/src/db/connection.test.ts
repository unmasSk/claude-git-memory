/**
 * Coverage tests for db/connection.ts — getDb() initialization path.
 *
 * connection.ts reads DB_PATH from config.ts, which reads process.env.DB_PATH.
 * We set DB_PATH env var BEFORE importing connection.js so the singleton
 * points at a temp file, not the real database.
 *
 * Since connection.ts uses a module-level singleton (_db), and Bun caches
 * modules, we use a separate temp path to avoid conflicts with
 * queries-real.test.ts which mocks connection.js entirely.
 */
import { describe, it, expect, afterAll } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// ---------------------------------------------------------------------------
// Setup: use DB_PATH env var before any import evaluates config.ts
// (config.ts: DB_PATH = process.env.DB_PATH ?? default)
// ---------------------------------------------------------------------------

const tempDir = mkdtempSync(join(tmpdir(), 'conn-test-'));
const TEST_DB_PATH = join(tempDir, 'conn-test.db');

// Set BEFORE any import evaluates config.ts
process.env.DB_PATH = TEST_DB_PATH;

// ---------------------------------------------------------------------------
// Dynamic import to get a fresh module evaluation with our DB_PATH
// ---------------------------------------------------------------------------

afterAll(() => {
  delete process.env.DB_PATH;
  try {
    rmSync(tempDir, { recursive: true });
  } catch {
    // ignore cleanup errors
  }
});

describe('connection.ts — getDb() initialization', () => {
  it('getDb() returns an object with exec and query methods (Database interface)', async () => {
    const { getDb } = await import('./connection.js');
    const db = getDb();
    expect(typeof db.exec).toBe('function');
    expect(typeof db.query).toBe('function');
  });

  it('getDb() returns the same singleton on repeated calls', async () => {
    const { getDb } = await import('./connection.js');
    const db1 = getDb();
    const db2 = getDb();
    expect(db1).toBe(db2);
  });

  it('getDb() returns a working DB that can execute SQL queries', async () => {
    const { getDb } = await import('./connection.js');
    const db = getDb();
    const result = db.query('SELECT 1 as val').get() as { val: number };
    expect(result.val).toBe(1);
  });

  it('getDb() initializes DB with WAL journal mode', async () => {
    const { getDb } = await import('./connection.js');
    const db = getDb();
    const row = db.query('PRAGMA journal_mode').get() as { journal_mode: string };
    expect(row.journal_mode).toBe('wal');
  });
});
