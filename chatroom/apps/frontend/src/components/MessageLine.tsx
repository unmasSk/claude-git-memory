import { memo } from 'react';
import type { Message } from '@agent-chatroom/shared';
import { agentColorClass, mentionClass } from '../lib/colors';

interface MessageLineProps {
  message: Message;
}

function formatTime(createdAt: string): string {
  try {
    const d = new Date(createdAt);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  } catch {
    return '--:--';
  }
}

/**
 * Parse content and highlight @mentions and file refs.
 * Returns an array of React nodes.
 */
function renderContent(content: string): React.ReactNode[] {
  // Split on @mentions and file paths (backtick or common extensions)
  const parts = content.split(/(@\w+)/g);

  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      const name = part.slice(1).toLowerCase();
      return (
        <span key={i} className={`mention ${mentionClass(name)}`}>
          {part}
        </span>
      );
    }
    return part;
  });
}

export const MessageLine = memo(function MessageLine({ message }: MessageLineProps) {
  const authorName = message.author.charAt(0).toUpperCase() + message.author.slice(1);

  return (
    <div className="message">
      <span className="msg-time">{formatTime(message.createdAt)}</span>
      <span className={`msg-author ${agentColorClass(message.author)}`}>
        {authorName}
      </span>
      <span className="msg-content">
        {renderContent(message.content)}
      </span>
    </div>
  );
});
