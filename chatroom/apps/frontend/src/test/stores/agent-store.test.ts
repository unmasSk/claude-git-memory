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
      agentsOutOfContext: new Set<string>(),
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

// ---------------------------------------------------------------------------
// agentsOutOfContext — addOutOfContext, clearOutOfContext, clearAllOutOfContext
// ---------------------------------------------------------------------------

describe('agent-store — agentsOutOfContext: initial state', () => {
  beforeEach(() => {
    useAgentStore.setState({
      agents: new Map(),
      room: null,
      connectedUsers: [],
      agentsOutOfContext: new Set<string>(),
    });
  });

  it('initial agentsOutOfContext is an empty Set', () => {
    expect(useAgentStore.getState().agentsOutOfContext.size).toBe(0);
  });
});

describe('agent-store — agentsOutOfContext: addOutOfContext', () => {
  beforeEach(() => {
    useAgentStore.setState({
      agents: new Map(),
      room: null,
      connectedUsers: [],
      agentsOutOfContext: new Set<string>(),
    });
  });

  it('addOutOfContext adds an agent name to the Set', () => {
    useAgentStore.getState().addOutOfContext('ultron');
    expect(useAgentStore.getState().agentsOutOfContext.has('ultron')).toBe(true);
  });

  it('addOutOfContext grows Set size by 1 per unique agent', () => {
    useAgentStore.getState().addOutOfContext('ultron');
    expect(useAgentStore.getState().agentsOutOfContext.size).toBe(1);
  });

  it('addOutOfContext is idempotent — adding same agent twice yields size 1', () => {
    useAgentStore.getState().addOutOfContext('cerberus');
    useAgentStore.getState().addOutOfContext('cerberus');
    expect(useAgentStore.getState().agentsOutOfContext.size).toBe(1);
  });

  it('addOutOfContext can hold multiple different agents', () => {
    useAgentStore.getState().addOutOfContext('ultron');
    useAgentStore.getState().addOutOfContext('cerberus');
    useAgentStore.getState().addOutOfContext('argus');
    const set = useAgentStore.getState().agentsOutOfContext;
    expect(set.size).toBe(3);
    expect(set.has('ultron')).toBe(true);
    expect(set.has('cerberus')).toBe(true);
    expect(set.has('argus')).toBe(true);
  });

  it('addOutOfContext does not disturb other agents already in Set', () => {
    useAgentStore.getState().addOutOfContext('bilbo');
    useAgentStore.getState().addOutOfContext('dante');
    // bilbo should still be present after adding dante
    expect(useAgentStore.getState().agentsOutOfContext.has('bilbo')).toBe(true);
  });
});

describe('agent-store — agentsOutOfContext: clearOutOfContext', () => {
  beforeEach(() => {
    useAgentStore.setState({
      agents: new Map(),
      room: null,
      connectedUsers: [],
      agentsOutOfContext: new Set<string>(['ultron', 'cerberus']),
    });
  });

  it('clearOutOfContext removes the named agent from the Set', () => {
    useAgentStore.getState().clearOutOfContext('ultron');
    expect(useAgentStore.getState().agentsOutOfContext.has('ultron')).toBe(false);
  });

  it('clearOutOfContext leaves other agents in the Set untouched', () => {
    useAgentStore.getState().clearOutOfContext('ultron');
    expect(useAgentStore.getState().agentsOutOfContext.has('cerberus')).toBe(true);
  });

  it('clearOutOfContext reduces Set size by 1 when agent was present', () => {
    useAgentStore.getState().clearOutOfContext('ultron');
    expect(useAgentStore.getState().agentsOutOfContext.size).toBe(1);
  });

  it('clearOutOfContext on an absent agent does not throw', () => {
    expect(() => useAgentStore.getState().clearOutOfContext('nonexistent-agent')).not.toThrow();
  });

  it('clearOutOfContext on absent agent leaves existing agents intact', () => {
    useAgentStore.getState().clearOutOfContext('nonexistent-agent');
    expect(useAgentStore.getState().agentsOutOfContext.size).toBe(2);
  });
});

describe('agent-store — agentsOutOfContext: clearAllOutOfContext', () => {
  beforeEach(() => {
    useAgentStore.setState({
      agents: new Map(),
      room: null,
      connectedUsers: [],
      agentsOutOfContext: new Set<string>(['ultron', 'cerberus', 'argus']),
    });
  });

  it('clearAllOutOfContext empties the Set', () => {
    useAgentStore.getState().clearAllOutOfContext();
    expect(useAgentStore.getState().agentsOutOfContext.size).toBe(0);
  });

  it('clearAllOutOfContext produces an empty Set (not null or undefined)', () => {
    useAgentStore.getState().clearAllOutOfContext();
    const set = useAgentStore.getState().agentsOutOfContext;
    expect(set).toBeDefined();
    expect(set instanceof Set).toBe(true);
  });

  it('clearAllOutOfContext on an already-empty Set does not throw', () => {
    useAgentStore.setState({ agentsOutOfContext: new Set<string>() });
    expect(() => useAgentStore.getState().clearAllOutOfContext()).not.toThrow();
  });

  it('clearAllOutOfContext allows subsequent addOutOfContext to work', () => {
    useAgentStore.getState().clearAllOutOfContext();
    useAgentStore.getState().addOutOfContext('bilbo');
    expect(useAgentStore.getState().agentsOutOfContext.has('bilbo')).toBe(true);
    expect(useAgentStore.getState().agentsOutOfContext.size).toBe(1);
  });
});
