import { randomBytes } from 'node:crypto';
import type { MessageRow, AgentSessionRow, RoomRow } from './types.js';
import type { Message, AgentStatus, Room } from '@agent-chatroom/shared';

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
    metadata: JSON.parse(row.metadata || '{}') as Message['metadata'],
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
