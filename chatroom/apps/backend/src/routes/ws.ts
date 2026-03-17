import { Elysia, t } from 'elysia';
import {
  getRoomById,
  getRecentMessages,
  listAgentSessions,
  insertMessage,
  getMessagesBefore,
  hasMoreMessagesBefore,
  getMessageCreatedAt,
} from '../db/queries.js';
import { extractMentions } from '../services/mention-parser.js';
import { broadcastSync } from '../services/message-bus.js';
import { invokeAgents, invokeAgent } from '../services/agent-invoker.js';
import { getAgentConfig } from '../services/agent-registry.js';
import { mapMessageRow, mapRoomRow, mapAgentSessionRow, generateId, nowIso, safeMessage } from '../utils.js';
import { ROOM_STATE_MESSAGE_LIMIT } from '../config.js';
import { ClientMessageSchema, AGENT_BY_NAME } from '@agent-chatroom/shared';
import type { ServerMessage, Message, ConnectedUser } from '@agent-chatroom/shared';

// ---------------------------------------------------------------------------
// SEC-FIX 2: Allowed origins for WebSocket upgrade
// ---------------------------------------------------------------------------

const ALLOWED_ORIGINS = new Set([
  'http://localhost:4201',
  'http://127.0.0.1:4201',
  // Allow requests with no origin (e.g. wscat, curl) in dev
  ...(process.env.NODE_ENV !== 'production' ? [''] : []),
]);

// ---------------------------------------------------------------------------
// SEC-FIX 6: Per-connection token bucket rate limiter
// ---------------------------------------------------------------------------

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

const RATE_LIMIT_MAX = 5;            // messages allowed per window
const RATE_LIMIT_WINDOW_MS = 10_000; // 10 seconds

// Map from ws instance → connId, populated in open(), cleaned in close()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const wsConnIds = new Map<any, string>();

// Map from connId → { name, roomId } for tracking connected users
interface ConnState {
  name: string;
  roomId: string;
  connectedAt: string;
}
const connStates = new Map<string, ConnState>();

// Map from roomId → Set<connId> for listing users per room
const roomConns = new Map<string, Set<string>>();

// Using a Map keyed by a unique id we stamp at open time
const buckets = new Map<string, TokenBucket>();
let _connCounter = 0;

function nextConnId(): string {
  return `conn-${++_connCounter}`;
}

function checkRateLimit(connId: string): boolean {
  const now = Date.now();
  let bucket = buckets.get(connId);

  if (!bucket) {
    bucket = { tokens: RATE_LIMIT_MAX - 1, lastRefill: now };
    buckets.set(connId, bucket);
    return true; // first message always allowed
  }

  const elapsed = now - bucket.lastRefill;
  const refill = Math.floor((elapsed / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_MAX);
  if (refill > 0) {
    bucket.tokens = Math.min(RATE_LIMIT_MAX, bucket.tokens + refill);
    bucket.lastRefill = now;
  }

  if (bucket.tokens <= 0) {
    return false;
  }

  bucket.tokens -= 1;
  return true;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the list of ConnectedUser objects currently in a room.
 */
function getConnectedUsers(roomId: string): ConnectedUser[] {
  const conns = roomConns.get(roomId);
  if (!conns) return [];
  const users: ConnectedUser[] = [];
  for (const connId of conns) {
    const state = connStates.get(connId);
    if (state) {
      users.push({ name: state.name, connectedAt: state.connectedAt });
    }
  }
  return users;
}

/**
 * Names that are reserved and cannot be used by WS clients to prevent impersonation.
 * Excludes 'user' (valid default) and 'claude' (valid orchestrator identity).
 * Only blocks specialized tool-agents that run as subprocesses.
 */
const RESERVED_AGENT_NAMES = new Set(
  Array.from(AGENT_BY_NAME.keys()).filter((n) => n !== 'user' && n !== 'claude')
);

/**
 * Resolve the author name for a new WS connection.
 * Rules:
 * - If no ?name= param, use 'user'
 * - Strip the name (preserve original case for display)
 * - If it collides with a reserved agent name (case-insensitive), reject (return null)
 * - Max 32 chars, alphanumeric + dash + underscore
 */
const NAME_RE = /^[a-zA-Z0-9_-]{1,32}$/;

function resolveConnectionName(rawName: string | undefined): string | null {
  if (!rawName || rawName.trim() === '') return 'user';
  const name = rawName.trim();
  if (!NAME_RE.test(name)) return null; // invalid chars or length
  // Block specialized agent names to prevent impersonation
  if (RESERVED_AGENT_NAMES.has(name.toLowerCase())) return null;
  return name;
}

// SEC-FIX 5: safeMessage imported from utils.ts (shared with api.ts)

// ---------------------------------------------------------------------------
// WS route
// ---------------------------------------------------------------------------

// connId is stored in the module-level wsConnIds map, not in ws.data
type WsData = { params: { roomId: string }; query: { name?: string } };

export const wsRoutes = new Elysia()
  .ws('/ws/:roomId', {
    params: t.Object({ roomId: t.String() }),
    query: t.Object({ name: t.Optional(t.String()) }),

    // SEC-HIGH-001: Hard ceiling on WS frame size — enforced by uWebSockets before handler runs
    maxPayloadLength: 64 * 1024, // 64KB

    open(ws) {
      // SEC-FIX 2: Origin check at open time.
      // Elysia's upgrade hook ignores return values and cannot reject the
      // connection, so we perform the check here and close immediately if the
      // origin is not allowed.
      const origin = (ws.data as WsData & { headers?: Record<string, string> }).headers?.['origin'] ?? '';
      if (!ALLOWED_ORIGINS.has(origin)) {
        ws.close();
        return;
      }

      const wsData = ws.data as WsData;
      const { roomId } = wsData.params;

      // Resolve connection name from ?name= query param.
      // If the name collides with an agent name, reject the connection.
      const rawName = wsData.query?.name;
      const resolvedName = resolveConnectionName(rawName);
      if (resolvedName === null) {
        ws.send(JSON.stringify({
          type: 'error',
          message: `Name '${rawName}' is reserved for agents. Choose a different name.`,
          code: 'NAME_RESERVED',
        } satisfies ServerMessage));
        ws.close();
        return;
      }

      // Assign a unique connId for rate limiting and store it in the module map.
      const connId = nextConnId();
      wsConnIds.set(ws.raw ?? ws, connId);

      const connectedAt = nowIso();
      connStates.set(connId, { name: resolvedName, roomId, connectedAt });
      if (!roomConns.has(roomId)) roomConns.set(roomId, new Set());
      roomConns.get(roomId)!.add(connId);

      const topic = `room:${roomId}`;

      // Subscribe to room pub/sub topic
      ws.subscribe(topic);

      const room = getRoomById(roomId);
      if (!room) {
        ws.send(JSON.stringify({
          type: 'error',
          message: `Room '${roomId}' not found`,
          code: 'ROOM_NOT_FOUND',
        } satisfies ServerMessage));
        ws.close();
        return;
      }

      const messageRows = getRecentMessages(roomId, ROOM_STATE_MESSAGE_LIMIT);
      const agentRows = listAgentSessions(roomId);

      const roomState: ServerMessage = {
        type: 'room_state',
        room: mapRoomRow(room),
        messages: messageRows.map((row) => safeMessage(mapMessageRow(row))),
        agents: agentRows.map((row) => {
          const status = mapAgentSessionRow(row);
          // SEC-FIX 5: Never send sessionId to clients
          return { ...status, sessionId: null };
        }),
        connectedUsers: getConnectedUsers(roomId),
      };

      ws.send(JSON.stringify(roomState));
    },

    message(ws, rawMessage) {
      const wsData = ws.data as WsData;
      const { roomId } = wsData.params;
      const connId = wsConnIds.get(ws.raw ?? ws);

      // SEC-FIX 6: Rate limit check
      if (!connId || !checkRateLimit(connId)) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Rate limit exceeded. Max 5 messages per 10 seconds.',
          code: 'RATE_LIMIT',
        } satisfies ServerMessage));
        return;
      }

      // Parse incoming message
      let parsed: unknown;
      try {
        parsed = typeof rawMessage === 'string'
          ? JSON.parse(rawMessage)
          : rawMessage;
      } catch {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid JSON',
          code: 'PARSE_ERROR',
        } satisfies ServerMessage));
        return;
      }

      const result = ClientMessageSchema.safeParse(parsed);
      if (!result.success) {
        ws.send(JSON.stringify({
          type: 'error',
          message: `Invalid message: ${result.error.issues[0]?.message ?? 'unknown'}`,
          code: 'VALIDATION_ERROR',
        } satisfies ServerMessage));
        return;
      }

      const msg = result.data;

      switch (msg.type) {

        case 'send_message': {
          const room = getRoomById(roomId);
          if (!room) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Room not found',
              code: 'ROOM_NOT_FOUND',
            } satisfies ServerMessage));
            return;
          }

          // SEC-FIX 2: Author always set server-side — never accepted from client.
          // Use the name established at connection time (from ?name= query param).
          const authorName = connStates.get(connId)?.name ?? 'user';
          const id = generateId();
          const createdAt = nowIso();

          insertMessage({
            id,
            roomId,
            author: authorName,
            authorType: 'human',
            content: msg.content,
            msgType: 'message',
            parentId: null,
            metadata: '{}',
          });

          const newMsg: Message = {
            id,
            roomId,
            author: authorName,
            authorType: 'human',
            content: msg.content,
            msgType: 'message',
            parentId: null,
            metadata: {},
            createdAt,
          };

          // Broadcast to all subscribers except sender
          broadcastSync(roomId, { type: 'new_message', message: newMsg }, ws);
          // Self-deliver: Elysia 1.4.28 does not implement publishToSelf
          ws.send(JSON.stringify({ type: 'new_message', message: safeMessage(newMsg) }));

          // FIX 5: authorType='human' — agents never trigger other agents
          const mentions = extractMentions(msg.content, 'human');

          if (mentions.size > 0) {
            // Phase 3: fire-and-forget agent invocations
            // invokeAgents handles concurrency, queueing, and per-agent locking
            invokeAgents(roomId, mentions, msg.content);
          }

          break;
        }

        case 'invoke_agent': {
          // SEC-OPEN-002: Validate agent name against registry at WS layer
          const agentConf = getAgentConfig(msg.agent);
          if (!agentConf || !agentConf.invokable) {
            ws.send(JSON.stringify({
              type: 'error',
              message: `Unknown or non-invokable agent: ${msg.agent}`,
              code: 'UNKNOWN_AGENT',
            } satisfies ServerMessage));
            return;
          }

          const room = getRoomById(roomId);
          if (!room) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Room not found',
              code: 'ROOM_NOT_FOUND',
            } satisfies ServerMessage));
            return;
          }

          // Persist the trigger prompt as a user message for audit trail
          const invokeAuthorName = connStates.get(connId)?.name ?? 'user';
          const invokeMsgId = generateId();
          const invokeCreatedAt = nowIso();
          insertMessage({
            id: invokeMsgId,
            roomId,
            author: invokeAuthorName,
            authorType: 'human',
            content: msg.prompt,
            msgType: 'message',
            parentId: null,
            metadata: '{}',
          });

          // T1-03 fix: broadcast the trigger message to all clients
          const invokeUserMsg: Message = {
            id: invokeMsgId,
            roomId,
            author: invokeAuthorName,
            authorType: 'human',
            content: msg.prompt,
            msgType: 'message',
            parentId: null,
            metadata: {},
            createdAt: invokeCreatedAt,
          };
          broadcastSync(roomId, { type: 'new_message', message: invokeUserMsg }, ws);
          // Self-deliver: Elysia 1.4.28 does not implement publishToSelf
          ws.send(JSON.stringify({ type: 'new_message', message: safeMessage(invokeUserMsg) }));

          invokeAgent(roomId, msg.agent, msg.prompt);
          break;
        }

        case 'load_history': {
          const room = getRoomById(roomId);
          if (!room) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Room not found',
              code: 'ROOM_NOT_FOUND',
            } satisfies ServerMessage));
            return;
          }

          const limit = Math.min(msg.limit, 100);
          const rows = getMessagesBefore(roomId, msg.before, limit);
          // hasMoreMessagesBefore needs a created_at timestamp, not a message ID
          const pivotCreatedAt = getMessageCreatedAt(msg.before);
          const hasMore = pivotCreatedAt
            ? hasMoreMessagesBefore(roomId, pivotCreatedAt)
            : false;

          // getMessagesBefore returns DESC — reverse to chronological order
          const safeMessages = rows.reverse().map((row) => safeMessage(mapMessageRow(row)));

          ws.send(JSON.stringify({
            type: 'history_page',
            messages: safeMessages,
            hasMore,
          } satisfies ServerMessage));
          break;
        }
      }
    },

    close(ws) {
      const { roomId } = (ws.data as WsData).params;
      const key = ws.raw ?? ws;
      const connId = wsConnIds.get(key);

      // Clean up rate limit bucket, connected user state, and connId map
      if (connId) {
        buckets.delete(connId);
        connStates.delete(connId);
        const roomConnSet = roomConns.get(roomId);
        if (roomConnSet) {
          roomConnSet.delete(connId);
          if (roomConnSet.size === 0) roomConns.delete(roomId);
        }
      }
      wsConnIds.delete(key);

      ws.unsubscribe(`room:${roomId}`);
    },
  });
