---
name: compliance-i18n
description: >
  Use when the user asks to "set up i18n", "internationalize my app",
  "add translations", "localize to Spanish", "configure Better i18n",
  "scan for hardcoded strings", "check missing translations",
  "translate with AI", "add a language", "publish translations to CDN",
  "sync translations with GitHub", "install Better i18n MCP",
  "manage translation keys", "set up i18n SDK",
  or mentions any of: i18n, internationalization, localization, l10n,
  translation keys, Better i18n, i18n.config.ts, ICU MessageFormat,
  pluralization, RTL, right-to-left, hreflang, locale, next-intl,
  @better-i18n/next, @better-i18n/cli, @better-i18n/use-intl,
  translation CDN, AI translation, glossary, key management,
  text expansion, pseudo-localization, translation workflow.
  Covers the full Better i18n platform lifecycle: project setup,
  AST-based string discovery, key management with dot notation,
  AI translation with glossary and ICU preservation, GitHub two-way
  sync with PR review, CDN delivery via Cloudflare, SDK integration
  for Next.js and React/Vite, MCP tools for translation management,
  and i18n best practices (pluralization, RTL, accessibility, text
  expansion). 10 reference files covering every aspect of the platform.
version: 1.0.0
---

# i18n -- Internationalization Toolkit

Set up, manage, and deliver translations using the Better i18n platform.
Covers the full lifecycle from string discovery to CDN delivery, with
AI-powered translation and GitHub-first workflows.

## Request Routing

Map user intent to the correct reference file.

| User Request | Load Reference |
|---|---|
| Set up i18n, onboard, create project | `references/getting-started.md` |
| Scan for hardcoded strings, check missing translations, CLI commands | `references/cli-usage.md` |
| Manage translation keys, naming, namespaces, CRUD | `references/key-management.md` |
| AI translate, glossary, batch translation, ICU preservation | `references/ai-translation.md` |
| GitHub sync, PR workflow, two-way sync, webhooks | `references/github-sync.md` |
| CDN delivery, publish, cache, output formats | `references/cdn-delivery.md` |
| MCP tools, Claude integration, translation management | `references/mcp-integration.md` |
| Next.js SDK, React SDK, TanStack, hooks | `references/sdk-integration.md` |
| Architecture overview, CDN structure, platform overview | `references/i18n-best-practices.md` |
| Pluralization, RTL, text expansion, accessibility, content guidelines | `references/best-practices.md` |

Load references on-demand as needed. Do NOT load all at startup.

## Setup Workflow

Follow these steps for new i18n projects.

### Step 1 -- Project Setup

Load `references/getting-started.md`. Create Better i18n account, set up
organization and project, configure `i18n.config.ts`, install CLI.

### Step 2 -- String Discovery

Run the CLI scanner to find hardcoded strings via AST parsing:

```
npx @better-i18n/cli scan
```

Load `references/cli-usage.md` for scan options, dynamic key detection,
and CI/CD integration via GitHub Actions.

### Step 3 -- Key Organization

Load `references/key-management.md`. Structure keys with dot notation
(`auth.login.title`), define namespaces, set translation status lifecycle
(draft/reviewed/approved).

### Step 4 -- Translation

Load `references/ai-translation.md`. Set up glossary with brand terms,
configure per-language instructions, run AI batch translation with ICU
MessageFormat preservation.

### Step 5 -- Integration

Load the relevant SDK reference:
- Next.js App Router: `references/sdk-integration.md`
- React/Vite: `references/sdk-integration.md`

### Step 6 -- Delivery

Load `references/cdn-delivery.md`. Publish translations to Cloudflare CDN.
Configure output format (flat/nested/namespaced), cache headers, and
service worker offline support.

## Translation Management Workflow

For ongoing translation work after initial setup.

### Step 1 -- Sync

Load `references/github-sync.md`. Configure two-way sync between
GitHub repository and Better i18n platform. Set up PR-based review
workflow for translation changes.

### Step 2 -- Validate

Run CLI checks before deployment:

```
npx @better-i18n/cli check:missing
npx @better-i18n/cli check:unused
```

### Step 3 -- Publish

Push approved translations to CDN or sync back to GitHub.

## MCP Integration

Load `references/mcp-integration.md` for Claude Desktop MCP server
configuration. Available MCP tools: `listProjects`, `getProject`,
`getAllTranslations`, `listKeys`, `createKeys`, `updateKeys`,
`deleteKeys`, `addLanguage`, `getPendingChanges`, `publishTranslations`,
`getSyncs`, `getSync`.

## Reference Files

| File | Domain | Load When |
|---|---|---|
| `references/getting-started.md` | Account setup, project creation, initial configuration | New i18n project setup |
| `references/cli-usage.md` | CLI commands: scan, check, sync, push, pull, CI/CD | String discovery, validation, CI integration |
| `references/key-management.md` | Key naming, namespaces, status lifecycle, CRUD | Key organization, migration |
| `references/ai-translation.md` | AI translation, glossary, ICU preservation, batch ops | Translation work |
| `references/github-sync.md` | GitHub App, AST discovery, two-way sync, webhooks | Repository sync, PR workflow |
| `references/cdn-delivery.md` | Cloudflare CDN, URL scheme, formats, caching | Translation delivery |
| `references/mcp-integration.md` | MCP server config, 12 available tools | Claude integration |
| `references/sdk-integration.md` | Next.js, React/Vite, TanStack Start, TypeScript | Framework integration |
| `references/i18n-best-practices.md` | Architecture overview, platform structure | Initial understanding |
| `references/best-practices.md` | ICU pluralization, RTL, text expansion, accessibility | Content quality, i18n patterns |

## Mandatory Rules

- Always use dot notation for key naming (`auth.login.title`, not `auth_login_title`).
- Never concatenate translated strings -- use ICU MessageFormat for variables, plurals, and selects.
- Always handle RTL languages with CSS logical properties (`margin-inline-start`, not `margin-left`).
- Always set the `lang` attribute on the HTML element and update it on locale change.
- Plan for text expansion: German ~30% longer than English, Japanese may be shorter.
- Always run `check:missing` before deployment to catch untranslated keys.

## Done Criteria

A task is complete when:
- i18n configuration is in place (`i18n.config.ts`)
- No hardcoded strings remain (CLI scan passes)
- Translation keys follow dot notation convention
- Missing translations checked (`check:missing` passes)
- SDK integrated and rendering translations correctly
- CDN delivery configured (if applicable)
