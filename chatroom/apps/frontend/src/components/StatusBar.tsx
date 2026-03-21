import '../styles/components/Statusbar.css';
import { GitBranch, ArrowDown, ArrowUp } from 'lucide-react';
import { useWsStore } from '../stores/ws-store';

export function StatusBar() {
  const status = useWsStore((s) => s.status);

  const dotClass =
    status === 'connected'
      ? 'statusbar-dot connected'
      : status === 'connecting'
      ? 'statusbar-dot connecting'
      : 'statusbar-dot disconnected';

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
        <span className="sb-item">
          <div className={dotClass} />
          {status}
        </span>
      </div>
    </div>
  );
}
