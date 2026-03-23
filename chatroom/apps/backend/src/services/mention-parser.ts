import { getAgentConfig } from './agent-registry.js';
import { createLogger } from '../logger.js';

const logger = createLogger('mention-parser');

// ---------------------------------------------------------------------------
// Mention extraction
// ---------------------------------------------------------------------------

const MENTION_RE = /@([a-zA-Z]+)\b/g;

/**
 * Names that are never actionable mentions regardless of the agent registry.
 *
 * - 'user' / 'system' — reserved by the server, never invokable
 * - 'claude' — excluded from subprocess invocation to prevent a recursive
 *   loop where the server tries to invoke itself (T1-02: prevent @claude loop)
 * - 'everyone' — broadcast alias, not a real agent
 */
const NEVER_INVOKE = new Set(['user', 'system', 'claude', 'everyone']);

/**
 * Extract @mentions from a chat message and return the set of invokable agent names.
 *
 * Rules:
 * - Deduplication is automatic (returns Set<string>).
 * - Ignores email-like patterns where '@' is preceded by an alphanumeric char.
 * - Only returns mentions that match known, invokable agents in the registry.
 * - Never returns 'user', 'system', 'claude', or 'everyone' (T1-01, T1-02).
 * - Returned names are lowercase.
 *
 * Per-agent turn limits are enforced in agent-invoker.ts, not here.
 *
 * @param content - Raw message content to scan for @mentions
 * @returns Set of lowercase agent names that should be invoked
 */
export function extractMentions(content: string): Set<string> {
  logger.debug({ contentLength: content.length }, 'extractMentions');

  // Strip fenced code blocks and inline code before scanning for @mentions
  // to avoid invoking agents that are only referenced inside code examples.
  const stripped = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '');

  const mentions = new Set<string>();

  let match: RegExpExecArray | null;
  MENTION_RE.lastIndex = 0; // reset stateful regex

  while ((match = MENTION_RE.exec(stripped)) !== null) {
    const name = match[1]!.toLowerCase();
    const matchStart = match.index;

    // Filter email-like patterns: if the char before '@' is alphanumeric, skip
    if (matchStart > 0) {
      const before = stripped[matchStart - 1]!;
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

  logger.debug({ mentions: [...mentions] }, 'extractMentions result');
  return mentions;
}
