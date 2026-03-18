import { join } from 'node:path';
import { existsSync, globSync } from 'node:fs';
import { homedir } from 'node:os';
import { createLogger } from './logger.js';

const logger = createLogger('config');

/** Port for the Elysia HTTP/WS server */
export const PORT = Number(process.env.PORT ?? 3001);

/**
 * SEC-FIX 2: Bind to loopback only — no external connections accepted.
 * Set HOST=0.0.0.0 to expose on LAN (e.g. for Docker or remote dev).
 */
export const HOST = process.env.HOST ?? '127.0.0.1';

/** Path to the SQLite database file */
export const DB_PATH = process.env.DB_PATH ?? join(import.meta.dir, '../data/chatroom.db');

/**
 * Directory containing agent .md definition files.
 * Resolution order:
 *   1. AGENT_DIR env var (explicit override)
 *   2. ~/.claude/plugins/cache/unmassk-claude-toolkit/unmassk-toolkit/<version>/agents (glob for any version)
 *   3. Relative fallback for development (../../../../../../agents)
 */
function resolveAgentDir(): string {
  if (process.env.AGENT_DIR) return process.env.AGENT_DIR;

  const globPattern = join(
    homedir(),
    '.claude/plugins/cache/unmassk-claude-toolkit/unmassk-toolkit/*/agents'
  );
  try {
    const matches = globSync(globPattern);
    if (matches.length > 0) {
      // Sort descending to pick the highest version (e.g. 2.0.0 > 1.0.0)
      matches.sort().reverse();
      return matches[0];
    }
  } catch {
    // globSync not available or no match — fall through to default
  }

  const fallback = join(import.meta.dir, '../../../../../../agents');
  return existsSync(fallback) ? fallback : join(import.meta.dir, '../agents');
}

export const AGENT_DIR = resolveAgentDir();

/**
 * Maximum concurrent agent invocations per room.
 * FIX 18: Reduced from 5 to 3 — 5 concurrent claude processes ≈ 5GB RSS.
 * Set MAX_CONCURRENT_AGENTS env var to increase on machines with >16GB RAM.
 */
const _maxAgents = Number(process.env.MAX_CONCURRENT_AGENTS ?? 3);
export const MAX_CONCURRENT_AGENTS = Number.isFinite(_maxAgents) && _maxAgents >= 1 ? _maxAgents : 3;

/** Timeout for a single agent invocation in milliseconds (5 min) */
export const AGENT_TIMEOUT_MS = 5 * 60 * 1000;

/** Number of messages sent to each agent as context */
export const AGENT_HISTORY_LIMIT = 20;

/** Maximum messages returned in initial room_state */
export const ROOM_STATE_MESSAGE_LIMIT = 50;

/** WebSocket topic prefix for room pub/sub */
export const WS_ROOM_TOPIC_PREFIX = 'room:';

/**
 * Allowed origins for WebSocket upgrade.
 * Configurable via WS_ALLOWED_ORIGINS env var (comma-separated list).
 * Empty entries (e.g. from a trailing comma) are filtered out of the parsed
 * list so they do not act as an accidental wildcard.
 * In dev (NODE_ENV !== 'production'), an empty string is added explicitly to
 * allow wscat/curl connections that send no Origin header.
 */
const _rawOrigins = (process.env.WS_ALLOWED_ORIGINS ?? 'http://localhost:4201,http://127.0.0.1:4201')
  .split(',')
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

// SEC-CONFIG-001: Explicitly check for known dev/test values.
// The previous `!== 'production'` check was overly permissive: an unset or
// misspelled NODE_ENV (e.g. 'staging', 'preview') would silently enable the
// no-Origin bypass in a non-development environment.
const _isDev =
  process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

export const WS_ALLOWED_ORIGINS: readonly string[] = [
  ..._rawOrigins,
  ...(_isDev ? [''] : []),
];

if (_isDev) {
  logger.warn({ nodeEnv: process.env.NODE_ENV }, 'WS upgrade accepts connections with no Origin header — set NODE_ENV=production to enforce origin checking');
}

/**
 * SEC-FIX 3: Tools that are never allowed in agent invocations,
 * regardless of what the agent's frontmatter says.
 * Bash = arbitrary code execution. computer = desktop automation.
 */
export const BANNED_TOOLS: readonly string[] = ['Bash', 'computer'];

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
