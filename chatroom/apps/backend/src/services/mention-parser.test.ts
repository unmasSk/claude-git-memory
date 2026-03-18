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
    const result = extractMentions('@bilbo check this out');
    expect(result).toEqual(new Set(['bilbo']));
  });

  it('extracts multiple distinct mentions', () => {
    const result = extractMentions('@bilbo @ultron please help');
    expect(result).toEqual(new Set(['bilbo', 'ultron']));
  });

  // --- FIX 9: Deduplication ---

  it('deduplicates repeated mentions', () => {
    const result = extractMentions('@bilbo @bilbo explore this');
    expect(result).toEqual(new Set(['bilbo']));
    expect(result.size).toBe(1);
  });

  // --- Agent @mentions with depth tracking ---

  it('allows agent mentions at depth 0', () => {
    const result = extractMentions('@bilbo hello', 0);
    expect(result).toEqual(new Set(['bilbo']));
  });

  it('extracts multiple distinct mentions', () => {
    const result = extractMentions('@bilbo @ultron check this');
    expect(result).toEqual(new Set(['bilbo', 'ultron']));
  });

  // --- T1-02: @claude loop prevention ---

  it('never returns claude as a mention', () => {
    const result = extractMentions('@claude help me');
    expect(result).toEqual(new Set());
  });

  it('filters claude but keeps other valid mentions', () => {
    const result = extractMentions('@claude @bilbo check this');
    expect(result).toEqual(new Set(['bilbo']));
  });

  // --- Email false positive filter ---

  it('ignores email-like patterns', () => {
    const result = extractMentions('email me at user@bilbo.com for details');
    expect(result).toEqual(new Set());
  });

  it('handles mixed valid mention and email', () => {
    const result = extractMentions('@bilbo check user@bilbo.com');
    expect(result).toEqual(new Set(['bilbo']));
  });

  // --- Unknown agent filter ---

  it('ignores mentions of unknown agents', () => {
    const result = extractMentions('@unknown @nobody hello');
    expect(result).toEqual(new Set());
  });

  it('ignores unknown agents but keeps known ones', () => {
    const result = extractMentions('@bilbo @unknown works');
    expect(result).toEqual(new Set(['bilbo']));
  });

  // --- Case insensitivity ---

  it('is case-insensitive for known agents', () => {
    const result = extractMentions('@Bilbo @ULTRON check this');
    expect(result).toEqual(new Set(['bilbo', 'ultron']));
  });

  it('normalizes mention names to lowercase', () => {
    const result = extractMentions('@BILBO');
    const [first] = result;
    expect(first).toBe('bilbo');
  });

  // --- Edge cases ---

  it('returns empty set for empty content', () => {
    const result = extractMentions('');
    expect(result).toEqual(new Set());
  });

  it('returns empty set for content with no mentions', () => {
    const result = extractMentions('hello world no mentions here');
    expect(result).toEqual(new Set());
  });

  it('handles mention at end of string without trailing char', () => {
    const result = extractMentions('check it @bilbo');
    expect(result).toEqual(new Set(['bilbo']));
  });

  it('handles multiple distinct known agents', () => {
    const result = extractMentions('@cerberus review and @bilbo explore');
    expect(result).toEqual(new Set(['cerberus', 'bilbo']));
  });
});
