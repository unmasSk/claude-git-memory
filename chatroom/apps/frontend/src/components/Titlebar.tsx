import '../styles/components/Titlebar.css';
import { Bot, Settings } from 'lucide-react';
import { useAgentStore } from '../stores/agent-store';

export function Titlebar() {
  const room = useAgentStore((s) => s.room);
  const roomName = room?.name ?? 'powerful-salamander';

  return (
    <div className="titlebar">
      {/* Left: macOS traffic lights, aligned over sidebar */}
      <div className="tb-left">
        <div className="tb-dots">
          <div className="tb-dot tb-dot-r" />
          <div className="tb-dot tb-dot-y" />
          <div className="tb-dot tb-dot-g" />
        </div>
      </div>

      {/* Right: tabs + user + icons, sits over chat area */}
      <div className="tb-tabs-area">
        <div className="tb-tabs">
          <div className="tb-tab active">
            #{roomName}
            <span className="tb-tab-close">&times;</span>
          </div>
        </div>

        <div className="tb-right-group">
          <div className="tb-user-dot" />
          <span className="tb-user">bex</span>
          <span className="tb-icon">
            <Bot size={14} />
          </span>
          <span className="tb-icon">
            <Settings size={14} />
          </span>
        </div>
      </div>
    </div>
  );
}
