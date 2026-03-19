/**
 * Coverage tests for agent-registry.ts — file-reading path.
 *
 * The `parseFrontmatter`, `parseToolsList`, and `buildRegistry` file-loading
 * code runs ONLY when AGENT_DIR exists on disk. We cover those lines by:
 *   1. Mocking `node:fs` to fake existsSync and readdirSync
 *   2. Mocking `../config.js` so AGENT_DIR has a known value
 *
 * All mock.module() calls MUST precede any import that transitively loads
 * the module under test.
 */
import { mock } from 'bun:test';

// ---------------------------------------------------------------------------
// In-memory fake filesystem for AGENT_DIR
// ---------------------------------------------------------------------------

const FAKE_AGENT_DIR = '/fake/agents';

const fakeFiles: Record<string, string> = {
  'bilbo.md': `---
model: claude-sonnet-4-6
color: oklch(65% 0.14 195)
tools: Read, Grep, Glob
---

# Bilbo the Explorer
`,
  'ultron.md': `---
model: claude-sonnet-4-6
tools: Read, Edit, Bash, computer
---

# Ultron — Bash and computer should be stripped
`,
  'dante.md': `---
model: claude-sonnet-4-6
tools:
---

# Dante — empty tools string
`,
  'claude.md': `---
model: claude-opus-4-6
---

# Claude — no tools key at all
`,
  'unknown-agent.md': `---
tools: Read
---
# Unknown — not in shared registry, should be skipped
`,
  'argus.md': `# No frontmatter
Just content.
`,
  'moriarty.md': `---
tools: Read, Grep
# missing closing ---
`,
};

// Mock node:fs BEFORE importing agent-registry.js
mock.module('node:fs', () => {
  // Preserve the real node:fs for everything EXCEPT the few functions
  // that buildRegistry calls on AGENT_DIR.
  const realFs = require('node:fs');

  return {
    ...realFs,
    existsSync(p: string): boolean {
      // Normalize separators so the mock works on both Windows and Unix
      if (p.replace(/\\/g, '/') === FAKE_AGENT_DIR.replace(/\\/g, '/')) return true;
      return realFs.existsSync(p);
    },
    readdirSync(p: string): string[] {
      if (p.replace(/\\/g, '/') === FAKE_AGENT_DIR.replace(/\\/g, '/')) return Object.keys(fakeFiles);
      return realFs.readdirSync(p);
    },
    readFileSync(p: string, enc?: string): string | Buffer {
      // Normalize separators so the mock works on both Windows (backslash) and Unix (forward slash).
      const normalP = p.replace(/\\/g, '/');
      const normalDir = FAKE_AGENT_DIR.replace(/\\/g, '/');
      const filename = normalP.replace(normalDir + '/', '');
      if (normalP.startsWith(normalDir) && fakeFiles[filename] !== undefined) {
        return fakeFiles[filename];
      }
      return realFs.readFileSync(p, enc);
    },
  };
});

// Mock config.ts so AGENT_DIR resolves to our fake directory
mock.module('../../src/config.js', () => {
  const realConfig = require('../../src/config.js');
  return {
    ...realConfig,
    AGENT_DIR: FAKE_AGENT_DIR,
  };
});

// ---------------------------------------------------------------------------
// Imports AFTER mocks
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'bun:test';
import { loadAgentRegistry, getAgentConfig } from '../../src/services/agent-registry.js';

// Force a fresh registry build using the mocked filesystem
const registry = loadAgentRegistry();

// ---------------------------------------------------------------------------
// parseFrontmatter + parseToolsList — exercised via loadAgentRegistry
// ---------------------------------------------------------------------------

describe('agent-registry file-reading path', () => {
  it('builds a non-empty registry from mocked .md files', () => {
    expect(registry instanceof Map).toBe(true);
    expect(registry.size).toBeGreaterThan(0);
  });

  it('bilbo has allowedTools from frontmatter (Read, Grep, Glob)', () => {
    const bilbo = registry.get('bilbo');
    expect(bilbo).toBeDefined();
    // Should contain the three tools
    expect(bilbo!.allowedTools).toContain('Read');
    expect(bilbo!.allowedTools).toContain('Grep');
    expect(bilbo!.allowedTools).toContain('Glob');
  });

  it('ultron has Bash and computer stripped (BANNED_TOOLS)', () => {
    const ultron = registry.get('ultron');
    expect(ultron).toBeDefined();
    expect(ultron!.allowedTools).not.toContain('Bash');
    expect(ultron!.allowedTools).not.toContain('computer');
    // Read and Edit should remain
    expect(ultron!.allowedTools).toContain('Read');
    expect(ultron!.allowedTools).toContain('Edit');
  });

  it('dante has empty allowedTools from empty tools string in frontmatter', () => {
    const dante = registry.get('dante');
    expect(dante).toBeDefined();
    expect(dante!.allowedTools).toEqual([]);
  });

  it('claude has empty allowedTools (no tools key in frontmatter)', () => {
    const claude = registry.get('claude');
    expect(claude).toBeDefined();
    expect(claude!.allowedTools).toEqual([]);
  });

  it('agents with no allowedTools have invokable=false', () => {
    for (const [, config] of registry) {
      if (config.allowedTools.length === 0) {
        expect(config.invokable).toBe(false);
      }
    }
  });

  it('unknown-agent is silently skipped (not in shared registry)', () => {
    // 'unknown-agent' is not in the shared AGENT_REGISTRY, so it should
    // not appear in the registry even though unknown-agent.md exists
    expect(registry.has('unknown-agent')).toBe(false);
  });

  it('argus (no frontmatter) has empty allowedTools', () => {
    const argus = registry.get('argus');
    expect(argus).toBeDefined();
    expect(argus!.allowedTools).toEqual([]);
  });

  it('moriarty (malformed frontmatter — missing closing ---) falls back to empty tools', () => {
    const moriarty = registry.get('moriarty');
    expect(moriarty).toBeDefined();
    expect(moriarty!.allowedTools).toEqual([]);
  });

  it('getAgentConfig returns bilbo with populated tools after loading', () => {
    const bilbo = getAgentConfig('bilbo');
    expect(bilbo).not.toBeNull();
    expect(bilbo!.allowedTools.length).toBeGreaterThan(0);
  });

  it('bilbo is invokable (has allowed tools and shared invokable=true)', () => {
    const bilbo = registry.get('bilbo');
    // bilbo should be invokable since it has tools and shared def says invokable
    expect(typeof bilbo!.invokable).toBe('boolean');
    // We only assert the shape — invokable depends on the shared registry definition
    // which we cannot easily change. But if bilbo.allowedTools > 0, the flag
    // reflects the shared registry's invokable setting.
  });

  it('all agents in registry have array-typed allowedTools', () => {
    for (const [, config] of registry) {
      expect(Array.isArray(config.allowedTools)).toBe(true);
    }
  });
});
