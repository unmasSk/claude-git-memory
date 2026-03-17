import { create } from 'zustand';
import type { AgentStatus, Room, ConnectedUser } from '@agent-chatroom/shared';
import { AgentState } from '@agent-chatroom/shared';

interface AgentState_ {
  agents: Map<string, AgentStatus>;
  room: Room | null;
  connectedUsers: ConnectedUser[];

  setRoom: (room: Room) => void;
  setAgents: (agents: AgentStatus[]) => void;
  setConnectedUsers: (users: ConnectedUser[]) => void;
  updateStatus: (agentName: string, status: AgentState, detail?: string) => void;
  getOnlineAgents: () => AgentStatus[];
}

export const useAgentStore = create<AgentState_>((set, get) => ({
  agents: new Map(),
  room: null,
  connectedUsers: [],

  setRoom: (room) => set({ room }),

  setAgents: (agents) =>
    set({ agents: new Map(agents.map((a) => [a.agentName, a])) }),

  setConnectedUsers: (users) => set({ connectedUsers: users }),

  updateStatus: (agentName, status, _detail?) =>
    set((state) => {
      const agents = new Map(state.agents);
      const existing = agents.get(agentName);
      if (existing) {
        agents.set(agentName, { ...existing, status, lastActive: new Date().toISOString() });
      } else {
        // Create a minimal placeholder if we haven't seen this agent yet
        agents.set(agentName, {
          agentName,
          roomId: state.room?.id ?? 'default',
          sessionId: null, // SEC-FIX 5: sessionId is server-internal, always null on client
          model: 'claude-sonnet-4-6',
          status,
          lastActive: new Date().toISOString(),
          totalCost: 0,
          turnCount: 0,
        });
      }
      return { agents };
    }),

  getOnlineAgents: () => {
    const { agents } = get();
    return Array.from(agents.values()).filter(
      (a) => a.status !== AgentState.Out
    );
  },
}));
