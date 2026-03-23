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
  return match?.[1]?.toLowerCase() ?? null;
}

/** Strip "Agent X" prefix — the name is already shown in the te-agent label */
function formatContent(content: string): string {
  if (content.startsWith('[DIRECTIVE FROM USER')) return 'directiva';
  const stripped = content.replace(/^Agent\s+\w+\s*/i, '').replace(/^\.\s*/, '');
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

function _getIcon(content: string, size = 11) {
  const lower = content.toLowerCase();
  if (lower.includes('joined') || lower.includes('started') || lower.includes('session')) return <LogIn size={size} />;
  if (lower.includes('left') || lower.includes('disconnected')) return <LogOut size={size} />;
  if (lower.includes('error') || lower.includes('failed') || lower.includes('timeout')) return <AlertCircle size={size} />;
  if (lower.includes('queued') || lower.includes('queue')) return <Clock size={size} />;
  if (lower.includes('stale') || lower.includes('resume') || lower.includes('reconnect')) return <RefreshCw size={size} />;
  if (content.startsWith('[DIRECTIVE FROM USER')) return <AlertCircle size={size} />;
  return <Info size={size} />;
}

function _pillVariant(content: string): string {
  const lower = content.toLowerCase();
  if (lower.includes('error') || lower.includes('failed') || lower.includes('timeout')) return 'system-pill-inner error';
  if (lower.includes('joined') || lower.includes('started')) return 'system-pill-inner join';
  if (lower.includes('left') || lower.includes('disconnected')) return 'system-pill-inner leave';
  return 'system-pill-inner';
}

/** Extract event type for badge label */
function getEventType(content: string): string {
  const lower = content.toLowerCase();
  if (lower.includes('queued') || lower.includes('queue') || lower.includes('busy')) return 'queued';
  if (lower.includes('joined') || lower.includes('started') || lower.includes('session')) return 'joined';
  if (lower.includes('left') || lower.includes('disconnected')) return 'left';
  if (lower.includes('error') || lower.includes('failed') || lower.includes('timeout')) return 'error';
  if (lower.includes('stale') || lower.includes('resume')) return 'retry';
  return 'system';
}

/** Derive CSS class for tool-event agent coloring */
function teAgentClass(agent: string): string {
  const known = ['ultron','cerberus','dante','bilbo','house','yoda','alexandria','gitto','argus','moriarty','claude'];
  return known.includes(agent) ? `te-${agent}` : 'te-default';
}

/** True when content represents an agent invocation event */
function isInvocationEvent(content: string): boolean {
  return /invoc|invoked|started by|spawned/i.test(content) ||
    content.startsWith('[DIRECTIVE FROM USER');
}

export const SystemMessage = memo(function SystemMessage({ message }: SystemMessageProps) {
  const agent = extractAgent(message.content);

  // Invocation events render as tool-event pills with "invocado" badge
  if (agent && isInvocationEvent(message.content)) {
    const colorClass = `c-${agent}`;
    const agentClass = teAgentClass(agent);
    const agentLabel = agent.charAt(0).toUpperCase() + agent.slice(1);
    return (
      <div className={`tool-event ${agentClass}`}>
        <span className={`te-agent ${colorClass}`}>{agentLabel}</span>
        <span className="te-arrow">›</span>
        <span className="te-badge">invocado</span>
        <span className="te-desc" />
      </div>
    );
  }

  const agentClass = agent ? teAgentClass(agent) : 'te-default';
  const colorClass = agent ? `c-${agent}` : '';
  const label = agent ? agent : 'system';
  return (
    <div className={`tool-event ${agentClass}`}>
      <span className={`te-agent ${colorClass}`}>{label}</span>
      <span className="te-arrow">›</span>
      <span className="te-badge">{getEventType(message.content)}</span>
      <span className="te-desc te-desc-ltr">{formatContent(message.content)}</span>
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
