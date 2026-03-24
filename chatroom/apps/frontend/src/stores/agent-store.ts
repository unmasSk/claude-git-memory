import { create } from 'zustand';
import type { AgentStatus, Room, ConnectedUser } from '@agent-chatroom/shared';
import { AgentState } from '@agent-chatroom/shared';

/**
 * Extended AgentStatus with frontend-only UI state not persisted in the backend.
 * Augments the shared type with accumulated metrics and live-timer data.
 */
export interface AgentStatusUI extends AgentStatus {
  /** Sum of inputTokens from all COMPLETED invocations (not including current). */
  completedInputTokens: number;
  /** Timestamp (ms since epoch) when the current invocation started. Null when idle/done. */
  invocationStartTime: number | null;
}

interface AgentStoreState {
  agents: Map<string, AgentStatusUI>;
  room: Room | null;
  connectedUsers: ConnectedUser[];
  agentsOutOfContext: Set<string>;

  setRoom: (room: Room) => void;
  setAgents: (agents: AgentStatus[]) => void;
  setConnectedUsers: (users: ConnectedUser[]) => void;
  updateRoomCwd: (roomId: string, cwd: string | null) => void;
  updateStatus: (
    agentName: string,
    status: AgentState,
    detail?: string,
    metrics?: {
      durationMs?: number;
      numTurns?: number;
      inputTokens?: number;
      outputTokens?: number;
      contextWindow?: number;
    },
  ) => void;
  getOnlineAgents: () => AgentStatusUI[];
  addOutOfContext: (agentName: string) => void;
  clearOutOfContext: (agentName: string) => void;
  clearAllOutOfContext: () => void;
}

const ACTIVE_STATES = new Set<AgentState>([AgentState.Thinking, AgentState.ToolUse]);

export const useAgentStore = create<AgentStoreState>((set, get) => ({
  agents: new Map(),
  room: null,
  connectedUsers: [],
  agentsOutOfContext: new Set<string>(),

  setRoom: (room) => set({ room }),

  updateRoomCwd: (roomId, cwd) =>
    set((state) => {
      if (!state.room || state.room.id !== roomId) return state;
      return { room: { ...state.room, cwd } };
    }),

  setAgents: (agents) =>
    set((state) => ({
      agents: new Map(
        agents.map((a) => {
          const existing = state.agents.get(a.agentName);
          return [
            a.agentName,
            {
              ...a,
              // Preserve accumulated frontend metrics across room_state refreshes.
              // If the agent already ran this session, keep the running total.
              completedInputTokens: existing?.completedInputTokens ?? 0,
              invocationStartTime: existing?.invocationStartTime ?? null,
            },
          ];
        }),
      ),
    })),

  setConnectedUsers: (users) => set({ connectedUsers: users }),

  updateStatus: (agentName, status, _detail?, metrics?) =>
    set((state) => {
      const agents = new Map(state.agents);
      const existing = agents.get(agentName);
      const wasActive = existing ? ACTIVE_STATES.has(existing.status) : false;
      const isNowActive = ACTIVE_STATES.has(status);
      const isNowDone = status === AgentState.Done || status === AgentState.Error;

      // Accumulated context: on invocation completion, fold inputTokens into the running total.
      // This makes context % grow across invocations instead of resetting each time.
      const prevCompleted = existing?.completedInputTokens ?? 0;
      const completedInputTokens =
        isNowDone && metrics?.inputTokens !== undefined
          ? prevCompleted + metrics.inputTokens
          : prevCompleted;

      // Live timer: record the moment a NEW invocation starts (idle→active transition).
      // Clear on done/error. Preserve through tool-use continuations within same invocation.
      const prevStartTime = existing?.invocationStartTime ?? null;
      const invocationStartTime = isNowActive && !wasActive
        ? Date.now()
        : isNowDone
          ? null
          : prevStartTime;

      const base: AgentStatusUI = existing ?? {
        agentName,
        roomId: state.room?.id ?? 'default',
        sessionId: null, // SEC-FIX 5: sessionId is server-internal, always null on client
        model: 'claude-sonnet-4-6',
        status,
        lastActive: new Date().toISOString(),
        totalCost: 0,
        turnCount: 0,
        completedInputTokens: 0,
        invocationStartTime: null,
      };

      agents.set(agentName, {
        ...base,
        status,
        lastActive: new Date().toISOString(),
        completedInputTokens,
        invocationStartTime,
        // Only update each metric field if the new value is defined.
        // Never overwrite existing metrics with undefined — this was the root bug:
        // the old ternary always spread because an empty object {} is truthy.
        ...(metrics?.durationMs !== undefined && { lastDurationMs: metrics.durationMs }),
        ...(metrics?.numTurns !== undefined && { lastNumTurns: metrics.numTurns }),
        ...(metrics?.inputTokens !== undefined && { lastInputTokens: metrics.inputTokens }),
        ...(metrics?.outputTokens !== undefined && { lastOutputTokens: metrics.outputTokens }),
        ...(metrics?.contextWindow !== undefined && { lastContextWindow: metrics.contextWindow }),
      });

      return { agents };
    }),

  getOnlineAgents: () => {
    const { agents } = get();
    return Array.from(agents.values()).filter((a) => a.status !== AgentState.Out);
  },

  addOutOfContext: (agentName) =>
    set((state) => ({
      agentsOutOfContext: new Set([...state.agentsOutOfContext, agentName]),
    })),

  clearOutOfContext: (agentName) =>
    set((state) => {
      const next = new Set(state.agentsOutOfContext);
      next.delete(agentName);
      return { agentsOutOfContext: next };
    }),

  clearAllOutOfContext: () => set({ agentsOutOfContext: new Set<string>() }),
}));

if (import.meta.env.DEV) {
  (window as any).__agentStore = useAgentStore;
}
