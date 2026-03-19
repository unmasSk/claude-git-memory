/**
 * Backend-only types — DB row shapes returned from bun:sqlite queries.
 * These use snake_case to match column names; services map to camelCase protocol types.
 */

/** Raw row from the `rooms` table */
export interface RoomRow {
  id: string;
  name: string;
  topic: string;
  created_at: string;
}

/** Raw row from the `messages` table. `metadata` is a JSON string — parse before use. */
export interface MessageRow {
  id: string;
  room_id: string;
  author: string;
  author_type: 'agent' | 'human' | 'system';
  content: string;
  msg_type: 'message' | 'tool_use' | 'system';
  parent_id: string | null;
  metadata: string; // JSON string, parse with JSON.parse
  created_at: string;
}

/** Raw row from the `agent_sessions` table */
export interface AgentSessionRow {
  agent_name: string;
  room_id: string;
  session_id: string | null;
  model: string;
  status: 'idle' | 'thinking' | 'tool-use' | 'done' | 'out' | 'error';
  last_active: string | null;
  total_cost: number;
  turn_count: number;
}
