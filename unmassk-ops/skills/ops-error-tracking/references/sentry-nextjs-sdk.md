# Sentry Next.js SDK

Opinionated wizard that scans your Next.js project and guides you through complete Sentry setup across all three runtimes: browser, Node.js server, and Edge.

## Invoke This Skill When

- User asks to "add Sentry to Next.js" or "set up Sentry" in a Next.js app
- User wants to install or configure `@sentry/nextjs`
- User wants error monitoring, tracing, session replay, logging, or profiling for Next.js
- User asks about `instrumentation.ts`, `withSentryConfig()`, or `global-error.tsx`
- User wants to capture server actions, server component errors, or edge runtime errors

> **Note:** SDK versions and APIs below reflect current Sentry docs (`@sentry/nextjs` ≥8.28.0).
> Always verify against [docs.sentry.io/platforms/javascript/guides/nextjs/](https://docs.sentry.io/platforms/javascript/guides/nextjs/) before implementing.

---

## Phase 1: Detect

```bash
# Detect Next.js version and existing Sentry
cat package.json | grep -E '"next"|"@sentry/'

# Detect router type (App Router vs Pages Router)
ls src/app app src/pages pages 2>/dev/null

# Check for existing Sentry config files
ls instrumentation.ts instrumentation-client.ts sentry.server.config.ts sentry.edge.config.ts 2>/dev/null
ls src/instrumentation.ts src/instrumentation-client.ts 2>/dev/null

# Check next.config
ls next.config.ts next.config.js next.config.mjs 2>/dev/null

# Check for existing error boundaries
find . -name "global-error.tsx" -o -name "_error.tsx" 2>/dev/null | grep -v node_modules

# Check build tool
cat package.json | grep -E '"turbopack"|"webpack"'

# Check for companion backend
ls ../backend ../server ../api 2>/dev/null
```

**What to determine:**

| Question | Impact |
|----------|--------|
| Next.js version? | 13+ required; 15+ needed for Turbopack support |
| App Router or Pages Router? | Determines error boundary files (`global-error.tsx` vs `_error.tsx`) |
| `@sentry/nextjs` already present? | Skip install, go to feature config |
| Existing `instrumentation.ts`? | Merge Sentry into it rather than replace |
| Turbopack in use? | Tree-shaking in `withSentryConfig` is webpack-only |
| Backend directory found? | Trigger Phase 4 cross-link suggestion |

---

## Phase 2: Recommend

**Recommended (core coverage):**
- ✅ **Error Monitoring** — server errors, client errors, server actions, unhandled promise rejections
- ✅ **Tracing** — server-side request tracing + client-side navigation spans across all runtimes
- ✅ **Session Replay** — recommended for user-facing apps; records sessions around errors

**Optional (enhanced observability):**
- ⚡ **Logging** — structured logs via `Sentry.logger.*`
- ⚡ **Profiling** — continuous profiling; requires `Document-Policy: js-profiling` header
- ⚡ **AI Monitoring** — OpenAI, Vercel AI SDK, Anthropic
- ⚡ **Crons** — detect missed/failed scheduled jobs

---

## Phase 3: Guide

### Option 1: Wizard (Recommended)

> **Run yourself** — requires interactive browser login:
> ```
> npx @sentry/wizard@latest -i nextjs
> ```
> Handles config files, `next.config.ts` wrapping, and source map upload. Once done, skip to [Verification](#verification).

### Option 2: Manual Setup

```bash
npm install @sentry/nextjs --save
```

#### `instrumentation-client.ts` — Browser Runtime

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? "___PUBLIC_DSN___",
  sendDefaultPii: true, // ⚠️ Sends IP, headers, cookies to Sentry. Set false for GDPR/HIPAA.
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  enableLogs: true,
  integrations: [
    Sentry.replayIntegration(),
  ],
});

// App Router navigation transitions
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
```

#### `sentry.server.config.ts` — Node.js Server Runtime

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? "___DSN___",
  sendDefaultPii: true, // ⚠️ Sends IP, headers, cookies to Sentry. Set false for GDPR/HIPAA.
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  includeLocalVariables: true,
  enableLogs: true,
});
```

#### `sentry.edge.config.ts` — Edge Runtime

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? "___DSN___",
  sendDefaultPii: true, // ⚠️ Sends IP, headers, cookies to Sentry. Set false for GDPR/HIPAA.
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  enableLogs: true,
});
```

#### `instrumentation.ts` — Server-Side Registration Hook

> Requires `experimental.instrumentationHook: true` in `next.config` for Next.js < 14.0.4.

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Captures all unhandled server-side request errors (requires @sentry/nextjs >= 8.28.0)
export const onRequestError = Sentry.captureRequestError;
```

#### App Router: `app/global-error.tsx`

```tsx
"use client";

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
```

#### Wrap `next.config.ts`

```typescript
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {};

export default withSentryConfig(nextConfig, {
  org: "___ORG_SLUG___",
  project: "___PROJECT_SLUG___",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  silent: !process.env.CI,
});
```

#### Exclude Tunnel Route from Middleware

```typescript
// middleware.ts
export const config = {
  matcher: ["/((?!monitoring|_next/static|_next/image|favicon.ico).*)"],
};
```

---

### Source Maps Setup

Source maps make production stack traces readable — non-negotiable for production apps.

1. Create auth token at [sentry.io/settings/auth-tokens/](https://sentry.io/settings/auth-tokens/) with `project:releases` + `org:read` scopes.
2. Set in `.env.sentry-build-plugin` (gitignore this file): `SENTRY_AUTH_TOKEN=sntrys_eyJ...`
3. Verify `authToken` is wired in `next.config.ts`. Source maps upload automatically on `next build`.

---

## Verification

```typescript
throw new Error("Sentry test error — delete me");
```

Check Sentry Issues dashboard — error appears within ~30 seconds.

| Check | How |
|-------|-----|
| Client errors captured | Throw in a client component |
| Server errors captured | Throw in a server action or API route |
| Edge errors captured | Throw in middleware or edge route handler |
| Source maps working | Stack trace shows readable file names |
| Session Replay working | Check Replays tab in Sentry dashboard |

---

## Config Reference

| Option | Type | Default | Notes |
|--------|------|---------|-------|
| `dsn` | `string` | — | `NEXT_PUBLIC_SENTRY_DSN` for client, `SENTRY_DSN` for server |
| `tracesSampleRate` | `number` | — | 1.0 in dev, 0.1 in prod |
| `replaysSessionSampleRate` | `number` | `0.1` | Fraction of all sessions recorded |
| `replaysOnErrorSampleRate` | `number` | `1.0` | Fraction of error sessions recorded |
| `includeLocalVariables` | `boolean` | `false` | Stack frame local vars (server only) |
| `enableLogs` | `boolean` | `false` | Enable Sentry Logs product |

### Environment Variables

| Variable | Runtime | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_SENTRY_DSN` | Client | DSN for browser Sentry init (public) |
| `SENTRY_DSN` | Server / Edge | DSN for server/edge Sentry init |
| `SENTRY_AUTH_TOKEN` | Build | Source map upload auth token (secret) |
| `SENTRY_ORG` | Build | Org slug |
| `SENTRY_PROJECT` | Build | Project slug |
| `NEXT_RUNTIME` | Server / Edge | `"nodejs"` or `"edge"` (set by Next.js) |

---

## Phase 4: Cross-Link

| Backend detected | Suggest skill |
|-----------------|--------------|
| Go (`go.mod`) | `sentry-go-sdk` |
| Python (`requirements.txt`, `pyproject.toml`) | `sentry-python-sdk` |
| Node.js (Express, Fastify, Hapi) | `sentry-node-sdk` |

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Events not appearing | DSN misconfigured | Set `debug: true`; check browser network tab |
| Stack traces show minified code | Source maps not uploading | Check `SENTRY_AUTH_TOKEN`; run `next build` |
| `onRequestError` not firing | SDK version < 8.28.0 | Upgrade: `npm install @sentry/nextjs@latest` |
| Edge runtime errors missing | `sentry.edge.config.ts` not loaded | Verify `instrumentation.ts` imports it when `NEXT_RUNTIME === "edge"` |
| `withSentryConfig` tree-shaking breaks | Turbopack in use | Remove `webpack.treeshake` options |
| `global-error.tsx` not catching errors | Missing `"use client"` | Add `"use client"` as very first line |
| Session Replay not recording | `replayIntegration()` missing | Add to `integrations` in `instrumentation-client.ts` |
