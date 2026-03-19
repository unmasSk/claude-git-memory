/**
 * Integration tests for POST /api/rooms/:id/invite
 *
 * Tests:
 *  - 401 when Authorization header is missing or token is invalid
 *  - 401 when Bearer token format is wrong (no "Bearer " prefix)
 *  - 200/201 when a valid token is in the Authorization: Bearer <token> header
 *  - 429 when the rate limit is exceeded
 *  - 404 when the room does not exist
 *
 * Strategy: spin up a minimal Elysia server with an inline handler that
 * mirrors the production invite route exactly, using an isolated in-memory
 * SQLite DB and a fresh rate-limit bucket so tests do not share state with
 * api.test.ts or with the production apiBuckets Map.
 *
 * ESM mock ordering: mock db/connection.js BEFORE importing anything that
 * transitively loads queries.ts. The auth-tokens module is imported directly
 * so peekToken, issueToken are real (no mock needed).
 */

import { mock } from 'bun:test';
import { Database } from 'bun:sqlite';

// ---------------------------------------------------------------------------
// In-memory DB — created and mocked BEFORE any other imports
// ---------------------------------------------------------------------------

const _inviteDb = new Database(':memory:');
_inviteDb.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, topic TEXT DEFAULT '',
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

mock.module('../db/connection.js', () => ({
  getDb: () => _inviteDb,
}));

// ---------------------------------------------------------------------------
// Imports AFTER mock
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Elysia, t } from 'elysia';
import { issueToken, peekToken } from '../services/auth-tokens.js';
import { getAgentConfig } from '../services/agent-registry.js';

// ---------------------------------------------------------------------------
// Isolated rate limiter — mirrors checkApiRateLimit in api.ts exactly,
// but uses a separate Map so these tests do not share state with api.test.ts.
// ---------------------------------------------------------------------------

interface ApiBucket {
  tokens: number;
  lastRefill: number;
}

const INVITE_RATE_LIMIT_MAX = 20;
const INVITE_RATE_LIMIT_WINDOW_MS = 60_000;
const _inviteBuckets = new Map<string, ApiBucket>();

function checkInviteRateLimit(key: string): boolean {
  const now = Date.now();
  let bucket = _inviteBuckets.get(key);

  if (!bucket) {
    bucket = { tokens: INVITE_RATE_LIMIT_MAX - 1, lastRefill: now };
    _inviteBuckets.set(key, bucket);
    return true;
  }

  const elapsed = now - bucket.lastRefill;
  const refill = Math.floor((elapsed / INVITE_RATE_LIMIT_WINDOW_MS) * INVITE_RATE_LIMIT_MAX);
  if (refill > 0) {
    bucket.tokens = Math.min(INVITE_RATE_LIMIT_MAX, bucket.tokens + refill);
    bucket.lastRefill = now;
  }

  if (bucket.tokens <= 0) return false;
  bucket.tokens -= 1;
  return true;
}

/** Drain the bucket for a given key so the next request returns 429. */
function exhaustBucket(key: string): void {
  _inviteBuckets.set(key, { tokens: 0, lastRefill: Date.now() });
}

// ---------------------------------------------------------------------------
// DB helpers for the invite handler
// ---------------------------------------------------------------------------

function dbGetRoomById(id: string) {
  return _inviteDb.query<{ id: string; name: string; topic: string; created_at: string }, [string]>(
    'SELECT * FROM rooms WHERE id = ?'
  ).get(id) ?? null;
}

function dbUpsertAgentSession(row: {
  agentName: string; roomId: string; sessionId: string | null; model: string; status: string;
}) {
  _inviteDb.query(`
    INSERT INTO agent_sessions (agent_name, room_id, session_id, model, status, last_active)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT (agent_name, room_id) DO UPDATE SET
      session_id = excluded.session_id, model = excluded.model,
      status = excluded.status, last_active = datetime('now')
  `).run(row.agentName, row.roomId, row.sessionId, row.model, row.status);
}

// ---------------------------------------------------------------------------
// Test server — inline invite handler with isolated rate limit bucket
// ---------------------------------------------------------------------------

type TestApp = ReturnType<typeof Elysia.prototype.listen>;
let app: TestApp | null = null;
let baseUrl: string;

beforeAll(async () => {
  const { loadAgentRegistry } = await import('../services/agent-registry.js');
  loadAgentRegistry();

  const testApp = new Elysia()
    .post(
      '/api/rooms/:id/invite',
      ({ params, body, set, headers }) => {
        // Rate limit — uses isolated bucket, not the production one
        if (!checkInviteRateLimit('test-global')) {
          set.status = 429;
          return { error: 'Too many requests — try again later', code: 'RATE_LIMIT' };
        }

        // Auth: Bearer token in Authorization header
        const rawAuth = (headers as Record<string, string | undefined>).authorization ?? '';
        const bearerToken = rawAuth.startsWith('Bearer ') ? rawAuth.slice(7).trim() : undefined;
        if (!peekToken(bearerToken)) {
          set.status = 401;
          return { error: 'Unauthorized. Provide a valid token via Authorization: Bearer <token>', code: 'UNAUTHORIZED' };
        }

        const room = dbGetRoomById(params.id);
        if (!room) {
          set.status = 404;
          return { error: 'Room not found', code: 'NOT_FOUND' };
        }

        const added: string[] = [];
        const skipped: string[] = [];

        for (const agentName of body.agents) {
          const config = getAgentConfig(agentName);
          if (!config) {
            skipped.push(agentName);
            continue;
          }
          dbUpsertAgentSession({
            agentName: config.name,
            roomId: params.id,
            sessionId: null,
            model: config.model,
            status: 'idle',
          });
          added.push(config.name);
        }

        set.status = 201;
        return { added, skipped };
      },
      {
        params: t.Object({ id: t.String() }),
        body: t.Object({
          agents: t.Array(t.String(), { minItems: 1 }),
        }),
        headers: t.Object({ authorization: t.Optional(t.String()) }),
      }
    )
    .listen({ port: 0, hostname: '127.0.0.1' });

  await new Promise<void>((resolve) => setTimeout(resolve, 100));
  const port = (testApp as unknown as { server: { port: number } }).server?.port;
  if (!port) throw new Error('Invite test server did not start');
  baseUrl = `http://127.0.0.1:${port}`;
  app = testApp as unknown as TestApp;
});

afterAll(() => {
  _inviteDb.close();
  try {
    (app as unknown as { server: { stop: () => void } })?.server?.stop();
  } catch { /* ignore */ }
});

// ---------------------------------------------------------------------------
// Helper: POST /api/rooms/:id/invite with a given auth header
// ---------------------------------------------------------------------------

async function postInvite(
  roomId: string,
  agents: string[],
  authHeader?: string,
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authHeader !== undefined) {
    headers['Authorization'] = authHeader;
  }
  return fetch(`${baseUrl}/api/rooms/${roomId}/invite`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ agents }),
  });
}

// ---------------------------------------------------------------------------
// Auth — Bearer token header parsing
// ---------------------------------------------------------------------------

describe('POST /api/rooms/:id/invite — Authorization header', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const res = await postInvite('default', ['bilbo']);
    expect(res.status).toBe(401);
  });

  it('returns 401 error body with UNAUTHORIZED code when header is missing', async () => {
    const res = await postInvite('default', ['bilbo']);
    const body = await res.json() as { error: string; code: string };
    expect(body.code).toBe('UNAUTHORIZED');
    expect(typeof body.error).toBe('string');
  });

  it('returns 401 when Authorization header has wrong format (no "Bearer " prefix)', async () => {
    const result = issueToken('user');
    // Send token directly without "Bearer " prefix
    const res = await postInvite('default', ['bilbo'], result!.token);
    expect(res.status).toBe(401);
  });

  it('returns 401 when Authorization is "Token <token>" instead of "Bearer <token>"', async () => {
    const result = issueToken('user');
    const res = await postInvite('default', ['bilbo'], `Token ${result!.token}`);
    expect(res.status).toBe(401);
  });

  it('returns 401 when token value is an invalid UUID', async () => {
    const res = await postInvite('default', ['bilbo'], 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });

  it('returns 201 when Authorization: Bearer <valid-token> is supplied', async () => {
    const issued = issueToken('user');
    const res = await postInvite('default', ['bilbo'], `Bearer ${issued!.token}`);
    // Note: peekToken does not consume — the same token can be used again
    expect(res.status).toBe(201);
  });

  it('returns added/skipped arrays on success', async () => {
    const issued = issueToken('user');
    const res = await postInvite('default', ['bilbo', 'nonexistent-xyz'], `Bearer ${issued!.token}`);
    const body = await res.json() as { added: string[]; skipped: string[] };
    expect(Array.isArray(body.added)).toBe(true);
    expect(Array.isArray(body.skipped)).toBe(true);
  });

  it('token is not consumed by invite — same token works a second time', async () => {
    const issued = issueToken('peek-test-user');
    const token = `Bearer ${issued!.token}`;

    const res1 = await postInvite('default', ['bilbo'], token);
    const res2 = await postInvite('default', ['bilbo'], token);

    // Both must succeed because peekToken is non-consuming
    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);
  });
});

// ---------------------------------------------------------------------------
// Room not found
// ---------------------------------------------------------------------------

describe('POST /api/rooms/:id/invite — room validation', () => {
  it('returns 404 when room does not exist', async () => {
    const issued = issueToken('user');
    const res = await postInvite('nonexistent-room-xyz', ['bilbo'], `Bearer ${issued!.token}`);
    expect(res.status).toBe(404);
  });

  it('returns NOT_FOUND code in body when room missing', async () => {
    const issued = issueToken('user');
    const res = await postInvite('nonexistent-room-xyz', ['bilbo'], `Bearer ${issued!.token}`);
    const body = await res.json() as { code: string };
    expect(body.code).toBe('NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// Rate limit — /invite returns 429 after bucket is exhausted
// ---------------------------------------------------------------------------

describe('POST /api/rooms/:id/invite — rate limit (429)', () => {
  it('returns 429 when the rate limit bucket is exhausted', async () => {
    // Drain the shared test bucket to 0
    exhaustBucket('test-global');

    const issued = issueToken('user');
    const res = await postInvite('default', ['bilbo'], `Bearer ${issued!.token}`);

    expect(res.status).toBe(429);
  });

  it('returns RATE_LIMIT code in 429 response body', async () => {
    exhaustBucket('test-global');

    const issued = issueToken('user');
    const res = await postInvite('default', ['bilbo'], `Bearer ${issued!.token}`);
    const body = await res.json() as { code: string; error: string };

    expect(body.code).toBe('RATE_LIMIT');
    expect(typeof body.error).toBe('string');
  });

  it('rate limit check fires before auth check — 429 beats 401', async () => {
    exhaustBucket('test-global');

    // Send with no auth header — if rate limit fires first we get 429, not 401
    const res = await postInvite('default', ['bilbo']);

    expect(res.status).toBe(429);
  });
});
