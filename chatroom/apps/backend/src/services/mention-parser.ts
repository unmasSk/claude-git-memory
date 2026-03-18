import { getAgentConfig } from './agent-registry.js';

// ---------------------------------------------------------------------------
// Debug logger — all output to stderr
// ---------------------------------------------------------------------------

function log(...args: unknown[]) { console.error('[mention-parser]', new Date().toISOString(), ...args); }

// ---------------------------------------------------------------------------
// Mention extraction
// ---------------------------------------------------------------------------

const MENTION_RE = /@([a-zA-Z]+)\b/g;

/**
 * Names that are never actionable mentions regardless of registry.
 * - 'user' / 'system' — reserved by the server, never invokable
 * - 'claude' — the orchestrator identity; invoking it as a subprocess would
 *   create a loop (T1-02: prevent @claude loop)
 */
const NEVER_INVOKE = new Set(['user', 'system', 'claude', 'everyone']);

/**
 * Extract @mentions from a message.
 *
 * Rules:
 * - FIX 9: Returns Set<string> — deduplication is automatic.
 * - Ignores email-like patterns (preceding char is alphanumeric, e.g. "user@bilbo.com").
 * - Only returns mentions matching known agent names in the registry.
 * - Never returns 'user', 'system', or 'claude' (T1-01, T1-02).
 * - Returned names are lowercase.
 *
 * Per-agent turn limits are enforced in agent-invoker.ts, not here.
 */
export function extractMentions(content: string): Set<string> {
  log('extractMentions content length:', content.length);

  const mentions = new Set<string>();

  let match: RegExpExecArray | null;
  MENTION_RE.lastIndex = 0; // reset stateful regex

  while ((match = MENTION_RE.exec(content)) !== null) {
    const name = match[1].toLowerCase();
    const matchStart = match.index;

    // Filter email-like patterns: if the char before '@' is alphanumeric, skip
    if (matchStart > 0) {
      const before = content[matchStart - 1];
      if (/[a-zA-Z0-9]/.test(before)) {
        continue;
      }
    }

    // T1-01/T1-02: Never invoke reserved names
    if (NEVER_INVOKE.has(name)) {
      continue;
    }

    // Only include known agents
    const config = getAgentConfig(name);
    if (config === null) {
      continue;
    }

    mentions.add(name);
  }

  log('extractMentions result:', [...mentions]);
  return mentions;
}
