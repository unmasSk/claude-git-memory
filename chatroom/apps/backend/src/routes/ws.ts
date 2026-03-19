import { createLogger } from '../logger.js';

const logger = createLogger('ws');
function log(...args: unknown[]) { logger.info(args.map(a => typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a)).join(' ')); }

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
import { invokeAgents, invokeAgent, clearQueue, pauseInvocations, resumeInvocations, isPaused } from '../services/agent-invoker.js';
import { getAgentConfig } from '../services/agent-registry.js';
import { mapMessageRow, mapRoomRow, mapAgentSessionRow, generateId, nowIso, safeMessage } from '../utils.js';
import { ROOM_STATE_MESSAGE_LIMIT, WS_ALLOWED_ORIGINS } from '../config.js';
import { validateToken } from '../services/auth-tokens.js';
import { ClientMessageSchema, AGENT_BY_NAME } from '@agent-chatroom/shared';
import type { ServerMessage, Message, ConnectedUser } from '@agent-chatroom/shared';

// ---------------------------------------------------------------------------
// SEC-FIX 2: Allowed origins for WebSocket upgrade — sourced from config
// ---------------------------------------------------------------------------

const ALLOWED_ORIGINS = new Set(WS_ALLOWED_ORIGINS);

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
  // Dedup by name — StrictMode creates 2 WS connections from the same browser,
  // both with the same name, so the user panel would show them twice.
  const seenNames = new Set<string>();
  for (const connId of conns) {
    const state = connStates.get(connId);
    if (state && !seenNames.has(state.name)) {
      seenNames.add(state.name);
      users.push({ name: state.name, connectedAt: state.connectedAt });
    }
  }
  return users;
}

/**
 * Names that are reserved and cannot be used by WS clients to prevent impersonation.
 * Excludes 'user' (valid default) and 'claude' (valid orchestrator identity).
 * Only blocks specialized tool-agents that run as subprocesses.
 * 'system' is explicitly added for defense-in-depth (mirrors auth-tokens.ts EXTRA_RESERVED).
 */
const RESERVED_AGENT_NAMES = new Set([
  ...Array.from(AGENT_BY_NAME.keys()).filter((n) => n !== 'user' && n !== 'claude'),
  'system',
]);

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
type WsData = { params: { roomId: string }; query: { name?: string; token?: string } };

export const wsRoutes = new Elysia()
  .ws('/ws/:roomId', {
    params: t.Object({ roomId: t.String() }),
    query: t.Object({
      name: t.Optional(t.String()),
      token: t.Optional(t.String()),
    }),

    // SEC-HIGH-001: Hard ceiling on WS frame size — enforced by uWebSockets before handler runs
    maxPayloadLength: 64 * 1024, // 64KB

    open(ws) {
      // SEC-FIX 2: Origin check at open time.
      // Elysia's upgrade hook ignores return values and cannot reject the
      // connection, so we perform the check here and close immediately if the
      // origin is not allowed.
      const origin = (ws.data as WsData & { headers?: Record<string, string> }).headers?.['origin'] ?? '';
      if (!ALLOWED_ORIGINS.has(origin)) {
        log('open rejected: bad origin', origin);
        ws.close();
        return;
      }

      const wsData = ws.data as WsData;
      const { roomId } = wsData.params;

      // SEC-AUTH-001: Token validation.
      // Clients must present a valid token obtained from POST /api/auth/token.
      // The name is bound to the token at issuance — the ?name= param is ignored.
      const rawToken = wsData.query?.token;
      const tokenName = validateToken(rawToken);
      if (tokenName === null) {
        log('open rejected: invalid or missing token', roomId);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Unauthorized. Obtain a token from POST /api/auth/token.',
          code: 'UNAUTHORIZED',
        } satisfies ServerMessage));
        ws.close();
        return;
      }
      const resolvedName = tokenName;

      // Assign a unique connId for rate limiting and store it in the module map.
      const connId = nextConnId();
      wsConnIds.set(ws.raw ?? ws, connId);
      log('open', resolvedName, 'room:', roomId, 'connId:', connId);

      const connectedAt = nowIso();
      connStates.set(connId, { name: resolvedName, roomId, connectedAt });
      if (!roomConns.has(roomId)) roomConns.set(roomId, new Set());
      roomConns.get(roomId)!.add(connId);

      const topic = `room:${roomId}`;

      // Subscribe to room pub/sub topic
      ws.subscribe(topic);

      // Broadcast updated user list to all room subscribers (including self)
      const userListMsg = JSON.stringify({ type: 'user_list_update', connectedUsers: getConnectedUsers(roomId) });
      ws.publish(topic, userListMsg);
      ws.send(userListMsg);

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
        log('rate limit hit connId:', connId);
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

          // Broadcast to all subscribers (sender receives via their second StrictMode socket)
          broadcastSync(roomId, { type: 'new_message', message: newMsg }, ws);
          // Also self-deliver directly in case there's only 1 socket (production, no StrictMode)
          ws.send(JSON.stringify({ type: 'new_message', message: safeMessage(newMsg) }));

          // @everyone: post as a high-priority system directive that agents
          // must obey when they read it in their history context
          if (/@everyone\b/i.test(msg.content)) {
            const directive = msg.content.replace(/@everyone\b/gi, '').trim();
            log('send_message', authorName, '@everyone directive:', directive);

            // @everyone stop — halt all pending and new invocations
            const isStopDirective = /\b(stop|para|callaos|silence|quiet)\b/i.test(directive);
            if (isStopDirective) {
              const cleared = clearQueue(roomId);
              pauseInvocations(roomId);
              log('@everyone stop — cleared', cleared, 'queued entries, invocations paused');
            }

            // Ignore empty directive (e.g. "@everyone" with nothing after it)
            if (!directive) {
              break;
            }

            const sysId = generateId();
            const sysCreatedAt = nowIso();
            insertMessage({
              id: sysId, roomId, author: 'system', authorType: 'system',
              content: `[DIRECTIVE FROM USER — ALL AGENTS MUST OBEY] ${directive}`,
              msgType: 'system', parentId: null, metadata: '{}',
            });
            const sysMsg: Message = {
              id: sysId, roomId, author: 'system', authorType: 'system',
              content: `[DIRECTIVE FROM USER — ALL AGENTS MUST OBEY] ${directive}`,
              msgType: 'system', parentId: null, metadata: {}, createdAt: sysCreatedAt,
            };
            broadcastSync(roomId, { type: 'new_message', message: sysMsg }, ws);
            ws.send(JSON.stringify({ type: 'new_message', message: safeMessage(sysMsg) }));

            // @everyone (non-stop): invoke all agents currently in the room
            if (!isStopDirective) {
              const agentSessions = listAgentSessions(roomId);
              if (agentSessions.length > 0) {
                const agentNames = new Set(agentSessions.map((row) => mapAgentSessionRow(row).agentName));
                log('@everyone — invoking active agents:', [...agentNames]);
                invokeAgents(roomId, agentNames, directive);
              }
            }
          } else if (isPaused(roomId)) {
            // Non-@everyone human message resumes invocations
            resumeInvocations(roomId);
            log('send_message', authorName, 'invocations resumed after @everyone stop');
          }

          const mentions = extractMentions(msg.content);
          log('send_message', authorName, 'contentLength:', msg.content.length, 'mentions:', [...mentions]);

          if (mentions.size > 0) {
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

          log('invoke_agent', msg.agent, 'room:', roomId);
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
      const closedName = connId ? connStates.get(connId)?.name : 'unknown';
      log('close', closedName, 'room:', roomId, 'connId:', connId);

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

      // Broadcast updated user list before unsubscribing so this connection still receives it
      const topic = `room:${roomId}`;
      ws.publish(topic, JSON.stringify({ type: 'user_list_update', connectedUsers: getConnectedUsers(roomId) }));

      ws.unsubscribe(topic);
    },
  });
