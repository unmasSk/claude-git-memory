import { memo } from 'react';
import { LogIn, LogOut, AlertCircle, Clock, RefreshCw, Info } from 'lucide-react';
import type { Message } from '@agent-chatroom/shared';

interface SystemMessageProps {
  message: Message;
}

function getSystemIcon(content: string) {
  const lower = content.toLowerCase();
  if (lower.includes('joined') || lower.includes('started') || lower.includes('session')) {
    return <LogIn size={12} />;
  }
  if (lower.includes('left') || lower.includes('disconnected')) {
    return <LogOut size={12} />;
  }
  if (lower.includes('error') || lower.includes('failed') || lower.includes('timeout')) {
    return <AlertCircle size={12} />;
  }
  if (lower.includes('queued') || lower.includes('queue')) {
    return <Clock size={12} />;
  }
  if (lower.includes('stale') || lower.includes('resume') || lower.includes('reconnect')) {
    return <RefreshCw size={12} />;
  }
  return <Info size={12} />;
}

export const SystemMessage = memo(function SystemMessage({ message }: SystemMessageProps) {
  return (
    <div className="system-msg">
      {getSystemIcon(message.content)}
      <span>{message.content}</span>
    </div>
  );
});
