/**
 * Simple in-memory token store for WebSocket authentication.
 *
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
 * "claude" is the orchestrator bridge identity — impersonation would let any client
 * inject messages that appear to come from the orchestrator. It is excluded from
 * token issuance via the public endpoint; the bridge authenticates with a pre-shared
 * token, not this endpoint (SEC-AUTH-002).
 *
 * "user" is intentionally NOT reserved — it is the default frontend identity
 * and must be obtainable via POST /api/auth/token. Although "user" appears in
 * AGENT_BY_NAME (as a human participant entry), it is excluded here so the
 * frontend can register with that name.
 */
const EXTRA_RESERVED = new Set(['claude', 'system']);
const RESERVED_AGENT_NAMES = new Set([
  ...Array.from(AGENT_BY_NAME.keys()).filter((n) => n !== 'user'),
  ...EXTRA_RESERVED,
]);

/** Regex for valid connection names — alphanumeric plus `-` and `_`, 1–32 chars */
const NAME_RE = /^[a-zA-Z0-9_-]{1,32}$/;

/**
 * Returns the set of reserved agent names for use in other modules (e.g. ws.ts).
 *
 * ws.ts uses a slightly narrower filter: it excludes 'user' and 'claude' from
 * the blocked set (both are valid WS identities). This function returns the
 * auth-token-issuance set; ws.ts filters it down as needed.
 *
 * @returns Read-only set of names that cannot be issued tokens via the public endpoint
 */
export function getReservedAgentNames(): ReadonlySet<string> {
  return RESERVED_AGENT_NAMES;
}

/**
 * Validate and normalise a raw connection name from a token-issuance request.
 *
 * SEC-AUTH-003: Empty names are rejected — the frontend must send an explicit
 * name. The previous default of 'user' allowed anonymous tokens to silently
 * assume the default human identity.
 *
 * @param rawName - Raw name string from the request body (may be undefined)
 * @returns Trimmed valid name, or null if invalid/reserved/empty
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

/** 30-minute TTL — long enough to survive reconnect backoff without lingering indefinitely */
const TOKEN_TTL_MS = 30 * 60 * 1000;

interface TokenEntry {
  name: string;
  expiresAt: number;
  /** Raw token bytes stored for constant-time comparison (SEC-AUTH-005) */
  tokenBuf: Buffer;
}

const tokens = new Map<string, TokenEntry>();

/**
 * Issue a new UUID token bound to a validated connection name.
 *
 * @param name - Pre-validated connection name (call `validateName` first)
 * @returns Token and ISO expiry string, or null if the store is at capacity (10 000 tokens)
 */
export function issueToken(name: string): { token: string; expiresAt: string } | null {
  if (tokens.size >= 10_000) {
    log.warn({ storeSize: tokens.size }, 'token store full — rejecting issuance');
    return null;
  }
  const token = crypto.randomUUID();
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  tokens.set(token, { name, expiresAt, tokenBuf: Buffer.from(token) });
  log.info({ name }, 'token issued');
  return { token, expiresAt: new Date(expiresAt).toISOString() };
}

/**
 * Validate a token without consuming it.
 *
 * Use for non-WS endpoints that need auth but must not burn the token
 * (e.g. POST /api/rooms/:id/invite). For WS upgrade use `validateToken`.
 *
 * SEC-AUTH-005: Constant-time comparison via `timingSafeEqual` prevents
 * timing-based token enumeration. Buffer lengths are checked first because
 * `timingSafeEqual` throws on length mismatch.
 *
 * @param token - Bearer token from the Authorization header (may be undefined)
 * @returns The associated connection name, or null if missing/unknown/expired
 */
export function peekToken(token: string | undefined): string | null {
  if (!token) {
    recordAuthFailure(token);
    return null;
  }
  const entry = tokens.get(token);
  if (!entry) {
    log.warn('peekToken failed: unknown token');
    recordAuthFailure(token);
    return null;
  }
  // SEC-AUTH-005: Constant-time comparison — defense-in-depth after Map.get.
  // Compare lengths first; timingSafeEqual throws if Buffers differ in length.
  const givenBuf = Buffer.from(token);
  if (entry.tokenBuf.length !== givenBuf.length || !crypto.timingSafeEqual(entry.tokenBuf, givenBuf)) {
    recordAuthFailure(token);
    return null;
  }
  if (Date.now() > entry.expiresAt) {
    tokens.delete(token);
    log.warn({ name: entry.name }, 'peekToken failed: expired');
    recordAuthFailure(token);
    return null;
  }
  return entry.name;
}

/**
 * Validate a token and consume it on first successful use.
 *
 * SEC-AUTH-004: One-time-use — the token is deleted on successful validation
 * to prevent replay attacks via token reuse.
 * SEC-AUTH-005: Constant-time comparison — see `peekToken` for rationale.
 *
 * @param token - WS upgrade query param value (may be undefined)
 * @returns The associated connection name, or null if missing/unknown/expired
 */
export function validateToken(token: string | undefined): string | null {
  if (!token) {
    recordAuthFailure(token);
    return null;
  }
  const entry = tokens.get(token);
  if (!entry) {
    log.warn('token validation failed: unknown token');
    recordAuthFailure(token);
    return null;
  }
  // SEC-AUTH-005: Constant-time comparison — defense-in-depth after Map.get.
  const givenBuf = Buffer.from(token);
  if (entry.tokenBuf.length !== givenBuf.length || !crypto.timingSafeEqual(entry.tokenBuf, givenBuf)) {
    recordAuthFailure(token);
    return null;
  }
  if (Date.now() > entry.expiresAt) {
    tokens.delete(token);
    log.warn({ name: entry.name }, 'token validation failed: expired');
    recordAuthFailure(token);
    return null;
  }
  // Consume the token: one successful WS upgrade per token issued.
  tokens.delete(token);
  log.info({ name: entry.name }, 'token validated and consumed');
  return entry.name;
}

// ---------------------------------------------------------------------------
// SEC-OPEN-011: Auth failure counter — detect brute-force attempts (per-source)
//
// Uses a per-token-prefix tracker keyed by the first 8 chars of the presented
// token. This ensures a distributed attacker sending distinct tokens cannot
// stay below the threshold by spreading failures across many sources.
// The first 8 chars are enough to distinguish probing sources without storing
// full token values (which are sensitive even in failed attempts).
// ---------------------------------------------------------------------------

/** Sliding window duration for per-source auth failure tracking */
const AUTH_FAILURE_WINDOW_MS = 60_000; // 60-second sliding window
/** Number of failures within the window before emitting an error log */
const AUTH_FAILURE_THRESHOLD = 10;

interface FailureWindow {
  count: number;
  windowStart: number;
}

// Map<tokenPrefix, window> — prefix is first 8 chars of the presented token
const authFailureBySource = new Map<string, FailureWindow>();

/**
 * Derive a safe, non-sensitive key from a token for per-source tracking.
 * For missing/short tokens, use the sentinel key 'unknown'.
 */
function sourceKey(token: string | undefined): string {
  if (!token || token.length < 8) return 'unknown';
  return token.slice(0, 8);
}

/** Maximum number of source entries tracked simultaneously — evicts oldest on overflow */
const AUTH_FAILURE_MAX_ENTRIES = 5_000;

function recordAuthFailure(token?: string | undefined): void {
  const now = Date.now();
  const key = sourceKey(token);
  const window = authFailureBySource.get(key);
  if (!window || now - window.windowStart > AUTH_FAILURE_WINDOW_MS) {
    // Evict oldest entry when the map is at capacity (prevents unbounded growth
    // under a distributed attack that uses many distinct token prefixes).
    if (!window && authFailureBySource.size >= AUTH_FAILURE_MAX_ENTRIES) {
      const oldestKey = authFailureBySource.keys().next().value;
      if (oldestKey !== undefined) authFailureBySource.delete(oldestKey);
    }
    // Start a fresh window for this source
    authFailureBySource.set(key, { count: 1, windowStart: now });
  } else {
    window.count += 1;
    if (window.count === AUTH_FAILURE_THRESHOLD) {
      log.error(
        { failCount: window.count, sourcePrefix: key },
        'Repeated auth failures from single source — possible brute force',
      );
    }
  }
}

// Periodic GC — remove expired tokens every 10 minutes + stale failure windows.
// .unref() prevents this timer from keeping the process alive after all real work is done.
setInterval(
  () => {
    const now = Date.now();
    let removed = 0;
    for (const [tok, entry] of tokens) {
      if (now > entry.expiresAt) {
        tokens.delete(tok);
        removed++;
      }
    }
    if (removed > 0) log.info({ removed, remaining: tokens.size }, 'token GC completed');

    // GC stale failure windows (older than 2x the window duration)
    let failWindowsRemoved = 0;
    for (const [key, window] of authFailureBySource) {
      if (now - window.windowStart > AUTH_FAILURE_WINDOW_MS * 2) {
        authFailureBySource.delete(key);
        failWindowsRemoved++;
      }
    }
    if (failWindowsRemoved > 0) log.info({ failWindowsRemoved }, 'failure window GC completed');
  },
  10 * 60 * 1000,
).unref();
