# Sentry React SDK

Opinionated wizard that scans your React project and guides you through complete Sentry setup.

## Invoke This Skill When

- User asks to "add Sentry to React" or "set up Sentry" in a React app
- User wants error monitoring, tracing, session replay, profiling, or logging in React
- User mentions `@sentry/react`, React Sentry SDK, or Sentry error boundaries
- User wants to monitor React Router navigation, Redux state, or component performance

> **Note:** SDK versions and APIs below reflect current Sentry docs (`@sentry/react` ≥8.0.0).
> Always verify against [docs.sentry.io/platforms/javascript/guides/react/](https://docs.sentry.io/platforms/javascript/guides/react/) before implementing.

---

## Phase 1: Detect

```bash
# Detect React version
cat package.json | grep -E '"react"|"react-dom"'

# Check for existing Sentry
cat package.json | grep '"@sentry/'

# Detect router
cat package.json | grep -E '"react-router-dom"|"@tanstack/react-router"'

# Detect state management
cat package.json | grep -E '"redux"|"@reduxjs/toolkit"'

# Detect build tool
ls vite.config.ts vite.config.js webpack.config.js craco.config.js 2>/dev/null
cat package.json | grep -E '"vite"|"react-scripts"|"webpack"'

# Check for companion backend
ls ../backend ../server ../api 2>/dev/null
cat ../go.mod ../requirements.txt ../Gemfile ../pom.xml 2>/dev/null | head -3
```

**What to determine:**

| Question | Impact |
|----------|--------|
| React 19+? | Use `reactErrorHandler()` hook pattern |
| React <19? | Use `Sentry.ErrorBoundary` |
| `@sentry/react` already present? | Skip install, go straight to feature config |
| `react-router-dom` v5 / v6 / v7? | Determines which router integration to use |
| `@tanstack/react-router`? | Use `tanstackRouterBrowserTracingIntegration()` |
| Redux in use? | Recommend `createReduxEnhancer()` |
| Vite detected? | Source maps via `sentryVitePlugin` |
| Backend directory found? | Trigger Phase 4 cross-link suggestion |

---

## Phase 2: Recommend

**Recommended (core coverage):**
- ✅ **Error Monitoring** — always; captures unhandled errors, React error boundaries, React 19 hooks
- ✅ **Tracing** — page load, navigation, and API call tracing
- ✅ **Session Replay** — recommended for user-facing apps

**Optional (enhanced observability):**
- ⚡ **Logging** — structured logs via `Sentry.logger.*`
- ⚡ **Profiling** — JS Self-Profiling API (experimental; requires cross-origin isolation headers)

**React-specific extras:**
- React 19 detected → set up `reactErrorHandler()` on `createRoot`
- React Router detected → configure matching router integration
- Redux detected → add `createReduxEnhancer()` to Redux store
- Vite detected → configure `sentryVitePlugin` for source maps

---

## Phase 3: Guide

### Install

```bash
npm install @sentry/react --save
```

### Create `src/instrument.ts`

Sentry must initialize **before any other code runs**:

```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN, // Adjust per build tool (see table below)
  environment: import.meta.env.MODE,
  release: import.meta.env.VITE_APP_VERSION,

  sendDefaultPii: true, // ⚠️ Sends IP, headers, cookies to Sentry. Set false for GDPR/HIPAA.

  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  tracesSampleRate: 1.0, // lower to 0.1–0.2 in production
  tracePropagationTargets: ["localhost", /^https:\/\/yourapi\.io/],

  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  enableLogs: true,
});
```

**DSN environment variable by build tool:**

| Build Tool | Variable Name | Access in code |
|------------|--------------|----------------|
| Vite | `VITE_SENTRY_DSN` | `import.meta.env.VITE_SENTRY_DSN` |
| Create React App | `REACT_APP_SENTRY_DSN` | `process.env.REACT_APP_SENTRY_DSN` |
| Custom webpack | `SENTRY_DSN` | `process.env.SENTRY_DSN` |

### Entry Point Setup

```tsx
// src/main.tsx (Vite) or src/index.tsx (CRA/webpack)
import "./instrument"; // ← MUST be first

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

### React Version-Specific Error Handling

**React 19+** — use `reactErrorHandler()` on `createRoot`:

```tsx
import { reactErrorHandler } from "@sentry/react";

createRoot(document.getElementById("root")!, {
  onUncaughtError: reactErrorHandler(),
  onCaughtError: reactErrorHandler(),
  onRecoverableError: reactErrorHandler(),
}).render(<App />);
```

**React <19** — wrap in `Sentry.ErrorBoundary`:

```tsx
import * as Sentry from "@sentry/react";

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary fallback={<p>Something went wrong</p>} showDialog>
    <App />
  </Sentry.ErrorBoundary>
);
```

### Router Integration

| Router | Integration |
|--------|------------|
| React Router v7 | `reactRouterV7BrowserTracingIntegration` |
| React Router v6 | `reactRouterV6BrowserTracingIntegration` |
| React Router v5 | `reactRouterV5BrowserTracingIntegration` |
| TanStack Router | `tanstackRouterBrowserTracingIntegration(router)` |
| No router / custom | `browserTracingIntegration()` |

**React Router v6/v7 setup (Option A — `createBrowserRouter`):**

```typescript
const sentryCreateBrowserRouter = Sentry.wrapCreateBrowserRouterV6(createBrowserRouter);
const router = sentryCreateBrowserRouter([...routes]);
```

### Redux Integration

```typescript
import * as Sentry from "@sentry/react";
import { configureStore } from "@reduxjs/toolkit";

const store = configureStore({
  reducer: rootReducer,
  enhancers: (getDefaultEnhancers) =>
    getDefaultEnhancers().concat(Sentry.createReduxEnhancer()),
});
```

### Source Maps Setup

**Vite (`vite.config.ts`):**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig({
  build: { sourcemap: "hidden" },
  plugins: [
    react(),
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
});
```

---

## Config Reference

| Option | Type | Default | Notes |
|--------|------|---------|-------|
| `dsn` | `string` | — | **Required.** SDK disabled when empty |
| `tracesSampleRate` | `number` | — | 0–1; `1.0` in dev, `0.1–0.2` in prod |
| `tracePropagationTargets` | `(string\|RegExp)[]` | — | Outgoing URLs that receive distributed tracing headers |
| `replaysSessionSampleRate` | `number` | — | Fraction of all sessions recorded |
| `replaysOnErrorSampleRate` | `number` | — | Fraction of error sessions recorded |
| `enableLogs` | `boolean` | `false` | Enable `Sentry.logger.*` API |
| `tunnel` | `string` | — | Proxy URL to bypass ad blockers |

### React Compatibility Matrix

| React Version | Error handling approach | SDK minimum |
|---------------|------------------------|-------------|
| React 19+ | `reactErrorHandler()` on `createRoot` | `@sentry/react` ≥8.0.0 |
| React 16–18 | `Sentry.ErrorBoundary` component | `@sentry/react` ≥7.0.0 |

---

## Verification

```tsx
import * as Sentry from "@sentry/react";

function SentryTest() {
  return (
    <>
      <button onClick={() => { throw new Error("Sentry React test error"); }}>
        Test Error
      </button>
      <button onClick={() => Sentry.captureMessage("Sentry test message", "info")}>
        Test Message
      </button>
    </>
  );
}
```

Check the Sentry dashboard: **Issues**, **Traces**, **Replays**, **Logs**.

---

## Phase 4: Cross-Link

| Backend detected | Suggest skill |
|-----------------|--------------|
| Go (`go.mod`) | `sentry-go-sdk` |
| Python (`requirements.txt`, `pyproject.toml`) | `sentry-python-sdk` |
| Node.js (Express, Fastify) | `sentry-node-sdk` |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Events not appearing | Set `debug: true`, check DSN, open browser console |
| Source maps not working | Build in production mode; verify `SENTRY_AUTH_TOKEN` is set |
| `instrument.ts` not running first | Verify it's the first import in entry file |
| React 19 errors not captured | Confirm `reactErrorHandler()` passed to all three `createRoot` options |
| React <19 errors not captured | Ensure `<Sentry.ErrorBoundary>` wraps the component tree |
| Router transactions named `<unknown>` | Add router integration matching your router version |
| Session replay not recording | Confirm `replayIntegration()` is in init |
| Redux actions not in breadcrumbs | Add `Sentry.createReduxEnhancer()` to store enhancers |
| Ad blockers dropping events | Set `tunnel: "/sentry-tunnel"` and add server-side relay endpoint |
