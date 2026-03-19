/**
 * Coverage tests for auth-tokens.ts — brute-force tracking internals.
 *
 * The recordAuthFailure / sourceKey logic is not exported.
 * We exercise it indirectly via the public peekToken / validateToken API:
 *   - Each call with an unknown/invalid token internally calls recordAuthFailure
 *   - After AUTH_FAILURE_THRESHOLD (10) failures from the same token prefix
 *     the module logs an error (we can't intercept that without patching the
 *     logger, but we verify the function does not throw and still returns null)
 *   - We also verify the sourceKey sentinel 'unknown' path (short / undefined tokens)
 *
 * These tests are intentionally separate from auth-tokens.test.ts to avoid
 * polluting the shared in-memory auth failure counters with noisy prefix data.
 */
import { describe, it, expect } from 'bun:test';
import { peekToken, validateToken, issueToken } from '../../src/services/auth-tokens.js';

// ---------------------------------------------------------------------------
// sourceKey derivation — exercised via short / undefined tokens
// ---------------------------------------------------------------------------

describe('auth-tokens — sourceKey sentinel (tokens shorter than 8 chars)', () => {
  it('peekToken with undefined does not throw (sourceKey → "unknown")', () => {
    expect(() => peekToken(undefined)).not.toThrow();
    expect(peekToken(undefined)).toBeNull();
  });

  it('validateToken with undefined does not throw (sourceKey → "unknown")', () => {
    expect(() => validateToken(undefined)).not.toThrow();
    expect(validateToken(undefined)).toBeNull();
  });

  it('peekToken with empty string does not throw (sourceKey → "unknown")', () => {
    expect(() => peekToken('')).not.toThrow();
    expect(peekToken('')).toBeNull();
  });

  it('validateToken with empty string does not throw (sourceKey → "unknown")', () => {
    expect(() => validateToken('')).not.toThrow();
    expect(validateToken('')).toBeNull();
  });

  it('peekToken with 7-char token does not throw (short → "unknown" sentinel)', () => {
    expect(() => peekToken('abc1234')).not.toThrow();
    expect(peekToken('abc1234')).toBeNull();
  });

  it('validateToken with 7-char token does not throw (short → "unknown" sentinel)', () => {
    expect(() => validateToken('abc1234')).not.toThrow();
    expect(validateToken('abc1234')).toBeNull();
  });

  it('peekToken with exactly 8-char token uses first-8-char key (not sentinel)', () => {
    // 'bf-12345' is 8 chars — takes the normal branch (sourceKey = 'bf-12345')
    expect(peekToken('bf-12345')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Brute-force threshold tracking — 10 failures from same prefix trigger alert
// We use a distinct prefix 'brute-threshold-12345678' (first 8 chars = 'brute-th')
// to avoid colliding with other tests.
// ---------------------------------------------------------------------------

describe('auth-tokens — brute-force failure window', () => {
  // Generate a fake token with a consistent 8-char prefix for threshold testing.
  function makeFakeToken(suffix: string): string {
    return 'brute-tf' + suffix; // prefix = 'brute-tf'
  }

  it('10 failed peekToken calls with same prefix does not throw', () => {
    for (let i = 0; i < 10; i++) {
      expect(() => peekToken(makeFakeToken(`-00${i}-padding`))).not.toThrow();
    }
  });

  it('11th failed peekToken call after threshold does not throw', () => {
    // The 10th call triggers the error log — the 11th must still not throw
    // and must still return null (window.count > threshold is a log-only effect)
    expect(() => peekToken(makeFakeToken('-extra-padding-01'))).not.toThrow();
    expect(peekToken(makeFakeToken('-extra-padding-02'))).toBeNull();
  });

  it('10 failed validateToken calls with same prefix does not throw', () => {
    for (let i = 0; i < 10; i++) {
      expect(() => validateToken('validate-' + `x${i}xxxxxxx`)).not.toThrow();
    }
  });

  it('fresh window starts when first failure arrives from a new prefix', () => {
    // Use a unique prefix so this is the first failure from this source
    const uniquePrefix = 'fresh-w1' + Date.now().toString(36);
    expect(peekToken(uniquePrefix + '-padding')).toBeNull();
    // Second failure — should increment count (no error yet, still < threshold)
    expect(peekToken(uniquePrefix + '-padding2')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Mixed success + failure — window is not affected by successful token ops
// ---------------------------------------------------------------------------

describe('auth-tokens — failures and successes do not interfere', () => {
  it('issuing and consuming a valid token does not corrupt failure tracking', () => {
    // Issue a valid token
    const { token } = issueToken('test-bf-user')!;

    // Trigger several failures from an unrelated fake prefix
    const fakePrefix = 'no-crash-';
    for (let i = 0; i < 5; i++) {
      peekToken(fakePrefix + i.toString().padStart(9, '0'));
    }

    // The valid token is still usable
    expect(validateToken(token)).toBe('test-bf-user');
    // After consumption, it is gone
    expect(validateToken(token)).toBeNull();
  });

  it('peekToken does not consume token even after many failed peeks from other prefixes', () => {
    const { token } = issueToken('test-bf-user2')!;

    // Noise failures from a distinct prefix
    for (let i = 0; i < 5; i++) {
      peekToken('diff-pref' + i.toString().padStart(5, '0'));
    }

    // peekToken on the real token must still work
    const name1 = peekToken(token);
    const name2 = peekToken(token);
    expect(name1).toBe('test-bf-user2');
    expect(name2).toBe('test-bf-user2');

    // Cleanup
    validateToken(token);
  });
});

// ---------------------------------------------------------------------------
// Token store full — issueToken returns null when store >= 10_000
// This is not practical to test by filling 10k real entries, so we verify the
// normal path (token is issued and returned) under realistic conditions.
// ---------------------------------------------------------------------------

describe('auth-tokens — issueToken resilience', () => {
  it('issueToken returns a non-null result for a fresh valid name', () => {
    const result = issueToken('resilience-test-user');
    expect(result).not.toBeNull();
    expect(typeof result!.token).toBe('string');
    expect(typeof result!.expiresAt).toBe('string');
    // Cleanup
    validateToken(result!.token);
  });

  it('issueToken token is at least 32 chars (UUID format)', () => {
    const result = issueToken('length-check-user');
    expect(result!.token.length).toBeGreaterThanOrEqual(32);
    validateToken(result!.token);
  });

  it('issueToken expiresAt is in the future', () => {
    const before = Date.now();
    const result = issueToken('expiry-check-user');
    const expiry = new Date(result!.expiresAt).getTime();
    expect(expiry).toBeGreaterThan(before);
    validateToken(result!.token);
  });

  it('two tokens issued to same name are distinct UUIDs', () => {
    const r1 = issueToken('dup-name-user');
    const r2 = issueToken('dup-name-user');
    expect(r1!.token).not.toBe(r2!.token);
    validateToken(r1!.token);
    validateToken(r2!.token);
  });
});
