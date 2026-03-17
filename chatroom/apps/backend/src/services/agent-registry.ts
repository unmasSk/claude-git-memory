import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { AGENT_DIR } from '../config.js';
import { AGENT_BY_NAME, type AgentDefinition } from '@agent-chatroom/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * AgentConfig merges frontmatter from the .md file with the static
 * AgentDefinition from the shared registry.
 */
export interface AgentConfig extends AgentDefinition {
  /** Raw allowed tools from frontmatter — already filtered by BANNED_TOOLS */
  allowedTools: string[];
  /** Whether this agent can be invoked (has tools configured, not banned) */
  invokable: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * SEC-FIX 3: Tools that are never allowed regardless of what frontmatter says.
 * Bash = arbitrary code execution. computer = desktop automation.
 */
const BANNED_TOOLS = new Set(['Bash', 'computer']);

// ---------------------------------------------------------------------------
// Frontmatter parser
// ---------------------------------------------------------------------------

interface ParsedFrontmatter {
  model?: string;
  color?: string;
  tools?: string;
}

function parseFrontmatter(content: string): ParsedFrontmatter {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const yaml = match[1];
  const result: ParsedFrontmatter = {};

  for (const line of yaml.split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;

    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();

    if (key === 'model') result.model = value;
    else if (key === 'color') result.color = value;
    else if (key === 'tools') result.tools = value;
  }

  return result;
}

function parseToolsList(toolsStr: string | undefined): string[] {
  if (!toolsStr) return [];
  return toolsStr
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

// ---------------------------------------------------------------------------
// Registry state
// ---------------------------------------------------------------------------

let _registry: Map<string, AgentConfig> | null = null;

function buildRegistry(): Map<string, AgentConfig> {
  const registry = new Map<string, AgentConfig>();

  // Merge all static AGENT_REGISTRY entries first — they form the base
  for (const [name, def] of AGENT_BY_NAME) {
    registry.set(name, {
      ...def,
      allowedTools: [],
      invokable: false, // will be set after checking tools
    });
  }

  // Overlay with frontmatter from .md files if the directory exists
  if (existsSync(AGENT_DIR)) {
    let files: string[];
    try {
      files = readdirSync(AGENT_DIR).filter((f) => f.endsWith('.md'));
    } catch {
      files = [];
    }

    for (const file of files) {
      try {
        const content = readFileSync(join(AGENT_DIR, file), 'utf-8');
        const fm = parseFrontmatter(content);
        const name = file.replace(/\.md$/, '').toLowerCase();

        const existing = registry.get(name);
        if (!existing) continue; // unknown agent, skip

        // SEC-FIX 3: Parse tools and filter banned tools
        const rawTools = parseToolsList(fm.tools);
        const allowedTools = rawTools.filter((t) => !BANNED_TOOLS.has(t));

        // SEC-FIX 3: Agent must have at least one allowed tool to be invokable
        // Use the original static definition's invokable flag, not the pre-set false
        const def = AGENT_BY_NAME.get(name);
        const invokable = allowedTools.length > 0 && (def?.invokable ?? false);

        registry.set(name, {
          ...existing,
          allowedTools,
          invokable,
        });
      } catch {
        // Skip unreadable files
      }
    }
  }

  return registry;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load (or reload) the agent registry from disk.
 * Subsequent calls return the cached registry — call this once at startup.
 */
export function loadAgentRegistry(): Map<string, AgentConfig> {
  _registry = buildRegistry();
  return _registry;
}

/**
 * Get the config for a specific agent by name (case-insensitive).
 * Returns null if the agent is not in the registry.
 */
export function getAgentConfig(name: string): AgentConfig | null {
  const reg = _registry ?? buildRegistry();
  return reg.get(name.toLowerCase()) ?? null;
}

/**
 * Get all agents in the registry.
 */
export function getAllAgents(): AgentConfig[] {
  const reg = _registry ?? buildRegistry();
  return Array.from(reg.values());
}
