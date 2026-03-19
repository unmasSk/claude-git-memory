/**
 * auth-tokens.ts
 *
 * Simple in-memory token store for WebSocket authentication.
 * Clients obtain a short-lived token via POST /api/auth/token and present
 * it on WS upgrade as ?token=<uuid>.
 *
 * SEC-AUTH-001: Token validation before WS upgrade
 */

import { AGENT_BY_NAME } from '@agent-chatroom/shared';
import { createLogger } from '../logger.js';

const log = createLogger('auth-tokens');

// ---------------------------------------------------------------------------
// Name validation (mirrors resolveConnectionName in ws.ts)
// ---------------------------------------------------------------------------

/**
 * SEC-AUTH-002: "claude" is an identity-sensitive name.
 * "claude" is the orchestrator bridge identity — impersonation would let any
 * client inject messages that appear to come from the orchestrator.
 * It is excluded from token issuance via the public endpoint; the bridge
 * authenticates with a pre-shared token, not this endpoint.
 *
 * "user" is intentionally NOT reserved — it is the default frontend identity
 * and must be obtainable via POST /api/auth/token.
 * Although "user" appears in AGENT_BY_NAME (as a human participant entry),
 * it is excluded here so the frontend can register with that name.
 */
const EXTRA_RESERVED = new Set(['claude', 'system']);
const RESERVED_AGENT_NAMES = new Set([
  ...Array.from(AGENT_BY_NAME.keys()).filter((n) => n !== 'user'),
  ...EXTRA_RESERVED,
]);
const NAME_RE = /^[a-zA-Z0-9_-]{1,32}$/;

/**
 * Returns the normalised name or null if invalid / reserved / empty.
 * SEC-AUTH-003: Empty names are rejected — the frontend must send an explicit
 * name. The previous default of 'user' allowed anonymous tokens to silently
 * assume the default human identity.
 */
export function validateName(rawName: string | undefined): string | null {
  if (!rawName || rawName.trim() === '') return null;
  const name = rawName.trim();
  if (!NAME_RE.test(name)) return null;
  if (RESERVED_AGENT_NAMES.has(name.toLowerCase())) return null;
  return name;
}

// ---------------------------------------------------------------------------
// Token store
// ---------------------------------------------------------------------------

const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes — survives reconnect backoff

interface TokenEntry {
  name: string;
  expiresAt: number;
}

const tokens = new Map<string, TokenEntry>();

/** Issue a new UUID token bound to a validated name. Returns null if the token store is full. */
export function issueToken(name: string): { token: string; expiresAt: string } | null {
  if (tokens.size >= 10_000) {
    log.warn({ storeSize: tokens.size }, 'token store full — rejecting issuance');
    return null;
  }
  const token = crypto.randomUUID();
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  tokens.set(token, { name, expiresAt });
  log.info({ name }, 'token issued');
  return { token, expiresAt: new Date(expiresAt).toISOString() };
}

/**
 * Validate a token without consuming it. Use for non-WS endpoints that need
 * auth but must not burn the WS token (e.g. POST /api/rooms/:id/invite).
 * Returns the name if valid, null if missing/unknown/expired.
 */
export function peekToken(token: string | undefined): string | null {
  if (!token) return null;
  const entry = tokens.get(token);
  if (!entry) {
    log.warn('peekToken failed: unknown token');
    return null;
  }
  if (Date.now() > entry.expiresAt) {
    tokens.delete(token);
    log.warn({ name: entry.name }, 'peekToken failed: expired');
    return null;
  }
  return entry.name;
}

/**
 * Validate a token and return the associated name.
 * Returns null if the token is missing, unknown, or expired.
 * SEC-AUTH-004: One-time-use — the token is deleted on first successful
 * validation to prevent replay attacks via token reuse.
 */
export function validateToken(token: string | undefined): string | null {
  if (!token) return null;
  const entry = tokens.get(token);
  if (!entry) { log.warn('token validation failed: unknown token'); return null; }
  if (Date.now() > entry.expiresAt) {
    tokens.delete(token);
    log.warn({ name: entry.name }, 'token validation failed: expired');
    return null;
  }
  // Consume the token: one successful WS upgrade per token issued.
  tokens.delete(token);
  log.info({ name: entry.name }, 'token validated and consumed');
  return entry.name;
}

// Periodic GC — remove expired tokens every 10 minutes
setInterval(() => {
  const now = Date.now();
  let removed = 0;
  for (const [tok, entry] of tokens) {
    if (now > entry.expiresAt) { tokens.delete(tok); removed++; }
  }
  if (removed > 0) log.info({ removed, remaining: tokens.size }, 'token GC completed');
}, 10 * 60 * 1000);
