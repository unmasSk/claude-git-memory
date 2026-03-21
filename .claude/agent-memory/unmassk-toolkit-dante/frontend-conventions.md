---
name: frontend-test-conventions
description: Test conventions for chatroom/apps/frontend — Vitest, @testing-library/react, jsdom, Zustand stores
type: project
---

## Framework

- Runtime: **Bun** (bun run test calls vitest)
- Test framework: **Vitest** (NOT bun:test — frontend uses Vitest for jsdom support)
- Testing library: `@testing-library/react` + `@testing-library/jest-dom` + `@testing-library/user-event`
- Environment: `jsdom` (configured in vitest.config.ts)
- Run: `bun run test` from `chatroom/apps/frontend/`
- Script in package.json: `"test": "vitest run"`

## Configuration (vitest.config.ts)

- `environment: 'jsdom'`
- `globals: true` (describe/it/expect available without import)
- `setupFiles: ['./src/test/setup.ts']` — imports `@testing-library/jest-dom`
- Alias: `@agent-chatroom/shared` → `../../packages/shared/src/index.ts`

## File Structure

Tests live in `src/test/`, mirroring src/:

```
src/test/
  setup.ts                                    # global setup — imports jest-dom
  stores/
    chat-store.test.ts
    agent-store.test.ts
    ws-store.test.ts
  hooks/
    useMentionAutocomplete.test.ts
  components/
    MessageInput.test.tsx
    ParticipantItem.test.tsx
```

## CSS Import Mocking

Components import CSS files with `import '../styles/components/Foo.css'`. In jsdom, these throw.
Mock them at the top of the test file:

```ts
vi.mock('../../styles/components/ChatInput.css', () => ({}));
vi.mock('../../styles/components/AgentCard.css', () => ({}));
```

Only mock CSS files that the component under test actually imports (check with grep).

## Zustand Store Isolation

- Zustand stores persist module-level state between tests (including module-level Sets like `seenIds`).
- chat-store: call `useChatStore.getState().clearMessages()` in `beforeEach` — this also clears the module-level `seenIds` Set.
- agent-store: call `useAgentStore.setState({ agents: new Map(), room: null, connectedUsers: [] })` in `beforeEach`.
- ws-store: call `useWsStore.getState().disconnect()` in `beforeEach` — this resets module-level vars (socket, reconnectTimer, connectingRoomId).

## WebSocket Mocking (Vitest / jsdom)

`vi.fn().mockImplementation(...)` does NOT produce a constructable class — `new WebSocket()` throws "is not a constructor".

Correct pattern: use a real class stub and `vi.stubGlobal`:

```ts
class FakeWebSocket {
  readyState = 0;
  onopen: ... = null; onmessage: ... = null; onclose: ... = null; onerror: ... = null;
  static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;

  constructor(url: string) { lastWs = this; }
  send(data: string) { ... }
  close() { this.readyState = 3; }
  triggerOpen() { this.readyState = 1; this.onopen?.(new Event('open')); }
  triggerClose() { this.readyState = 3; this.onclose?.(new CloseEvent('close')); }
}

vi.stubGlobal('WebSocket', FakeWebSocket);
```

Clean up with `vi.unstubAllGlobals()` in `afterEach`.

## Fetch Mocking

```ts
vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ token: 'test-token' }),
}));
```

Use `vi.unstubAllGlobals()` in `afterEach` to clean up.

## Flushing Promises (async store actions)

The ws-store uses an async IIFE for auth fetch. After calling `connect()`, flush with:

```ts
async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
```

Three rounds needed because the async IIFE has multiple `await` points.

## Fake Timers (Vitest)

```ts
vi.useFakeTimers();          // in beforeEach
vi.useRealTimers();          // in afterEach
await vi.runAllTimersAsync(); // to advance reconnect timers
```

Note: fake timers interact with Promise resolution. Flush promises BEFORE running timers.

## Assertion Style

- `expect(el).toBeInTheDocument()` — from jest-dom
- `expect(el).toBeDisabled()` / `not.toBeDisabled()`
- `expect(el).toHaveClass('foo')`
- `expect(el).toHaveTextContent('...')`
- `screen.getByRole('button', { name: /aria-label regex/i })`
- `screen.getByRole('textbox')` for textarea

## userEvent

Use `userEvent.setup()` (NOT `userEvent.click(el)` directly) for accurate event simulation:

```ts
const user = userEvent.setup();
await user.click(btn);
```

## Test Count (session 7 — frontend Vitest setup)

- 78 tests, 0 failures
- Covers: chat-store (11), agent-store (12), ws-store (8), useMentionAutocomplete (16), MessageInput (10), ParticipantItem (12)

## Hard Rules (frontend)

- NEVER use `vi.fn().mockImplementation()` for classes that need `new` — use a real class stub
- NEVER skip CSS mock for components that import CSS — jsdom will throw
- NEVER test WS send logic in component tests — belongs in ws-store tests
- Test behavior and contracts, not Zustand internals
