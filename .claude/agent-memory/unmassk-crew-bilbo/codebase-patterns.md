---
name: codebase-patterns
description: Plugin structure, ref-repo conventions, skill anatomy for claude-toolkit
type: project
---

## Plugin Structure (unmassk-claude-toolkit)

Each plugin lives under `.claude/plugins/cache/<namespace>/<plugin-name>/<version>/`.
Skills within a plugin: `skills/<skill-name>/SKILL.md` + optional `references/` dir.

## Ref-Repo Convention

`.ref-repos/` holds upstream source repos (e.g., `marketingskills/`) cloned for reference.
These are NOT installed plugins — they are source material for plugin authoring.
Structure: `.ref-repos/<repo>/skills/<skill-name>/SKILL.md`

## Skill Anatomy

Each SKILL.md has:
- YAML frontmatter: `name`, `description` (trigger phrases), `metadata.version`
- Body: role declaration, initial assessment (context-check pattern), core principles, workflow
- Optional `references/` subdir with supporting detail docs loaded on demand
- All 27 surveyed marketing skills (non-SEO) follow the `product-marketing-context` check pattern

## SEO Skills (excluded from marketing plugin scope)

seo-audit, ai-seo, programmatic-seo, site-architecture, competitor-alternatives, schema-markup
These are already covered by unmassk-seo plugin.
