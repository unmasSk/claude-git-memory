import { randomBytes } from 'node:crypto';
import type { MessageRow, AgentSessionRow, RoomRow } from './types.js';
import type { Message, AgentStatus, Room, Attachment } from '@agent-chatroom/shared';
import { createLogger } from './logger.js';
import { listAttachmentsByMessageIds } from './db/queries.js';

const logger = createLogger('utils');

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

/**
 * Generates a URL-safe random ID using 12 bytes (96 bits) of entropy.
 *
 * 96 bits is collision-safe for millions of messages. Output is a base62-like
 * string (~16 chars) using `-` and `_` instead of `+` and `/`.
 *
 * @returns A URL-safe random string
 */
export function generateId(): string {
  const bytes = randomBytes(12);
  return bytes.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// ---------------------------------------------------------------------------
// Timestamp helpers
// ---------------------------------------------------------------------------

/** Returns an ISO 8601 timestamp string for the current moment */
export function nowIso(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// DB row → protocol type mappers
// ---------------------------------------------------------------------------

/**
 * Map a raw `messages` DB row to the shared `Message` protocol type.
 *
 * @param row - Raw snake_case row from bun:sqlite
 * @returns Camel-case Message with parsed metadata
 */
export function mapMessageRow(row: MessageRow): Message {
  return {
    id: row.id,
    roomId: row.room_id,
    author: row.author,
    authorType: row.author_type,
    content: row.content,
    msgType: row.msg_type,
    parentId: row.parent_id,
    metadata: (() => {
      try {
        return JSON.parse(row.metadata || '{}') as Message['metadata'];
      } catch {
        logger.warn({ rowId: row.id }, 'mapMessageRow: failed to parse metadata — using {}');
        return {} as Message['metadata'];
      }
    })(),
    createdAt: row.created_at,
  };
}

/**
 * Map a raw `agent_sessions` DB row to the shared `AgentStatus` protocol type.
 *
 * @param row - Raw snake_case row from bun:sqlite
 * @returns Camel-case AgentStatus
 */
export function mapAgentSessionRow(row: AgentSessionRow): AgentStatus {
  return {
    agentName: row.agent_name,
    roomId: row.room_id,
    sessionId: row.session_id,
    model: row.model,
    status: row.status as AgentStatus['status'],
    lastActive: row.last_active,
    totalCost: row.total_cost,
    turnCount: row.turn_count,
    ...(row.last_input_tokens > 0 && { lastInputTokens: row.last_input_tokens }),
    ...(row.last_output_tokens > 0 && { lastOutputTokens: row.last_output_tokens }),
    ...(row.last_context_window > 0 && { lastContextWindow: row.last_context_window }),
    ...(row.last_duration_ms > 0 && { lastDurationMs: row.last_duration_ms }),
    ...(row.last_num_turns > 0 && { lastNumTurns: row.last_num_turns }),
  };
}

/**
 * Map a raw `rooms` DB row to the shared `Room` protocol type.
 *
 * @param row - Raw snake_case row from bun:sqlite
 * @returns Camel-case Room
 */
export function mapRoomRow(row: RoomRow): Room {
  return {
    id: row.id,
    name: row.name,
    topic: row.topic,
    createdAt: row.created_at,
    cwd: row.cwd ?? null,
  };
}

/**
 * Strip sessionId from message metadata before sending to clients.
 *
 * SEC-FIX 5: session IDs are server-internal identifiers used for `--resume`.
 * Leaking them to the frontend would allow clients to reconstruct agent session
 * history or attempt to hijack a session by presenting the ID on a future call.
 *
 * @param msg - Full Message including internal metadata
 * @returns Message with sessionId omitted from metadata
 */
export function safeMessage(msg: Message): Message {
  const { sessionId: _omit, ...safeMetadata } = msg.metadata;
  return { ...msg, metadata: safeMetadata };
}

/**
 * Batch-enrich a list of messages with their attachments from the DB.
 * Uses a single IN query — no N+1.
 *
 * @param messages - Messages to enrich
 * @returns Same messages with `metadata.attachments` populated where applicable
 */
export function enrichWithAttachments(messages: Message[]): Message[] {
  if (messages.length === 0) return messages;
  const rows = listAttachmentsByMessageIds(messages.map((m) => m.id));
  if (rows.length === 0) return messages;

  const byMessage = new Map<string, Attachment[]>();
  for (const row of rows) {
    if (!row.message_id) continue;
    const att: Attachment = {
      id: row.id,
      filename: row.filename,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      url: `/api/uploads/${row.room_id}/${row.id}`,
    };
    const bucket = byMessage.get(row.message_id);
    if (bucket) bucket.push(att);
    else byMessage.set(row.message_id, [att]);
  }

  return messages.map((msg) => {
    const attachments = byMessage.get(msg.id);
    if (!attachments || attachments.length === 0) return msg;
    return { ...msg, metadata: { ...msg.metadata, attachments } };
  });
}
