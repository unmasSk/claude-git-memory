import { join } from 'node:path';
import { existsSync, globSync } from 'node:fs';
import { homedir } from 'node:os';

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
 * SEC-FIX 3: Tools that are never allowed in agent invocations,
 * regardless of what the agent's frontmatter says.
 * Bash = arbitrary code execution. computer = desktop automation.
 */
export const BANNED_TOOLS: readonly string[] = ['Bash', 'computer'];
