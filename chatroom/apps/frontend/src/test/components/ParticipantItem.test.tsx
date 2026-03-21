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
import type { AgentStatus } from '@agent-chatroom/shared';

// Suppress CSS import errors in jsdom
vi.mock('../../styles/components/AgentCard.css', () => ({}));

function makeAgent(status: AgentState, name = 'bilbo'): AgentStatus {
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

  it('uses active-card when status is Done', () => {
    const { container } = render(<ParticipantItem agent={makeAgent(AgentState.Done)} />);
    const card = container.querySelector('.card');
    expect(card).toHaveClass('active-card');
  });

  it('uses active-card when status is Error', () => {
    const { container } = render(<ParticipantItem agent={makeAgent(AgentState.Error)} />);
    const card = container.querySelector('.card');
    expect(card).toHaveClass('active-card');
  });

  it('wraps card in agent-name CSS class on the outer div', () => {
    const { container } = render(<ParticipantItem agent={makeAgent(AgentState.Idle, 'dante')} />);
    const wrap = container.querySelector('.card-wrap');
    expect(wrap).toHaveClass('agent-dante');
  });
});

describe('ParticipantItem — pause/resume toggle', () => {
  beforeEach(() => {
    // Provide a mock send function so WS calls don't throw
    useWsStore.setState({
      status: 'connected',
      roomId: 'default',
      send: vi.fn(),
    } as any);
  });

  it('Pause button label switches to Resume after click', async () => {
    const user = userEvent.setup();
    render(<ParticipantItem agent={makeAgent(AgentState.Idle)} />);
    const pauseBtn = screen.getByRole('button', { name: /pause/i });
    await user.click(pauseBtn);
    expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();
  });

  it('Resume button label switches back to Pause after second click', async () => {
    const user = userEvent.setup();
    render(<ParticipantItem agent={makeAgent(AgentState.Idle)} />);
    const btn = screen.getByRole('button', { name: /pause/i });
    await user.click(btn); // → Resume
    await user.click(screen.getByRole('button', { name: /resume/i })); // → Pause
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
  });
});
