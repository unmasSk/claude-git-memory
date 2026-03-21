import '../styles/components/AgentCard.css';
import { memo } from 'react';
import type { AgentStatus } from '@agent-chatroom/shared';
import { AgentState, getModelBadge } from '@agent-chatroom/shared';
import { agentColorClass } from '../lib/colors';
import { getAgentIcon } from '../lib/icons';

interface ParticipantItemProps {
  agent: AgentStatus;
}

/** Agent accent color lookup — used for CSS custom property on card-wrap */
const AGENT_COLOR: Record<string, string> = {
  ultron:    '#2090EE',
  cerberus:  '#FF7C0A',
  dante:     '#8788EE',
  bilbo:     '#AAD372',
  house:     '#00FF98',
  yoda:      '#33937F',
  alexandria:'#C050E0',
  gitto:     '#FFF468',
  argus:     '#C69B6D',
  moriarty:  '#E03050',
};

/** Returns inline style with agent CSS custom properties for card tinting */
function agentCardStyle(agentName: string): React.CSSProperties {
  const ac = AGENT_COLOR[agentName.toLowerCase()] ?? '#888888';
  return { '--ac': ac, '--agent-tint': ac + '22' } as React.CSSProperties;
}

export const ParticipantItem = memo(function ParticipantItem({ agent }: ParticipantItemProps) {
  const modelBadge = getModelBadge(agent.model);
  const Icon = getAgentIcon(agent.agentName);
  const isActive = agent.status !== AgentState.Out && agent.status !== AgentState.Idle;
  const cardClass = isActive ? 'card active-card' : 'card off-card';
  const isAnimating =
    agent.status === AgentState.Thinking || agent.status === AgentState.ToolUse;
  const agentNameLower = agent.agentName.toLowerCase();
  const acColor = AGENT_COLOR[agentNameLower] ?? '#888888';

  return (
    <div className="card-wrap" style={agentCardStyle(agent.agentName)}>
      {/* Action buttons layer — revealed on hover via CSS shrink-reveal */}
      <div className="card-buttons">
        <div className="btn-panel">
          {/* Play */}
          <button className="act-btn" type="button" aria-label="Play">
            <svg viewBox="0 0 12 12">
              <polygon points="3,1 11,6 3,11" className="filled" />
            </svg>
          </button>
          {/* Pause */}
          <button className="act-btn" type="button" aria-label="Pause">
            <svg viewBox="0 0 12 12">
              <rect x="2" y="1" width="3" height="10" rx="1" className="filled" />
              <rect x="7" y="1" width="3" height="10" rx="1" className="filled" />
            </svg>
          </button>
          {/* Stop */}
          <button className="act-btn" type="button" aria-label="Stop">
            <svg viewBox="0 0 12 12">
              <rect x="1.5" y="1.5" width="9" height="9" rx="2" className="filled" />
            </svg>
          </button>
          {/* Chat */}
          <button className="act-btn" type="button" aria-label="Chat">
            <svg viewBox="0 0 12 12">
              <path d="M10 1H2a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2l2 2 2-2h2a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main card — CSS grid: [info cols] [status icon col] */}
      <div className={cardClass}>
        {/* Cell 1: name + model badge + context percentage */}
        <div className="cell-name">
          <span className={`name ${agentColorClass(agent.agentName)}`}>
            {agentNameLower}
          </span>
          <span className="model">{modelBadge}</span>
          <span className="pct">&mdash;</span>
        </div>

        {/* Cell 2: context bar */}
        <div className="cell-bar">
          <div className="bar-track">
            <div className="bar-fill" style={{ width: '0%' }} />
          </div>
        </div>

        {/* Cell 3: 4 metrics — output tokens, input tokens, turns, time */}
        <div className="cell-metrics">
          <span className="metric">
            <svg className="icon-tiny" viewBox="0 0 10 10">
              <polygon points="5,1 9,7 1,7" fill="var(--text-3)" stroke="none" />
            </svg>
            &mdash;
          </span>
          <span className="metric">
            <svg className="icon-tiny" viewBox="0 0 10 10">
              <polygon points="5,9 9,3 1,3" fill="var(--text-3)" stroke="none" />
            </svg>
            &mdash;
          </span>
          <span className="metric">
            <svg className="icon-tiny" viewBox="0 0 10 10">
              <path d="M8 2.5A4 4 0 1 0 8.5 7" />
              <path d="M9 1v2.5H6.5" />
            </svg>
            &mdash;
          </span>
          <span className="metric">
            <svg className="icon-tiny" viewBox="0 0 10 10">
              <path d="M2 1h6M2 9h6M2 1l3 4-3 4M8 1L5 5l3 4" />
            </svg>
            &mdash;
          </span>
        </div>

        {/* Cell 4: large status icon spanning all rows */}
        <div className="cell-status">
          {isAnimating ? (
            <div className="neon-active" style={{ color: acColor }}>
              <Icon className="icon-status" />
            </div>
          ) : (
            <Icon className="icon-status" />
          )}
        </div>
      </div>
    </div>
  );
});
