import { createLogger } from '../logger.js';
import { createTokenBucket } from '../services/rate-limiter.js';
import { getReservedAgentNames } from '../services/auth-tokens.js';
import { WS_ALLOWED_ORIGINS } from '../config.js';
import type { ConnectedUser } from '@agent-chatroom/shared';

export const logger = createLogger('ws');

// ---------------------------------------------------------------------------
// SEC-FIX 2: Allowed origins for WebSocket upgrade — sourced from config
// ---------------------------------------------------------------------------

export const ALLOWED_ORIGINS = new Set(WS_ALLOWED_ORIGINS);

// FIX 9: Shared @everyone regex — used in both directive detection and skip guard.
export const EVERYONE_PATTERN = /@everyone\b/i;

// ---------------------------------------------------------------------------
// SEC-FIX 6: Per-connection token bucket rate limiter (shared factory)
// ---------------------------------------------------------------------------

// 5 messages per 10 seconds — keyed by connId
export const checkRateLimit = createTokenBucket(5, 10_000);

// ---------------------------------------------------------------------------
// WS upgrade rate limiter — 50 upgrades/second, global key
// ---------------------------------------------------------------------------

// 50 upgrades per 1 second — keyed by constant 'global'
export const checkUpgradeRateLimit = (() => {
  const check = createTokenBucket(50, 1_000);
  return () => check('global');
})();

// Map from ws instance → connId, populated in open(), cleaned in close()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const wsConnIds = new Map<any, string>();

// Map from connId → { name, roomId } for tracking connected users
export interface ConnState {
  name: string;
  roomId: string;
  connectedAt: string;
}
export const connStates = new Map<string, ConnState>();

// Map from roomId → Set<connId> for listing users per room
export const roomConns = new Map<string, Set<string>>();

// SEC-OPEN-008: Per-room connection cap — prevents a single room from being
// flooded with connections that consume memory and WS server capacity.
export const MAX_CONNECTIONS_PER_ROOM = 20;

let _connCounter = 0;

export function nextConnId(): string {
  return `conn-${++_connCounter}`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the list of ConnectedUser objects currently in a room.
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

/**
 * Resolve the author name for a new WS connection.
 * Rules:
 * - If no ?name= param, use 'user'
 * - Strip the name (preserve original case for display)
 * - If it collides with a reserved agent name (case-insensitive), reject (return null)
 * - Max 32 chars, alphanumeric + dash + underscore
 */
const NAME_RE = /^[a-zA-Z0-9_-]{1,32}$/;

export function resolveConnectionName(rawName: string | undefined): string | null {
  if (!rawName || rawName.trim() === '') return 'user';
  const name = rawName.trim();
  if (!NAME_RE.test(name)) return null; // invalid chars or length
  // Block specialized agent names to prevent impersonation
  if (RESERVED_AGENT_NAMES.has(name.toLowerCase())) return null;
  return name;
}

// connId is stored in the module-level wsConnIds map, not in ws.data
export type WsData = { params: { roomId: string }; query: { name?: string; token?: string } };
