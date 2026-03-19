/**
 * WS lifecycle handlers: open(), message(), close().
 * Imported by ws.ts and passed to the Elysia .ws() definition.
 */
import {
  getRoomById,
  getRecentMessages,
  listAgentSessions,
} from '../db/queries.js';
import { mapMessageRow, mapAgentSessionRow, nowIso, safeMessage } from '../utils.js';
import { validateToken } from '../services/auth-tokens.js';
import { ClientMessageSchema } from '@agent-chatroom/shared';
import type { ServerMessage } from '@agent-chatroom/shared';
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
import { handleSendMessage, handleInvokeAgent, handleLoadHistory } from './ws-message-handlers.js';

// ---------------------------------------------------------------------------
// open()
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function open(ws: any): void {
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
    ws.send(
      JSON.stringify({
        type: 'error',
        message: 'Too many connections. Try again later.',
        code: 'UPGRADE_RATE_LIMIT',
      } satisfies ServerMessage),
    );
    ws.close();
    return;
  }

  const wsData = ws.data as WsData;
  const { roomId } = wsData.params;

  // SEC-OPEN-008: Per-room connection cap — check BEFORE consuming token.
  const existingRoomConns = roomConns.get(roomId);
  if (existingRoomConns && existingRoomConns.size >= MAX_CONNECTIONS_PER_ROOM) {
    logger.warn({ roomId, connCount: existingRoomConns.size }, 'WS connection rejected: per-room cap reached');
    ws.send(
      JSON.stringify({
        type: 'error',
        message: 'Room connection limit reached. Try again later.',
        code: 'ROOM_FULL',
      } satisfies ServerMessage),
    );
    ws.close();
    return;
  }

  // SEC-AUTH-001: Token validation — token consumed only when room has capacity.
  const rawToken = wsData.query?.token;
  const tokenName = validateToken(rawToken);
  if (tokenName === null) {
    logger.warn({ roomId }, 'WS open rejected: invalid or missing token');
    ws.send(
      JSON.stringify({
        type: 'error',
        message: 'Unauthorized. Obtain a token from POST /api/auth/token.',
        code: 'UNAUTHORIZED',
      } satisfies ServerMessage),
    );
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
    ws.send(
      JSON.stringify({
        type: 'error',
        message: `Room '${roomId}' not found`,
        code: 'ROOM_NOT_FOUND',
      } satisfies ServerMessage),
    );
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
}

// ---------------------------------------------------------------------------
// message()
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function message(ws: any, rawMessage: unknown): void {
  const wsData = ws.data as WsData;
  const { roomId } = wsData.params;
  const connId = wsConnIds.get(ws.raw ?? ws);

  // SEC-FIX 6: Rate limit check
  if (!connId || !checkRateLimit(connId)) {
    // SEC-OPEN-010: Warn-level log for rate-limit events — enables intrusion detection
    // and alerting on clients sending excessive messages.
    logger.warn({ connId, roomId }, 'WS rate limit exceeded');
    ws.send(
      JSON.stringify({
        type: 'error',
        message: 'Rate limit exceeded. Max 5 messages per 10 seconds.',
        code: 'RATE_LIMIT',
      } satisfies ServerMessage),
    );
    return;
  }

  // Parse incoming message
  let parsed: unknown;
  try {
    parsed = typeof rawMessage === 'string' ? JSON.parse(rawMessage) : rawMessage;
  } catch {
    ws.send(
      JSON.stringify({
        type: 'error',
        message: 'Invalid JSON',
        code: 'PARSE_ERROR',
      } satisfies ServerMessage),
    );
    return;
  }

  const result = ClientMessageSchema.safeParse(parsed);
  if (!result.success) {
    ws.send(
      JSON.stringify({
        type: 'error',
        message: `Invalid message: ${result.error.issues[0]?.message ?? 'unknown'}`,
        code: 'VALIDATION_ERROR',
      } satisfies ServerMessage),
    );
    return;
  }

  const msg = result.data;

  switch (msg.type) {
    case 'send_message':
      handleSendMessage(ws, roomId, connId, msg.content);
      break;

    case 'invoke_agent':
      handleInvokeAgent(ws, roomId, connId, msg.agent, msg.prompt);
      break;

    case 'load_history':
      handleLoadHistory(ws, roomId, msg.before, msg.limit);
      break;
  }
}

// ---------------------------------------------------------------------------
// close()
// ---------------------------------------------------------------------------

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
