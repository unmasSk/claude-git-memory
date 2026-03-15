# Sentry Node.js / Bun / Deno SDK

Opinionated wizard that scans your project and guides you through complete Sentry setup for server-side JavaScript and TypeScript runtimes: Node.js, Bun, and Deno.

## Invoke This Skill When

- User asks to "add Sentry to Node.js", "Bun", or "Deno"
- User wants to install or configure `@sentry/node`, `@sentry/bun`, or `@sentry/deno`
- User wants error monitoring, tracing, logging, profiling, crons, metrics, or AI monitoring for a backend JS/TS app
- User asks about `instrument.js`, `--import ./instrument.mjs`, `bun --preload`, or `npm:@sentry/deno`
- User wants to monitor Express, Fastify, Koa, Hapi, Connect, Bun.serve(), or Deno.serve()

> **NestJS?** Use `sentry-nestjs-sdk` instead — it uses `@sentry/nestjs` with NestJS-native decorators and filters.
> **Next.js?** Use `sentry-nextjs-sdk` instead — it handles the three-runtime architecture (browser, server, edge).

> **Note:** SDK versions below reflect current Sentry docs at time of writing (`@sentry/node` ≥10.42.0).
> Always verify against [docs.sentry.io/platforms/javascript/guides/node/](https://docs.sentry.io/platforms/javascript/guides/node/) before implementing.

---

## Phase 1: Detect

```bash
# Detect runtime
bun --version 2>/dev/null && echo "Bun detected"
deno --version 2>/dev/null && echo "Deno detected"
node --version 2>/dev/null && echo "Node.js detected"

# Detect existing Sentry packages
cat package.json 2>/dev/null | grep -E '"@sentry/'
cat deno.json deno.jsonc 2>/dev/null | grep -i sentry

# Detect Node.js framework
cat package.json 2>/dev/null | grep -E '"express"|"fastify"|"@hapi/hapi"|"koa"|"@nestjs/core"|"connect"'

# Detect Bun-specific frameworks
cat package.json 2>/dev/null | grep -E '"elysia"|"hono"'

# Detect Deno frameworks (deno.json imports)
cat deno.json deno.jsonc 2>/dev/null | grep -E '"oak"|"hono"|"fresh"'

# Detect module system (Node.js)
cat package.json 2>/dev/null | grep '"type"'
ls *.mjs *.cjs 2>/dev/null | head -5

# Detect existing instrument file
ls instrument.js instrument.mjs instrument.ts instrument.cjs 2>/dev/null

# Detect logging libraries
cat package.json 2>/dev/null | grep -E '"winston"|"pino"|"bunyan"'

# Detect cron / scheduling
cat package.json 2>/dev/null | grep -E '"node-cron"|"cron"|"agenda"|"bull"|"bullmq"'

# Detect AI / LLM usage
cat package.json 2>/dev/null | grep -E '"openai"|"@anthropic-ai"|"@langchain"|"@vercel/ai"|"@google/generative-ai"'

# Check for companion frontend
ls frontend/ web/ client/ ui/ 2>/dev/null
cat package.json 2>/dev/null | grep -E '"react"|"vue"|"svelte"|"next"'
```

**What to determine:**

| Question | Impact |
|----------|--------|
| Which runtime? (Node.js / Bun / Deno) | Determines package, init pattern, and preload flag |
| Node.js: ESM or CJS? | ESM requires `--import ./instrument.mjs`; CJS uses `require("./instrument")` |
| Framework detected? | Determines which error handler to register |
| `@sentry/*` already installed? | Skip install, go straight to feature config |
| `instrument.js` / `instrument.mjs` already exists? | Merge into it rather than overwrite |
| Logging library detected? | Recommend Sentry Logs |
| Cron / job scheduler detected? | Recommend Crons monitoring |
| AI library detected? | Recommend AI Monitoring |
| Companion frontend found? | Trigger Phase 4 cross-link |

---

## Phase 2: Recommend

**Recommended (core coverage):**
- ✅ **Error Monitoring** — always; captures unhandled exceptions, promise rejections, and framework errors
- ✅ **Tracing** — automatic HTTP, DB, and queue instrumentation via OpenTelemetry

**Optional (enhanced observability):**
- ⚡ **Logging** — structured logs via `Sentry.logger.*`; recommend when `winston`/`pino`/`bunyan` or log search is needed
- ⚡ **Profiling** — continuous CPU profiling (Node.js only; not available on Bun or Deno)
- ⚡ **AI Monitoring** — OpenAI, Anthropic, LangChain, Vercel AI SDK
- ⚡ **Crons** — detect missed or failed scheduled jobs
- ⚡ **Metrics** — custom counters, gauges, distributions

---

## Phase 3: Guide

### Runtime: Node.js

#### Option 1: Wizard (Recommended)

> **Run yourself** — requires interactive browser login:
> ```
> npx @sentry/wizard@latest -i node
> ```
> Once it finishes, skip to [Verification](#verification).

#### Option 2: Manual Setup — Node.js

```bash
npm install @sentry/node --save
```

**CommonJS (`instrument.js`):**

```javascript
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? "___DSN___",
  sendDefaultPii: true, // ⚠️ Sends IP, headers, cookies to Sentry. Set false for GDPR/HIPAA.
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  includeLocalVariables: true,
  enableLogs: true,
});
```

**ESM (`instrument.mjs`):**

```javascript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? "___DSN___",
  sendDefaultPii: true, // ⚠️ Sends IP, headers, cookies to Sentry. Set false for GDPR/HIPAA.
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  includeLocalVariables: true,
  enableLogs: true,
});
```

**CJS** — add `require("./instrument")` as the very first line of entry file.

**ESM** — use the `--import` flag (Node.js 18.19.0+ required):

```bash
node --import ./instrument.mjs app.mjs
```

```json
{
  "scripts": {
    "start": "node --import ./instrument.mjs server.mjs",
    "dev": "node --import ./instrument.mjs --watch server.mjs"
  }
}
```

Or via env var: `NODE_OPTIONS="--import ./instrument.mjs" npm start`

#### Framework Error Handlers

Register **after all routes** (Express) or **before routes** (Fastify, Koa, Connect):

| Framework | Function | Placement | Async? |
|-----------|----------|-----------|--------|
| Express | `setupExpressErrorHandler(app)` | **After** all routes | No |
| Fastify | `setupFastifyErrorHandler(fastify)` | **Before** routes | No |
| Koa | `setupKoaErrorHandler(app)` | **First** middleware | No |
| Hapi | `setupHapiErrorHandler(server)` | Before `server.start()` | **Yes** |
| Connect | `setupConnectErrorHandler(app)` | **Before** routes | No |
| NestJS | → Use `sentry-nestjs-sdk` skill | Dedicated skill | — |

---

### Runtime: Bun

```bash
bun add @sentry/bun
```

```typescript
import * as Sentry from "@sentry/bun";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? "___DSN___",
  sendDefaultPii: true, // ⚠️ Sends IP, headers, cookies to Sentry. Set false for GDPR/HIPAA.
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  enableLogs: true,
});
```

Start with `--preload`:
```bash
bun --preload ./instrument.ts server.ts
```

| Feature | Bun Support |
|---------|-------------|
| Error Monitoring | ✅ Full |
| Tracing | ✅ Via `@sentry/node` OTel |
| Logging | ✅ Full |
| Profiling | ❌ Not available (native addon incompatible) |
| Metrics | ✅ Full |
| Crons | ✅ Full |
| AI Monitoring | ✅ Full |

---

### Runtime: Deno

> Requires Deno 2.0+. Use `npm:` specifier — `deno.land/x/sentry` is deprecated.

```json
{
  "imports": {
    "@sentry/deno": "npm:@sentry/deno@10.42.0"
  }
}
```

```typescript
import * as Sentry from "@sentry/deno";

Sentry.init({
  dsn: Deno.env.get("SENTRY_DSN") ?? "___DSN___",
  sendDefaultPii: true, // ⚠️ Sends IP, headers, cookies to Sentry. Set false for GDPR/HIPAA.
  tracesSampleRate: Deno.env.get("DENO_ENV") === "development" ? 1.0 : 0.1,
  enableLogs: true,
});
```

> Unlike Node.js and Bun, Deno has no `--preload` / `--import` flag. Sentry must be the first `import` in your entry file.

Required Deno permissions:
```bash
deno run \
  --allow-net=o<ORG_ID>.ingest.sentry.io \
  --allow-read=./src \
  --allow-env=SENTRY_DSN,SENTRY_RELEASE \
  main.ts
```

| Feature | Deno Support |
|---------|-------------|
| Error Monitoring | ✅ Full |
| Tracing | ✅ Custom OTel |
| Logging | ✅ Full |
| Profiling | ❌ Not available |
| Metrics | ✅ Full |
| Crons | ✅ `denoCronIntegration()` + `Sentry.withMonitor()` |
| AI Monitoring | ✅ Partial |

---

## Verification

```javascript
import * as Sentry from "@sentry/node";
Sentry.captureException(new Error("Sentry test error — delete me"));
```

Then check your Sentry Issues dashboard — the error should appear within ~30 seconds.

---

## Config Reference

| Option | Type | Default | Notes |
|--------|------|---------|-------|
| `dsn` | `string` | — | Required. Also from `SENTRY_DSN` env var |
| `tracesSampleRate` | `number` | — | 0–1; required to enable tracing |
| `sendDefaultPii` | `boolean` | `false` | Include IP, request headers, user info |
| `includeLocalVariables` | `boolean` | `false` | Add local variable values to stack frames (Node.js) |
| `enableLogs` | `boolean` | `false` | Enable Sentry Logs |
| `environment` | `string` | `"production"` | Also from `SENTRY_ENVIRONMENT` env var |
| `release` | `string` | — | Also from `SENTRY_RELEASE` env var |
| `debug` | `boolean` | `false` | Log SDK activity to console |
| `enabled` | `boolean` | `true` | Set `false` in tests to disable sending |
| `shutdownTimeout` | `number` | `2000` | Milliseconds to flush events before process exit |

### Graceful Shutdown

```javascript
process.on("SIGTERM", async () => {
  await Sentry.close(2000);
  process.exit(0);
});
```

---

## Phase 4: Cross-Link

| Detected | Prefer skill |
|----------|-------------|
| NestJS | `sentry-nestjs-sdk` |
| Next.js | `sentry-nextjs-sdk` |
| React app | `sentry-react-sdk` |
| Python backend | `sentry-python-sdk` |

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Events not appearing | `instrument.js` loaded too late | Ensure it's first `require()` / loaded via `--import` or `--preload` |
| Tracing spans missing | `tracesSampleRate` not set | Add `tracesSampleRate: 1.0` to `Sentry.init()` |
| ESM instrumentation not working | Missing `--import` flag | Run with `node --import ./instrument.mjs` |
| `@sentry/profiling-node` install fails on Bun | Native addon incompatible | Remove `@sentry/profiling-node` |
| Deno: events not sent | Missing `--allow-net` permission | Run with `--allow-net=o<ORG_ID>.ingest.sentry.io` |
| Deno: `deno.land/x/sentry` not working | Deprecated | Switch to `npm:@sentry/deno` specifier |
| Hapi: `setupHapiErrorHandler` timing issue | Not awaited | Must `await Sentry.setupHapiErrorHandler(server)` |
| Shutdown: events lost | Process exits before flush | Add `await Sentry.close(2000)` in SIGTERM handler |
