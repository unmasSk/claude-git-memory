import './styles/globals.css';
import { useEffect, useState } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { Titlebar } from './components/Titlebar';
import { ParticipantPanel } from './components/ParticipantPanel';
import { ChatArea } from './components/ChatArea';
import { StatusBar } from './components/StatusBar';
import { SettingsPanel } from './components/SettingsPanel';
import { useRoomStore } from './stores/room-store';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export function App() {
  const activeRoomId = useRoomStore((s) => s.activeRoomId);
  const loadRooms = useRoomStore((s) => s.loadRooms);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [repoRoomId, setRepoRoomId] = useState<string | null>(null);

  // Load all rooms on mount
  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  // Reconnect when active room changes
  useWebSocket(activeRoomId);

  return (
    <div className={`chatroom${isTauri ? ' tauri' : ''}`}>
      <Titlebar
        onSettingsClick={() => setSettingsOpen(true)}
        onRepoClick={(roomId) => setRepoRoomId(roomId)}
      />
      <div className="main">
        <ParticipantPanel />
        <ChatArea />
      </div>
      <StatusBar />
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
