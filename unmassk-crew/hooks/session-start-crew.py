#!/usr/bin/env python3
"""
SessionStart hook for unmassk-crew.
Ensures the orchestrator block exists in CLAUDE.md.
"""
import subprocess
import sys
from pathlib import Path

MARKER_BEGIN = "<!-- BEGIN unmassk-crew (managed block — do not edit) -->"
MARKER_END = "<!-- END unmassk-crew -->"

BLOCK = """
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
""".strip()


def find_git_root():
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            return Path(result.stdout.strip())
    except Exception:
        pass
    return None


def main():
    git_root = find_git_root()
    if not git_root:
        print("[crew] Not a git repo, skipping CLAUDE.md check")
        return

    claude_md = git_root / "CLAUDE.md"

    if claude_md.exists():
        content = claude_md.read_text(encoding="utf-8")
        if MARKER_BEGIN in content:
            # Block already present — update it in case it changed
            import re
            pattern = re.compile(
                re.escape(MARKER_BEGIN) + r".*?" + re.escape(MARKER_END),
                re.DOTALL
            )
            new_content = pattern.sub(BLOCK, content)
            if new_content != content:
                claude_md.write_text(new_content, encoding="utf-8")
                print("[crew] Updated orchestrator block in CLAUDE.md")
            else:
                print("[crew] Orchestrator block up to date")
            return

        # Block missing — append it
        content = content.rstrip() + "\n\n" + BLOCK + "\n"
        claude_md.write_text(content, encoding="utf-8")
        print("[crew] Injected orchestrator block into CLAUDE.md")
    else:
        # No CLAUDE.md — create it
        claude_md.write_text(BLOCK + "\n", encoding="utf-8")
        print("[crew] Created CLAUDE.md with orchestrator block")


if __name__ == "__main__":
    main()
