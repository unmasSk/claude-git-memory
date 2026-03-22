/**
 * WS lifecycle handlers: open(), message(), close().
 * Imported by ws.ts and passed to the Elysia .ws() definition.
 */
import {
  getRoomById,
  getRecentMessages,
  listAgentSessions,
} from '../db/queries.js';
import { mapMessageRow, mapAgentSessionRow, nowIso, safeMessage, enrichWithAttachments } from '../utils.js';
import { validateToken } from '../services/auth-tokens.js';
import { ClientMessageSchema } from '@agent-chatroom/shared';
import type { ServerMessage, ClientMessage } from '@agent-chatroom/shared';
import { ROOM_STATE_MESSAGE_LIMIT } from '../config.js';
import { mapRoomRow } from '../utils.js';
import {
  logger,
  ALLOWED_ORIGINS,
  checkRateLimit,
  checkUpgradeRateLimit,
  wsConnIds,
  connStates,
  roomConns,
  MAX_CONNECTIONS_PER_ROOM,
  nextConnId,
  getConnectedUsers,
  type WsData,
} from './ws-state.js';
import { getGitStatus } from '../services/git-status.js';
import { broadcast } from '../services/message-bus.js';
import {
  handleSendMessage,
  handleInvokeAgent,
  handleLoadHistory,
} from './ws-message-handlers.js';
import {
  handleKillAgent,
  handlePauseAgent,
  handleResumeAgent,
  handleReadChat,
  handleStopAll,
} from './ws-control-handlers.js';
import { clearQueue } from '../services/agent-invoker.js';
import { postSystemMessage } from '../services/agent-runner.js';

// ---------------------------------------------------------------------------
// open() helpers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rejectUpgrade(ws: any, logCtx: Record<string, unknown>, logMsg: string, msg?: string, code?: string): null {
  logger.warn(logCtx, logMsg);
  if (msg && code) ws.send(JSON.stringify({ type: 'error', message: msg, code } satisfies ServerMessage));
  ws.close();
  return null;
}

/**
 * Validates the WS upgrade: origin, rate limit, room cap, auth token.
 * Returns the tokenName on success, or null after closing the connection.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateUpgrade(ws: any, roomId: string): string | null {
  const origin = (ws.data as WsData & { headers?: Record<string, string> }).headers?.['origin'] ?? '';
  if (!ALLOWED_ORIGINS.has(origin))
    return rejectUpgrade(ws, { origin }, 'WS open rejected: bad origin');
  if (!checkUpgradeRateLimit())
    return rejectUpgrade(ws, { origin }, 'WS open rejected: upgrade rate limit exceeded', 'Too many connections. Try again later.', 'UPGRADE_RATE_LIMIT');
  const existingRoomConns = roomConns.get(roomId);
  if (existingRoomConns && existingRoomConns.size >= MAX_CONNECTIONS_PER_ROOM)
    return rejectUpgrade(ws, { roomId, connCount: existingRoomConns.size }, 'WS connection rejected: per-room cap reached', 'Room connection limit reached. Try again later.', 'ROOM_FULL');
  const tokenName = validateToken((ws.data as WsData).query?.token);
  if (tokenName === null)
    return rejectUpgrade(ws, { roomId }, 'WS open rejected: invalid or missing token', 'Unauthorized. Obtain a token from POST /api/auth/token.', 'UNAUTHORIZED');
  return tokenName;
}

/**
 * Registers a new connection in the module state maps and subscribes to the
 * room pub/sub topic. Broadcasts an updated user list to the room.
 * Returns the assigned connId.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function registerConnection(ws: any, roomId: string, tokenName: string): string {
  const connId = nextConnId();
  wsConnIds.set(ws.raw ?? ws, connId);
  logger.info({ tokenName, roomId, connId }, 'WS open');

  connStates.set(connId, { name: tokenName, roomId, connectedAt: nowIso() });
  if (!roomConns.has(roomId)) roomConns.set(roomId, new Set());
  roomConns.get(roomId)!.add(connId);

  const topic = `room:${roomId}`;
  ws.subscribe(topic);

  const userListMsg = JSON.stringify({ type: 'user_list_update', connectedUsers: getConnectedUsers(roomId) });
  ws.publish(topic, userListMsg);
  ws.send(userListMsg);

  return connId;
}

/**
 * Looks up the room and sends the full room_state payload (room, messages, agents,
 * connectedUsers). Returns false and closes the connection if the room is not found.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sendInitialState(ws: any, roomId: string): boolean {
  const room = getRoomById(roomId);
  if (!room) {
    ws.send(JSON.stringify({ type: 'error', message: `Room '${roomId}' not found`, code: 'ROOM_NOT_FOUND' } satisfies ServerMessage));
    ws.close();
    return false;
  }

  const messageRows = getRecentMessages(roomId, ROOM_STATE_MESSAGE_LIMIT);
  const agentRows = listAgentSessions(roomId);

  const roomState: ServerMessage = {
    type: 'room_state',
    room: mapRoomRow(room),
    messages: enrichWithAttachments(messageRows.map(mapMessageRow)).map(safeMessage),
    agents: agentRows.map((row) => {
      const status = mapAgentSessionRow(row);
      // SEC-FIX 5: Never send sessionId to clients
      return { ...status, sessionId: null };
    }),
    connectedUsers: getConnectedUsers(roomId),
  };

  ws.send(JSON.stringify(roomState));
  return true;
}

// ---------------------------------------------------------------------------
// open()
// ---------------------------------------------------------------------------

/**
 * Elysia WebSocket open handler.
 * Validates the upgrade request (origin, rate limits, room cap, token), registers the
 * connection in module state, and sends the initial room_state snapshot to the client.
 *
 * @param ws - The Elysia WebSocket instance (typed as any due to Elysia internals).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function open(ws: any): void {
  const { roomId } = (ws.data as WsData).params;

  const tokenName = validateUpgrade(ws, roomId);
  if (tokenName === null) return;

  registerConnection(ws, roomId, tokenName);
  try {
    if (sendInitialState(ws, roomId)) {
      const roomCwd = getRoomById(roomId)?.cwd ?? undefined;
      ws.send(JSON.stringify({ type: 'git_status', ...getGitStatus(roomCwd) } satisfies ServerMessage));
    }
  } catch (err) {
    logger.error({ err, roomId }, 'WS open: sendInitialState threw — closing connection');
    ws.close();
  }
}

// Broadcast git status to all active rooms every 30 seconds.
// Starts when the module is first imported (server boot).
setInterval(() => {
  for (const roomId of roomConns.keys()) {
    const roomCwd = getRoomById(roomId)?.cwd ?? undefined;
    const gitMsg: ServerMessage = { type: 'git_status', ...getGitStatus(roomCwd) };
    void broadcast(roomId, gitMsg);
  }
}, 30_000);

// ---------------------------------------------------------------------------
// message()
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseAndValidate(ws: any, rawMessage: unknown): ClientMessage | null {
  let parsed: unknown;
  try {
    parsed = typeof rawMessage === 'string' ? JSON.parse(rawMessage) : rawMessage;
  } catch {
    ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON', code: 'PARSE_ERROR' } satisfies ServerMessage));
    return null;
  }

  const result = ClientMessageSchema.safeParse(parsed);
  if (!result.success) {
    ws.send(JSON.stringify({ type: 'error', message: `Invalid message: ${result.error.issues[0]?.message ?? 'unknown'}`, code: 'VALIDATION_ERROR' } satisfies ServerMessage));
    return null;
  }

  return result.data as ClientMessage;
}

/**
 * Elysia WebSocket message handler.
 * Enforces the per-connection rate limit, parses and validates the incoming JSON
 * against ClientMessageSchema, then dispatches to the appropriate handler
 * (handleSendMessage, handleInvokeAgent, or handleLoadHistory).
 *
 * @param ws - The Elysia WebSocket instance.
 * @param rawMessage - The raw message payload (string or already-parsed object).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function message(ws: any, rawMessage: unknown): void {
  const wsData = ws.data as WsData;
  const { roomId } = wsData.params;
  const connId = wsConnIds.get(ws.raw ?? ws);

  if (!connId || !checkRateLimit(connId)) {
    logger.warn({ connId, roomId }, 'WS rate limit exceeded');
    ws.send(JSON.stringify({ type: 'error', message: 'Rate limit exceeded. Max 5 messages per 10 seconds.', code: 'RATE_LIMIT' } satisfies ServerMessage));
    return;
  }

  const msg = parseAndValidate(ws, rawMessage);
  if (!msg) return;

  switch (msg.type) {
    case 'send_message':
      handleSendMessage(ws, roomId, connId, msg.content, msg.attachmentIds, msg.mode);
      break;
    case 'invoke_agent':
      handleInvokeAgent(ws, roomId, connId, msg.agent, msg.prompt);
      break;
    case 'load_history':
      handleLoadHistory(ws, roomId, msg.before, msg.limit);
      break;
    case 'kill_agent':
      handleKillAgent(ws, roomId, msg.agentName);
      break;
    case 'pause_agent':
      handlePauseAgent(ws, roomId, msg.agentName);
      break;
    case 'resume_agent':
      handleResumeAgent(ws, roomId, msg.agentName);
      break;
    case 'read_chat':
      handleReadChat(ws, roomId, msg.agentName);
      break;
    case 'clear_queue': {
      const cleared = clearQueue(roomId);
      logger.info({ roomId, cleared }, 'WS clear_queue: agent queue drained');
      if (cleared > 0) {
        void postSystemMessage(roomId, `Queue cleared — ${cleared} pending agent${cleared === 1 ? '' : 's'} removed.`);
      }
      break;
    }
    case 'stop_all':
      handleStopAll(ws, roomId);
      break;
  }
}

// ---------------------------------------------------------------------------
// close()
// ---------------------------------------------------------------------------

/**
 * Elysia WebSocket close handler.
 * Removes the connection from all module state maps (wsConnIds, connStates, roomConns),
 * broadcasts an updated user list to the remaining room subscribers, then unsubscribes
 * the socket from the room pub/sub topic.
 *
 * @param ws - The Elysia WebSocket instance.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function close(ws: any): void {
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
}
