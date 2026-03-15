---
name: Plugin and SKILL.md conventions
description: Structural conventions for unmassk-claude-toolkit plugins and SKILL.md orchestrators
type: project
---

## SKILL.md Frontmatter

Every SKILL.md must have a `description` field that begins with "This skill should be used when...". This is enforced by the unmassk-audit command.

## Plugin File Layout

Standard plugin structure (verified in unmassk-marketing, 2026-03-14):

```
skills/<skill-name>/
  SKILL.md             — orchestrator with routing table
  references/          — domain knowledge files loaded on-demand
  scripts/             — zero-dependency Node.js CLI scripts for platform APIs
  evals/               — eval JSON + search script (evals.json, search-evals.py)
```

The `scripts/` directory may contain a `README.md` — this is documentation, not a routed script. Do not flag it as orphaned.

## Routing Table Audit Pattern

When auditing SKILL.md routing completeness:
1. Extract every `references/*.md` path from the routing table AND the Reference Files section (they can overlap — deduplicate).
2. Extract every `scripts/*.js` filename from the Script Categories table.
3. Diff against actual disk contents.
4. `README.md` in scripts/ is always expected and benign.
