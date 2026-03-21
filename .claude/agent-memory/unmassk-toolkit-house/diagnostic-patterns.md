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
