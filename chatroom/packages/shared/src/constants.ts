/**
 * Agent state enum — mirrors the DB CHECK constraint values
 */
export enum AgentState {
  Idle = 'idle',
  Thinking = 'thinking',
  ToolUse = 'tool-use',
  Done = 'done',
  Out = 'out',
  Error = 'error',
}

/**
 * Agent color map using OKLCH values from mockup-chatroom-v2.html
 */
export const AGENT_COLORS: Record<string, string> = {
  claude:    'oklch(65% 0.16 250)',
  bilbo:     'oklch(65% 0.14 195)',
  ultron:    'oklch(65% 0.18 250)',
  cerberus:  'oklch(72% 0.14 85)',
  dante:     'oklch(65% 0.14 195)',
  argus:     'oklch(65% 0.18 55)',
  moriarty:  'oklch(60% 0.20 25)',
  house:     'oklch(60% 0.20 25)',
  yoda:      'oklch(60% 0.15 145)',
  alexandria:'oklch(65% 0.15 300)',
  gitto:     'oklch(72% 0.14 85)',
  user:      'oklch(75% 0.10 145)',
};

/**
 * Avatar background colors (matching av-* CSS classes in mockup)
 */
export const AGENT_AVATAR_BACKGROUNDS: Record<string, string> = {
  claude:    'oklch(25% 0.06 250)',
  bilbo:     'oklch(25% 0.05 195)',
  ultron:    'oklch(25% 0.06 250)',
  cerberus:  'oklch(25% 0.05 85)',
  dante:     'oklch(25% 0.05 195)',
  argus:     'oklch(25% 0.06 55)',
  moriarty:  'oklch(25% 0.07 25)',
  house:     'oklch(25% 0.07 25)',
  yoda:      'oklch(25% 0.05 145)',
  alexandria:'oklch(25% 0.05 300)',
  gitto:     'oklch(25% 0.05 85)',
  user:      'oklch(25% 0.04 145)',
};

/**
 * Supported model types
 */
export type ModelType =
  | 'claude-opus-4-5'
  | 'claude-sonnet-4-5'
  | 'claude-haiku-4-5'
  | 'claude-opus-4-6'
  | 'claude-sonnet-4-6'
  | 'claude-haiku-3-5';

/**
 * Model display badge categories
 */
export type ModelBadge = 'opus' | 'sonnet' | 'haiku';

export function getModelBadge(model: string): ModelBadge {
  if (model.includes('opus')) return 'opus';
  if (model.includes('haiku')) return 'haiku';
  return 'sonnet';
}

/**
 * Author types — mirrors DB CHECK constraint
 */
export type AuthorType = 'agent' | 'human' | 'system';

/**
 * Message types — mirrors DB CHECK constraint
 */
export type MsgType = 'message' | 'tool_use' | 'system';
