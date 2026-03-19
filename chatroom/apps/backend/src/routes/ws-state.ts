import { createLogger } from '../logger.js';
import { createTokenBucket } from '../services/rate-limiter.js';
import { getReservedAgentNames } from '../services/auth-tokens.js';
import { WS_ALLOWED_ORIGINS } from '../config.js';
import type { ConnectedUser } from '@agent-chatroom/shared';

/** Pino logger instance for the WS module. */
export const logger = createLogger('ws');

// ---------------------------------------------------------------------------
// SEC-FIX 2: Allowed origins for WebSocket upgrade — sourced from config
// ---------------------------------------------------------------------------

/** Set of allowed WebSocket upgrade origins, built from WS_ALLOWED_ORIGINS config. */
export const ALLOWED_ORIGINS = new Set(WS_ALLOWED_ORIGINS);

/** Shared @everyone regex — used in both directive detection and skip guard. */
export const EVERYONE_PATTERN = /@everyone\b/i;

// ---------------------------------------------------------------------------
// SEC-FIX 6: Per-connection token bucket rate limiter (shared factory)
// ---------------------------------------------------------------------------

/**
 * Per-connection message rate limiter.
 * Allows 5 messages per 10 seconds, keyed by connId.
 *
 * @param connId - Connection identifier assigned in open().
 * @returns true if the message is within the rate limit, false if it should be rejected.
 */
export const checkRateLimit = createTokenBucket(5, 10_000);

// ---------------------------------------------------------------------------
// WS upgrade rate limiter — 50 upgrades/second, global key
// ---------------------------------------------------------------------------

/**
 * Global WebSocket upgrade rate limiter.
 * Allows 50 new connections per second across all rooms.
 *
 * @returns true if the upgrade is within the rate limit, false if it should be rejected.
 */
export const checkUpgradeRateLimit = (() => {
  const check = createTokenBucket(50, 1_000);
  return () => check('global');
})();

/**
 * Maps a ws instance (ws.raw or ws) to its assigned connId.
 * Populated in open(), cleaned up in close().
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const wsConnIds = new Map<any, string>();

// Map from connId → { name, roomId } for tracking connected users
export interface ConnState {
  name: string;
  roomId: string;
  connectedAt: string;
}

/** Maps connId to the connection state (name, roomId, connectedAt). */
export const connStates = new Map<string, ConnState>();

/** Maps roomId to the set of connIds currently connected in that room. */
export const roomConns = new Map<string, Set<string>>();

/**
 * Maximum number of simultaneous WebSocket connections allowed per room.
 * Prevents a single room from exhausting memory and WS server capacity (SEC-OPEN-008).
 */
export const MAX_CONNECTIONS_PER_ROOM = 20;

// Wraps at MAX_SAFE_INTEGER after ~285 trillion connections — not reachable in practice.
let _connCounter = 0;

/**
 * Generate a unique connection identifier for each WebSocket connection.
 *
 * @returns A string of the form "conn-{N}" where N is a monotonically increasing integer.
 */
export function nextConnId(): string {
  return `conn-${++_connCounter}`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the list of connected users currently in a room, deduplicated by name.
 * Deduplication handles React StrictMode, which opens two WebSocket connections
 * from the same browser tab with the same token name.
 *
 * @param roomId - The room to query.
 * @returns Array of ConnectedUser objects, one entry per unique display name.
 */
export function getConnectedUsers(roomId: string): ConnectedUser[] {
  const conns = roomConns.get(roomId);
  if (!conns) return [];
  const users: ConnectedUser[] = [];
  // Dedup by name — StrictMode creates 2 WS connections from the same browser,
  // both with the same name, so the user panel would show them twice.
  const seenNames = new Set<string>();
  for (const connId of conns) {
    const state = connStates.get(connId);
    if (state && !seenNames.has(state.name)) {
      seenNames.add(state.name);
      users.push({ name: state.name, connectedAt: state.connectedAt });
    }
  }
  return users;
}

/**
 * Names that are reserved and cannot be used by WS clients to prevent impersonation.
 * Excludes 'user' (valid default) and 'claude' (valid orchestrator identity).
 * Only blocks specialized tool-agents that run as subprocesses.
 * Constructed via shared helper in auth-tokens.ts for consistency.
 */
export const RESERVED_AGENT_NAMES = getReservedAgentNames();

const NAME_RE = /^[a-zA-Z0-9_-]{1,32}$/;

/**
 * Resolve the display name for a new WebSocket connection.
 *
 * Rules applied in order:
 * - If no ?name= param or blank, defaults to 'user'.
 * - Name is trimmed (original case preserved for display).
 * - If the name collides with a reserved agent name (case-insensitive), returns null.
 * - Max 32 chars, alphanumeric + dash + underscore only.
 *
 * @param rawName - The ?name= query parameter value, may be undefined.
 * @returns The resolved display name, or null if the name is invalid or reserved.
 */
export function resolveConnectionName(rawName: string | undefined): string | null {
  if (!rawName || rawName.trim() === '') return 'user';
  const name = rawName.trim();
  if (!NAME_RE.test(name)) return null; // invalid chars or length
  // Block specialized agent names to prevent impersonation
  if (RESERVED_AGENT_NAMES.has(name.toLowerCase())) return null;
  return name;
}

/**
 * Shape of the data object attached to each Elysia WebSocket connection.
 * connId is stored separately in the module-level wsConnIds map, not here.
 */
export type WsData = { params: { roomId: string }; query: { name?: string; token?: string } };
