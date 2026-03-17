import { create } from 'zustand';
import type { Message } from '@agent-chatroom/shared';

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

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoadingHistory: false,
  hasMoreHistory: false,

  appendMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),

  /** FIX 17: batch append for coalesced WS flush */
  appendMessages: (msgs) =>
    set((state) => ({ messages: [...state.messages, ...msgs] })),

  prependHistory: (msgs, hasMore) =>
    set((state) => ({
      messages: [...msgs, ...state.messages],
      hasMoreHistory: hasMore,
      isLoadingHistory: false,
    })),

  clearMessages: () =>
    set({ messages: [], hasMoreHistory: false }),

  setLoadingHistory: (loading) =>
    set({ isLoadingHistory: loading }),
}));
