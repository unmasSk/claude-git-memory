# Changelog

## [Unreleased]

### Added

- Graceful shutdown on `SIGTERM`/`SIGINT`: the server drains active connections, runs a SQLite WAL checkpoint, and exits cleanly — preventing data loss on container stop or process manager restart.
- Environment validation at startup: all required env vars are checked via `config.ts` before the server binds; the process exits with a descriptive error on invalid config rather than failing silently at runtime.
- Swagger UI at `/docs` via `@elysiajs/swagger`: all HTTP routes are now self-documenting and explorable without reading source.
- `.env.example` with all supported environment variables and inline comments.
- `README.md` covering project purpose, setup steps, and development workflow.
- Context exhaustion auto-respawn: when an agent hits "Prompt is too long", the system clears the session, spawns a fresh instance with the last 2000 messages as history, and posts a RESPAWN NOTICE in the room so other agents know they are talking to a new instance of the same agent.
- Human message priority queue: messages from human users go to the front of the invocation queue (`unshift`), ensuring human input is never delayed by a chain of agent-to-agent mentions.
- Queue merge for duplicate entries: when the same agent+room already has a pending queue entry, new triggers merge instead of duplicating — with priority escalation and a 16 KB cap on trigger content to prevent unbounded memory growth.
- Git diff stat in agent system prompt: agents now see recent repository changes (30-second cached, whitelist-filtered, sanitized) so they have ambient awareness of ongoing work without reading the full diff.
- `contextWindow` fallback: when the Claude CLI reports 0 for the context window, the system infers a safe value from the model name (Opus → 1 M tokens, Sonnet/Haiku → 200 K tokens).
- `peekToken`: validates an auth token without consuming it, used by the `/invite` endpoint to authenticate without invalidating the token.
- Rate limiting on `/invite`: the invite endpoint now shares the same global token bucket as `/auth/token`, preventing brute-force discovery of invite codes.
- 54 new tests covering: sanitizer correctness, context-overflow detection, respawn flow, priority queue ordering, `@everyone` injection guard, `peekToken` validation, and invite-endpoint auth (535 total, 526 passing, 9 pre-existing failures, 0 new failures).

### Changed

- `config.ts` refactored to centralize and validate all `process.env` reads; application code no longer accesses `process.env` directly.
- Global `onError` handler added to Elysia: all unhandled errors return `{ error, code }` JSON instead of leaking stack traces. Validation and parse errors map to `422` rather than `500`.
- `sanitizePromptContent` is now a shared function applied consistently to all content that enters agent prompts — chat history, trigger content, and `@everyone` directives — replacing scattered ad-hoc sanitization.
- RESPAWN section delimiters upgraded to U+2550 (double-line box-drawing character) to make prompt-injection harder.
- `retryScheduled` refactored to a pure return-boolean pattern, removing the context mutation that made call sites unpredictable.
- Queue entries for the same agent+room now escalate to the higher priority on merge rather than keeping the original priority.

### Fixed

- README documented port corrected from `3001` to `3000`.
- Phantom environment variables removed from config and documentation.
- `@everyone` directive content is now sanitized before injection, closing a prompt-injection vector.
- Git diff output is whitelisted to safe characters and sanitized before being included in agent system prompts.
- Double-invoke guard: agent chains (agent-to-agent mentions) now go to the back of the queue (`push`) so a high-volume agent chain cannot starve human messages.
