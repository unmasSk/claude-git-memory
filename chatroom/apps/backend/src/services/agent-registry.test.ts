import { describe, it, expect, beforeAll } from 'bun:test';
import { AGENT_REGISTRY, AGENT_BY_NAME } from '@agent-chatroom/shared';
import {
  loadAgentRegistry,
  getAgentConfig,
  getAllAgents,
} from './agent-registry.js';
import { BANNED_TOOLS } from '../config.js';

// ---------------------------------------------------------------------------
// Boot: build the registry once for this entire suite.
// NOTE: In the test environment the AGENT_DIR may not exist (no .md files
// on disk). The registry still loads all agents from the shared package's
// static list — just without frontmatter overlays.
// ---------------------------------------------------------------------------

beforeAll(() => {
  loadAgentRegistry();
});

// ---------------------------------------------------------------------------
// Registry loading
// ---------------------------------------------------------------------------

describe('loadAgentRegistry', () => {
  it('returns a non-empty Map', () => {
    const registry = loadAgentRegistry();
    expect(registry instanceof Map).toBe(true);
    expect(registry.size).toBeGreaterThan(0);
  });

  it('includes all agents defined in the shared AGENT_REGISTRY', () => {
    const registry = loadAgentRegistry();
    for (const def of AGENT_REGISTRY) {
      expect(registry.has(def.name)).toBe(true);
    }
  });

  it('every entry has the required AgentConfig shape', () => {
    const registry = loadAgentRegistry();
    for (const [, config] of registry) {
      expect(typeof config.name).toBe('string');
      expect(typeof config.displayName).toBe('string');
      expect(typeof config.role).toBe('string');
      expect(typeof config.model).toBe('string');
      expect(Array.isArray(config.allowedTools)).toBe(true);
      expect(typeof config.invokable).toBe('boolean');
    }
  });
});

// ---------------------------------------------------------------------------
// Known agents present
// ---------------------------------------------------------------------------

describe('registry contains all 10 toolkit agents + user + claude', () => {
  const expectedAgents = [
    'user',
    'claude',
    'bilbo',
    'ultron',
    'cerberus',
    'dante',
    'argus',
    'moriarty',
    'house',
    'yoda',
    'alexandria',
    'gitto',
  ];

  for (const name of expectedAgents) {
    it(`registry contains "${name}"`, () => {
      const config = getAgentConfig(name);
      expect(config).not.toBeNull();
      expect(config!.name).toBe(name);
    });
  }

  it('has exactly 12 entries (10 toolkit agents + user + claude)', () => {
    const registry = loadAgentRegistry();
    expect(registry.size).toBe(12);
  });
});

// ---------------------------------------------------------------------------
// getAgentConfig — happy path
// ---------------------------------------------------------------------------

describe('getAgentConfig', () => {
  it('returns the correct config for a known agent', () => {
    const config = getAgentConfig('bilbo');
    expect(config).not.toBeNull();
    expect(config!.name).toBe('bilbo');
    expect(config!.role).toBe('explorer');
  });

  it('returns null for an unknown agent', () => {
    const config = getAgentConfig('unknown-agent-xyz');
    expect(config).toBeNull();
  });

  it('returns null for an empty string', () => {
    const config = getAgentConfig('');
    expect(config).toBeNull();
  });

  it('is case-insensitive — "BILBO" resolves to "bilbo"', () => {
    const config = getAgentConfig('BILBO');
    expect(config).not.toBeNull();
    expect(config!.name).toBe('bilbo');
  });

  it('is case-insensitive — "Cerberus" resolves to "cerberus"', () => {
    const config = getAgentConfig('Cerberus');
    expect(config).not.toBeNull();
    expect(config!.name).toBe('cerberus');
  });

  it('preserves display name from shared registry', () => {
    const config = getAgentConfig('yoda');
    const shared = AGENT_BY_NAME.get('yoda');
    expect(config!.displayName).toBe(shared!.displayName);
  });
});

// ---------------------------------------------------------------------------
// BANNED_TOOLS — SEC-FIX 3
// ---------------------------------------------------------------------------

describe('BANNED_TOOLS are stripped from agent tools', () => {
  it('BANNED_TOOLS config constant contains Bash', () => {
    expect(BANNED_TOOLS).toContain('Bash');
  });

  it('BANNED_TOOLS config constant contains computer', () => {
    expect(BANNED_TOOLS).toContain('computer');
  });

  it('no agent in the registry has Bash in allowedTools', () => {
    const agents = getAllAgents();
    for (const agent of agents) {
      expect(agent.allowedTools).not.toContain('Bash');
    }
  });

  it('no agent in the registry has computer in allowedTools', () => {
    const agents = getAllAgents();
    for (const agent of agents) {
      expect(agent.allowedTools).not.toContain('computer');
    }
  });
});

// ---------------------------------------------------------------------------
// Agents with no tools are not invokable — SEC-FIX 3
// ---------------------------------------------------------------------------

describe('invokable flag', () => {
  it('an agent with no allowedTools is marked as not invokable', () => {
    // The registry builds from shared static data; without .md files,
    // all agents start with allowedTools=[] and invokable=false.
    const agents = getAllAgents();
    for (const agent of agents) {
      if (agent.allowedTools.length === 0) {
        expect(agent.invokable).toBe(false);
      }
    }
  });

  it('user is never invokable (human, not a subprocess agent)', () => {
    const user = getAgentConfig('user');
    expect(user!.invokable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getAllAgents
// ---------------------------------------------------------------------------

describe('getAllAgents', () => {
  it('returns an array', () => {
    const agents = getAllAgents();
    expect(Array.isArray(agents)).toBe(true);
  });

  it('returns the same count as the registry Map', () => {
    const registry = loadAgentRegistry();
    const agents = getAllAgents();
    expect(agents.length).toBe(registry.size);
  });

  it('every returned agent has a name property', () => {
    const agents = getAllAgents();
    for (const agent of agents) {
      expect(typeof agent.name).toBe('string');
      expect(agent.name.length).toBeGreaterThan(0);
    }
  });
});
