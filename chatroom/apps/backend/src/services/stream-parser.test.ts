/**
 * Unit tests for stream-parser.ts
 *
 * Covers parseStreamLine() exhaustively:
 *  - assistant events (text blocks, tool_use blocks, mixed, empty content)
 *  - result events (success, error_during_execution, missing fields)
 *  - discarded events (progress, hook_started, system, etc.)
 *  - malformed / empty input
 */
import { describe, it, expect } from 'bun:test';
import { parseStreamLine } from './stream-parser.js';
import type { TextEvent, ToolUseEvent, ResultEvent } from './stream-parser.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAssistantLine(contentBlocks: unknown[]): string {
  return JSON.stringify({
    type: 'assistant',
    message: { content: contentBlocks },
  });
}

function makeResultLine(fields: {
  subtype?: string;
  result?: string;
  session_id?: string;
  total_cost_usd?: number;
}): string {
  return JSON.stringify({ type: 'result', ...fields });
}

// ---------------------------------------------------------------------------
// assistant events — text blocks
// ---------------------------------------------------------------------------

describe('parseStreamLine — assistant text content', () => {
  it('extracts text from a single text block', () => {
    const line = makeAssistantLine([{ type: 'text', text: 'Hello from agent' }]);
    const events = parseStreamLine(line);
    expect(events.length).toBe(1);
    const ev = events[0] as TextEvent;
    expect(ev.type).toBe('text');
    expect(ev.text).toBe('Hello from agent');
  });

  it('extracts multiple text blocks as separate TextEvents', () => {
    const line = makeAssistantLine([
      { type: 'text', text: 'First part' },
      { type: 'text', text: 'Second part' },
    ]);
    const events = parseStreamLine(line);
    expect(events.length).toBe(2);
    expect((events[0] as TextEvent).text).toBe('First part');
    expect((events[1] as TextEvent).text).toBe('Second part');
  });

  it('handles assistant event with no content array — returns empty array', () => {
    const line = JSON.stringify({ type: 'assistant', message: {} });
    const events = parseStreamLine(line);
    expect(events).toEqual([]);
  });

  it('handles assistant event with null message — returns empty array', () => {
    const line = JSON.stringify({ type: 'assistant' });
    const events = parseStreamLine(line);
    expect(events).toEqual([]);
  });

  it('handles assistant event with empty content array — returns empty array', () => {
    const line = makeAssistantLine([]);
    const events = parseStreamLine(line);
    expect(events).toEqual([]);
  });

  it('discards content blocks that are not text or tool_use', () => {
    const line = makeAssistantLine([
      { type: 'image', source: { type: 'base64', data: 'abc' } },
      { type: 'text', text: 'visible text' },
    ]);
    const events = parseStreamLine(line);
    // only the text block survives
    expect(events.length).toBe(1);
    expect((events[0] as TextEvent).text).toBe('visible text');
  });
});

// ---------------------------------------------------------------------------
// assistant events — tool_use blocks
// ---------------------------------------------------------------------------

describe('parseStreamLine — assistant tool_use content', () => {
  it('extracts tool name and input from a tool_use block', () => {
    const line = makeAssistantLine([
      { type: 'tool_use', name: 'Read', input: { file_path: '/src/index.ts' } },
    ]);
    const events = parseStreamLine(line);
    expect(events.length).toBe(1);
    const ev = events[0] as ToolUseEvent;
    expect(ev.type).toBe('tool_use');
    expect(ev.name).toBe('Read');
    expect(ev.input).toEqual({ file_path: '/src/index.ts' });
  });

  it('extracts tool_use with null input (no input field on block)', () => {
    const line = makeAssistantLine([
      { type: 'tool_use', name: 'SomeTool' },
    ]);
    const events = parseStreamLine(line);
    expect(events.length).toBe(1);
    const ev = events[0] as ToolUseEvent;
    expect(ev.type).toBe('tool_use');
    expect(ev.name).toBe('SomeTool');
    expect(ev.input).toBeNull();
  });

  it('extracts multiple tool_use blocks from one line', () => {
    const line = makeAssistantLine([
      { type: 'tool_use', name: 'Read', input: { file_path: '/a.ts' } },
      { type: 'tool_use', name: 'Grep', input: { pattern: 'foo' } },
    ]);
    const events = parseStreamLine(line);
    expect(events.length).toBe(2);
    expect((events[0] as ToolUseEvent).name).toBe('Read');
    expect((events[1] as ToolUseEvent).name).toBe('Grep');
  });

  it('skips a tool_use block missing the name field', () => {
    const line = makeAssistantLine([
      { type: 'tool_use', input: { file_path: '/foo.ts' } }, // no name
    ]);
    const events = parseStreamLine(line);
    expect(events).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// assistant events — mixed text + tool_use
// ---------------------------------------------------------------------------

describe('parseStreamLine — mixed text and tool_use blocks', () => {
  it('extracts both text and tool_use from same message', () => {
    const line = makeAssistantLine([
      { type: 'text', text: 'Reading file now...' },
      { type: 'tool_use', name: 'Read', input: { file_path: '/foo.ts' } },
    ]);
    const events = parseStreamLine(line);
    expect(events.length).toBe(2);
    expect(events[0].type).toBe('text');
    expect(events[1].type).toBe('tool_use');
    expect((events[0] as TextEvent).text).toBe('Reading file now...');
    expect((events[1] as ToolUseEvent).name).toBe('Read');
  });

  it('preserves order of text and tool_use blocks', () => {
    const line = makeAssistantLine([
      { type: 'tool_use', name: 'Grep', input: { pattern: 'TODO' } },
      { type: 'text', text: 'After the grep' },
      { type: 'tool_use', name: 'Read', input: { file_path: '/x.ts' } },
    ]);
    const events = parseStreamLine(line);
    expect(events.length).toBe(3);
    expect(events[0].type).toBe('tool_use');
    expect(events[1].type).toBe('text');
    expect(events[2].type).toBe('tool_use');
    expect((events[0] as ToolUseEvent).name).toBe('Grep');
    expect((events[1] as TextEvent).text).toBe('After the grep');
    expect((events[2] as ToolUseEvent).name).toBe('Read');
  });
});

// ---------------------------------------------------------------------------
// result events
// ---------------------------------------------------------------------------

describe('parseStreamLine — result events', () => {
  it('parses a success result event', () => {
    const line = makeResultLine({
      subtype: 'success',
      result: 'Agent completed the task.',
      session_id: 'a1b2c3d4-0000-0000-0000-000000000000',
      total_cost_usd: 0.0042,
    });
    const events = parseStreamLine(line);
    expect(events.length).toBe(1);
    const ev = events[0] as ResultEvent;
    expect(ev.type).toBe('result');
    expect(ev.success).toBe(true);
    expect(ev.result).toBe('Agent completed the task.');
    expect(ev.sessionId).toBe('a1b2c3d4-0000-0000-0000-000000000000');
    expect(ev.costUsd).toBe(0.0042);
  });

  it('parses error_during_execution result as success=false', () => {
    const line = makeResultLine({
      subtype: 'error_during_execution',
      result: 'No conversation found with session abc',
      session_id: null as unknown as string,
    });
    const events = parseStreamLine(line);
    expect(events.length).toBe(1);
    const ev = events[0] as ResultEvent;
    expect(ev.type).toBe('result');
    expect(ev.success).toBe(false);
    expect(ev.result).toBe('No conversation found with session abc');
  });

  it('returns success=false when subtype is missing', () => {
    const line = makeResultLine({ result: 'some text' });
    const events = parseStreamLine(line);
    expect(events.length).toBe(1);
    const ev = events[0] as ResultEvent;
    expect(ev.success).toBe(false); // only 'success' subtype sets true
  });

  it('returns sessionId=null when session_id is missing', () => {
    const line = makeResultLine({ subtype: 'success', result: 'done' });
    const events = parseStreamLine(line);
    expect(events.length).toBe(1);
    const ev = events[0] as ResultEvent;
    expect(ev.sessionId).toBeNull();
  });

  it('returns sessionId=null when session_id is a non-string value', () => {
    const line = JSON.stringify({ type: 'result', subtype: 'success', result: 'done', session_id: 12345 });
    const events = parseStreamLine(line);
    expect(events.length).toBe(1);
    expect((events[0] as ResultEvent).sessionId).toBeNull();
  });

  it('returns costUsd=0 when total_cost_usd is missing', () => {
    const line = makeResultLine({ subtype: 'success', result: 'done' });
    const events = parseStreamLine(line);
    expect((events[0] as ResultEvent).costUsd).toBe(0);
  });

  it('returns costUsd=0 when total_cost_usd is a non-numeric string', () => {
    const line = JSON.stringify({ type: 'result', subtype: 'success', result: 'done', total_cost_usd: 'free' });
    const events = parseStreamLine(line);
    expect((events[0] as ResultEvent).costUsd).toBe(0);
  });

  it('returns empty string for result when result field is missing', () => {
    const line = makeResultLine({ subtype: 'success' });
    const events = parseStreamLine(line);
    expect((events[0] as ResultEvent).result).toBe('');
  });

  it('returns empty string for result when result field is a number', () => {
    const line = JSON.stringify({ type: 'result', subtype: 'success', result: 42 });
    const events = parseStreamLine(line);
    expect((events[0] as ResultEvent).result).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Discarded event types
// ---------------------------------------------------------------------------

describe('parseStreamLine — discarded events', () => {
  it('returns empty array for progress events', () => {
    const line = JSON.stringify({ type: 'progress', data: 'something' });
    expect(parseStreamLine(line)).toEqual([]);
  });

  it('returns empty array for hook_started events', () => {
    const line = JSON.stringify({ type: 'hook_started', hook: 'PostToolUse' });
    expect(parseStreamLine(line)).toEqual([]);
  });

  it('returns empty array for hook_response events', () => {
    const line = JSON.stringify({ type: 'hook_response', decision: 'allow' });
    expect(parseStreamLine(line)).toEqual([]);
  });

  it('returns empty array for system events', () => {
    const line = JSON.stringify({ type: 'system', data: {} });
    expect(parseStreamLine(line)).toEqual([]);
  });

  it('returns empty array for completely unknown event type', () => {
    const line = JSON.stringify({ type: 'foobar', payload: 42 });
    expect(parseStreamLine(line)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Malformed and edge input
// ---------------------------------------------------------------------------

describe('parseStreamLine — malformed / edge input', () => {
  it('returns empty array for malformed JSON — no crash', () => {
    expect(parseStreamLine('{ bad json ][')).toEqual([]);
  });

  it('returns empty array for partially valid JSON (truncated)', () => {
    expect(parseStreamLine('{"type": "assistant"')).toEqual([]);
  });

  it('returns empty array for an empty line', () => {
    expect(parseStreamLine('')).toEqual([]);
  });

  it('returns empty array for a whitespace-only line', () => {
    expect(parseStreamLine('   \t  ')).toEqual([]);
  });

  it('returns empty array for a JSON null value', () => {
    expect(parseStreamLine('null')).toEqual([]);
  });

  it('returns empty array for a JSON number', () => {
    expect(parseStreamLine('42')).toEqual([]);
  });

  it('returns empty array for a JSON string', () => {
    expect(parseStreamLine('"hello"')).toEqual([]);
  });

  it('returns empty array for a JSON array (not an object)', () => {
    expect(parseStreamLine('[{"type":"assistant"}]')).toEqual([]);
  });

  it('trims leading/trailing whitespace before parsing', () => {
    const line = '  ' + makeResultLine({ subtype: 'success', result: 'trimmed', total_cost_usd: 0.001 }) + '  ';
    const events = parseStreamLine(line);
    expect(events.length).toBe(1);
    expect((events[0] as ResultEvent).result).toBe('trimmed');
  });
});
