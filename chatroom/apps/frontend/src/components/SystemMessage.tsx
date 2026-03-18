import { memo, useState } from 'react';
import { LogIn, LogOut, AlertCircle, Clock, RefreshCw, Info, ChevronDown, ChevronUp } from 'lucide-react';
import type { Message } from '@agent-chatroom/shared';

interface SystemMessageProps {
  message: Message;
}

interface QueueGroupProps {
  messages: Message[];
}

/** Extract agent name from content like "Agent house is busy..." → "house" */
function extractAgent(content: string): string | null {
  const match = content.match(/^Agent\s+(\w+)/i);
  return match ? match[1].toLowerCase() : null;
}

/** Strip "Agent X" prefix, capitalize agent name */
function formatContent(content: string): string {
  return content.replace(/^Agent\s+(\w+)/i, (_, name) =>
    name.charAt(0).toUpperCase() + name.slice(1)
  );
}

function getIcon(content: string, size = 11) {
  const lower = content.toLowerCase();
  if (lower.includes('joined') || lower.includes('started') || lower.includes('session')) return <LogIn size={size} />;
  if (lower.includes('left') || lower.includes('disconnected')) return <LogOut size={size} />;
  if (lower.includes('error') || lower.includes('failed') || lower.includes('timeout')) return <AlertCircle size={size} />;
  if (lower.includes('queued') || lower.includes('queue')) return <Clock size={size} />;
  if (lower.includes('stale') || lower.includes('resume') || lower.includes('reconnect')) return <RefreshCw size={size} />;
  return <Info size={size} />;
}

function pillVariant(content: string): string {
  const lower = content.toLowerCase();
  if (lower.includes('error') || lower.includes('failed') || lower.includes('timeout')) return 'system-pill-inner error';
  if (lower.includes('joined') || lower.includes('started')) return 'system-pill-inner join';
  if (lower.includes('left') || lower.includes('disconnected')) return 'system-pill-inner leave';
  return 'system-pill-inner';
}

export const SystemMessage = memo(function SystemMessage({ message }: SystemMessageProps) {
  const agent = extractAgent(message.content);
  const colorClass = agent ? `c-${agent}` : '';
  return (
    <div className="system-pill">
      <span className={`${pillVariant(message.content)} ${colorClass}`}>
        {getIcon(message.content)}
        {formatContent(message.content)}
      </span>
    </div>
  );
});

export const QueueGroup = memo(function QueueGroup({ messages }: QueueGroupProps) {
  const [expanded, setExpanded] = useState(false);

  if (expanded) {
    return (
      <div className="system-queue-group">
        {messages.map((msg) => {
          const agent = extractAgent(msg.content);
          const colorClass = agent ? `c-${agent}` : '';
          return (
            <div key={msg.id} className="system-pill">
              <span className={`system-pill-inner ${colorClass}`}>
                <Clock size={11} />
                {formatContent(msg.content)}
              </span>
            </div>
          );
        })}
        <div className="system-pill">
          <button
            type="button"
            className="system-pill-inner queue-toggle"
            onClick={() => setExpanded(false)}
          >
            <ChevronUp size={11} />
            collapse
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="system-pill">
      <button
        type="button"
        className="system-pill-inner queue-toggle"
        onClick={() => setExpanded(true)}
      >
        <Clock size={11} />
        {messages.length} queued
        <ChevronDown size={11} />
      </button>
    </div>
  );
});
