import type { AuthorType } from '@agent-chatroom/shared';
import { getAgentConfig } from './agent-registry.js';

// ---------------------------------------------------------------------------
// Mention extraction
// ---------------------------------------------------------------------------

const MENTION_RE = /@([a-zA-Z]+)\b/g;

/**
 * Extract @mentions from a message.
 *
 * Rules:
 * - FIX 5: If authorType is 'agent', return empty set (blocks agent→agent chains).
 * - FIX 9: Returns Set<string> — deduplication is automatic.
 * - Ignores email-like patterns (preceding char is alphanumeric, e.g. "user@bilbo.com").
 * - Only returns mentions matching known agent names in the registry.
 * - Returned names are lowercase.
 */
export function extractMentions(content: string, authorType: AuthorType): Set<string> {
  // FIX 5: Agent-authored messages must never trigger further agent invocations
  if (authorType === 'agent') {
    return new Set();
  }

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

    // Only include known agents
    const config = getAgentConfig(name);
    if (config === null) {
      continue;
    }

    mentions.add(name);
  }

  return mentions;
}
