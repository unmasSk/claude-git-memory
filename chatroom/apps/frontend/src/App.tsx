import './styles/globals.css';
import { useWebSocket } from './hooks/useWebSocket';
import { Titlebar } from './components/Titlebar';
import { ParticipantPanel } from './components/ParticipantPanel';
import { ChatArea } from './components/ChatArea';
import { StatusBar } from './components/StatusBar';

const ROOM_ID = 'default';

export function App() {
  // Initialize WebSocket connection on mount, disconnect on unmount
  useWebSocket(ROOM_ID);

  return (
    <div className="chatroom">
      <Titlebar />
      <div className="main">
        <ParticipantPanel />
        <ChatArea />
      </div>
      <StatusBar />
    </div>
  );
}
