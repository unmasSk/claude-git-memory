/**
 * WS message case handlers — called from the message() dispatcher in ws-handlers.ts.
 * Handles: send_message, invoke_agent, load_history.
 * Control handlers (kill_agent, pause_agent, resume_agent, read_chat) live in ws-control-handlers.ts.
 */
import {
  getRoomById,
  listAgentSessions,
  insertMessage,
  getMessagesBefore,
  hasMoreMessagesBefore,
  getMessageCreatedAt,
  linkAttachmentsToMessage,
  listAttachmentsByMessage,
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
import { stoppedRooms } from '../services/agent-scheduler.js';
import { getAgentConfig } from '../services/agent-registry.js';
import { mapMessageRow, mapAgentSessionRow, generateId, nowIso, safeMessage, enrichWithAttachments } from '../utils.js';
import type { Message, ServerMessage, Attachment } from '@agent-chatroom/shared';
import { logger, connStates, EVERYONE_PATTERN, sendError } from './ws-state.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STOP_DIRECTIVE = /\b(stop|para|callaos|silence|quiet)\b/i;

/** Link attachment IDs to a message and return mapped Attachment objects. Returns [] on failure. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function linkAndFetchAttachments(messageId: string, roomId: string, attachmentIds: string[]): Attachment[] {
  try {
    linkAttachmentsToMessage(attachmentIds, messageId, roomId);
    return listAttachmentsByMessage(messageId).map((row) => ({
      id: row.id,
      filename: row.filename,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      url: `/api/uploads/${roomId}/${row.id}`,
    }));
  } catch (err) {
    logger.warn({ err, roomId, messageId }, 'WS send_message: attachment linking failed — broadcasting message without attachments');
    return [];
  }
}

/**
 * Persist a system directive message to DB and broadcast it to the room.
 * Returns false (and sends DB_ERROR) if the insert fails.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function insertAndBroadcastDirective(ws: any, roomId: string, safeDirective: string): boolean {
  const sysId = generateId();
  const sysCreatedAt = nowIso();
  const sysContent = `[DIRECTIVE FROM USER — ALL AGENTS MUST OBEY] ${safeDirective}`;
  try {
    insertMessage({ id: sysId, roomId, author: 'system', authorType: 'system', content: sysContent, msgType: 'system', parentId: null, metadata: '{}' });
  } catch (err) {
    logger.error({ err, roomId }, 'WS @everyone: insertMessage (system directive) failed');
    sendError(ws, 'Failed to save directive. Please try again.', 'DB_ERROR');
    return false;
  }
  const sysMsg: Message = { id: sysId, roomId, author: 'system', authorType: 'system', content: sysContent, msgType: 'system', parentId: null, metadata: {}, createdAt: sysCreatedAt };
  broadcastSync(roomId, { type: 'new_message', message: sysMsg }, ws);
  ws.send(JSON.stringify({ type: 'new_message', message: safeMessage(sysMsg) }));
  return true;
}

/** Handle the @everyone directive embedded in a send_message. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleEveryoneDirective(ws: any, roomId: string, content: string, authorName: string, mode: 'execute' | 'brainstorm' = 'execute'): void {
  const directive = content.replace(/@everyone\b/gi, '').trim();
  logger.info({ authorName, directive }, 'WS send_message @everyone directive');

  const isStopDirective = STOP_DIRECTIVE.test(directive);
  if (isStopDirective) {
    const cleared = clearQueue(roomId);
    pauseInvocations(roomId);
    logger.info({ cleared }, 'WS @everyone stop: queue cleared, invocations paused');
  }

  // Fix 1: only skip saving if there is no directive text — do not return early,
  // so a bare @everyone still proceeds to invoke all agents below.
  const safeDirective = sanitizePromptContent(directive);
  if (directive && !insertAndBroadcastDirective(ws, roomId, safeDirective)) return;

  if (!isStopDirective) {
    // Fix 2: invoke agents that have been activated at least once (status !== idle OR turnCount > 0).
    // Excludes agents seeded on room creation but never invoked.
    const agentSessions = listAgentSessions(roomId);
    const activatedSessions = agentSessions
      .map((row) => mapAgentSessionRow(row))
      .filter((s) => s.status !== 'idle' || s.turnCount > 0);
    if (activatedSessions.length > 0) {
      const agentNames = new Set(activatedSessions.map((s) => s.agentName));
      logger.debug({ agentNames: [...agentNames] }, 'WS @everyone: invoking activated agents');
      invokeAgents(roomId, agentNames, safeDirective, new Map(), true, mode);
    }
  }
}

// ---------------------------------------------------------------------------
// send_message
// ---------------------------------------------------------------------------

/**
 * Handle a send_message client message.
 * Persists the message to the database, broadcasts it to all room subscribers,
 * and dispatches @mention or @everyone invocations. Author is always resolved
 * server-side from connId to prevent client spoofing (SEC-FIX 2).
 *
 * @param ws - The Elysia WebSocket instance.
 * @param roomId - The target room identifier.
 * @param connId - The connection identifier used to look up the sender's name.
 * @param content - The raw message content from the client.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handleSendMessage(ws: any, roomId: string, connId: string, content: string, attachmentIds?: string[], mode: 'execute' | 'brainstorm' = 'execute'): void {
  stoppedRooms.delete(roomId);
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

  const attachments: Attachment[] = (attachmentIds && attachmentIds.length > 0)
    ? linkAndFetchAttachments(id, roomId, attachmentIds)
    : [];

  const newMsg: Message = { id, roomId, author: authorName, authorType: 'human', content, msgType: 'message', parentId: null, metadata: { attachments: attachments.length > 0 ? attachments : undefined }, createdAt };
  broadcastSync(roomId, { type: 'new_message', message: newMsg }, ws);
  ws.send(JSON.stringify({ type: 'new_message', message: safeMessage(newMsg) }));

  // Cache once — avoids running the regex twice on the same content.
  const everyonePresent = EVERYONE_PATTERN.test(content);
  if (everyonePresent) {
    handleEveryoneDirective(ws, roomId, content, authorName, mode);
  } else if (isPaused(roomId)) {
    resumeInvocations(roomId);
    logger.info({ authorName }, 'WS send_message: invocations resumed after @everyone stop');
  }

  // Skip individual @mentions when @everyone was present (already handled above or was a stop).
  const mentions = everyonePresent ? new Set<string>() : extractMentions(content);
  logger.debug({ authorName, contentLength: content.length, everyonePresent, mentionCount: mentions.size }, 'WS send_message processed');

  if (mentions.size > 0) {
    invokeAgents(roomId, mentions, sanitizePromptContent(content), new Map(), true, mode);
  }
}

// ---------------------------------------------------------------------------
// invoke_agent
// ---------------------------------------------------------------------------

/**
 * Handle an invoke_agent client message.
 * Validates the agent exists and is invokable, persists and broadcasts the trigger prompt
 * as a human message for the audit trail, then enqueues the agent invocation.
 *
 * @param ws - The Elysia WebSocket instance.
 * @param roomId - The target room identifier.
 * @param connId - The connection identifier used to look up the invoker's name.
 * @param agent - The agent name to invoke.
 * @param prompt - The prompt to pass to the agent.
 */
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

  const invokeConnState = connStates.get(connId);
  if (!invokeConnState) {
    logger.error({ connId, roomId }, 'WS invoke_agent: connState missing for active connId — closing');
    ws.close();
    return;
  }
  const invokeAuthorName = invokeConnState.name;

  const safePrompt = sanitizePromptContent(prompt);
  const invokeMsgId = generateId();
  const invokeCreatedAt = nowIso();
  try {
    insertMessage({ id: invokeMsgId, roomId, author: invokeAuthorName, authorType: 'human', content: safePrompt, msgType: 'message', parentId: null, metadata: '{}' });
  } catch (err) {
    logger.error({ err, roomId, agent }, 'WS invoke_agent: insertMessage failed');
    sendError(ws, 'Failed to save message. Please try again.', 'DB_ERROR');
    return;
  }

  // T1-03 fix: broadcast the trigger message to all clients
  const invokeUserMsg: Message = { id: invokeMsgId, roomId, author: invokeAuthorName, authorType: 'human', content: safePrompt, msgType: 'message', parentId: null, metadata: {}, createdAt: invokeCreatedAt };
  broadcastSync(roomId, { type: 'new_message', message: invokeUserMsg }, ws);
  ws.send(JSON.stringify({ type: 'new_message', message: safeMessage(invokeUserMsg) }));

  logger.info({ agent, roomId }, 'WS invoke_agent');
  invokeAgent(roomId, agent, safePrompt);
}

// ---------------------------------------------------------------------------
// load_history
// ---------------------------------------------------------------------------

/**
 * Handle a load_history client message.
 * Returns a paginated batch of messages before the given cursor, clamped to 100 per page,
 * in chronological order. Includes a hasMore flag for the client to decide whether to
 * show a "load more" button.
 *
 * @param ws - The Elysia WebSocket instance.
 * @param roomId - The room to query.
 * @param before - The message ID used as the pagination cursor.
 * @param limit - The requested number of messages (clamped to 100).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handleLoadHistory(ws: any, roomId: string, before: string, limit: number): void {
  const room = getRoomById(roomId);
  if (!room) { sendError(ws, 'Room not found', 'ROOM_NOT_FOUND'); return; }

  const clampedLimit = Math.min(limit, 100);
  const rows = getMessagesBefore(roomId, before, clampedLimit);
  const pivotCreatedAt = getMessageCreatedAt(before);
  const hasMore = pivotCreatedAt ? hasMoreMessagesBefore(roomId, pivotCreatedAt) : false;

  // getMessagesBefore returns DESC — reverse to chronological order
  const safeMessages = enrichWithAttachments(rows.reverse().map(mapMessageRow)).map(safeMessage);
  ws.send(JSON.stringify({ type: 'history_page', messages: safeMessages, hasMore } satisfies ServerMessage));
}

