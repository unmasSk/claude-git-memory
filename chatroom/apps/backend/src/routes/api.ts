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

      const limit = Math.min(Number(query.limit ?? ROOM_STATE_MESSAGE_LIMIT), 100);

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

  // POST /api/rooms/:id/invite — add agents to a room (create agent_session rows)
  .post(
    '/rooms/:id/invite',
    ({ params, body, set }) => {
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
    }
  );
