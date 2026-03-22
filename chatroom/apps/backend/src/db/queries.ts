import { getDb } from './connection.js';
import type { MessageRow, AgentSessionRow, RoomRow, AttachmentRow } from '../types.js';

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

/**
 * Fetch a single room by its ID.
 *
 * @param id - Room UUID
 * @returns The room row, or null if not found
 */
export function getRoomById(id: string): RoomRow | null {
  return getDb().query<RoomRow, [string]>('SELECT * FROM rooms WHERE id = ?').get(id) ?? null;
}

/**
 * List all rooms ordered by creation time ascending.
 *
 * @returns All room rows
 */
export function listRooms(): RoomRow[] {
  return getDb().query<RoomRow, []>('SELECT * FROM rooms ORDER BY created_at ASC').all();
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/**
 * Insert a new message row into the database.
 *
 * @param row - Flat message fields (snake_case matches DB columns)
 * @throws If the INSERT violates a FK or CHECK constraint
 */
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

/**
 * Get the most recent N messages for a room in chronological order.
 *
 * Uses a subquery (DESC LIMIT then re-order ASC) so the N newest messages
 * are returned in display order without a full table scan.
 *
 * @param roomId - Target room ID
 * @param limit - Maximum number of messages to return
 * @returns Message rows, oldest-first
 */
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

/**
 * Get messages older than a given message ID for paginated history loading.
 *
 * Returns up to `limit` rows in DESC order (newest-first within the page).
 * Callers should reverse the result before presenting it to users.
 *
 * @param roomId - Target room ID
 * @param beforeId - Exclusive upper bound — messages created before this message's timestamp
 * @param limit - Maximum rows to return
 * @returns Message rows, newest-first within the page
 */
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

/**
 * Look up the created_at timestamp for a message by ID.
 *
 * @param id - Message ID
 * @returns ISO timestamp string, or null if the message does not exist
 */
export function getMessageCreatedAt(id: string): string | null {
  const row = getDb().query<{ created_at: string }, [string]>('SELECT created_at FROM messages WHERE id = ?').get(id);
  return row?.created_at ?? null;
}

/**
 * Check if there are messages older than a given timestamp for infinite scroll.
 *
 * @param roomId - Target room ID
 * @param beforeCreatedAt - ISO timestamp used as the exclusive upper bound
 * @returns True if at least one older message exists
 */
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

/**
 * Fetch the session record for a specific agent in a room.
 *
 * @param agentName - Agent name (lowercase)
 * @param roomId - Room ID
 * @returns The session row, or null if not found
 */
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

/**
 * List all agent sessions for a room, ordered by agent name.
 *
 * @param roomId - Room ID
 * @returns All session rows for the room
 */
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

/**
 * Insert or update an agent session record.
 *
 * On conflict (same agent_name + room_id), updates session_id, model, status,
 * and last_active. Used when agents are first invited and when they reconnect.
 *
 * @param row - Session fields to upsert
 */
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

/**
 * Update the status of an agent session and refresh last_active.
 *
 * @param agentName - Agent name
 * @param roomId - Room ID
 * @param status - New status value
 */
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
 * Atomically increment an agent's total cost by a delta amount.
 *
 * Uses `total_cost = total_cost + delta` rather than a read-modify-write to
 * avoid race overwrites when multiple agents finish concurrently (FIX 4).
 *
 * @param agentName - Agent name
 * @param roomId - Room ID
 * @param delta - Cost in USD to add (from the result event)
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

/**
 * Atomically increment an agent's turn count by 1.
 *
 * @param agentName - Agent name
 * @param roomId - Room ID
 */
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
 * Insert an agent session row only if no row already exists for this agent+room.
 *
 * Uses `ON CONFLICT DO NOTHING` so existing rows (and their status) are left
 * untouched. This is the correct seed behaviour: a server restart must not
 * reset a `done` agent back to `idle` and break `@everyone` invocation.
 *
 * @param agentName - Agent name (lowercase)
 * @param roomId - Room ID
 * @param model - Model identifier string
 */
export function insertAgentSessionIfMissing(agentName: string, roomId: string, model: string): void {
  getDb()
    .query<void, [string, string, string]>(
      `
      INSERT INTO agent_sessions (agent_name, room_id, session_id, model, status, last_active)
      VALUES (?, ?, NULL, ?, 'idle', datetime('now'))
      ON CONFLICT (agent_name, room_id) DO NOTHING
    `,
    )
    .run(agentName, roomId, model);
}

/**
 * Insert a new room into the database.
 *
 * @param id - Room ID (UUID or slug)
 * @param name - Display name
 * @param topic - Optional topic string
 * @returns The created room row
 */
export function createRoom(id: string, name: string, topic: string): RoomRow {
  getDb()
    .query<void, [string, string, string]>(
      `INSERT INTO rooms (id, name, topic) VALUES (?, ?, ?)`,
    )
    .run(id, name, topic);
  return getDb().query<RoomRow, [string]>('SELECT * FROM rooms WHERE id = ?').get(id)!;
}

/**
 * Delete a room and all its messages and agent sessions (CASCADE-style).
 *
 * SQLite FK constraints on messages and agent_sessions reference rooms(id) but
 * are not set to ON DELETE CASCADE, so we delete child rows first.
 *
 * @param id - Room ID
 * @returns True if the room existed and was deleted, false if not found
 */
export function deleteRoom(id: string): boolean {
  if (id === 'default') return false;
  const db = getDb();
  let deleted = false;
  db.transaction(() => {
    db.query<void, [string]>('DELETE FROM agent_sessions WHERE room_id = ?').run(id);
    db.query<void, [string]>('DELETE FROM messages WHERE room_id = ?').run(id);
    const result = db.query<void, [string]>('DELETE FROM rooms WHERE id = ?').run(id);
    deleted = (result as unknown as { changes: number }).changes > 0;
  })();
  return deleted;
}

/**
 * Persist the last-invocation metrics for an agent session.
 *
 * Called after persistAndBroadcast completes so that room_state on reconnection
 * includes the most recent token counts and context window size.
 *
 * @param agentName - Agent name
 * @param roomId    - Room ID
 * @param metrics   - Metric values from the completed invocation
 */
export function updateAgentMetrics(
  agentName: string,
  roomId: string,
  metrics: {
    inputTokens: number;
    outputTokens: number;
    contextWindow: number;
    durationMs: number;
    numTurns: number;
  },
): void {
  getDb()
    .query<void, [number, number, number, number, number, string, string]>(
      `
      UPDATE agent_sessions
      SET last_input_tokens   = ?,
          last_output_tokens  = ?,
          last_context_window = ?,
          last_duration_ms    = ?,
          last_num_turns      = ?
      WHERE agent_name = ? AND room_id = ?
    `,
    )
    .run(
      metrics.inputTokens,
      metrics.outputTokens,
      metrics.contextWindow,
      metrics.durationMs,
      metrics.numTurns,
      agentName,
      roomId,
    );
}

/**
 * Clear the session_id for an agent so the next invocation starts fresh.
 *
 * Called when a stale `--resume` session is detected (FIX 2). Clearing
 * session_id forces the next spawn to omit `--resume` and start a new session.
 *
 * @param agentName - Agent name
 * @param roomId - Room ID
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

// ---------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------

/**
 * Insert a new attachment record into the database.
 *
 * Called immediately after a file is saved to disk. The message_id is null
 * until the client sends a send_message with the attachment IDs, at which point
 * linkAttachmentsToMessage is called to associate them.
 *
 * @param attachment - Attachment fields to insert
 */
export function insertAttachment(attachment: {
  id: string;
  roomId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  createdAt: string;
}): void {
  getDb()
    .query<void, [string, string, string, string, number, string, string]>(
      `
      INSERT INTO attachments (id, room_id, message_id, filename, mime_type, size_bytes, storage_path, created_at)
      VALUES (?, ?, NULL, ?, ?, ?, ?, ?)
    `,
    )
    .run(
      attachment.id,
      attachment.roomId,
      attachment.filename,
      attachment.mimeType,
      attachment.sizeBytes,
      attachment.storagePath,
      attachment.createdAt,
    );
}

/**
 * Fetch all attachments linked to a given message, ordered by creation time.
 *
 * @param messageId - Message ID to query attachments for
 * @returns Attachment rows for the message
 */
export function listAttachmentsByMessage(messageId: string): AttachmentRow[] {
  return getDb()
    .query<AttachmentRow, [string]>(
      `
      SELECT * FROM attachments
      WHERE message_id = ?
      ORDER BY created_at ASC
    `,
    )
    .all(messageId);
}

/**
 * Fetch all attachments for a batch of message IDs in a single query.
 * Returns an empty array if messageIds is empty.
 *
 * @param messageIds - Array of message IDs to query attachments for
 * @returns All attachment rows for the given messages, ordered by creation time
 */
export function listAttachmentsByMessageIds(messageIds: string[]): AttachmentRow[] {
  if (messageIds.length === 0) return [];
  const placeholders = messageIds.map(() => '?').join(', ');
  return getDb()
    .query<AttachmentRow, string[]>(
      `SELECT * FROM attachments WHERE message_id IN (${placeholders}) ORDER BY created_at ASC`,
    )
    .all(...messageIds);
}

/**
 * Set message_id on a batch of attachment rows, linking them to a sent message.
 *
 * Only updates attachments that have no message_id yet (unlinked) and belong to
 * the correct room — prevents cross-room attachment hijacking.
 *
 * @param attachmentIds - Array of attachment IDs to link (max 5 per the protocol)
 * @param messageId - The message to link them to
 * @param roomId - Room that owns these attachments (ownership guard)
 */
export function linkAttachmentsToMessage(attachmentIds: string[], messageId: string, roomId: string): void {
  if (attachmentIds.length === 0) return;
  const db = getDb();
  const placeholders = attachmentIds.map(() => '?').join(', ');
  db.query<void, string[]>(
    `
    UPDATE attachments
    SET message_id = ?
    WHERE id IN (${placeholders})
      AND room_id = ?
      AND message_id IS NULL
  `,
  ).run(messageId, ...attachmentIds, roomId);
}

/**
 * Fetch a single attachment by its ID.
 *
 * @param id - Attachment UUID
 * @returns The attachment row, or null if not found
 */
export function getAttachmentById(id: string): AttachmentRow | null {
  return (
    getDb()
      .query<AttachmentRow, [string]>('SELECT * FROM attachments WHERE id = ?')
      .get(id) ?? null
  );
}
