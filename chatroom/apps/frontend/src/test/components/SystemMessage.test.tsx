/**
 * SystemMessage — formatContent duplicate-name fix.
 *
 * The te-agent span already shows the agent name, so formatContent must strip
 * the "Agent X" prefix from the description text to avoid showing the name twice.
 *
 * Display structure: <te-agent>house</te-agent> › <te-badge>queued</te-badge> <te-desc>{formatContent(...)}</te-desc>
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SystemMessage } from '../../components/SystemMessage';
import type { Message } from '@agent-chatroom/shared';

function makeMessage(content: string): Message {
  return {
    id: 'msg-1',
    roomId: 'default',
    role: 'system',
    content,
    createdAt: new Date().toISOString(),
    agentName: null,
    sessionId: null,
    thinkingContent: null,
    attachments: [],
  } as unknown as Message;
}

describe('SystemMessage — formatContent strips duplicate agent name', () => {
  it('strips "Agent House " prefix from queued message', () => {
    render(<SystemMessage message={makeMessage('Agent House is busy. Message queued (3 pending).')} />);
    const desc = document.querySelector('.te-desc');
    expect(desc?.textContent).toBe('is busy. Message queued (3 pending).');
  });

  it('strips "Agent house " prefix (lowercase)', () => {
    render(<SystemMessage message={makeMessage('Agent house is busy. Message queued (1 pending).')} />);
    const desc = document.querySelector('.te-desc');
    expect(desc?.textContent).toBe('is busy. Message queued (1 pending).');
  });

  it('strips "AGENT BILBO " prefix (uppercase)', () => {
    render(<SystemMessage message={makeMessage('AGENT BILBO is running.')} />);
    const desc = document.querySelector('.te-desc');
    expect(desc?.textContent).toBe('is running.');
  });

  it('does not duplicate the agent name in te-agent and te-desc', () => {
    render(<SystemMessage message={makeMessage('Agent house is busy. Message queued (3 pending).')} />);
    const agent = document.querySelector('.te-agent');
    const desc = document.querySelector('.te-desc');
    expect(agent?.textContent).toBe('house');
    // desc must not start with the agent name
    expect(desc?.textContent?.toLowerCase()).not.toMatch(/^house/);
  });

  it('passes through content with no "Agent X" prefix unchanged', () => {
    render(<SystemMessage message={makeMessage('Connection established.')} />);
    const desc = document.querySelector('.te-desc');
    expect(desc?.textContent).toBe('Connection established.');
  });

  it('returns "directiva" for DIRECTIVE FROM USER messages', () => {
    render(<SystemMessage message={makeMessage('[DIRECTIVE FROM USER] do something')} />);
    const desc = document.querySelector('.te-desc');
    expect(desc?.textContent).toBe('directiva');
  });

  it('strips a leading period+space after agent removal if present', () => {
    // Edge case: "Agent Foo. Some message" → strip ". " leftover
    render(<SystemMessage message={makeMessage('Agent Foo. Some message.')} />);
    const desc = document.querySelector('.te-desc');
    expect(desc?.textContent).toBe('Some message.');
  });

  it('handles multi-word-looking agent name boundary correctly (only strips first word)', () => {
    // "Agent House And Something" — only "Agent House " stripped, not "And Something"
    render(<SystemMessage message={makeMessage('Agent House And Something.')} />);
    const desc = document.querySelector('.te-desc');
    expect(desc?.textContent).toBe('And Something.');
  });
});
