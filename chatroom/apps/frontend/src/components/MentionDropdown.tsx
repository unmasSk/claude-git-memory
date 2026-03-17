import type { AgentDefinition } from '@agent-chatroom/shared';
import { agentAvatarClass, agentColorClass } from '../lib/colors';
import { getAgentIcon } from '../lib/icons';

interface MentionDropdownProps {
  agents: AgentDefinition[];
  selectedIndex: number;
  onSelect: (agent: AgentDefinition) => void;
}

export function MentionDropdown({ agents, selectedIndex, onSelect }: MentionDropdownProps) {
  if (agents.length === 0) return null;

  return (
    <div className="mention-dropdown">
      {agents.map((agent, i) => {
        const Icon = getAgentIcon(agent.name);
        return (
          <div
            key={agent.name}
            className={`mention-item${i === selectedIndex ? ' active' : ''}`}
            onMouseDown={(e) => {
              // Use mousedown so it fires before the input blur
              e.preventDefault();
              onSelect(agent);
            }}
          >
            <div className={`agent-avatar ${agentAvatarClass(agent.name)}`} style={{ width: 24, height: 24, borderRadius: 5 }}>
              <Icon size={13} />
            </div>
            <span className={`mention-item-name ${agentColorClass(agent.name)}`}>
              @{agent.name}
            </span>
            <span className="mention-item-role">{agent.role}</span>
          </div>
        );
      })}
    </div>
  );
}
