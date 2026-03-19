import { Elysia, t } from 'elysia';
import {
  listRooms,
  getRoomById,
  getRecentMessages,
  getMessagesBefore,
  hasMoreMessagesBefore,
  getMessageCreatedAt,
  listAgentSessions,
  upsertAgentSession,
} from '../db/queries.js';
import { getAllAgents, getAgentConfig } from '../services/agent-registry.js';
import { mapMessageRow, mapRoomRow, mapAgentSessionRow, safeMessage } from '../utils.js';
import { ROOM_STATE_MESSAGE_LIMIT } from '../config.js';
import { validateName, issueToken, peekToken } from '../services/auth-tokens.js';
import { createLogger } from '../logger.js';

const log = createLogger('api');

// ---------------------------------------------------------------------------
// SEC-FIX 7: Rate limiter for POST /api/auth/token.
// We intentionally do NOT key by X-Forwarded-For — headers are trivially
// spoofed and the backend runs behind a proxy we do not control.
// Using 'global' caps the total token-issuance rate server-wide, which is
// sufficient to prevent brute-force token farming.
// ---------------------------------------------------------------------------

interface ApiBucket {
  tokens: number;
  lastRefill: number;
}

const API_RATE_LIMIT_MAX = 20;           // 20 token requests allowed per window
const API_RATE_LIMIT_WINDOW_MS = 60_000; // per minute
const apiBuckets = new Map<string, ApiBucket>();

function checkApiRateLimit(key: string): boolean {
  const now = Date.now();
  let bucket = apiBuckets.get(key);

  if (!bucket) {
    bucket = { tokens: API_RATE_LIMIT_MAX - 1, lastRefill: now };
    apiBuckets.set(key, bucket);
    return true;
  }

  const elapsed = now - bucket.lastRefill;
  const refill = Math.floor((elapsed / API_RATE_LIMIT_WINDOW_MS) * API_RATE_LIMIT_MAX);
  if (refill > 0) {
    bucket.tokens = Math.min(API_RATE_LIMIT_MAX, bucket.tokens + refill);
    bucket.lastRefill = now;
  }

  if (bucket.tokens <= 0) return false;
  bucket.tokens -= 1;
  return true;
}

// ---------------------------------------------------------------------------
// API route group
// ---------------------------------------------------------------------------

export const apiRoutes = new Elysia({ prefix: '/api' })

  // GET /api/rooms — list all rooms
  .get('/rooms', () => {
    const rows = listRooms();
    return rows.map(mapRoomRow);
  })

  // GET /api/rooms/:id — room detail with participant statuses
  .get(
    '/rooms/:id',
    ({ params, set }) => {
      const room = getRoomById(params.id);
      if (!room) {
        set.status = 404;
        return { error: 'Room not found', code: 'NOT_FOUND' };
      }

      const sessions = listAgentSessions(params.id);
      return {
        room: mapRoomRow(room),
        // SEC-MED-002: strip sessionId — server-internal only
        participants: sessions.map((row) => {
          const s = mapAgentSessionRow(row);
          return { ...s, sessionId: null };
        }),
      };
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )

  // GET /api/rooms/:id/messages?limit=50&before=<id> — paginated messages
  .get(
    '/rooms/:id/messages',
    ({ params, query, set }) => {
      const room = getRoomById(params.id);
      if (!room) {
        set.status = 404;
        return { error: 'Room not found', code: 'NOT_FOUND' };
      }

      const limit = Math.max(1, Math.min(Number(query.limit ?? ROOM_STATE_MESSAGE_LIMIT), 100));

      if (query.before) {
        const rows = getMessagesBefore(params.id, query.before, limit);
        // hasMoreMessagesBefore needs a created_at timestamp, not a message ID
        const pivotCreatedAt = getMessageCreatedAt(query.before);
        const hasMore = pivotCreatedAt
          ? hasMoreMessagesBefore(params.id, pivotCreatedAt)
          : false;
        // getMessagesBefore returns DESC — reverse to chronological order
        return {
          messages: rows.reverse().map(mapMessageRow).map(safeMessage),
          hasMore,
        };
      }

      const rows = getRecentMessages(params.id, limit);
      return {
        messages: rows.map(mapMessageRow).map(safeMessage),
        hasMore: false,
      };
    },
    {
      params: t.Object({ id: t.String() }),
      query: t.Object({
        limit: t.Optional(t.Numeric()),
        before: t.Optional(t.String()),
      }),
    }
  )

  // GET /api/agents — public agent registry (SEC-MED-001: strip allowedTools)
  .get('/agents', () => {
    return getAllAgents().map(({ allowedTools: _omit, ...safe }) => safe);
  })

  // POST /api/auth/token — issue a short-lived WS auth token
  // Body: { name?: string }  →  { token, expiresAt, name }
  .post(
    '/auth/token',
    ({ body, set }) => {
      // SEC-FIX 7: Rate limit keyed by 'global' — never by X-Forwarded-For.
      if (!checkApiRateLimit('global')) {
        log.warn('POST /api/auth/token rate limit exceeded');
        set.status = 429;
        return { error: 'Too many token requests — try again later', code: 'RATE_LIMIT' };
      }
      const name = validateName((body as { name?: string }).name);
      if (name === null) {
        log.warn({ rawName: (body as { name?: string }).name }, 'POST /api/auth/token invalid or reserved name');
        set.status = 400;
        return { error: 'Invalid or reserved name', code: 'NAME_INVALID' };
      }
      const issued = issueToken(name);
      if (issued === null) {
        set.status = 503;
        return { error: 'Token store full — try again later', code: 'TOKEN_STORE_FULL' };
      }
      log.info({ name }, 'POST /api/auth/token issued');
      return issued;
    },
    {
      body: t.Object({ name: t.Optional(t.String()) }),
    }
  )

  // POST /api/rooms/:id/invite — add agents to a room (create agent_session rows)
  // SEC-FIX 8: Requires a valid auth token in the Authorization header.
  // Uses peekToken (non-consuming) so the caller's WS token is not burned.
  .post(
    '/rooms/:id/invite',
    ({ params, body, set, headers }) => {
      // FIX 6: Rate limit on /invite — same global bucket as /auth/token.
      if (!checkApiRateLimit('global')) {
        log.warn('POST /api/rooms/:id/invite rate limit exceeded');
        set.status = 429;
        return { error: 'Too many requests — try again later', code: 'RATE_LIMIT' };
      }

      // FIX 2: headers.authorization is now typed via the schema declaration below.
      // Extract token from "Authorization: Bearer <token>"
      const rawAuth = headers.authorization ?? '';
      const bearerToken = rawAuth.startsWith('Bearer ') ? rawAuth.slice(7).trim() : undefined;
      if (!peekToken(bearerToken)) {
        set.status = 401;
        return { error: 'Unauthorized. Provide a valid token via Authorization: Bearer <token>', code: 'UNAUTHORIZED' };
      }

      const room = getRoomById(params.id);
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

        upsertAgentSession({
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
      // FIX 2: Typed header schema so Elysia provides headers.authorization as string | undefined
      // instead of requiring an unsafe cast to Record<string, string | undefined>.
      headers: t.Object({ authorization: t.Optional(t.String()) }),
    }
  );
