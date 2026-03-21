import '../styles/components/Statusbar.css';
import { GitBranch, ArrowDown, ArrowUp } from 'lucide-react';
import { useAgentStore } from '../stores/agent-store';
import { AgentState } from '@agent-chatroom/shared';

export function StatusBar() {
  const agents = useAgentStore((s) => s.agents);

  const activeAgents = Array.from(agents.values()).filter(
    (a) => a.status !== AgentState.Out
  ).length;
  const totalAgents = agents.size;

  return (
    <div className="statusbar">
      <div className="sb-left">
        <span className="sb-item sb-git">
          <GitBranch size={12} />
          <span className="sb-branch">dev*</span>
        </span>
        <span className="sb-item">
          <ArrowDown size={10} />0
          <ArrowUp size={10} style={{ marginLeft: '2px' }} />3
        </span>
        <span className="sb-item">claude-toolkit</span>
      </div>

      <div className="sb-right">
        <span className="sb-item sb-agents">
          <span>{activeAgents}</span> / {totalAgents} active
        </span>
      </div>
    </div>
  );
}
