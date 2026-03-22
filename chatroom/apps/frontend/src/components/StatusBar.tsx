import '../styles/components/Statusbar.css';
import { GitBranch, ArrowDown, ArrowUp } from 'lucide-react';
import { useWsStore } from '../stores/ws-store';

export function StatusBar() {
  const status = useWsStore((s) => s.status);
  const gitStatus = useWsStore((s) => s.gitStatus);

  const dotClass =
    status === 'connected'
      ? 'statusbar-dot connected'
      : status === 'connecting'
      ? 'statusbar-dot connecting'
      : status === 'offline'
      ? 'statusbar-dot offline'
      : 'statusbar-dot disconnected';

  const branch = gitStatus ? `${gitStatus.branch}${gitStatus.dirty ? '*' : ''}` : null;
  const ahead = gitStatus?.ahead ?? 0;
  const behind = gitStatus?.behind ?? 0;
  const repo = gitStatus?.repo ?? null;

  return (
    <div className="statusbar">
      <div className="sb-left">
        <span className="sb-item sb-git">
          <GitBranch size={12} />
          <span className="sb-branch">{branch ?? '—'}</span>
        </span>
        <span className="sb-item">
          <ArrowDown size={10} />
          <span className={`sb-git-stat${behind > 0 ? ' deletions' : ''}`}>{behind}</span>
          <ArrowUp size={10} style={{ marginLeft: '2px' }} />
          <span className={`sb-git-stat${ahead > 0 ? ' additions' : ''}`}>{ahead}</span>
        </span>
        {repo && <span className="sb-item">{repo}</span>}
      </div>

      <div className="sb-right">
        <span className="sb-item">
          <div className={dotClass} />
          <span style={{ position: 'relative', top: '-1px' }}>{status}</span>
          {status === 'offline' && (
            <button
              type="button"
              className="sb-retry-btn"
              onClick={() => useWsStore.getState().retryOffline()}
            >
              Retry
            </button>
          )}
        </span>
      </div>
    </div>
  );
}
