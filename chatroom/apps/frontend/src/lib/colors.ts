import type { ModelBadge } from '@agent-chatroom/shared';

/**
 * Maps agent name to its CSS variable name (without the var() wrapper).
 * Use as: `color: var(${AGENT_COLOR_VAR['bilbo']})` or className `c-bilbo`.
 */
export const AGENT_COLOR_VAR: Record<string, string> = {
  claude:     '--agent-claude',
  bilbo:      '--agent-bilbo',
  ultron:     '--agent-ultron',
  cerberus:   '--agent-cerberus',
  dante:      '--agent-dante',
  argus:      '--agent-argus',
  moriarty:   '--agent-moriarty',
  house:      '--agent-house',
  yoda:       '--agent-yoda',
  alexandria: '--agent-alexandria',
  gitto:      '--agent-gitto',
  user:       '--agent-user',
};

/** Returns `c-{name}` CSS class for agent text color */
export function agentColorClass(name: string): string {
  return `c-${name}`;
}

/** Returns `av-{name}` CSS class for agent avatar background */
export function agentAvatarClass(name: string): string {
  return `av-${name}`;
}

/** Returns `mention-{name}` CSS class for @mention highlight */
export function mentionClass(name: string): string {
  return `mention-${name}`;
}

/** Model badge CSS class map */
export const MODEL_BADGE_CLASS: Record<ModelBadge, string> = {
  opus:   'model-opus',
  sonnet: 'model-sonnet',
  haiku:  'model-haiku',
};
