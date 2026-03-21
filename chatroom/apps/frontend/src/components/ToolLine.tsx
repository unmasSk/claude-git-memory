import { memo } from 'react';
import type { Message } from '@agent-chatroom/shared';

interface ToolLineProps {
  message: Message;
}

/** Derive the agent-specific CSS class for tool event coloring */
function teAgentClass(author: string): string {
  const name = author.toLowerCase();
  const known = ['ultron','cerberus','dante','bilbo','house','yoda','alexandria','gitto','argus','moriarty','claude'];
  return known.includes(name) ? `te-${name}` : 'te-default';
}

export const ToolLine = memo(function ToolLine({ message }: ToolLineProps) {
  const toolName = message.metadata?.tool ?? 'Tool';
  const safeAuthor = message.author || 'unknown';
  const authorName = safeAuthor.charAt(0).toUpperCase() + safeAuthor.slice(1);
  const colorClass = `c-${safeAuthor.toLowerCase()}`;
  const agentClass = teAgentClass(safeAuthor);

  return (
    <div className={`tool-event ${agentClass}`}>
      <span className={`te-agent ${colorClass}`}>{authorName}</span>
      <span className="te-arrow">›</span>
      <span className="te-badge">{toolName}</span>
      <span className="te-desc">{message.content}</span>
    </div>
  );
});
