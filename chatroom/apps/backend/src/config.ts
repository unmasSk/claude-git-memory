import { join } from 'node:path';
import { existsSync, globSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { createLogger } from './logger.js';

const logger = createLogger('config');

// ---------------------------------------------------------------------------
// Env validation helpers
// ---------------------------------------------------------------------------

/**
 * Parse an integer from an env var, exit(1) if the value is present but
 * not a valid integer within [min, max].
 */
function requireIntEnv(name: string, defaultValue: number, min: number, max: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return defaultValue;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) {
    logger.error({ name, value: raw, min, max }, `Invalid env var: ${name} must be an integer between ${min} and ${max}`);
    process.exit(1);
  }
  return n;
}

/**
 * Parse a string from an env var, exit(1) if it is present but not one of
 * the allowed values.
 */
function requireEnumEnv<T extends string>(name: string, defaultValue: T, allowed: readonly T[]): T {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return defaultValue;
  if (!(allowed as readonly string[]).includes(raw)) {
    logger.error({ name, value: raw, allowed }, `Invalid env var: ${name} must be one of: ${allowed.join(', ')}`);
    process.exit(1);
  }
  return raw as T;
}

/** Return a string env var or its default. */
function stringEnv(name: string, defaultValue: string): string {
  const raw = process.env[name];
  return raw !== undefined && raw.length > 0 ? raw : defaultValue;
}

// ---------------------------------------------------------------------------
// Validated exports
// ---------------------------------------------------------------------------

/** Port for the Elysia HTTP/WS server */
export const PORT = requireIntEnv('PORT', 3000, 1, 65535);

/**
 * SEC-FIX 2: Bind to loopback only — no external connections accepted.
 * Set HOST=0.0.0.0 to expose on LAN (e.g. for Docker or remote dev).
 */
export const HOST = stringEnv('HOST', '127.0.0.1');

/** Path to the SQLite database file */
export const DB_PATH = stringEnv('DB_PATH', join(import.meta.dir, '../data/chatroom.db'));

export const NODE_ENV = requireEnumEnv('NODE_ENV', 'development', ['development', 'production', 'test'] as const);

/**
 * Directory containing agent .md definition files.
 * Resolution order:
 *   1. AGENT_DIR env var (explicit override, validated to exist)
 *   2. ~/.claude/plugins/cache/unmassk-claude-toolkit/unmassk-toolkit/<version>/agents (glob for any version)
 *   3. Relative fallback for development (../../../../../../agents)
 */
function resolveAgentDir(): string {
  if (process.env.AGENT_DIR) {
    const dir = process.env.AGENT_DIR;
    if (!existsSync(dir)) {
      logger.error({ AGENT_DIR: dir }, 'Invalid env var: AGENT_DIR directory does not exist');
      process.exit(1);
    }
    // Canonicalize: resolve symlinks so downstream code always gets the real path.
    return realpathSync(dir);
  }

  const globPattern = join(
    homedir(),
    '.claude/plugins/cache/unmassk-claude-toolkit/unmassk-toolkit/*/agents'
  );
  try {
    const matches = globSync(globPattern);
    if (matches.length > 0) {
      // Sort descending to pick the highest version (e.g. 2.0.0 > 1.0.0)
      matches.sort().reverse();
      return realpathSync(matches[0]);
    }
  } catch {
    // globSync not available or no match — fall through to default
  }

  const fallback = join(import.meta.dir, '../../../../../../agents');
  const resolved = existsSync(fallback) ? fallback : join(import.meta.dir, '../agents');
  return existsSync(resolved) ? realpathSync(resolved) : resolved;
}

export const AGENT_DIR = resolveAgentDir();

/**
 * Maximum concurrent agent invocations per room.
 * FIX 18: Reduced from 5 to 3 — 5 concurrent claude processes ≈ 5GB RSS.
 * Set MAX_CONCURRENT_AGENTS env var to increase on machines with >16GB RAM.
 */
export const MAX_CONCURRENT_AGENTS = requireIntEnv('MAX_CONCURRENT_AGENTS', 3, 1, 20);

/** Timeout for a single agent invocation in milliseconds (5 min) */
export const AGENT_TIMEOUT_MS = 5 * 60 * 1000;

/** Number of messages sent to each agent as context */
export const AGENT_HISTORY_LIMIT = 20;

/** Maximum messages returned in initial room_state */
export const ROOM_STATE_MESSAGE_LIMIT = 50;

/**
 * Allowed origins for WebSocket upgrade.
 * Configurable via WS_ALLOWED_ORIGINS env var (comma-separated list).
 * Each entry must be a valid http:// or https:// URL origin (scheme + host [+ port]).
 * Empty entries (e.g. from a trailing comma) are filtered out of the parsed
 * list so they do not act as an accidental wildcard.
 * In dev/test, an empty string is added explicitly to allow wscat/curl
 * connections that send no Origin header.
 */
function parseWsAllowedOrigins(): readonly string[] {
  const raw = process.env.WS_ALLOWED_ORIGINS ?? 'http://localhost:4201,http://127.0.0.1:4201';
  const entries = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Validate that each entry is a well-formed http/https origin
  for (const entry of entries) {
    try {
      const url = new URL(entry);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error(`protocol must be http or https`);
      }
    } catch {
      logger.error({ WS_ALLOWED_ORIGINS: entry }, 'Invalid env var: WS_ALLOWED_ORIGINS entry is not a valid http/https origin');
      process.exit(1);
    }
  }

  return entries;
}

const _rawOrigins = parseWsAllowedOrigins();

// SEC-CONFIG-001: Explicitly check for known dev/test values.
// The previous `!== 'production'` check was overly permissive: an unset or
// misspelled NODE_ENV (e.g. 'staging', 'preview') would silently enable the
// no-Origin bypass in a non-development environment.
const _isDev = NODE_ENV === 'development' || NODE_ENV === 'test';

export const WS_ALLOWED_ORIGINS: readonly string[] = [
  ..._rawOrigins,
  ...(_isDev ? [''] : []),
];

if (_isDev) {
  logger.warn({ nodeEnv: NODE_ENV }, 'WS upgrade accepts connections with no Origin header — set NODE_ENV=production to enforce origin checking');
}

/**
 * Per-agent voice descriptors injected into each system prompt.
 * Moved from agent-invoker.ts to keep config centralized and testable.
 */
export const AGENT_VOICE: Readonly<Record<string, string>> = {
  bilbo:      'Curioso, metódico. "¿Qué hay aquí?" antes de "¿qué debería haber?"',
  ultron:     'Directo, eficiente. Anuncia qué hará, lo hace, reporta. Sin filosofía.',
  cerberus:   'Estructurado, con opinión. Veredictos claros: "LGTM" o "no mergeable".',
  moriarty:   'Provocador, afilado. "¿Qué pasa si mando 10.000 de estos?"',
  house:      'Impaciente con las adivinanzas. Elimina teorías rápido, demuestra la correcta.',
  yoda:       'Deliberado, final. Un veredicto claro con el razonamiento. No se repite.',
  argus:      'Clínico, enfocado en riesgo. Cada finding tiene impacto, no teoría.',
  dante:      'Escéptico, preciso. "Funciona en mi máquina" no es un test.',
  alexandria: 'Clara, organizada. Documenta hechos, no aspiraciones.',
  gitto:      'Factual. Cita commits y diffs, no opiniones.',
};
