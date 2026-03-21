import '../styles/components/Statusbar.css';
import { GitBranch, ArrowDown, ArrowUp } from 'lucide-react';
import { useWsStore } from '../stores/ws-store';
import { useAgentStore } from '../stores/agent-store';
import { AgentState } from '@agent-chatroom/shared';

export function StatusBar() {
  const status = useWsStore((s) => s.status);
  const agents = useAgentStore((s) => s.agents);

  const dotClass =
    status === 'connected'
      ? 'statusbar-dot connected'
      : status === 'connecting'
      ? 'statusbar-dot connecting'
      : 'statusbar-dot disconnected';

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
          <ArrowDown size={10} style={{ color: 'var(--success)' }} />
          <span style={{ color: 'var(--success)' }}>0</span>
          <ArrowUp size={10} style={{ color: 'var(--error)', marginLeft: '2px' }} />
          <span style={{ color: 'var(--error)' }}>3</span>
        </span>
        <span className="sb-item">
          <div className={dotClass} />
          {status}
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
