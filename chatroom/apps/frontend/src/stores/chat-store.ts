import { create } from 'zustand';
import type { Message } from '@agent-chatroom/shared';

// Maximum number of messages kept in memory. When prependHistory causes the array to
// exceed this limit, the newest excess messages are trimmed from the tail and their IDs
// removed from seenIds so they can be re-fetched from the server if needed.
const MAX_STORED_MESSAGES = 2000;

interface ChatState {
  messages: Message[];
  isLoadingHistory: boolean;
  hasMoreHistory: boolean;

  appendMessage: (msg: Message) => void;
  appendMessages: (msgs: Message[]) => void;
  prependHistory: (msgs: Message[], hasMore: boolean) => void;
  clearMessages: () => void;
  setLoadingHistory: (loading: boolean) => void;
}

// Module-level dedup set — survives across Zustand set() race conditions
// that occur when 2 StrictMode WS connections deliver the same message
const seenIds = new Set<string>();

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoadingHistory: false,
  hasMoreHistory: false,

  appendMessage: (msg) => {
    if (seenIds.has(msg.id)) return;
    seenIds.add(msg.id);
    set((state) => ({ messages: [...state.messages, msg] }));
  },

  appendMessages: (msgs) => {
    const fresh = msgs.filter((m) => {
      if (seenIds.has(m.id)) return false;
      seenIds.add(m.id);
      return true;
    });
    if (fresh.length === 0) return;
    set((state) => ({ messages: [...state.messages, ...fresh] }));
  },

  prependHistory: (msgs, hasMore) => {
    const fresh = msgs.filter((m) => {
      if (seenIds.has(m.id)) return false;
      seenIds.add(m.id);
      return true;
    });
    set((state) => {
      let combined = [...fresh, ...state.messages];
      if (combined.length > MAX_STORED_MESSAGES) {
        // combined is [old (prepended)…, newer…]. Trim from the tail (newest excess)
        // so the bounded window slides toward older history as the user scrolls up.
        // Remove evicted IDs from seenIds so they can be re-fetched if needed.
        const trimmed = combined.slice(0, MAX_STORED_MESSAGES);
        const kept = new Set(trimmed.map((m) => m.id));
        for (const id of seenIds) {
          if (!kept.has(id)) seenIds.delete(id);
        }
        combined = trimmed;
      }
      return {
        messages: combined,
        hasMoreHistory: hasMore,
        isLoadingHistory: false,
      };
    });
  },

  clearMessages: () => {
    seenIds.clear();
    set({ messages: [], hasMoreHistory: false });
  },

  setLoadingHistory: (loading) =>
    set({ isLoadingHistory: loading }),
}));
