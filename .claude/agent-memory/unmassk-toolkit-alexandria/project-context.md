---
name: project-context
description: Core identity of the unmassk-gitmemory project — what it is, how it works, key conventions
type: project
---

unmassk-toolkit is a Claude Code plugin monorepo providing persistent memory, 10 specialized agents, creative pipeline, enterprise audit, and quality standards. Git is the memory — every commit is resumable across machines and sessions.

- Author: unmasSk
- License: MIT
- Current version: 1.1.1 (source of truth: unmassk-toolkit/.claude-plugin/plugin.json) — verified 2026-03-24
- Core language: Python (lib/, bin/) for git-memory; TypeScript/Bun for chatroom
- Distribution: Claude Code plugin marketplace (marketplace.json at repo root)
- Commit convention: conventional commits with emojis (feat, fix, refactor, etc.)
- Non-code commit types: memo, decision, context, wip, remember — these are memory, NOT code changes
- Chatroom is a separate sub-project under chatroom/ with its own CHANGELOG, version track (0.x), and build system (Bun/Elysia)

**Why:** Knowing the project identity prevents misclassifying commits and helps write accurate changelogs.
**How to apply:** Filter out memo/decision/context/wip/remember commits from changelog. Only feat/fix/refactor/perf/chore/ci/test/docs with real code changes go in.
