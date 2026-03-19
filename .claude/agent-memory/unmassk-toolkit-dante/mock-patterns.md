---
name: mock-patterns
description: Working mock patterns for Bun test suites (bun:test, ESM, SQLite, WebSocket)
type: project
---

## Database Mock (Bun ESM-safe, chatroom/backend)

Pattern: mock `connection.js` BEFORE imports. Use a persistent in-memory DB for the entire file.

```ts
import { mock } from 'bun:test';
import { Database } from 'bun:sqlite';

const _testDb = new Database(':memory:');
_testDb.exec(`CREATE TABLE IF NOT EXISTS rooms (...); INSERT OR IGNORE INTO rooms ...`);

// MUST be before any import that transitively loads queries.ts
mock.module('./connection.js', () => ({
  getDb: () => _testDb,
}));

// Then import the real query functions
import { insertMessage, getRecentMessages } from './queries.js';
```

Rotate DB per test: use `let currentDb: Database` and replace it in `beforeEach(() => { currentDb = makeDb(); })`. The closure in the mock factory references `currentDb` lazily.

## App Singleton Mock (message-bus.ts broadcast)

`broadcast()` dynamically imports `../index.js` to get the Elysia app. Mock the deep dependency:

```ts
mock.module('../index.js', () => ({
  app: {
    server: {
      publish(topic: string, data: string) { /* capture or no-op */ },
    },
  },
}));
```

DO NOT mock `./message-bus.js` if another test file imports the real `broadcast` function — that will contaminate it.

## Node:fs Mock (agent-registry.ts file-reading path)

```ts
mock.module('node:fs', () => {
  const realFs = require('node:fs');
  return {
    ...realFs,
    existsSync(p: string) { return p === FAKE_DIR ? true : realFs.existsSync(p); },
    readdirSync(p: string) { return p === FAKE_DIR ? fakeFileList : realFs.readdirSync(p); },
    readFileSync(p: string, enc?: string) {
      if (p.startsWith(FAKE_DIR)) return fakeFiles[basename(p)];
      return realFs.readFileSync(p, enc);
    },
  };
});
```

## Config Mock (override env-evaluated constants)

For constants evaluated at import time (like AGENT_DIR), mock the config module or set env before import:

```ts
// Option A: env var before import (works if module reads process.env lazily)
process.env.DB_PATH = '/tmp/test.db';
const { getDb } = await import('./connection.js');

// Option B: mock.module
mock.module('../config.js', () => ({
  ...require('../config.js'),
  AGENT_DIR: '/fake/agents',
}));
```

## Partial Mock of agent-invoker.js (facade module)

When a test file must mock `agent-invoker.js` (because the module under test imports from it),
but other test files rely on the real sanitizePromptContent / pause / resume state:
- Use `require()` inside the mock factory to get real implementations from the split modules.
- Only stub `invokeAgents` / `invokeAgent` (subprocess-spawning paths).

```ts
mock.module('../../src/services/agent-invoker.js', () => {
  const { sanitizePromptContent } = require('../../src/services/agent-prompt.js');
  const sched = require('../../src/services/agent-scheduler.js');
  return {
    invokeAgents: () => {},          // stub — no real subprocess
    invokeAgent: () => {},           // stub — no real subprocess
    pauseInvocations: sched.pauseInvocations,   // real state
    resumeInvocations: sched.resumeInvocations, // real state
    isPaused: sched.isPaused,                   // real state
    clearQueue: sched.clearQueue,               // real state
    sanitizePromptContent,                      // real sanitizer
    scheduleInvocation: sched.scheduleInvocation,
    drainActiveInvocations: sched.drainActiveInvocations,
    drainQueue: sched.drainQueue,
    inFlight: sched.inFlight,
    activeInvocations: sched.activeInvocations,
  };
});
```

NEVER use a simple stub `{ sanitizePromptContent: (s) => s, isPaused: () => false, ... }`
— that replaces the real sanitizer and makes sanitizePromptContent tests fail in the full suite.

## Cross-File Mock Contamination Rule

Bun `mock.module()` persists across test files in the same run. Two rules:
1. If file A mocks `./foo.js`, file B's import of `./foo.js` gets the mock.
2. To avoid contamination: mock the DEEPEST dependency (index.js, not message-bus.js).

## WebSocket Testing (Elysia + bun:test)

```ts
// Spin up real server on port 0
const app = new Elysia().ws('/ws/:roomId', { ... });
await app.listen(0);
const url = `ws://localhost:${app.server!.port}/ws/default`;

// Wait for room_state before doing anything
function openWsReady(url: string, timeoutMs = 2000): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const t = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'room_state') { clearTimeout(t); resolve(ws); }
    };
    ws.onerror = (err) => { clearTimeout(t); reject(err); };
  });
}

// Rate limit key: use ws.id (Bun built-in), NOT upgrade() return data
// upgrade() return value ({ data: { connId } }) does NOT merge into ws.data
```

## Bun spawn subprocess testing

`Bun.spawn` in agent-invoker.ts spawns real `claude -p` processes. These lines (267-479) are NOT unit-testable. Accept the coverage gap — mark in report as "requires real claude binary".

## Rate Limit Isolation for Route Tests

When testing rate-limited routes (e.g. /invite), do NOT import the real `apiRoutes` — it shares module-level `apiBuckets` state with api.test.ts. Instead, spin up an inline Elysia handler with a local `checkRateLimit` function and a local `Map`. Add a `exhaustBucket(key)` helper that sets `tokens: 0` directly, so 429 tests don't need to fire 20+ real requests.

## Isolated Rate Limit Test Pattern

```ts
const _buckets = new Map<string, { tokens: number; lastRefill: number }>();
function checkRateLimit(key: string): boolean { /* mirror prod logic */ }
function exhaustBucket(key: string): void {
  _buckets.set(key, { tokens: 0, lastRefill: Date.now() });
}
```

## Windows-safe fs Mock (agent-registry-fs.test.ts)

When mocking `node:fs` and checking paths against a fake dir, normalize separators:

```ts
existsSync(p: string): boolean {
  if (p.replace(/\\/g, '/') === FAKE_AGENT_DIR.replace(/\\/g, '/')) return true;
  return realFs.existsSync(p);
},
readFileSync(p: string, enc?: string): string | Buffer {
  const normalP = p.replace(/\\/g, '/');
  const normalDir = FAKE_AGENT_DIR.replace(/\\/g, '/');
  const filename = normalP.replace(normalDir + '/', '');
  if (normalP.startsWith(normalDir) && fakeFiles[filename] !== undefined) {
    return fakeFiles[filename];
  }
  return realFs.readFileSync(p, enc);
},
```

## Fake-Agent Pattern for Fire-and-Forget Tests

When testing `invokeAgents` / `invokeAgent` public API shape, use a name that does NOT
exist in any real agent registry (e.g. `'golden-nonexistent-agent'`). This causes
`doInvoke` to exit immediately via the "Unknown agent" guard without spawning a real
`claude` subprocess. Using a real agent name (like `'bilbo'`) triggers a real subprocess
and can cause `drainActiveInvocations` tests to time out (5s Bun default).

Downstream tests that call `drainActiveInvocations` after invokeAgents: add a
`await tick(80)` before drain to flush any async cleanup from fake-agent early exits.

## Cross-File DB Contamination — historyLimit pattern

Tests that insert rows into `_invokerDb` and assert their presence via `buildPrompt` FAIL in the full test suite run because Bun's `mock.module()` persists: another file's `mock.module('../db/connection.js')` overwrites the closure, so `getDb()` returns a different (empty) DB. Safe workaround: assert only structural envelope (markers, trigger content) — never row content — from tests that don't control the DB mock lifecycle end-to-end.
