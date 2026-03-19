import { getDb } from './connection.js';
import type { MessageRow, AgentSessionRow, RoomRow } from '../types.js';

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

export function getRoomById(id: string): RoomRow | null {
  return getDb().query<RoomRow, [string]>('SELECT * FROM rooms WHERE id = ?').get(id) ?? null;
}

export function listRooms(): RoomRow[] {
  return getDb().query<RoomRow, []>('SELECT * FROM rooms ORDER BY created_at ASC').all();
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export function insertMessage(row: {
  id: string;
  roomId: string;
  author: string;
  authorType: string;
  content: string;
  msgType: string;
  parentId: string | null;
  metadata: string;
}): void {
  getDb()
    .query<void, [string, string, string, string, string, string, string | null, string]>(
      `
      INSERT INTO messages
        (id, room_id, author, author_type, content, msg_type, parent_id, metadata)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    )
    .run(row.id, row.roomId, row.author, row.authorType, row.content, row.msgType, row.parentId, row.metadata);
}

/** Get the most recent N messages for a room (for room_state on WS connect) */
export function getRecentMessages(roomId: string, limit: number): MessageRow[] {
  // Subquery gets latest N by DESC, then outer query re-orders ASC for display
  return getDb()
    .query<MessageRow, [string, number]>(
      `
      SELECT * FROM (
        SELECT * FROM messages
        WHERE room_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      ) ORDER BY created_at ASC
    `,
    )
    .all(roomId, limit);
}

export function getMessagesBefore(roomId: string, beforeId: string, limit: number): MessageRow[] {
  return getDb()
    .query<MessageRow, [string, string, number]>(
      `
      SELECT * FROM messages
      WHERE room_id = ?
        AND created_at < (SELECT created_at FROM messages WHERE id = ?)
      ORDER BY created_at DESC
      LIMIT ?
    `,
    )
    .all(roomId, beforeId, limit);
}

/** Look up the created_at timestamp for a message by ID. Returns null if not found. */
export function getMessageCreatedAt(id: string): string | null {
  const row = getDb().query<{ created_at: string }, [string]>('SELECT created_at FROM messages WHERE id = ?').get(id);
  return row?.created_at ?? null;
}

/** Check if there are messages older than a given timestamp (for infinite scroll) */
export function hasMoreMessagesBefore(roomId: string, beforeCreatedAt: string): boolean {
  const row = getDb()
    .query<{ count: number }, [string, string]>(
      `
      SELECT COUNT(*) as count FROM messages
      WHERE room_id = ? AND created_at < ?
    `,
    )
    .get(roomId, beforeCreatedAt);
  return (row?.count ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Agent sessions
// ---------------------------------------------------------------------------

export function getAgentSession(agentName: string, roomId: string): AgentSessionRow | null {
  return (
    getDb()
      .query<AgentSessionRow, [string, string]>(
        `
      SELECT * FROM agent_sessions
      WHERE agent_name = ? AND room_id = ?
    `,
      )
      .get(agentName, roomId) ?? null
  );
}

export function listAgentSessions(roomId: string): AgentSessionRow[] {
  return getDb()
    .query<AgentSessionRow, [string]>(
      `
      SELECT * FROM agent_sessions
      WHERE room_id = ?
      ORDER BY agent_name ASC
    `,
    )
    .all(roomId);
}

export function upsertAgentSession(row: {
  agentName: string;
  roomId: string;
  sessionId: string | null;
  model: string;
  status: string;
}): void {
  getDb()
    .query<void, [string, string, string | null, string, string]>(
      `
      INSERT INTO agent_sessions (agent_name, room_id, session_id, model, status, last_active)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT (agent_name, room_id) DO UPDATE SET
        session_id  = excluded.session_id,
        model       = excluded.model,
        status      = excluded.status,
        last_active = datetime('now')
    `,
    )
    .run(row.agentName, row.roomId, row.sessionId, row.model, row.status);
}

export function updateAgentStatus(agentName: string, roomId: string, status: string): void {
  getDb()
    .query<void, [string, string, string]>(
      `
      UPDATE agent_sessions
      SET status = ?, last_active = datetime('now')
      WHERE agent_name = ? AND room_id = ?
    `,
    )
    .run(status, agentName, roomId);
}

/**
 * FIX 4: Increment total_cost atomically (avoids race overwrite when agents run concurrently).
 * Uses total_cost = total_cost + $delta, NOT SET total_cost = $newValue.
 */
export function incrementAgentCost(agentName: string, roomId: string, delta: number): void {
  getDb()
    .query<void, [number, string, string]>(
      `
      UPDATE agent_sessions
      SET total_cost = total_cost + ?,
          last_active = datetime('now')
      WHERE agent_name = ? AND room_id = ?
    `,
    )
    .run(delta, agentName, roomId);
}

export function incrementAgentTurnCount(agentName: string, roomId: string): void {
  getDb()
    .query<void, [string, string]>(
      `
      UPDATE agent_sessions
      SET turn_count = turn_count + 1,
          last_active = datetime('now')
      WHERE agent_name = ? AND room_id = ?
    `,
    )
    .run(agentName, roomId);
}

/**
 * FIX 2: Clear session_id so the next invocation runs without --resume.
 * Called when a stale session is detected.
 */
export function clearAgentSession(agentName: string, roomId: string): void {
  getDb()
    .query<void, [string, string]>(
      `
      UPDATE agent_sessions
      SET session_id = NULL
      WHERE agent_name = ? AND room_id = ?
    `,
    )
    .run(agentName, roomId);
}
