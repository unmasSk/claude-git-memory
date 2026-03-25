import { create } from 'zustand';
import type { Room } from '@agent-chatroom/shared';

const USER_NAME: string = import.meta.env.VITE_USER_NAME ?? 'Bex';

/** Obtain a short-lived auth token for HTTP API calls that require Bearer auth. */
async function getAuthToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: USER_NAME }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { token: string };
    return data.token;
  } catch {
    return null;
  }
}

interface RoomStore {
  rooms: Room[];
  activeRoomId: string;
  /** Room marked for deletion on first X click — null if none pending */
  pendingDeleteId: string | null;

  loadRooms: () => Promise<void>;
  createRoom: () => Promise<Room | null>;
  setActiveRoomId: (id: string) => void;
  markForDelete: (id: string) => void;
  cancelDelete: () => void;
  confirmDelete: (id: string) => Promise<void>;
}

export const useRoomStore = create<RoomStore>((set, get) => ({
  rooms: [],
  activeRoomId: 'default',
  pendingDeleteId: null,

  loadRooms: async () => {
    try {
      const res = await fetch('/api/rooms');
      if (!res.ok) return;
      const data = (await res.json()) as Room[];
      const { activeRoomId } = get();
      const activeExists = data.some((r) => r.id === activeRoomId);
      set({ rooms: data, ...(activeExists ? {} : { activeRoomId: data[0]?.id ?? '' }) });
    } catch {
      // backend not reachable — leave rooms empty
    }
  },

  createRoom: async () => {
    try {
      const token = await getAuthToken();
      if (!token) return null;
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { room: Room };
      set((state) => ({
        rooms: [...state.rooms, data.room],
        activeRoomId: data.room.id,
      }));
      return data.room;
    } catch {
      return null;
    }
  },

  setActiveRoomId: (id) => {
    // Cancel any pending delete when switching rooms
    set({ activeRoomId: id, pendingDeleteId: null });
  },

  markForDelete: (id) => {
    set({ pendingDeleteId: id });
  },

  cancelDelete: () => {
    set({ pendingDeleteId: null });
  },

  confirmDelete: async (id) => {
    try {
      const token = await getAuthToken();
      if (!token) return;
      const res = await fetch(`/api/rooms/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { set({ pendingDeleteId: null }); return; }
      const { rooms, activeRoomId } = get();
      const remaining = rooms.filter((r) => r.id !== id);
      if (remaining.length === 0) {
        // Last tab closed — auto-create a fresh room, retry once on failure
        set({ rooms: [], activeRoomId: '', pendingDeleteId: null });
        const created = await get().createRoom();
        if (!created) {
          // Retry once after a short delay
          await new Promise((r) => setTimeout(r, 500));
          await get().createRoom();
        }
        return;
      }
      const nextActiveId = activeRoomId === id ? remaining[0].id : activeRoomId;
      set({ rooms: remaining, activeRoomId: nextActiveId, pendingDeleteId: null });
    } catch {
      set({ pendingDeleteId: null });
    }
  },
}));
