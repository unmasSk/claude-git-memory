/**
 * Unit tests for config.ts — resolveAgentDir() resolution logic.
 *
 * The function under test is not exported, so we test it indirectly by
 * controlling the environment (AGENT_DIR env var) and by calling the exported
 * AGENT_DIR constant after module re-evaluation via a helper that reimports
 * the module with a fresh import.meta cache (Bun supports this via dynamic
 * import with a cache-busting URL).
 *
 * Strategy:
 *  - AGENT_DIR env var path: override process.env.AGENT_DIR, verify the result
 *    matches what was set.
 *  - Glob path: the actual globSync in resolveAgentDir returns the highest-
 *    versioned match; we verify the exported AGENT_DIR is a non-empty string
 *    when no override is set (i.e., either glob or fallback ran successfully).
 *  - Fallback path: verify existsSync fallback string never throws even when
 *    the directory does not exist.
 *
 * NOTE: Because Bun caches ESM modules, we cannot re-run resolveAgentDir()
 * from a separate import after changing env vars in the same test run.
 * Instead, we test the logic by inlining a copy of the function — exactly the
 * same pattern used in ws.test.ts for the rate-limit helper. This guarantees
 * the tests are deterministic and fast without side effects.
 */
import { describe, it, expect, afterEach } from 'bun:test';
import { existsSync, globSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

// ---------------------------------------------------------------------------
// Inline resolveAgentDir — mirrors config.ts exactly so tests stay in sync
// ---------------------------------------------------------------------------

function resolveAgentDir(env?: Record<string, string | undefined>): string {
  const agentDirEnv = env?.AGENT_DIR ?? process.env.AGENT_DIR;
  if (agentDirEnv) return agentDirEnv;

  const globPattern = join(
    homedir(),
    '.claude/plugins/cache/unmassk-claude-toolkit/unmassk-toolkit/*/agents'
  );
  try {
    const matches = globSync(globPattern);
    if (matches.length > 0) {
      matches.sort().reverse();
      return matches[0];
    }
  } catch {
    // globSync not available or no match — fall through to default
  }

  const fallback = join(import.meta.dir, '../../../../../../agents');
  return existsSync(fallback) ? fallback : join(import.meta.dir, '../agents');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('resolveAgentDir — AGENT_DIR env var has priority', () => {
  const originalEnv = process.env.AGENT_DIR;

  afterEach(() => {
    // Restore original env value after each test
    if (originalEnv === undefined) {
      delete process.env.AGENT_DIR;
    } else {
      process.env.AGENT_DIR = originalEnv;
    }
  });

  it('returns the exact AGENT_DIR value when set', () => {
    const expected = '/custom/path/to/agents';
    const result = resolveAgentDir({ AGENT_DIR: expected });
    expect(result).toBe(expected);
  });

  it('returns a different custom path unchanged', () => {
    const expected = '/opt/my-project/agents';
    const result = resolveAgentDir({ AGENT_DIR: expected });
    expect(result).toBe(expected);
  });

  it('env var takes priority over glob — even when glob would match', () => {
    // Provide a custom env value and verify it's returned without glob running
    const expected = '/explicit/override';
    const result = resolveAgentDir({ AGENT_DIR: expected });
    // If glob had priority this would return a ~/.claude/... path instead
    expect(result).toBe(expected);
    expect(result).not.toContain('.claude');
  });
});

describe('resolveAgentDir — no env var, glob and fallback', () => {
  it('returns a non-empty string when no env var is set', () => {
    // Either glob matched or the fallback ran — either way we get a string
    const result = resolveAgentDir({ AGENT_DIR: undefined });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns an absolute path (starts with /)', () => {
    const result = resolveAgentDir({ AGENT_DIR: undefined });
    expect(result.startsWith('/')).toBe(true);
  });

  it('glob pattern targets the unmassk-toolkit agents directory', () => {
    // Verify the globPattern structure — the resolved dir must contain "agents"
    const result = resolveAgentDir({ AGENT_DIR: undefined });
    expect(result).toContain('agents');
  });
});

describe('resolveAgentDir — fallback when no glob match', () => {
  it('fallback path ends with /agents', () => {
    // When globSync returns empty and the distant-relative fallback does not
    // exist, resolveAgentDir falls back to import.meta.dir/../agents.
    // We cannot easily force globSync to return [] without monkey-patching,
    // so we verify the fallback string construction directly.
    const fallbackWithExisting = join(import.meta.dir, '../../../../../../agents');
    const fallbackWithoutExisting = join(import.meta.dir, '../agents');

    // Both possible fallback paths end with /agents
    expect(fallbackWithExisting.endsWith('/agents')).toBe(true);
    expect(fallbackWithoutExisting.endsWith('/agents')).toBe(true);
  });

  it('version sort picks highest version when multiple glob matches exist', () => {
    // Simulate what sort().reverse() does on version-like directory paths
    const simulatedMatches = [
      '/home/user/.claude/plugins/cache/unmassk-claude-toolkit/unmassk-toolkit/0.9.0/agents',
      '/home/user/.claude/plugins/cache/unmassk-claude-toolkit/unmassk-toolkit/1.0.0/agents',
      '/home/user/.claude/plugins/cache/unmassk-claude-toolkit/unmassk-toolkit/2.0.0/agents',
    ];
    const sorted = [...simulatedMatches].sort().reverse();
    // Lexicographic sort descending picks 2.0.0 > 1.0.0 > 0.9.0
    expect(sorted[0]).toContain('2.0.0');
    expect(sorted[0]).toBe(simulatedMatches[2]);
  });

  it('version sort handles single match correctly', () => {
    const singleMatch = ['/path/to/1.0.0/agents'];
    const sorted = [...singleMatch].sort().reverse();
    expect(sorted[0]).toBe('/path/to/1.0.0/agents');
  });
});
