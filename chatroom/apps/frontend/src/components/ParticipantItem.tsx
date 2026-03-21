import '../styles/components/AgentCard.css';
import { memo } from 'react';
import type { AgentStatus } from '@agent-chatroom/shared';
import { AgentState, getModelBadge, AGENT_BY_NAME } from '@agent-chatroom/shared';
import { agentColorClass, MODEL_BADGE_CLASS } from '../lib/colors';
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
  const def = AGENT_BY_NAME.get(agent.agentName);
  const displayName = def?.displayName ?? agent.agentName;
  const role = def?.role ?? 'agent';
  const Icon = getAgentIcon(agent.agentName);
  const modelBadge = getModelBadge(agent.model);
  const isActive = agent.status !== AgentState.Out && agent.status !== AgentState.Idle;
  const cardClass = isActive ? 'card active-card' : 'card off-card';
  const isAnimating =
    agent.status === AgentState.Thinking || agent.status === AgentState.ToolUse;

  return (
    <div className="card-wrap" style={agentCardStyle(agent.agentName)}>
      {/* Action buttons layer — revealed on hover via CSS shrink-reveal */}
      <div className="card-buttons">
        <div className="btn-panel" />
      </div>

      {/* Main card — CSS grid: [info cols] [status icon col] */}
      <div className={cardClass}>
        {/* Cell 1: role icon + name + model badge */}
        <div className="cell-name">
          <Icon className="icon-role" />
          <span className={`name ${agentColorClass(agent.agentName)}`}>
            {displayName}
          </span>
          <span className="model">{modelBadge}</span>
        </div>

        {/* Cell 2: context bar */}
        <div className="cell-bar">
          <div className="bar-track">
            <div className="bar-fill" style={{ width: '35%' }} />
          </div>
        </div>

        {/* Cell 3: role + model badge metrics */}
        <div className="cell-metrics">
          <span className="metric">{role}</span>
          {agent.agentName !== 'user' && (
            <span className={`model-badge ${MODEL_BADGE_CLASS[modelBadge]}`}>
              {modelBadge}
            </span>
          )}
        </div>

        {/* Cell 4: large status icon spanning all rows */}
        <div className="cell-status">
          <div className={isAnimating ? 'neon-active' : undefined}>
            <Icon className="icon-status" />
          </div>
        </div>
      </div>
    </div>
  );
});
