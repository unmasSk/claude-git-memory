import { createLogger } from '../logger.js';
import { createTokenBucket } from '../services/rate-limiter.js';

const logger = createLogger('ws');

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
import { validateToken, getReservedAgentNames } from '../services/auth-tokens.js';
import { ClientMessageSchema } from '@agent-chatroom/shared';
import type { ServerMessage, Message, ConnectedUser } from '@agent-chatroom/shared';
import { sanitizePromptContent } from '../services/agent-invoker.js';

// ---------------------------------------------------------------------------
// SEC-FIX 2: Allowed origins for WebSocket upgrade — sourced from config
// ---------------------------------------------------------------------------

const ALLOWED_ORIGINS = new Set(WS_ALLOWED_ORIGINS);

// FIX 9: Shared @everyone regex — used in both directive detection and skip guard.
const EVERYONE_PATTERN = /@everyone\b/i;

// ---------------------------------------------------------------------------
// SEC-FIX 6: Per-connection token bucket rate limiter (shared factory)
// ---------------------------------------------------------------------------

// 5 messages per 10 seconds — keyed by connId
const checkRateLimit = createTokenBucket(5, 10_000);

// ---------------------------------------------------------------------------
// WS upgrade rate limiter — 50 upgrades/second, global key
// ---------------------------------------------------------------------------

// 50 upgrades per 1 second — keyed by constant 'global'
const checkUpgradeRateLimit = (() => {
  const check = createTokenBucket(50, 1_000);
  return () => check('global');
})();

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

// SEC-OPEN-008: Per-room connection cap — prevents a single room from being
// flooded with connections that consume memory and WS server capacity.
const MAX_CONNECTIONS_PER_ROOM = 20;

let _connCounter = 0;

function nextConnId(): string {
  return `conn-${++_connCounter}`;
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
 * Constructed via shared helper in auth-tokens.ts for consistency.
 */
const RESERVED_AGENT_NAMES = getReservedAgentNames();

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
        logger.warn({ origin }, 'WS open rejected: bad origin');
        ws.close();
        return;
      }

      // WS upgrade rate limit — 50 upgrades/second global
      if (!checkUpgradeRateLimit()) {
        logger.warn({ origin }, 'WS open rejected: upgrade rate limit exceeded');
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Too many connections. Try again later.',
          code: 'UPGRADE_RATE_LIMIT',
        } satisfies ServerMessage));
        ws.close();
        return;
      }

      const wsData = ws.data as WsData;
      const { roomId } = wsData.params;

      // SEC-OPEN-008: Per-room connection cap — check BEFORE consuming token.
      const existingRoomConns = roomConns.get(roomId);
      if (existingRoomConns && existingRoomConns.size >= MAX_CONNECTIONS_PER_ROOM) {
        logger.warn({ roomId, connCount: existingRoomConns.size }, 'WS connection rejected: per-room cap reached');
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Room connection limit reached. Try again later.',
          code: 'ROOM_FULL',
        } satisfies ServerMessage));
        ws.close();
        return;
      }

      // SEC-AUTH-001: Token validation — token consumed only when room has capacity.
      const rawToken = wsData.query?.token;
      const tokenName = validateToken(rawToken);
      if (tokenName === null) {
        logger.warn({ roomId }, 'WS open rejected: invalid or missing token');
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Unauthorized. Obtain a token from POST /api/auth/token.',
          code: 'UNAUTHORIZED',
        } satisfies ServerMessage));
        ws.close();
        return;
      }

      // Assign a unique connId for rate limiting and store it in the module map.
      const connId = nextConnId();
      wsConnIds.set(ws.raw ?? ws, connId);
      logger.info({ tokenName, roomId, connId }, 'WS open');

      const connectedAt = nowIso();
      connStates.set(connId, { name: tokenName, roomId, connectedAt });
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
        // SEC-OPEN-010: Warn-level log for rate-limit events — enables intrusion detection
        // and alerting on clients sending excessive messages.
        logger.warn({ connId, roomId }, 'WS rate limit exceeded');
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
          // connId must be present (checked above in rate-limit guard) and the
          // connState must exist — if it does not, the connection is corrupt.
          const connState = connStates.get(connId);
          if (!connState) {
            logger.error({ connId, roomId }, 'WS send_message: connState missing for active connId — closing');
            ws.close();
            return;
          }
          const authorName = connState.name;

          const id = generateId();
          const createdAt = nowIso();

          try {
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
          } catch (err) {
            logger.error({ err, roomId, author: authorName }, 'WS send_message: insertMessage failed');
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Failed to save message. Please try again.',
              code: 'DB_ERROR',
            } satisfies ServerMessage));
            return;
          }

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
          if (EVERYONE_PATTERN.test(msg.content)) {
            const directive = msg.content.replace(/@everyone\b/gi, '').trim();
            logger.info({ authorName, directive }, 'WS send_message @everyone directive');

            // @everyone stop — halt all pending and new invocations.
            // clearQueue and pauseInvocations run ONLY when the directive matches
            // the stop pattern — not for every @everyone message.
            const isStopDirective = /\b(stop|para|callaos|silence|quiet)\b/i.test(directive);
            if (isStopDirective) {
              const cleared = clearQueue(roomId);
              pauseInvocations(roomId);
              logger.info({ cleared }, 'WS @everyone stop: queue cleared, invocations paused');
            }

            // Ignore empty directive (e.g. "@everyone" with nothing after it)
            if (!directive) {
              break;
            }

            // FIX 5: Sanitize directive content before storage to prevent double-framing
            // injection — a user cannot embed [DIRECTIVE FROM USER...] in their own input
            // and trick agents into treating stored history as a system-level directive.
            const safeDirective = sanitizePromptContent(directive);
            const sysId = generateId();
            const sysCreatedAt = nowIso();
            try {
              insertMessage({
                id: sysId, roomId, author: 'system', authorType: 'system',
                content: `[DIRECTIVE FROM USER — ALL AGENTS MUST OBEY] ${safeDirective}`,
                msgType: 'system', parentId: null, metadata: '{}',
              });
            } catch (err) {
              logger.error({ err, roomId }, 'WS @everyone: insertMessage (system directive) failed');
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Failed to save directive. Please try again.',
                code: 'DB_ERROR',
              } satisfies ServerMessage));
              break;
            }
            const sysMsg: Message = {
              id: sysId, roomId, author: 'system', authorType: 'system',
              content: `[DIRECTIVE FROM USER — ALL AGENTS MUST OBEY] ${safeDirective}`,
              msgType: 'system', parentId: null, metadata: {}, createdAt: sysCreatedAt,
            };
            broadcastSync(roomId, { type: 'new_message', message: sysMsg }, ws);
            ws.send(JSON.stringify({ type: 'new_message', message: safeMessage(sysMsg) }));

            // @everyone (non-stop): invoke all agents currently in the room.
            // Individual @mentions in the same message are also processed below
            // (the everyoneProcessed guard only applies when @everyone IS a stop directive,
            // since in that case no invocations should happen at all).
            if (!isStopDirective) {
              const agentSessions = listAgentSessions(roomId);
              if (agentSessions.length > 0) {
                const agentNames = new Set(agentSessions.map((row) => mapAgentSessionRow(row).agentName));
                logger.debug({ agentNames: [...agentNames] }, 'WS @everyone: invoking active agents');
                invokeAgents(roomId, agentNames, safeDirective, new Map(), true);
              }
            }
          } else if (isPaused(roomId)) {
            // Non-@everyone human message resumes invocations
            resumeInvocations(roomId);
            logger.info({ authorName }, 'WS send_message: invocations resumed after @everyone stop');
          }

          // When @everyone fired a non-stop broadcast, individual @mentions in the same
          // message are intentionally skipped to avoid double-invoking agents that were
          // already covered by invokeAgents above.
          // When @everyone was a stop directive, no invocations should occur — skip too.
          // Only process individual mentions when @everyone was NOT present.
          const everyonePresent = EVERYONE_PATTERN.test(msg.content);
          const mentions = everyonePresent ? new Set<string>() : extractMentions(msg.content);
          logger.debug({ authorName, contentLength: msg.content.length, everyonePresent, mentionCount: mentions.size }, 'WS send_message processed');

          if (mentions.size > 0) {
            // priority=true: human message — goes to front of queue (FIX 4)
            // Sanitize ingress content before passing to the agent prompt layer
            // to prevent trust-boundary delimiter injection via user messages.
            invokeAgents(roomId, mentions, sanitizePromptContent(msg.content), new Map(), true);
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

          // Persist the trigger prompt as a user message for audit trail.
          // connId is always set (validated by rate-limit guard above).
          const invokeConnState = connStates.get(connId);
          if (!invokeConnState) {
            logger.error({ connId, roomId }, 'WS invoke_agent: connState missing for active connId — closing');
            ws.close();
            return;
          }
          const invokeAuthorName = invokeConnState.name;

          const invokeMsgId = generateId();
          const invokeCreatedAt = nowIso();
          try {
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
          } catch (err) {
            logger.error({ err, roomId, agent: msg.agent }, 'WS invoke_agent: insertMessage failed');
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Failed to save message. Please try again.',
              code: 'DB_ERROR',
            } satisfies ServerMessage));
            return;
          }

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

          logger.info({ agent: msg.agent, roomId }, 'WS invoke_agent');
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
      logger.info({ closedName, roomId, connId }, 'WS close');

      // Clean up connected user state and connId map.
      // Per-connection rate limit bucket lives inside the createTokenBucket closure
      // and is keyed by connId — it will naturally expire when no more messages arrive.
      if (connId) {
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
