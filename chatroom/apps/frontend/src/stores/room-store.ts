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
      set({ rooms: data });
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
    // Cannot mark the default room for deletion
    if (id === 'default') return;
    set({ pendingDeleteId: id });
  },

  cancelDelete: () => {
    set({ pendingDeleteId: null });
  },

  confirmDelete: async (id) => {
    if (id === 'default') return;
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
      // If the deleted room was active, fall back to 'default'
      const nextActiveId = activeRoomId === id ? 'default' : activeRoomId;
      set({ rooms: remaining, activeRoomId: nextActiveId, pendingDeleteId: null });
    } catch {
      set({ pendingDeleteId: null });
    }
  },
}));
