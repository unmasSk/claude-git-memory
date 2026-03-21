import '../styles/components/Sidebar.css';
import { useAgentStore } from '../stores/agent-store';
import { AgentState } from '@agent-chatroom/shared';
import { ParticipantItem } from './ParticipantItem';
import { User, Bot } from 'lucide-react';

export function ParticipantPanel() {
  // T1-01 fix: select the agents Map directly, derive online list in render
  const agents = useAgentStore((s) => s.agents);
  const connectedUsers = useAgentStore((s) => s.connectedUsers);
  const onlineAgents = Array.from(agents.values()).filter(
    (a) => a.status !== AgentState.Out
  );
  const totalOnline = connectedUsers.length + onlineAgents.length;

  return (
    <aside className="sidebar">
      {/* Agent list fills the full sidebar — no header, room info is in titlebar */}
      <div className="sb-section">Agents — {totalOnline}</div>

      <div className="agent-list">
        {connectedUsers.map((u) => (
          <div key={u.name + '-' + u.connectedAt} className="participant">
            <div className={`agent-avatar ${u.name.toLowerCase() === 'claude' ? 'av-claude' : 'av-user'}`}>
              {u.name.toLowerCase() === 'claude' ? <Bot size={15} /> : <User size={15} />}
              <div className="status-indicator status-idle" />
            </div>
            <div className="participant-info">
              <div className="participant-name c-user">{u.name}</div>
              <div className="participant-meta">
                <span className="participant-role">
                  {u.name.toLowerCase() === 'claude' ? 'orchestrator' : 'human'}
                </span>
              </div>
            </div>
          </div>
        ))}

        {onlineAgents.map((agent) => (
          <ParticipantItem key={agent.agentName} agent={agent} />
        ))}
      </div>
    </aside>
  );
}
