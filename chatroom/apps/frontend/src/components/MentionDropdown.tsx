import type { AgentDefinition } from '@agent-chatroom/shared';
import { agentColorClass } from '../lib/colors';
import { getModelBadge } from '@agent-chatroom/shared';

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
        const model = agent.model ? getModelBadge(agent.model) : '';
        return (
          <div
            key={agent.name}
            className={`mention-item${i === selectedIndex ? ' active' : ''}`}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(agent);
            }}
          >
            <span className={`mention-item-name ${agentColorClass(agent.name)}`}>
              @{agent.name}
            </span>
            {model && <span className="mention-badge">{model}</span>}
            <span className="mention-badge">{agent.role}</span>
          </div>
        );
      })}
    </div>
  );
}
