import { memo } from 'react';
import type { AgentStatus } from '@agent-chatroom/shared';
import { AgentState, getModelBadge } from '@agent-chatroom/shared';
import { agentColorClass, agentAvatarClass, MODEL_BADGE_CLASS } from '../lib/colors';
import { getAgentIcon } from '../lib/icons';
import { AGENT_BY_NAME } from '@agent-chatroom/shared';

interface ParticipantItemProps {
  agent: AgentStatus;
}

function statusIndicatorClass(status: AgentState): string {
  switch (status) {
    case AgentState.Idle:    return 'status-indicator status-idle';
    case AgentState.Thinking: return 'status-indicator status-thinking';
    case AgentState.ToolUse:  return 'status-indicator status-tool';
    case AgentState.Done:     return 'status-indicator status-done';
    case AgentState.Out:      return 'status-indicator status-out';
    case AgentState.Error:    return 'status-indicator status-error';
    default:                  return 'status-indicator status-idle';
  }
}

export const ParticipantItem = memo(function ParticipantItem({ agent }: ParticipantItemProps) {
  const def = AGENT_BY_NAME.get(agent.agentName);
  const displayName = def?.displayName ?? agent.agentName;
  const role = def?.role ?? 'agent';
  const Icon = getAgentIcon(agent.agentName);
  const modelBadge = getModelBadge(agent.model);

  return (
    <div className="participant">
      <div className={`agent-avatar ${agentAvatarClass(agent.agentName)}`}>
        <Icon size={15} />
        <div className={statusIndicatorClass(agent.status)} />
      </div>
      <div className="participant-info">
        <div className={`participant-name ${agentColorClass(agent.agentName)}`}>
          {displayName}
        </div>
        <div className="participant-meta">
          <span className="participant-role">{role}</span>
          {agent.agentName !== 'user' && (
            <span className={`model-badge ${MODEL_BADGE_CLASS[modelBadge]}`}>
              {modelBadge}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});
