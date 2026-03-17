import { useAgentStore } from '../stores/agent-store';
import { AgentState } from '@agent-chatroom/shared';
import { ParticipantItem } from './ParticipantItem';
import { User } from 'lucide-react';

export function ParticipantPanel() {
  // T1-01 fix: select the agents Map directly, derive online list in render
  const agents = useAgentStore((s) => s.agents);
  const connectedUsers = useAgentStore((s) => s.connectedUsers);
  const onlineAgents = Array.from(agents.values()).filter(
    (a) => a.status !== AgentState.Out
  );
  const totalOnline = connectedUsers.length + onlineAgents.length;

  return (
    <div className="panel">
      <div className="section-label">Online — {totalOnline}</div>

      {connectedUsers.length > 0 && (
        <>
          <div className="section-label" style={{ fontSize: '10px', opacity: 0.5, paddingTop: '4px' }}>
            humans
          </div>
          {connectedUsers.map((u) => (
            <div key={u.name} className="participant">
              <div className="agent-avatar av-user">
                <User size={15} />
                <div className="status-indicator status-idle" />
              </div>
              <div className="participant-info">
                <div className="participant-name c-user">{u.name}</div>
                <div className="participant-meta">
                  <span className="participant-role">human</span>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {onlineAgents.length > 0 && (
        <>
          <div className="section-label" style={{ fontSize: '10px', opacity: 0.5, paddingTop: '4px' }}>
            agents
          </div>
          {onlineAgents.map((agent) => (
            <ParticipantItem key={agent.agentName} agent={agent} />
          ))}
        </>
      )}
    </div>
  );
}
