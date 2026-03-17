import type { ModelType } from './constants.js';

export interface AgentDefinition {
  /** Internal name, lowercase, used in @mentions */
  name: string;
  /** Display name */
  displayName: string;
  /** Role label shown in participant panel */
  role: string;
  /** Claude model to invoke */
  model: ModelType;
  /** OKLCH color (matches mockup CSS variables) */
  color: string;
  /** Lucide icon name */
  icon: string;
  /** Whether this agent is a real subprocess-invokable agent */
  invokable: boolean;
}

/**
 * Full registry of all participants in the chatroom.
 * Includes the human user, Claude orchestrator, and all 10 toolkit agents.
 * Ordered for display in the participant panel.
 */
export const AGENT_REGISTRY: AgentDefinition[] = [
  {
    name: 'user',
    displayName: 'You',
    role: 'human',
    model: 'claude-sonnet-4-6',
    color: 'oklch(75% 0.10 145)',
    icon: 'user',
    invokable: false,
  },
  {
    name: 'claude',
    displayName: 'Claude',
    role: 'orchestrator',
    model: 'claude-opus-4-6',
    color: 'oklch(65% 0.16 250)',
    icon: 'brain',
    invokable: true,
  },
  {
    name: 'bilbo',
    displayName: 'Bilbo',
    role: 'explorer',
    model: 'claude-sonnet-4-6',
    color: 'oklch(65% 0.14 195)',
    icon: 'compass',
    invokable: true,
  },
  {
    name: 'ultron',
    displayName: 'Ultron',
    role: 'implementer',
    model: 'claude-sonnet-4-6',
    color: 'oklch(65% 0.18 250)',
    icon: 'wrench',
    invokable: true,
  },
  {
    name: 'cerberus',
    displayName: 'Cerberus',
    role: 'reviewer',
    model: 'claude-sonnet-4-6',
    color: 'oklch(72% 0.14 85)',
    icon: 'shield-check',
    invokable: true,
  },
  {
    name: 'dante',
    displayName: 'Dante',
    role: 'tester',
    model: 'claude-sonnet-4-6',
    color: 'oklch(65% 0.14 195)',
    icon: 'flask-conical',
    invokable: true,
  },
  {
    name: 'argus',
    displayName: 'Argus',
    role: 'security',
    model: 'claude-sonnet-4-6',
    color: 'oklch(65% 0.18 55)',
    icon: 'shield-alert',
    invokable: true,
  },
  {
    name: 'moriarty',
    displayName: 'Moriarty',
    role: 'adversary',
    model: 'claude-sonnet-4-6',
    color: 'oklch(60% 0.20 25)',
    icon: 'zap',
    invokable: true,
  },
  {
    name: 'house',
    displayName: 'House',
    role: 'debugger',
    model: 'claude-sonnet-4-6',
    color: 'oklch(60% 0.20 25)',
    icon: 'bug',
    invokable: true,
  },
  {
    name: 'yoda',
    displayName: 'Yoda',
    role: 'evaluator',
    model: 'claude-opus-4-6',
    color: 'oklch(60% 0.15 145)',
    icon: 'star',
    invokable: true,
  },
  {
    name: 'alexandria',
    displayName: 'Alexandria',
    role: 'documenter',
    model: 'claude-sonnet-4-6',
    color: 'oklch(65% 0.15 300)',
    icon: 'book-open',
    invokable: true,
  },
  {
    name: 'gitto',
    displayName: 'Gitto',
    role: 'historian',
    model: 'claude-sonnet-4-6',
    color: 'oklch(72% 0.14 85)',
    icon: 'git-branch',
    invokable: true,
  },
];

/** All invokable agent names (excludes 'user') */
export const INVOKABLE_AGENT_NAMES = new Set(
  AGENT_REGISTRY.filter((a) => a.invokable).map((a) => a.name)
);

/** Quick lookup by name */
export const AGENT_BY_NAME = new Map<string, AgentDefinition>(
  AGENT_REGISTRY.map((a) => [a.name, a])
);
