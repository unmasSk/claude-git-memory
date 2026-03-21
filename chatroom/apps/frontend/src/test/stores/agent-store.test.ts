import { describe, it, expect, beforeEach } from 'vitest';
import { AgentState } from '@agent-chatroom/shared';
import type { AgentStatus, Room, ConnectedUser } from '@agent-chatroom/shared';
import { useAgentStore } from '../../stores/agent-store';

function makeAgent(name: string, status: AgentState = AgentState.Idle): AgentStatus {
  return {
    agentName: name,
    roomId: 'default',
    sessionId: null,
    model: 'claude-sonnet-4-6',
    status,
    lastActive: null,
    totalCost: 0,
    turnCount: 0,
  };
}

const testRoom: Room = {
  id: 'room-1',
  name: 'Test Room',
  topic: 'testing',
  createdAt: new Date().toISOString(),
};

describe('agent-store — agent status updates', () => {
  beforeEach(() => {
    // Reset store state between tests
    useAgentStore.setState({
      agents: new Map(),
      room: null,
      connectedUsers: [],
    });
  });

  it('setRoom stores the room', () => {
    useAgentStore.getState().setRoom(testRoom);
    expect(useAgentStore.getState().room).toEqual(testRoom);
  });

  it('setAgents replaces the agents map from an array', () => {
    useAgentStore.getState().setAgents([makeAgent('bilbo'), makeAgent('dante')]);
    const agents = useAgentStore.getState().agents;
    expect(agents.size).toBe(2);
    expect(agents.get('bilbo')?.agentName).toBe('bilbo');
    expect(agents.get('dante')?.agentName).toBe('dante');
  });

  it('setAgents replaces any previously set agents', () => {
    useAgentStore.getState().setAgents([makeAgent('bilbo')]);
    useAgentStore.getState().setAgents([makeAgent('dante')]);
    const agents = useAgentStore.getState().agents;
    expect(agents.has('bilbo')).toBe(false);
    expect(agents.has('dante')).toBe(true);
  });

  it('setConnectedUsers stores the user list', () => {
    const users: ConnectedUser[] = [
      { name: 'Alice', connectedAt: new Date().toISOString() },
    ];
    useAgentStore.getState().setConnectedUsers(users);
    expect(useAgentStore.getState().connectedUsers).toHaveLength(1);
    expect(useAgentStore.getState().connectedUsers[0].name).toBe('Alice');
  });

  it('updateStatus updates status on a known agent', () => {
    useAgentStore.getState().setAgents([makeAgent('bilbo', AgentState.Idle)]);
    useAgentStore.getState().updateStatus('bilbo', AgentState.Thinking);
    expect(useAgentStore.getState().agents.get('bilbo')?.status).toBe(AgentState.Thinking);
  });

  it('updateStatus sets lastActive when updating a known agent', () => {
    useAgentStore.getState().setAgents([makeAgent('bilbo')]);
    useAgentStore.getState().updateStatus('bilbo', AgentState.Done);
    expect(useAgentStore.getState().agents.get('bilbo')?.lastActive).toBeTruthy();
  });

  it('updateStatus creates a placeholder entry for an unknown agent', () => {
    useAgentStore.getState().updateStatus('unknown-agent', AgentState.Thinking);
    const entry = useAgentStore.getState().agents.get('unknown-agent');
    expect(entry).toBeDefined();
    expect(entry?.status).toBe(AgentState.Thinking);
    expect(entry?.sessionId).toBeNull();
  });

  it('updateStatus placeholder uses room id from current room state', () => {
    useAgentStore.getState().setRoom(testRoom);
    useAgentStore.getState().updateStatus('new-agent', AgentState.Idle);
    const entry = useAgentStore.getState().agents.get('new-agent');
    expect(entry?.roomId).toBe('room-1');
  });

  it('updateStatus placeholder falls back to "default" roomId when no room set', () => {
    useAgentStore.getState().updateStatus('orphan', AgentState.Done);
    expect(useAgentStore.getState().agents.get('orphan')?.roomId).toBe('default');
  });

  it('getOnlineAgents excludes agents with Out status', () => {
    useAgentStore.getState().setAgents([
      makeAgent('bilbo', AgentState.Idle),
      makeAgent('dante', AgentState.Out),
      makeAgent('argus', AgentState.Thinking),
    ]);
    const online = useAgentStore.getState().getOnlineAgents();
    const names = online.map((a) => a.agentName);
    expect(names).toContain('bilbo');
    expect(names).toContain('argus');
    expect(names).not.toContain('dante');
  });

  it('getOnlineAgents returns empty array when all agents are Out', () => {
    useAgentStore.getState().setAgents([
      makeAgent('bilbo', AgentState.Out),
    ]);
    expect(useAgentStore.getState().getOnlineAgents()).toHaveLength(0);
  });

  it('getOnlineAgents includes agents in all non-Out states', () => {
    useAgentStore.getState().setAgents([
      makeAgent('a', AgentState.Idle),
      makeAgent('b', AgentState.Thinking),
      makeAgent('c', AgentState.ToolUse),
      makeAgent('d', AgentState.Done),
      makeAgent('e', AgentState.Error),
    ]);
    const online = useAgentStore.getState().getOnlineAgents();
    expect(online).toHaveLength(5);
  });
});
