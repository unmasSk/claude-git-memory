# unmassk-marketing Implementation Plan

**Issue:** #3
**Branch:** feat/plugin-expansion
**Triage:** Big
**Created:** 2026-03-14

## Goal

Build the unmassk-marketing plugin — complete strategic marketing toolkit with 9 domain references, 62 CLI scripts, 197 evals, integration guides, Composio MCP, and product-context template. Sourced from marketingskills (coreyhaines31).

## Decisions

- Same architecture as unmassk-seo: 1 SKILL.md orchestrator + references (progressive disclosure)
- 27 source skills consolidated into 9 domain references
- 50 per-skill reference files merged into the 9 domain refs
- 72 integration guides consolidated into 4 integration references
- 62 Node.js CLI scripts ported as scripts inside skill
- 197 evals consolidated into evals/ directory
- Composio in .mcp.json
- No hooks (no technical validation needed for marketing)
- No agents — crew executes everything
- Product-marketing-context as reference template
- Attribution to coreyhaines31/marketingskills

## Source Material

Cloned at `.ref-repos/marketingskills/`

## Tasks

### Task 1: Plugin manifest + structure + MCP
**Files:** create/update
**Steps:**
- [ ] Update .claude-plugin/plugin.json with full metadata
- [ ] Create directory structure
- [ ] Create .mcp.json with Composio
- [ ] Commit

### Task 2: Port 62 CLI scripts
**Files:** create scripts/*.js + package.json
**Steps:**
- [ ] Copy all 62 CLIs from source, adapt branding
- [ ] Verify no hardcoded paths
- [ ] Commit

### Task 3: SKILL.md orchestrator
**Files:** create SKILL.md
**Steps:**
- [ ] Write canonical frontmatter with all triggers
- [ ] Routing table for 9 references + 4 integration refs
- [ ] Mandate scripts and MCP usage
- [ ] Product-context check as first step
- [ ] Commit

### Task 4: Product context template
**Files:** create references/product-context-template.md
**Steps:**
- [ ] Port template from source skill
- [ ] Commit

### Task 5: 9 domain references (Alexandria x3)
**Files:** create 9 references
**Steps:**
- [ ] foundations.md (product-context, psychology, ideas)
- [ ] copy.md (copywriting, editing, content-strategy, social)
- [ ] cro.md (page, form, popup, signup-flow)
- [ ] retention.md (onboarding, churn, paywall, pricing)
- [ ] email.md (sequences, cold-email)
- [ ] ads.md (paid-ads, ad-creative)
- [ ] analytics.md (tracking, ab-testing)
- [ ] growth.md (launch, lead-magnets, free-tools, referral)
- [ ] sales.md (enablement, revops)
- [ ] Commit

### Task 6: 4 integration references (Alexandria)
**Files:** create 4 integration refs
**Steps:**
- [ ] integrations-crm.md (HubSpot, Salesforce, ActiveCampaign, etc.)
- [ ] integrations-ads.md (Google Ads, Meta, LinkedIn, TikTok, etc.)
- [ ] integrations-analytics.md (GA4, Amplitude, Mixpanel, Hotjar, etc.)
- [ ] integrations-email.md (Mailchimp, Customer.io, SendGrid, Kit, etc.)
- [ ] Commit

### Task 7: Consolidate evals
**Files:** create evals/evals.json
**Steps:**
- [ ] Merge 32 eval files into consolidated evals.json
- [ ] Adapt skill references to our reference names
- [ ] Commit

### Task 8: README + version bump
**Files:** create README.md, bump to 1.0.0
**Steps:**
- [ ] README with attribution to coreyhaines31/marketingskills
- [ ] Bump version
- [ ] Push
- [ ] Commit

## Wave Map

- **Wave 1:** Task 1 (manifest+MCP), Task 2 (62 CLIs), Task 4 (product-context) — independent
- **Wave 2:** Task 3 (SKILL.md) — needs structure from Wave 1
- **Wave 3:** Task 5 (9 refs) + Task 6 (4 integration refs) — 3 Alexandria in parallel
- **Wave 4:** Task 7 (evals), Task 8 (README+bump) — depends on all above

## Verify

- Alexandria: review all references
- Yoda: senior verdict

**Status: IN PROGRESS**
