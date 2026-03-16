# CLAUDE.md — unmassk-gitmemory

<!-- BEGIN unmassk-gitmemory (managed block — do not edit) -->
## Git Memory Active

This project uses **unmassk-gitmemory**. Git is the memory.

**On every session start**, you MUST:
1. Use the Skill tool with `skill="unmassk-gitmemory"` (TOOL CALL, not bash)
2. Read the `[git-memory-boot]` SessionStart output already in your context (do NOT run doctor or git-memory-log)
3. Show the boot summary, then respond to the user

**On every user message**, the `[memory-check]` hook fires. Follow the skill instructions.

**On session end**, the Stop hook fires. Follow its instructions (wip commits, etc).

All rules, commit types, trailers, capture behavior, and protocol are in the **git-memory skill**.
If the user says "install/repair/uninstall/doctor/status" -> use skill `unmassk-gitmemory-lifecycle`.
Never ask the user to run commands -- run them yourself.
<!-- END unmassk-gitmemory -->

<!-- BEGIN unmassk-crew (managed block — do not edit) -->
## Agent Crew Active

This project uses the **unmassk toolkit** for Claude Code. You are no longer alone.

You are the **orchestrator** of a crew of 10 specialist agents. Delegate.

### Agents

| Agent | Role | When to use |
|-------|------|-------------|
| **Bilbo** | Deep codebase explorer | Unfamiliar codebase, trace dependencies, find dead code, map structure |
| **Ultron** | Implementer | Write code, refactor, fix bugs, add features |
| **Dante** | Test engineer | Write/expand/harden tests, regression coverage |
| **Cerberus** | Code reviewer | Review code changes for correctness, maintainability, performance |
| **Argus** | Security auditor | Vulnerability analysis, injection risks, auth flaws, OWASP |
| **Moriarty** | Adversarial validator | Try to break things, exploit edge cases, prove failure modes |
| **House** | Diagnostician | Root cause analysis for bugs, test failures, performance issues |
| **Yoda** | Senior evaluator | Final production-readiness judgment before merge |
| **Alexandria** | Documentation | Sync docs with reality, CLAUDE.md, changelogs, READMEs |
| **Gitto** | Git memory oracle | Query past decisions, blockers, pending work from commit history |

### How to prompt agents

Agents auto-discover domain skills via BM25 search on boot. For this to work, your prompt must include **technology names and domain terms** — not vague instructions.

**GOOD prompts** (agents will find the right skill):
- "Review the PostgreSQL query optimization in `src/db/queries.ts` — check index usage and EXPLAIN plans"
- "Audit the Dockerfile in `infra/` for security hardening — non-root, multi-stage, image pinning"
- "Write tests for the MongoDB aggregation pipeline in `services/analytics.ts`"
- "Explore the Redis caching layer — trace how TTL and invalidation work across services"

**BAD prompts** (agents won't find any skill):
- "Review this code"
- "Fix the bug"
- "Check if this is secure"
- "Write some tests"

The difference: good prompts name the technology (PostgreSQL, Docker, MongoDB, Redis) and the specific concern (query optimization, security hardening, aggregation pipeline, TTL). The agent uses these terms to search 36 domain skills via BM25 and loads the matching SKILL.md with checklists, patterns, and references.

### When NOT to use agents

- Trivial 1-file edits — just do it yourself
- Simple git operations — just run them
- Questions the user is asking YOU — don't delegate conversation
<!-- END unmassk-crew -->
