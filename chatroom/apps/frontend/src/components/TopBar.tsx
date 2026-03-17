import { Hash, Users, Clock } from 'lucide-react';
import { useAgentStore } from '../stores/agent-store';
import { AgentState } from '@agent-chatroom/shared';
import { useEffect, useState } from 'react';

export function TopBar() {
  const room = useAgentStore((s) => s.room);
  const agents = useAgentStore((s) => s.agents);
  const [elapsedMin, setElapsedMin] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedMin((m) => m + 1);
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  const onlineCount = Array.from(agents.values()).filter(
    (a) => a.status !== AgentState.Out
  ).length;
  const roomName = room?.name ?? 'general';
  const roomId = room?.id ?? 'default';
  const shortId = roomId.slice(0, 4);

  return (
    <div className="topbar">
      <div className="room-info">
        <div className="room-icon">
          <Hash size={16} />
        </div>
        <span className="room-name">{roomName}</span>
        <span className="room-id">Room #{shortId}</span>
      </div>
      <div className="room-meta">
        <div className="room-meta-item">
          <Users size={13} />
          <span>{onlineCount} online</span>
        </div>
        <div className="room-meta-item">
          <Clock size={13} />
          <span>{elapsedMin} min</span>
        </div>
      </div>
    </div>
  );
}
