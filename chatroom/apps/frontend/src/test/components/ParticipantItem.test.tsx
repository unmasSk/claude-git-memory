/**
 * ParticipantItem — smoke render + card class names based on agent state.
 *
 * card class rules (from source):
 *   isActive = status !== Out && status !== Idle
 *   cardClass = isActive ? 'card active-card' : 'card off-card'
 *
 * We mock the WS store's send function to avoid real WS connections.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ParticipantItem } from '../../components/ParticipantItem';
import { useWsStore } from '../../stores/ws-store';
import { AgentState } from '@agent-chatroom/shared';
import type { AgentStatusUI } from '../../stores/agent-store';

// Suppress CSS import errors in jsdom
vi.mock('../../styles/components/AgentCard.css', () => ({}));

function makeAgent(status: AgentState, name = 'bilbo'): AgentStatusUI {
  return {
    agentName: name,
    roomId: 'default',
    sessionId: null,
    model: 'claude-sonnet-4-6',
    status,
    lastActive: null,
    totalCost: 0,
    turnCount: 0,
    completedInputTokens: 0,
    invocationStartTime: null,
  };
}

describe('ParticipantItem — smoke render', () => {
  it('renders the agent name (lowercased)', () => {
    render(<ParticipantItem agent={makeAgent(AgentState.Idle)} />);
    expect(screen.getByText('bilbo')).toBeInTheDocument();
  });

  it('renders the Play button', () => {
    render(<ParticipantItem agent={makeAgent(AgentState.Idle)} />);
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
  });

  it('renders the Pause button', () => {
    render(<ParticipantItem agent={makeAgent(AgentState.Idle)} />);
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
  });

  it('renders the Stop button', () => {
    render(<ParticipantItem agent={makeAgent(AgentState.Idle)} />);
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
  });

  it('renders the Chat button', () => {
    render(<ParticipantItem agent={makeAgent(AgentState.Idle)} />);
    expect(screen.getByRole('button', { name: /chat/i })).toBeInTheDocument();
  });
});

describe('ParticipantItem — card class based on agent state', () => {
  it('uses off-card when status is Idle', () => {
    const { container } = render(<ParticipantItem agent={makeAgent(AgentState.Idle)} />);
    const card = container.querySelector('.card');
    expect(card).toHaveClass('off-card');
    expect(card).not.toHaveClass('active-card');
  });

  it('uses off-card when status is Out', () => {
    const { container } = render(<ParticipantItem agent={makeAgent(AgentState.Out)} />);
    const card = container.querySelector('.card');
    expect(card).toHaveClass('off-card');
  });

  it('uses active-card when status is Thinking', () => {
    const { container } = render(<ParticipantItem agent={makeAgent(AgentState.Thinking)} />);
    const card = container.querySelector('.card');
    expect(card).toHaveClass('active-card');
    expect(card).not.toHaveClass('off-card');
  });

  it('uses active-card when status is ToolUse', () => {
    const { container } = render(<ParticipantItem agent={makeAgent(AgentState.ToolUse)} />);
    const card = container.querySelector('.card');
    expect(card).toHaveClass('active-card');
  });

  it('uses off-card when status is Done', () => {
    const { container } = render(<ParticipantItem agent={makeAgent(AgentState.Done)} />);
    const card = container.querySelector('.card');
    expect(card).toHaveClass('off-card');
  });

  it('uses off-card when status is Error', () => {
    const { container } = render(<ParticipantItem agent={makeAgent(AgentState.Error)} />);
    const card = container.querySelector('.card');
    expect(card).toHaveClass('off-card');
  });

  it('wraps card in agent-name CSS class on the outer div when previously invoked', () => {
    const { container } = render(<ParticipantItem agent={makeAgent(AgentState.Done, 'dante')} />);
    const wrap = container.querySelector('.card-wrap');
    expect(wrap).toHaveClass('agent-dante');
  });
});

describe('ParticipantItem — button enabled/disabled states', () => {
  let mockSend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSend = vi.fn();
    useWsStore.setState({
      status: 'connected',
      roomId: 'default',
      send: mockSend,
    } as any);
  });

  it('Play is disabled when agent is Idle (not paused)', () => {
    render(<ParticipantItem agent={makeAgent(AgentState.Idle)} />);
    expect(screen.getByRole('button', { name: /play/i })).toBeDisabled();
  });

  it('Pause is disabled when agent is Idle', () => {
    render(<ParticipantItem agent={makeAgent(AgentState.Idle)} />);
    expect(screen.getByRole('button', { name: /pause/i })).toBeDisabled();
  });

  it('Stop is disabled when agent is Idle', () => {
    render(<ParticipantItem agent={makeAgent(AgentState.Idle)} />);
    expect(screen.getByRole('button', { name: /stop/i })).toBeDisabled();
  });

  it('Chat is enabled when agent is Idle', () => {
    render(<ParticipantItem agent={makeAgent(AgentState.Idle)} />);
    expect(screen.getByRole('button', { name: /chat/i })).not.toBeDisabled();
  });

  it('Pause is enabled when agent is Thinking', () => {
    render(<ParticipantItem agent={makeAgent(AgentState.Thinking)} />);
    expect(screen.getByRole('button', { name: /pause/i })).not.toBeDisabled();
  });

  it('Stop is enabled when agent is Thinking', () => {
    render(<ParticipantItem agent={makeAgent(AgentState.Thinking)} />);
    expect(screen.getByRole('button', { name: /stop/i })).not.toBeDisabled();
  });

  it('Chat is disabled when agent is Thinking', () => {
    render(<ParticipantItem agent={makeAgent(AgentState.Thinking)} />);
    expect(screen.getByRole('button', { name: /chat/i })).toBeDisabled();
  });

  it('Play is disabled when agent is Thinking (not paused)', () => {
    render(<ParticipantItem agent={makeAgent(AgentState.Thinking)} />);
    expect(screen.getByRole('button', { name: /play/i })).toBeDisabled();
  });

  it('Pause click sends pause_agent and enables Play/Stop', async () => {
    const user = userEvent.setup();
    render(<ParticipantItem agent={makeAgent(AgentState.Thinking)} />);
    await user.click(screen.getByRole('button', { name: /pause/i }));
    expect(mockSend).toHaveBeenCalledWith({ type: 'pause_agent', agentName: 'bilbo' });
    expect(screen.getByRole('button', { name: /play/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /stop/i })).not.toBeDisabled();
  });

  it('after pause, Chat is disabled', async () => {
    const user = userEvent.setup();
    render(<ParticipantItem agent={makeAgent(AgentState.Thinking)} />);
    await user.click(screen.getByRole('button', { name: /pause/i }));
    expect(screen.getByRole('button', { name: /chat/i })).toBeDisabled();
  });

  it('Play click sends resume_agent', async () => {
    const user = userEvent.setup();
    render(<ParticipantItem agent={makeAgent(AgentState.Thinking)} />);
    // First pause to enable Play
    await user.click(screen.getByRole('button', { name: /pause/i }));
    await user.click(screen.getByRole('button', { name: /play/i }));
    expect(mockSend).toHaveBeenCalledWith({ type: 'resume_agent', agentName: 'bilbo' });
  });

  it('Stop click sends kill_agent when active', async () => {
    const user = userEvent.setup();
    render(<ParticipantItem agent={makeAgent(AgentState.Thinking)} />);
    await user.click(screen.getByRole('button', { name: /stop/i }));
    expect(mockSend).toHaveBeenCalledWith({ type: 'kill_agent', agentName: 'bilbo' });
  });

  it('Chat click sends read_chat when idle', async () => {
    const user = userEvent.setup();
    render(<ParticipantItem agent={makeAgent(AgentState.Idle)} />);
    await user.click(screen.getByRole('button', { name: /chat/i }));
    expect(mockSend).toHaveBeenCalledWith({ type: 'read_chat', agentName: 'bilbo' });
  });

  it('Chat is enabled when agent is Done', () => {
    render(<ParticipantItem agent={makeAgent(AgentState.Done)} />);
    expect(screen.getByRole('button', { name: /chat/i })).not.toBeDisabled();
  });

  it('Chat is enabled when agent is Error', () => {
    render(<ParticipantItem agent={makeAgent(AgentState.Error)} />);
    expect(screen.getByRole('button', { name: /chat/i })).not.toBeDisabled();
  });
});
