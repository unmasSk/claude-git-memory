import '../styles/components/Titlebar.css';
import { FolderOpen, Settings } from 'lucide-react';
import { useRoomStore } from '../stores/room-store';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

// Eager import — resolved at module load time so the handler is sync at click time.
let startDragging: (() => void) | null = null;
if (isTauri) {
  import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
    startDragging = () => { void getCurrentWindow().startDragging(); };
  });
}

interface TitlebarProps {
  onSettingsClick: () => void;
  onRepoClick: (roomId: string) => void;
}

export function Titlebar({ onSettingsClick, onRepoClick }: TitlebarProps) {
  const rooms = useRoomStore((s) => s.rooms);
  const activeRoomId = useRoomStore((s) => s.activeRoomId);
  const pendingDeleteId = useRoomStore((s) => s.pendingDeleteId);
  const setActiveRoomId = useRoomStore((s) => s.setActiveRoomId);
  const markForDelete = useRoomStore((s) => s.markForDelete);
  const cancelDelete = useRoomStore((s) => s.cancelDelete);
  const confirmDelete = useRoomStore((s) => s.confirmDelete);
  const createRoom = useRoomStore((s) => s.createRoom);

  function handleTabClick(roomId: string) {
    if (pendingDeleteId === roomId) {
      // Clicking the tab body while it's pending-delete cancels the pending delete
      cancelDelete();
      return;
    }
    setActiveRoomId(roomId);
  }

  function handleCloseClick(e: React.MouseEvent, roomId: string) {
    e.stopPropagation();
    if (roomId === 'default') return;
    if (pendingDeleteId === roomId) {
      // Second click — confirm delete
      void confirmDelete(roomId);
    } else {
      // First click — mark for deletion
      markForDelete(roomId);
    }
  }

  async function handleCreateRoom() {
    await createRoom();
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (!startDragging) return;
    if ((e.target as HTMLElement).closest('.tb-tab, .tb-tab-new, .tb-tab-close, .tb-icon, .tb-dots, .tb-right-group')) return;
    e.preventDefault();
    startDragging();
  }

  return (
    // data-tauri-drag-region as fallback; JS handler is the primary drag mechanism for WKWebView.
    <div className="titlebar" data-tauri-drag-region onMouseDown={handleMouseDown}>
      {/* Left: macOS traffic lights zone — native dots shown by OS when titleBarStyle=transparent */}
      <div className="tb-left">
        {!isTauri && (
          <div className="tb-dots">
            <div className="tb-dot tb-dot-r" />
            <div className="tb-dot tb-dot-y" />
            <div className="tb-dot tb-dot-g" />
          </div>
        )}
      </div>

      {/* Right: tabs + user + settings, sits over chat area */}
      <div className="tb-tabs-area">
        <div className="tb-tabs">
          {rooms.map((room) => {
            const isActive = room.id === activeRoomId;
            const isPendingDelete = room.id === pendingDeleteId;
            const isDeletable = room.id !== 'default';

            return (
              <div
                key={room.id}
                className={`tb-tab${isActive ? ' active' : ''}${isPendingDelete ? ' pending-delete' : ''}`}
                onClick={() => handleTabClick(room.id)}
                title={isPendingDelete ? 'Click × again to permanently delete' : room.name}
              >
                <span
                  className="tb-repo-icon"
                  onClick={(e) => { e.stopPropagation(); onRepoClick(room.id); }}
                  title="Select repo"
                >
                  <FolderOpen size={11} />
                </span>
                #{room.name}
                {isDeletable && (
                  <span
                    className={`tb-tab-close${isPendingDelete ? ' close-confirm' : ''}`}
                    onClick={(e) => handleCloseClick(e, room.id)}
                    title={isPendingDelete ? 'Confirm delete' : 'Delete room'}
                  >
                    &times;
                  </span>
                )}
              </div>
            );
          })}

          {/* New room button */}
          <div
            className="tb-tab-new"
            onClick={() => void handleCreateRoom()}
            title="New room"
          >
            +
          </div>
        </div>

        <div className="tb-right-group">
          <span className="tb-user">bex</span>
          <span className="tb-icon" onClick={onSettingsClick} title="Settings">
            <Settings size={14} />
          </span>
        </div>
      </div>
    </div>
  );
}
