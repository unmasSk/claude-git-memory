/**
 * WS message case handlers — called from the message() dispatcher in ws-handlers.ts.
 * Each function handles one ClientMessage type: send_message, invoke_agent, load_history.
 */
import {
  getRoomById,
  listAgentSessions,
  insertMessage,
  getMessagesBefore,
  hasMoreMessagesBefore,
  getMessageCreatedAt,
} from '../db/queries.js';
import { extractMentions } from '../services/mention-parser.js';
import { broadcastSync } from '../services/message-bus.js';
import {
  invokeAgents,
  invokeAgent,
  clearQueue,
  pauseInvocations,
  resumeInvocations,
  isPaused,
  sanitizePromptContent,
} from '../services/agent-invoker.js';
import { getAgentConfig } from '../services/agent-registry.js';
import { mapMessageRow, mapAgentSessionRow, generateId, nowIso, safeMessage } from '../utils.js';
import type { ServerMessage, Message } from '@agent-chatroom/shared';
import { logger, connStates, EVERYONE_PATTERN } from './ws-state.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sendError(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ws: any,
  message: string,
  code: string,
): void {
  ws.send(JSON.stringify({ type: 'error', message, code } satisfies ServerMessage));
}

/**
 * Handle the @everyone directive embedded in a send_message.
 * Returns true if processing should stop (stop directive or empty directive after strip).
 */
function handleEveryoneDirective(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ws: any,
  roomId: string,
  content: string,
  authorName: string,
): void {
  const directive = content.replace(/@everyone\b/gi, '').trim();
  logger.info({ authorName, directive }, 'WS send_message @everyone directive');

  // @everyone stop — halt all pending and new invocations.
  const isStopDirective = /\b(stop|para|callaos|silence|quiet)\b/i.test(directive);
  if (isStopDirective) {
    const cleared = clearQueue(roomId);
    pauseInvocations(roomId);
    logger.info({ cleared }, 'WS @everyone stop: queue cleared, invocations paused');
  }

  if (!directive) return; // empty after stripping @everyone

  // FIX 5: Sanitize before storage to prevent double-framing injection.
  const safeDirective = sanitizePromptContent(directive);
  const sysId = generateId();
  const sysCreatedAt = nowIso();
  try {
    insertMessage({
      id: sysId,
      roomId,
      author: 'system',
      authorType: 'system',
      content: `[DIRECTIVE FROM USER — ALL AGENTS MUST OBEY] ${safeDirective}`,
      msgType: 'system',
      parentId: null,
      metadata: '{}',
    });
  } catch (err) {
    logger.error({ err, roomId }, 'WS @everyone: insertMessage (system directive) failed');
    sendError(ws, 'Failed to save directive. Please try again.', 'DB_ERROR');
    return;
  }
  const sysMsg: Message = {
    id: sysId,
    roomId,
    author: 'system',
    authorType: 'system',
    content: `[DIRECTIVE FROM USER — ALL AGENTS MUST OBEY] ${safeDirective}`,
    msgType: 'system',
    parentId: null,
    metadata: {},
    createdAt: sysCreatedAt,
  };
  broadcastSync(roomId, { type: 'new_message', message: sysMsg }, ws);
  ws.send(JSON.stringify({ type: 'new_message', message: safeMessage(sysMsg) }));

  // @everyone (non-stop): invoke all agents currently in the room.
  if (!isStopDirective) {
    const agentSessions = listAgentSessions(roomId);
    if (agentSessions.length > 0) {
      const agentNames = new Set(agentSessions.map((row) => mapAgentSessionRow(row).agentName));
      logger.debug({ agentNames: [...agentNames] }, 'WS @everyone: invoking active agents');
      invokeAgents(roomId, agentNames, safeDirective, new Map(), true);
    }
  }
}

// ---------------------------------------------------------------------------
// send_message
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handleSendMessage(ws: any, roomId: string, connId: string, content: string): void {
  const room = getRoomById(roomId);
  if (!room) { sendError(ws, 'Room not found', 'ROOM_NOT_FOUND'); return; }

  // SEC-FIX 2: Author always set server-side — never accepted from client.
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
    insertMessage({ id, roomId, author: authorName, authorType: 'human', content, msgType: 'message', parentId: null, metadata: '{}' });
  } catch (err) {
    logger.error({ err, roomId, author: authorName }, 'WS send_message: insertMessage failed');
    sendError(ws, 'Failed to save message. Please try again.', 'DB_ERROR');
    return;
  }

  const newMsg: Message = { id, roomId, author: authorName, authorType: 'human', content, msgType: 'message', parentId: null, metadata: {}, createdAt };
  // Broadcast to all subscribers; self-deliver for production (no StrictMode second socket)
  broadcastSync(roomId, { type: 'new_message', message: newMsg }, ws);
  ws.send(JSON.stringify({ type: 'new_message', message: safeMessage(newMsg) }));

  if (EVERYONE_PATTERN.test(content)) {
    handleEveryoneDirective(ws, roomId, content, authorName);
  } else if (isPaused(roomId)) {
    // Non-@everyone human message resumes invocations
    resumeInvocations(roomId);
    logger.info({ authorName }, 'WS send_message: invocations resumed after @everyone stop');
  }

  // Skip individual @mentions when @everyone was present (already handled above or was a stop).
  // Only process individual mentions when @everyone was NOT present.
  const everyonePresent = EVERYONE_PATTERN.test(content);
  const mentions = everyonePresent ? new Set<string>() : extractMentions(content);
  logger.debug({ authorName, contentLength: content.length, everyonePresent, mentionCount: mentions.size }, 'WS send_message processed');

  if (mentions.size > 0) {
    // priority=true: human message — goes to front of queue (FIX 4)
    invokeAgents(roomId, mentions, sanitizePromptContent(content), new Map(), true);
  }
}

// ---------------------------------------------------------------------------
// invoke_agent
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handleInvokeAgent(ws: any, roomId: string, connId: string, agent: string, prompt: string): void {
  // SEC-OPEN-002: Validate agent name against registry at WS layer
  const agentConf = getAgentConfig(agent);
  if (!agentConf || !agentConf.invokable) {
    sendError(ws, `Unknown or non-invokable agent: ${agent}`, 'UNKNOWN_AGENT');
    return;
  }

  const room = getRoomById(roomId);
  if (!room) { sendError(ws, 'Room not found', 'ROOM_NOT_FOUND'); return; }

  // Persist trigger prompt as a user message for audit trail.
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
    insertMessage({ id: invokeMsgId, roomId, author: invokeAuthorName, authorType: 'human', content: prompt, msgType: 'message', parentId: null, metadata: '{}' });
  } catch (err) {
    logger.error({ err, roomId, agent }, 'WS invoke_agent: insertMessage failed');
    sendError(ws, 'Failed to save message. Please try again.', 'DB_ERROR');
    return;
  }

  // T1-03 fix: broadcast the trigger message to all clients
  const invokeUserMsg: Message = { id: invokeMsgId, roomId, author: invokeAuthorName, authorType: 'human', content: prompt, msgType: 'message', parentId: null, metadata: {}, createdAt: invokeCreatedAt };
  broadcastSync(roomId, { type: 'new_message', message: invokeUserMsg }, ws);
  // Self-deliver: Elysia 1.4.28 does not implement publishToSelf
  ws.send(JSON.stringify({ type: 'new_message', message: safeMessage(invokeUserMsg) }));

  logger.info({ agent, roomId }, 'WS invoke_agent');
  invokeAgent(roomId, agent, prompt);
}

// ---------------------------------------------------------------------------
// load_history
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handleLoadHistory(ws: any, roomId: string, before: string, limit: number): void {
  const room = getRoomById(roomId);
  if (!room) { sendError(ws, 'Room not found', 'ROOM_NOT_FOUND'); return; }

  const clampedLimit = Math.min(limit, 100);
  const rows = getMessagesBefore(roomId, before, clampedLimit);
  // hasMoreMessagesBefore needs a created_at timestamp, not a message ID
  const pivotCreatedAt = getMessageCreatedAt(before);
  const hasMore = pivotCreatedAt ? hasMoreMessagesBefore(roomId, pivotCreatedAt) : false;

  // getMessagesBefore returns DESC — reverse to chronological order
  const safeMessages = rows.reverse().map((row) => safeMessage(mapMessageRow(row)));
  ws.send(JSON.stringify({ type: 'history_page', messages: safeMessages, hasMore } satisfies ServerMessage));
}
