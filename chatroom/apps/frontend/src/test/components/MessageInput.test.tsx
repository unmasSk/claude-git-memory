/**
 * MessageInput — smoke render + mode toggle tests.
 *
 * We don't test WS send logic here (that belongs to ws-store tests).
 * Focus: the component mounts without errors, the mode toggle button works,
 * and the textarea is disabled when status is not 'connected'.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageInput } from '../../components/MessageInput';
import { useWsStore } from '../../stores/ws-store';
import { useAgentStore } from '../../stores/agent-store';
import type { Room } from '@agent-chatroom/shared';

// Suppress CSS import errors in jsdom
vi.mock('../../styles/components/ChatInput.css', () => ({}));
// MentionDropdown imports its own CSS
vi.mock('../../styles/components/MentionDropdown.css', () => ({}));

const testRoom: Room = {
  id: 'room-1',
  name: 'Test Room',
  topic: 'testing',
  createdAt: new Date().toISOString(),
};

function setConnected() {
  useWsStore.setState({ status: 'connected', roomId: 'room-1' });
}

function setDisconnected() {
  useWsStore.setState({ status: 'disconnected', roomId: null });
}

describe('MessageInput — smoke render', () => {
  beforeEach(() => {
    setDisconnected();
    useAgentStore.setState({ room: testRoom, agents: new Map(), connectedUsers: [] });
  });

  it('renders the textarea', () => {
    render(<MessageInput />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders the send button', () => {
    render(<MessageInput />);
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
  });

  it('renders the mode toggle button', () => {
    render(<MessageInput />);
    expect(screen.getByRole('button', { name: /toggle input mode/i })).toBeInTheDocument();
  });

  it('textarea is disabled when status is disconnected', () => {
    setDisconnected();
    render(<MessageInput />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('textarea is enabled when status is connected', () => {
    setConnected();
    render(<MessageInput />);
    expect(screen.getByRole('textbox')).not.toBeDisabled();
  });

  it('send button is disabled when textarea is empty', () => {
    setConnected();
    render(<MessageInput />);
    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled();
  });
});

describe('MessageInput — mode toggle', () => {
  beforeEach(() => {
    setConnected();
    useAgentStore.setState({ room: testRoom, agents: new Map(), connectedUsers: [] });
  });

  it('starts in Execute mode', () => {
    render(<MessageInput />);
    expect(screen.getByRole('button', { name: /toggle input mode/i })).toHaveTextContent('Execute');
  });

  it('toggles to Brainstorm mode on first click', async () => {
    const user = userEvent.setup();
    render(<MessageInput />);
    await user.click(screen.getByRole('button', { name: /toggle input mode/i }));
    expect(screen.getByRole('button', { name: /toggle input mode/i })).toHaveTextContent('Brainstorm');
  });

  it('toggles back to Execute mode on second click', async () => {
    const user = userEvent.setup();
    render(<MessageInput />);
    const btn = screen.getByRole('button', { name: /toggle input mode/i });
    await user.click(btn);
    await user.click(btn);
    expect(btn).toHaveTextContent('Execute');
  });

  it('mode-execute CSS class present in Execute mode', () => {
    render(<MessageInput />);
    const btn = screen.getByRole('button', { name: /toggle input mode/i });
    expect(btn).toHaveClass('mode-execute');
  });

  it('mode-brainstorm CSS class present in Brainstorm mode', async () => {
    const user = userEvent.setup();
    render(<MessageInput />);
    const btn = screen.getByRole('button', { name: /toggle input mode/i });
    await user.click(btn);
    expect(btn).toHaveClass('mode-brainstorm');
  });
});
