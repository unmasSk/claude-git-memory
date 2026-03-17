/**
 * stream-parser.ts
 *
 * Parses NDJSON lines from `claude -p --output-format stream-json --verbose`.
 *
 * The --verbose stream is noisy: it contains `progress`, `hook_started`,
 * `hook_response`, and `system` events alongside real data. This module
 * whitelists only the events we care about and silently discards the rest.
 *
 * FIX 1: Whitelist `assistant` and `result` event types only.
 * FIX 1: For `assistant`, drill into message.content[] for tool_use blocks.
 * FIX 1: For `result`, extract result text, session_id, cost, and success flag.
 */

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export interface TextEvent {
  type: 'text';
  text: string;
}

export interface ToolUseEvent {
  type: 'tool_use';
  name: string;
  input: unknown;
}

export interface ResultEvent {
  type: 'result';
  result: string;
  sessionId: string | null;
  costUsd: number;
  success: boolean;
}

export type StreamEvent = TextEvent | ToolUseEvent | ResultEvent;

// ---------------------------------------------------------------------------
// Internal shapes (stream-json wire format)
// ---------------------------------------------------------------------------

interface ContentBlock {
  type: string;
  text?: string;
  name?: string;
  input?: unknown;
}

interface AssistantEvent {
  type: 'assistant';
  message?: {
    content?: ContentBlock[];
  };
}

interface ResultEventRaw {
  type: 'result';
  subtype?: string;
  result?: string;
  session_id?: string;
  total_cost_usd?: number;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * Parse a single NDJSON line from the claude stream-json output.
 *
 * Returns one of:
 *   - TextEvent    — assistant text content
 *   - ToolUseEvent — a tool call block extracted from an assistant event
 *   - ResultEvent  — the final result event
 *   - null         — unknown/noise event (progress, hook_started, etc.) — discard silently
 *
 * A single line may produce multiple tool_use events (one per content block).
 * To keep the return type simple this function returns StreamEvent[] not StreamEvent|null.
 */
export function parseStreamLine(line: string): StreamEvent[] {
  const trimmed = line.trim();
  if (!trimmed) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    // Malformed JSON — skip silently (FIX 1: no warnings for noise)
    return [];
  }

  if (typeof parsed !== 'object' || parsed === null) return [];

  const event = parsed as Record<string, unknown>;
  const eventType = event['type'];

  // FIX 1: Whitelist — only process assistant and result events
  if (eventType === 'assistant') {
    return parseAssistantEvent(event as unknown as AssistantEvent);
  }

  if (eventType === 'result') {
    const resultEvent = parseResultEvent(event as unknown as ResultEventRaw);
    return resultEvent ? [resultEvent] : [];
  }

  // Silently discard: progress, hook_started, hook_response, system, etc.
  return [];
}

function parseAssistantEvent(event: AssistantEvent): StreamEvent[] {
  const content = event.message?.content;
  if (!Array.isArray(content)) return [];

  const events: StreamEvent[] = [];

  for (const block of content) {
    if (block.type === 'text' && typeof block.text === 'string') {
      events.push({ type: 'text', text: block.text });
    } else if (block.type === 'tool_use' && typeof block.name === 'string') {
      events.push({
        type: 'tool_use',
        name: block.name,
        input: block.input ?? null,
      });
    }
    // Other block types (image, document, etc.) — discard silently
  }

  return events;
}

function parseResultEvent(event: ResultEventRaw): ResultEvent | null {
  // FIX 2: Check subtype for success vs error
  const success = event.subtype === 'success';
  const result = typeof event.result === 'string' ? event.result : '';
  const sessionId = typeof event.session_id === 'string' ? event.session_id : null;
  const costUsd = typeof event.total_cost_usd === 'number' ? event.total_cost_usd : 0;

  return { type: 'result', result, sessionId, success, costUsd };
}
