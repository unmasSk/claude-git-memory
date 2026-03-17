import { memo } from 'react';
import type { Message } from '@agent-chatroom/shared';
import { getToolIcon } from '../lib/icons';

interface ToolLineProps {
  message: Message;
}

export const ToolLine = memo(function ToolLine({ message }: ToolLineProps) {
  const toolName = message.metadata?.tool ?? 'Tool';
  const Icon = getToolIcon(toolName);

  return (
    <div className="tool-line">
      <Icon size={11} />
      <span className="tool-badge">{toolName}</span>
      <span>{message.content}</span>
    </div>
  );
});
