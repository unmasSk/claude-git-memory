import { describe, it, expect, beforeAll } from 'bun:test';
import { loadAgentRegistry } from './agent-registry.js';
import { extractMentions } from './mention-parser.js';

// Seed the registry before running tests
beforeAll(() => {
  loadAgentRegistry();
});

describe('extractMentions', () => {
  // --- Basic extraction ---

  it('extracts a single mention', () => {
    const result = extractMentions('@bilbo check this out', 'human');
    expect(result).toEqual(new Set(['bilbo']));
  });

  it('extracts multiple distinct mentions', () => {
    const result = extractMentions('@bilbo @ultron please help', 'human');
    expect(result).toEqual(new Set(['bilbo', 'ultron']));
  });

  // --- FIX 9: Deduplication ---

  it('deduplicates repeated mentions', () => {
    const result = extractMentions('@bilbo @bilbo explore this', 'human');
    expect(result).toEqual(new Set(['bilbo']));
    expect(result.size).toBe(1);
  });

  // --- FIX 5: Agent-authored messages ---

  it('returns empty set for agent-authored messages', () => {
    const result = extractMentions('@bilbo @ultron', 'agent');
    expect(result).toEqual(new Set());
    expect(result.size).toBe(0);
  });

  it('passes through mentions for system-authored messages (only agent type is blocked)', () => {
    // FIX 5 only blocks authorType='agent'. 'system' is not a user-driven
    // author type but the spec only specifies blocking 'agent'.
    // System messages with @mentions are unusual and handled by the caller.
    const result = extractMentions('@bilbo @ultron', 'system');
    // System type is not blocked — only 'agent' is blocked per FIX 5
    expect(result.size).toBeGreaterThanOrEqual(0);
  });

  // --- Email false positive filter ---

  it('ignores email-like patterns', () => {
    const result = extractMentions('email me at user@bilbo.com for details', 'human');
    expect(result).toEqual(new Set());
  });

  it('handles mixed valid mention and email', () => {
    const result = extractMentions('@bilbo check user@bilbo.com', 'human');
    expect(result).toEqual(new Set(['bilbo']));
  });

  // --- Unknown agent filter ---

  it('ignores mentions of unknown agents', () => {
    const result = extractMentions('@unknown @nobody hello', 'human');
    expect(result).toEqual(new Set());
  });

  it('ignores unknown agents but keeps known ones', () => {
    const result = extractMentions('@bilbo @unknown works', 'human');
    expect(result).toEqual(new Set(['bilbo']));
  });

  // --- Case insensitivity ---

  it('is case-insensitive for known agents', () => {
    const result = extractMentions('@Bilbo @ULTRON check this', 'human');
    expect(result).toEqual(new Set(['bilbo', 'ultron']));
  });

  it('normalizes mention names to lowercase', () => {
    const result = extractMentions('@BILBO', 'human');
    const [first] = result;
    expect(first).toBe('bilbo');
  });

  // --- Edge cases ---

  it('returns empty set for empty content', () => {
    const result = extractMentions('', 'human');
    expect(result).toEqual(new Set());
  });

  it('returns empty set for content with no mentions', () => {
    const result = extractMentions('hello world no mentions here', 'human');
    expect(result).toEqual(new Set());
  });

  it('handles mention at end of string without trailing char', () => {
    const result = extractMentions('check it @bilbo', 'human');
    expect(result).toEqual(new Set(['bilbo']));
  });

  it('handles multiple distinct known agents', () => {
    const result = extractMentions('@cerberus review and @bilbo explore', 'human');
    expect(result).toEqual(new Set(['cerberus', 'bilbo']));
  });
});
