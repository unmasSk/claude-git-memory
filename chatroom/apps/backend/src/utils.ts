import { randomBytes } from 'node:crypto';
import type { MessageRow, AgentSessionRow, RoomRow } from './types.js';
import type { Message, AgentStatus, Room } from '@agent-chatroom/shared';

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

/**
 * Generates a URL-safe random ID.
 * Uses 12 bytes (96 bits) — collision-safe for millions of messages.
 * Format: base62 string, ~16 chars.
 */
export function generateId(): string {
  const bytes = randomBytes(12);
  return bytes
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// ---------------------------------------------------------------------------
// Timestamp helpers
// ---------------------------------------------------------------------------

/** Returns an ISO 8601 timestamp string for the current moment */
export function nowIso(): string {
  return new Date().toISOString();
}

/** Format an ISO timestamp as HH:MM for display */
export function formatTimeHHMM(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

// ---------------------------------------------------------------------------
// DB row → protocol type mappers
// ---------------------------------------------------------------------------

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

export function mapRoomRow(row: RoomRow): Room {
  return {
    id: row.id,
    name: row.name,
    topic: row.topic,
    createdAt: row.created_at,
  };
}

/** SEC-FIX 5: Strip sessionId from message metadata before sending to clients. */
export function safeMessage(msg: Message): Message {
  const { sessionId: _omit, ...safeMetadata } = msg.metadata;
  return { ...msg, metadata: safeMetadata };
}
