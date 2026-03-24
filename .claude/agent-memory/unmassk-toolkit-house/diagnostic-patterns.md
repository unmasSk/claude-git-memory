---
name: diagnostic-patterns
description: Recurring root cause patterns found during investigations in omawamapas and related projects
type: reference
---

## Pattern: Schema-Code Divergence (Phantom Tables)

**Project:** omawamapas
**First seen:** 2026-03-15

Code references tables that do not exist in schema.sql or any migration file. Root cause: code was written against an aspirational/planned schema that was never migrated into the database. The schema.sql is a pg_dump of the ACTUAL database; the code was authored (likely by AI agents during audit rounds) assuming tables that would exist in a future state.

**Detection:** grep for FROM/JOIN/INTO + table name, then verify against schema.sql CREATE TABLE statements.

**Affected tables (as of 2026-03-15):**
- `usuarios` (code uses plural; DB has singular `usuario`)
- `layer_permissions` (no CREATE TABLE anywhere)
- `spatial_layers` (no CREATE TABLE anywhere)
- `supervisor_municipio` (no CREATE TABLE anywhere)
- `operador_municipio` (no CREATE TABLE anywhere)
- `inventario` (code uses short form; DB has `inventario_amianto`)
- `capa` (no CREATE TABLE anywhere)
- `eventos` (no CREATE TABLE anywhere)

**Key insight:** The initial Knex migration (`20250507162238_initial_schema_setup.ts`) is a no-op stub (empty up/down). All schema was created via raw SQL (supabase_migration.sql or direct pg_dump). Code modules were built by audit agents without verifying against actual DB state.

## Pattern: ws.publish vs server.publish in Elysia/Bun (Self-Delivery)

**Project:** agent-chatroom
**First seen:** 2026-03-18

`ws.publish(topic, data)` in Bun/uWebSockets sends to all topic subscribers EXCEPT the calling socket. `server.publish(topic, data)` sends to ALL subscribers including the sender. Elysia's `publishToSelf: true` in `.ws()` config does NOT work in v1.4.28 — the option is inherited from Bun types but not implemented by Elysia.

**Root cause:** `broadcastSync()` received `ws` (individual connection) as its `server` parameter, calling `ws.publish()` which by uWebSockets design excludes the sender. The sender never receives their own message back.

**Detection:** When "messages not received" in WS system, check whether publish originates from individual socket or server instance. Test with 2 connections — if other subscriber receives but sender does not, this is the pattern.

## Pattern: Windows CMD Flash from Child-of-Child Process Spawning

**Project:** agent-chatroom
**First seen:** 2026-03-18

`windowsHide: true` in Bun.spawn v1.3.11 is **inversely implemented** on Windows. Instead of suppressing console windows, it CREATES them. Tested empirically:

| Executable | windowsHide: true | No flags | conhost.exe? |
|---|---|---|---|
| node.exe | conhost CREATED | No conhost | BUG |
| claude.exe | conhost CREATED | No conhost | BUG |
| cmd.exe | No conhost | No conhost | No diff |

**Root cause:** When `windowsHide: true` is passed, Bun's libuv integration on Windows passes incorrect `CreateProcessW` flags (likely `DETACHED_PROCESS` instead of `CREATE_NO_WINDOW`), causing console subsystem executables to allocate a new console via `conhost.exe`. Without the flag, piped stdio naturally suppresses console allocation.

**Also found:** `process.kill(-pid, 'SIGTERM')` (negative PID for process group kill) does NOT work on Windows in Bun 1.3.11 (ESRCH error). The FIX 16 orphan cleanup pattern is broken on Windows.

**Secondary factor:** `claude.exe` internally spawns `cmd.exe /d /s /c "npx ..."` for MCP servers. Even if `windowsHide` worked correctly, these grandchild processes would not inherit the flag.

**Detection:** Use `Get-CimInstance Win32_Process | Where ParentProcessId -eq $PID` to check for `conhost.exe` children.

**Fix:** Remove `windowsHide: true` (it does the opposite of what's intended). Remove `detached: true` (process group kill is broken on Windows anyway). Replace orphan cleanup with `proc.kill()` direct call with timeout. The piped stdio (`stdout: 'pipe', stderr: 'pipe'`) already prevents console window creation without any additional flags.

## Pattern: Missing `position: relative` on Dropdown Anchor (CSS Clipping)

**Project:** agent-chatroom
**First seen:** 2026-03-21

Absolutely-positioned dropdown (`.mention-dropdown`) renders inside a container (`.chat-input`) that lacks `position: relative`. The dropdown's containing block falls through to a distant ancestor (`.chat`) that has `position: relative; overflow: hidden`. The dropdown positions itself relative to `.chat` and ends up outside its clipping bounds -- invisible to the user.

**Detection:** When a dropdown "should render but doesn't appear," check:
1. The dropdown's `position: absolute` CSS
2. Whether its immediate parent has `position: relative`
3. Whether any ancestor between parent and containing block has `overflow: hidden`

**Key insight:** The React state and DOM are correct (the element exists in the DOM tree). The issue is purely CSS positioning. DevTools element inspector will show the element exists but is positioned outside visible bounds. This pattern is especially common when refactoring from `<input>` to `<textarea>` or reorganizing component hierarchy -- the CSS containment context changes but the dropdown positioning CSS is not updated.

## Pattern: HMR Cascade Amplification of React-Managed Side Effects

**Project:** agent-chatroom
**First seen:** 2026-03-21

When a side effect (WebSocket, fetch, timer) is managed inside a React `useEffect`, Vite HMR cascades can create unbounded amplification loops. The trigger: backend dies -> Vite proxy loses upstream -> HMR update fires -> React remounts component tree -> `useEffect` restarts the side effect -> side effect fails (backend still down) -> triggers Zustand state updates -> React re-renders -> HMR detects changes -> loop repeats.

**Key factors:**
1. Side effect initiated in `useEffect` (coupled to React lifecycle)
2. Vite dev proxy forwarding to the backend (proxy errors trigger HMR)
3. Each attempt creates Zustand state transitions that trigger re-renders
4. Debounce/backoff guards bypassed during reconnect cycles
5. StrictMode cleanup delays (100ms) designed for double-mount, not rapid HMR

**Detection:** When an Electron host (Cursor, VS Code) shows extreme RAM/CPU after a backend process stops, check whether the frontend has React-lifecycle-managed connections to that backend. Look for `useEffect` + `connect()` patterns in root-level components.

**Fix pattern:** Decouple connection lifecycle from React. Run connect/reconnect as a module-level singleton. React hooks should be passive subscribers (read status), not active controllers (trigger connections). Add circuit breakers on repeated failures.

## Pattern: Concurrently Piped Output -> Electron Terminal OOM

**Project:** agent-chatroom
**First seen:** 2026-03-21

When `concurrently` runs multiple dev processes (backend, frontend, bridge) WITHOUT `--kill-others-on-fail`, killing one process leaves others alive. Surviving processes that have reconnect logic to the dead process produce sustained stderr/stdout floods. Concurrently pipes all child stdio (`['pipe', 'pipe', 'pipe']` in spawn.js). The output flows into Cursor/VS Code's Electron terminal (xterm.js), which retains ALL scrollback in V8 renderer memory without bounds. On machines with <= 16GB RAM this triggers OOM.

**Causal chain:**
1. Backend killed -> concurrently keeps bridge + frontend alive (no --kill-others)
2. Bridge: 20 reconnect attempts, each logging to console.error
3. Frontend: 10 reconnect attempts through Vite proxy (5s timeout per attempt)
4. Vite proxy: logs its own errors for each failed upstream connection
5. Health check loop (10s interval) continues producing proxy errors indefinitely
6. pino-pretty ANSI colorization inflates per-line memory footprint
7. xterm.js scrollback buffer retains everything in Electron renderer heap

**Detection:** When an Electron IDE (Cursor, VS Code) shows extreme RAM after killing a child process in a `concurrently` managed terminal, check: (a) does the concurrently script use --kill-others? (b) do surviving processes have reconnect loops to the dead process? (c) how many console.error/warn calls per reconnect cycle?

**Fix pattern:** Add `--kill-others-on-fail` to the concurrently dev script. Reduce reconnect attempt counts for dev environments. Cap or silence intermediate reconnect log output.

## Pattern: Status Overwrite After Async Subprocess Completion

**Project:** agent-chatroom
**First seen:** 2026-03-21
**Updated:** 2026-03-21 (runtime verification)

SIGSTOP DOES freeze the `claude` process (confirmed: `ps` shows state `T` on PID). However, SIGSTOP does NOT propagate to child processes (MCP servers). And the completion path unconditionally overwrites Paused status.

**Three compounding failures:**
1. **SIGSTOP only stops the parent** — `process.kill(pid, 'SIGSTOP')` targets only the `claude` process. Its children (MCP servers spawned via `npm exec`) remain in state `S` (running). To stop the entire process group: `process.kill(-pid, 'SIGSTOP')` (negative PID = process group signal). This works because `detached: true` gives `claude` its own process group.
2. **Timeout ignores pause** — `makeTimeoutHandle` runs on wall-clock time (5 min). If the agent is paused for 4 minutes, only 1 minute of actual work time remains before the timeout kills it. No mechanism pauses or extends the timeout during SIGSTOP.
3. **Completion path overwrites status** — `handleAgentResult`, `handleFailedResult`, `handleEmptyResult` in `agent-result.ts` and `agent-stream.ts` unconditionally set status to Done/Error without checking `isAgentPaused()`. When the subprocess eventually completes (after SIGCONT, or after timeout kill), status flips from Paused to Done.

**Detection:** When a control button "doesn't work" but the system message confirms the handler ran, check: (a) `ps -o state` on the process — is it actually `T`? (b) are child processes also stopped? (c) does the timeout fire while paused? (d) does the completion path check pause state?

**Key insight:** The SIGSTOP mechanism fundamentally works (confirmed by runtime test). The real bugs are: missing process-group signal, no timeout suspension during pause, and unconditional status overwrite on completion.

## Pattern: bun:test mock.module() Global Leak Across Test Files

**Project:** agent-chatroom
**First seen:** 2026-03-24

`mock.module()` in bun 1.3.11 affects the **global module registry**, not just the declaring test file. When file A mocks `../../src/services/agent-runner.js` with a stub, file B (which imports the real `agent-runner.js` and has its own mock.module for different modules) gets file A's stub instead of the real implementation.

**Root cause:** bun test runs all test files in the same thread with a shared module cache. `mock.module()` replaces entries in this shared cache. Once replaced, ALL subsequent imports of that module path resolve to the mock, regardless of which test file does the importing.

**Symptoms:**
- Mock capture arrays (`_publishCalls`, `_broadcasts`) stay empty
- DB queries return 0 rows despite functions that insert data
- Tests pass in isolation but fail in full suite
- One specific test file causes ALL other mock-dependent tests to fail

**Detection:**
1. Run failing test file in isolation -- if it passes, this is the pattern
2. Binary search: `bun test fileA.test.ts fileB.test.ts` to find the poisoning file
3. Check if the poisoning file mocks a module that OTHER test files import directly (not just transitively)
4. The poisoning file's mock.module replaces the real implementation; downstream files get the stub

**Key test:** `bun test $(ls tests/**/*.test.ts | grep -v <poisoning-file>)` -- if 0 failures, confirmed.

**Fix pattern:** The poisoning test file must NOT use `mock.module()` on modules that other test files import for real behavior. Options:
1. Mock at a higher level (mock the functions, not the module)
2. Use dependency injection so the test can pass stubs without `mock.module`
3. Restructure so the poisoning test uses `jest.fn()`/`mock()` on individual functions rather than replacing entire modules
