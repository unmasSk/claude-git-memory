/**
 * Config validation tests — requireIntEnv, requireEnumEnv, stringEnv, parseWsAllowedOrigins.
 *
 * The validation helpers in config.ts are not exported (they call process.exit(1) on
 * invalid input, which is not unit-testable without monkey-patching). We test their
 * logic by inlining exact mirrors, following the same pattern used in config.test.ts
 * for resolveAgentDir and buildAllowedOrigins.
 *
 * If config.ts changes the validation rules, these tests must be updated manually.
 */
import { describe, it, expect } from 'bun:test';

// ---------------------------------------------------------------------------
// Inline mirrors of config.ts validation helpers
// ---------------------------------------------------------------------------

/**
 * Mirror of requireIntEnv — raises instead of calling process.exit(1) so we can assert on errors.
 */
function requireIntEnvMirror(raw: string | undefined, defaultValue: number, min: number, max: number): number {
  if (raw === undefined || raw === '') return defaultValue;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new Error(`invalid int: ${raw} must be between ${min} and ${max}`);
  }
  return n;
}

/**
 * Mirror of requireEnumEnv.
 */
function requireEnumEnvMirror<T extends string>(raw: string | undefined, defaultValue: T, allowed: readonly T[]): T {
  if (raw === undefined || raw === '') return defaultValue;
  if (!(allowed as readonly string[]).includes(raw)) {
    throw new Error(`invalid enum: ${raw} must be one of: ${allowed.join(', ')}`);
  }
  return raw as T;
}

/**
 * Mirror of stringEnv.
 */
function stringEnvMirror(raw: string | undefined, defaultValue: string): string {
  return raw !== undefined && raw.length > 0 ? raw : defaultValue;
}

// ---------------------------------------------------------------------------
// requireIntEnv
// ---------------------------------------------------------------------------

describe('requireIntEnv — valid inputs', () => {
  it('returns default when raw is undefined', () => {
    expect(requireIntEnvMirror(undefined, 3000, 1, 65535)).toBe(3000);
  });

  it('returns default when raw is empty string', () => {
    expect(requireIntEnvMirror('', 3000, 1, 65535)).toBe(3000);
  });

  it('parses a valid integer string', () => {
    expect(requireIntEnvMirror('8080', 3000, 1, 65535)).toBe(8080);
  });

  it('accepts min boundary value', () => {
    expect(requireIntEnvMirror('1', 3000, 1, 65535)).toBe(1);
  });

  it('accepts max boundary value', () => {
    expect(requireIntEnvMirror('65535', 3000, 1, 65535)).toBe(65535);
  });

  it('accepts value in the middle of range', () => {
    expect(requireIntEnvMirror('3', 3, 1, 20)).toBe(3);
  });
});

describe('requireIntEnv — invalid inputs (trigger error)', () => {
  it('throws for a value below min', () => {
    expect(() => requireIntEnvMirror('0', 3000, 1, 65535)).toThrow();
  });

  it('throws for a value above max', () => {
    expect(() => requireIntEnvMirror('65536', 3000, 1, 65535)).toThrow();
  });

  it('throws for a non-integer float', () => {
    expect(() => requireIntEnvMirror('3.14', 3000, 1, 65535)).toThrow();
  });

  it('throws for non-numeric string', () => {
    expect(() => requireIntEnvMirror('abc', 3000, 1, 65535)).toThrow();
  });

  it('throws for NaN string', () => {
    expect(() => requireIntEnvMirror('NaN', 3000, 1, 65535)).toThrow();
  });

  it('throws for Infinity', () => {
    expect(() => requireIntEnvMirror('Infinity', 3000, 1, 65535)).toThrow();
  });

  it('throws for negative value below min=1', () => {
    expect(() => requireIntEnvMirror('-1', 3000, 1, 65535)).toThrow();
  });

  it('error message references the out-of-range value', () => {
    let msg = '';
    try {
      requireIntEnvMirror('99999', 3000, 1, 65535);
    } catch (e) {
      msg = String(e);
    }
    expect(msg).toContain('99999');
  });
});

describe('requireIntEnv — boundary conditions for MAX_CONCURRENT_AGENTS (1..20)', () => {
  it('accepts 1 (minimum)', () => {
    expect(requireIntEnvMirror('1', 3, 1, 20)).toBe(1);
  });

  it('accepts 20 (maximum)', () => {
    expect(requireIntEnvMirror('20', 3, 1, 20)).toBe(20);
  });

  it('throws for 0 (below min)', () => {
    expect(() => requireIntEnvMirror('0', 3, 1, 20)).toThrow();
  });

  it('throws for 21 (above max)', () => {
    expect(() => requireIntEnvMirror('21', 3, 1, 20)).toThrow();
  });

  it('returns default 3 when env is not set', () => {
    expect(requireIntEnvMirror(undefined, 3, 1, 20)).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// requireEnumEnv
// ---------------------------------------------------------------------------

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const;
const NODE_ENVS = ['development', 'production', 'test'] as const;

describe('requireEnumEnv — valid inputs', () => {
  it('returns default when raw is undefined', () => {
    expect(requireEnumEnvMirror(undefined, 'debug', LOG_LEVELS)).toBe('debug');
  });

  it('returns default when raw is empty string', () => {
    expect(requireEnumEnvMirror('', 'debug', LOG_LEVELS)).toBe('debug');
  });

  it('returns the valid enum value as-is', () => {
    expect(requireEnumEnvMirror('warn', 'debug', LOG_LEVELS)).toBe('warn');
  });

  it('accepts all valid LOG_LEVEL values', () => {
    for (const level of LOG_LEVELS) {
      expect(requireEnumEnvMirror(level, 'debug', LOG_LEVELS)).toBe(level);
    }
  });

  it('accepts all valid NODE_ENV values', () => {
    for (const env of NODE_ENVS) {
      expect(requireEnumEnvMirror(env, 'development', NODE_ENVS)).toBe(env);
    }
  });
});

describe('requireEnumEnv — invalid inputs (trigger error)', () => {
  it('throws for an invalid log level', () => {
    expect(() => requireEnumEnvMirror('verbose', 'debug', LOG_LEVELS)).toThrow();
  });

  it('throws for an invalid NODE_ENV value', () => {
    expect(() => requireEnumEnvMirror('staging', 'development', NODE_ENVS)).toThrow();
  });

  it('throws for case-mismatched value (enum is case-sensitive)', () => {
    expect(() => requireEnumEnvMirror('DEBUG', 'debug', LOG_LEVELS)).toThrow();
    expect(() => requireEnumEnvMirror('INFO', 'debug', LOG_LEVELS)).toThrow();
  });

  it('throws for a value with leading/trailing whitespace', () => {
    // The function does not trim — ' debug' is not 'debug'
    expect(() => requireEnumEnvMirror(' debug', 'debug', LOG_LEVELS)).toThrow();
  });

  it('error message references the invalid value', () => {
    let msg = '';
    try {
      requireEnumEnvMirror('invalid-env', 'development', NODE_ENVS);
    } catch (e) {
      msg = String(e);
    }
    expect(msg).toContain('invalid-env');
  });

  it('error message lists allowed values', () => {
    let msg = '';
    try {
      requireEnumEnvMirror('bad-level', 'debug', LOG_LEVELS);
    } catch (e) {
      msg = String(e);
    }
    expect(msg).toContain('fatal');
  });
});

// ---------------------------------------------------------------------------
// stringEnv
// ---------------------------------------------------------------------------

describe('stringEnv', () => {
  it('returns default when raw is undefined', () => {
    expect(stringEnvMirror(undefined, '127.0.0.1')).toBe('127.0.0.1');
  });

  it('returns default when raw is empty string', () => {
    expect(stringEnvMirror('', '127.0.0.1')).toBe('127.0.0.1');
  });

  it('returns the raw value when non-empty', () => {
    expect(stringEnvMirror('0.0.0.0', '127.0.0.1')).toBe('0.0.0.0');
  });

  it('returns a single-char value (not empty)', () => {
    expect(stringEnvMirror('x', 'default')).toBe('x');
  });

  it('returns default when raw is exactly empty (zero-length)', () => {
    expect(stringEnvMirror('', 'fallback')).toBe('fallback');
  });

  it('preserves leading/trailing whitespace in non-empty raw values', () => {
    // stringEnv does not trim — raw ' value ' is returned as-is
    expect(stringEnvMirror(' /tmp/test.db ', 'default.db')).toBe(' /tmp/test.db ');
  });
});

// ---------------------------------------------------------------------------
// parseWsAllowedOrigins logic — inline mirror (validation + parsing)
// The real function calls process.exit(1) on invalid origins.
// We mirror the parsing logic so we can assert on the validation rules.
// ---------------------------------------------------------------------------

function parseWsAllowedOriginsMirror(raw: string): string[] | 'EXIT' {
  const entries = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const entry of entries) {
    try {
      const url = new URL(entry);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return 'EXIT';
      }
    } catch {
      return 'EXIT';
    }
  }

  return entries;
}

describe('parseWsAllowedOrigins — parsing logic', () => {
  it('parses a single http origin', () => {
    const result = parseWsAllowedOriginsMirror('http://localhost:4201');
    expect(result).toEqual(['http://localhost:4201']);
  });

  it('parses two comma-separated origins', () => {
    const result = parseWsAllowedOriginsMirror('http://localhost:4201,http://127.0.0.1:4201');
    expect(result).toEqual(['http://localhost:4201', 'http://127.0.0.1:4201']);
  });

  it('trims whitespace around each origin', () => {
    const result = parseWsAllowedOriginsMirror('http://localhost:4201 , http://127.0.0.1:4201');
    expect(result).toEqual(['http://localhost:4201', 'http://127.0.0.1:4201']);
  });

  it('filters out empty entries from trailing comma', () => {
    const result = parseWsAllowedOriginsMirror('http://localhost:4201,');
    expect(result).toEqual(['http://localhost:4201']);
  });

  it('accepts https origins', () => {
    const result = parseWsAllowedOriginsMirror('https://app.example.com');
    expect(result).toEqual(['https://app.example.com']);
  });

  it('rejects ws:// protocol (triggers EXIT)', () => {
    expect(parseWsAllowedOriginsMirror('ws://localhost:4201')).toBe('EXIT');
  });

  it('rejects ftp:// protocol (triggers EXIT)', () => {
    expect(parseWsAllowedOriginsMirror('ftp://example.com')).toBe('EXIT');
  });

  it('rejects a plain hostname (no protocol) — invalid URL (triggers EXIT)', () => {
    expect(parseWsAllowedOriginsMirror('localhost:4201')).toBe('EXIT');
  });

  it('rejects a garbage string (triggers EXIT)', () => {
    expect(parseWsAllowedOriginsMirror('not-a-url-at-all')).toBe('EXIT');
  });

  it('mixes valid and invalid origins — EXIT on first invalid', () => {
    // The first entry is valid but the second is ftp:// — should exit
    const result = parseWsAllowedOriginsMirror('http://localhost:4201,ftp://bad.example.com');
    expect(result).toBe('EXIT');
  });
});

// ---------------------------------------------------------------------------
// PORT boundary values (requireIntEnv called with 1..65535)
// ---------------------------------------------------------------------------

describe('PORT env var validation boundaries', () => {
  it('port 1 is valid', () => {
    expect(requireIntEnvMirror('1', 3000, 1, 65535)).toBe(1);
  });

  it('port 65535 is valid', () => {
    expect(requireIntEnvMirror('65535', 3000, 1, 65535)).toBe(65535);
  });

  it('port 0 is invalid', () => {
    expect(() => requireIntEnvMirror('0', 3000, 1, 65535)).toThrow();
  });

  it('port 65536 is invalid', () => {
    expect(() => requireIntEnvMirror('65536', 3000, 1, 65535)).toThrow();
  });

  it('negative port is invalid', () => {
    expect(() => requireIntEnvMirror('-80', 3000, 1, 65535)).toThrow();
  });

  it('float port is invalid', () => {
    expect(() => requireIntEnvMirror('3000.5', 3000, 1, 65535)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Config constants — verify exported values match expected defaults.
// These tests import the real config.ts to catch accidental constant drift.
// ---------------------------------------------------------------------------

describe('config.ts — exported constant shapes', () => {
  it('MAX_CONCURRENT_AGENTS is between 1 and 20', async () => {
    const { MAX_CONCURRENT_AGENTS } = await import('../src/config.js');
    expect(MAX_CONCURRENT_AGENTS).toBeGreaterThanOrEqual(1);
    expect(MAX_CONCURRENT_AGENTS).toBeLessThanOrEqual(20);
  });

  it('AGENT_TIMEOUT_MS is 5 minutes (300000 ms)', async () => {
    const { AGENT_TIMEOUT_MS } = await import('../src/config.js');
    expect(AGENT_TIMEOUT_MS).toBe(5 * 60 * 1000);
  });

  it('AGENT_HISTORY_LIMIT is 20', async () => {
    const { AGENT_HISTORY_LIMIT } = await import('../src/config.js');
    expect(AGENT_HISTORY_LIMIT).toBe(20);
  });

  it('ROOM_STATE_MESSAGE_LIMIT is 50', async () => {
    const { ROOM_STATE_MESSAGE_LIMIT } = await import('../src/config.js');
    expect(ROOM_STATE_MESSAGE_LIMIT).toBe(50);
  });

  it('AGENT_VOICE has entries for all 10 expected agents', async () => {
    const { AGENT_VOICE } = await import('../src/config.js');
    const expectedAgents = [
      'bilbo',
      'ultron',
      'cerberus',
      'moriarty',
      'house',
      'yoda',
      'argus',
      'dante',
      'alexandria',
      'gitto',
    ];
    for (const name of expectedAgents) {
      expect(AGENT_VOICE[name]).toBeDefined();
      expect(AGENT_VOICE[name]!.length).toBeGreaterThan(0);
    }
  });

  it('AGENT_VOICE values are non-empty strings', async () => {
    const { AGENT_VOICE } = await import('../src/config.js');
    for (const [, voice] of Object.entries(AGENT_VOICE)) {
      expect(typeof voice).toBe('string');
      expect(voice.length).toBeGreaterThan(0);
    }
  });

  it('WS_ALLOWED_ORIGINS is a readonly array', async () => {
    const { WS_ALLOWED_ORIGINS } = await import('../src/config.js');
    expect(Array.isArray(WS_ALLOWED_ORIGINS)).toBe(true);
  });

  it('WS_ALLOWED_ORIGINS includes localhost:4201', async () => {
    const { WS_ALLOWED_ORIGINS } = await import('../src/config.js');
    expect(WS_ALLOWED_ORIGINS).toContain('http://localhost:4201');
  });

  it('WS_ALLOWED_ORIGINS includes 127.0.0.1:4201', async () => {
    const { WS_ALLOWED_ORIGINS } = await import('../src/config.js');
    expect(WS_ALLOWED_ORIGINS).toContain('http://127.0.0.1:4201');
  });

  it('AGENT_DIR is a non-empty string', async () => {
    const { AGENT_DIR } = await import('../src/config.js');
    expect(typeof AGENT_DIR).toBe('string');
    expect(AGENT_DIR.length).toBeGreaterThan(0);
  });

  it('NODE_ENV is one of the three allowed values', async () => {
    const { NODE_ENV } = await import('../src/config.js');
    expect(['development', 'production', 'test']).toContain(NODE_ENV);
  });

  it('PORT is a valid port number (1–65535)', async () => {
    const { PORT } = await import('../src/config.js');
    expect(PORT).toBeGreaterThanOrEqual(1);
    expect(PORT).toBeLessThanOrEqual(65535);
  });

  it('HOST is a non-empty string', async () => {
    const { HOST } = await import('../src/config.js');
    expect(typeof HOST).toBe('string');
    expect(HOST.length).toBeGreaterThan(0);
  });
});
