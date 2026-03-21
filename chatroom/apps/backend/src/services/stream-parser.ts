/**
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

/** An assistant text content block extracted from an `assistant` stream event */
export interface TextEvent {
  type: 'text';
  text: string;
}

/** A tool call block extracted from an `assistant` stream event */
export interface ToolUseEvent {
  type: 'tool_use';
  name: string;
  input: unknown;
}

interface PermissionDenial {
  toolName: string;
  input?: unknown;
}

/** The final result event emitted when the claude subprocess completes */
export interface ResultEvent {
  type: 'result';
  result: string;
  sessionId: string | null;
  costUsd: number;
  success: boolean;
  durationMs: number;
  numTurns: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  contextWindow: number;
  permissionDenials: PermissionDenial[];
}

type StreamEvent = TextEvent | ToolUseEvent | ResultEvent;

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
  duration_ms?: number;
  num_turns?: number;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
  };
  permission_denials?: Array<{ tool_name?: string; input?: unknown }>;
  model_usage?: Record<string, { contextWindow?: number }>;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * Parse a single NDJSON line from the claude stream-json output.
 *
 * Returns an array because one `assistant` line may contain multiple
 * content blocks (e.g. mixed text + tool_use). Returns an empty array for
 * noise events (progress, hook_started, etc.) — callers should discard them.
 *
 * @param line - A single raw NDJSON line from the subprocess stdout
 * @returns Zero or more parsed stream events
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

/**
 * Infer context window size from model name when the CLI reports 0.
 *
 * Keys in modelUsage are the full model IDs (e.g., "claude-sonnet-4-6").
 *
 * @param modelUsage - modelUsage map from the raw result event
 * @returns Inferred context window token count, or 0 if unknown
 */
function inferContextWindow(modelUsage: Record<string, { contextWindow?: number }> | undefined): number {
  if (!modelUsage) return 0;
  for (const modelId of Object.keys(modelUsage)) {
    const lower = modelId.toLowerCase();
    if (lower.includes('opus')) return 1_000_000;
    if (lower.includes('sonnet')) return 200_000;
    if (lower.includes('haiku')) return 200_000;
  }
  return 0;
}

function parseResultEvent(event: ResultEventRaw): ResultEvent | null {
  // FIX 2: Check subtype for success vs error
  const success = event.subtype === 'success';
  const result = typeof event.result === 'string' ? event.result : '';
  const sessionId = typeof event.session_id === 'string' ? event.session_id : null;
  const costUsd = typeof event.total_cost_usd === 'number' ? event.total_cost_usd : 0;
  const durationMs = typeof event.duration_ms === 'number' ? event.duration_ms : 0;
  const numTurns = typeof event.num_turns === 'number' ? event.num_turns : 0;
  const inputTokens = typeof event.usage?.input_tokens === 'number' ? event.usage.input_tokens : 0;
  const outputTokens = typeof event.usage?.output_tokens === 'number' ? event.usage.output_tokens : 0;
  const cacheReadTokens =
    typeof event.usage?.cache_read_input_tokens === 'number' ? event.usage.cache_read_input_tokens : 0;
  const permissionDenials: PermissionDenial[] = Array.isArray(event.permission_denials)
    ? event.permission_denials.map((d) => ({ toolName: d.tool_name ?? 'unknown', input: d.input }))
    : [];
  // contextWindow lives under model_usage[<modelId>].contextWindow — pick the first entry
  const modelUsageValues = event.model_usage ? Object.values(event.model_usage) : [];
  const rawContextWindow =
    modelUsageValues.length > 0 && typeof modelUsageValues[0]?.contextWindow === 'number'
      ? modelUsageValues[0].contextWindow
      : 0;
  // Fallback: when the CLI reports 0, infer from the model name in the model_usage key.
  // This covers cases where the CLI omits contextWindow for known model families.
  const contextWindow = rawContextWindow > 0 ? rawContextWindow : inferContextWindow(event.model_usage);

  return {
    type: 'result',
    result,
    sessionId,
    success,
    costUsd,
    durationMs,
    numTurns,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    contextWindow,
    permissionDenials,
  };
}
