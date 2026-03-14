---
name: unmassk-marketing
description: >
  Use when the user asks to "write copy", "CRO audit",
  "optimize conversion", "email sequence", "cold email", "ad creative",
  "paid ads", "pricing strategy", "launch plan", "referral program",
  "churn prevention", "onboarding flow", "A/B test", "analytics tracking",
  "marketing ideas", "marketing psychology", "sales deck", "sales enablement",
  "RevOps", "lead scoring", "content strategy", "social media content",
  "lead magnet", "free tool strategy", "popup optimization",
  "form optimization", "signup flow", "paywall optimization",
  "product marketing context",
  or mentions any of: CRO, conversion rate, email drip, nurture sequence,
  ROAS, CTR, CPL, CAC, LTV, churn rate, MRR, ARR, NPS, product-led growth,
  sales pipeline, deal velocity, win rate, attribution, UTM, retargeting,
  lookalike audience, landing page, value proposition, positioning,
  competitive analysis, go-to-market, GTM, demand generation, ABM,
  account-based marketing, lifecycle marketing, retention, activation,
  onboarding, paywall, upsell, cross-sell, referral loop, viral coefficient.
  Covers 9 marketing domains: copywriting, CRO, email, retention, paid ads,
  analytics, growth, sales enablement, and marketing foundations. Includes
  4 integration categories (CRM, ad platforms, analytics, email) with CLI
  scripts for platform API access. Integrates with Composio MCP for
  OAuth-based platforms (HubSpot, Salesforce, Meta Ads, LinkedIn Ads).
  Based on marketingskills by coreyhaines31 (MIT License).
version: 1.0.0
---

# Marketing -- Strategic Marketing Toolkit

Comprehensive marketing analysis and execution across all domains. Route user
requests to the correct reference, apply product context, and produce
actionable deliverables using on-demand reference files, CLI scripts, and
MCP integrations.

Based on marketingskills by coreyhaines31 (MIT License).

## First Step: Product Context

Before any marketing task, check if product marketing context exists for this
project. Look for `.agents/product-marketing-context.md` in the project root.
Also check `.claude/product-marketing-context.md` for older setups.

- **If it exists**: Read it and use the product, audience, positioning, and
  messaging data to inform all outputs. Reference specific customer language,
  ICPs, and value propositions from the context document.
- **If it does not exist**: Create one using `references/product-context-template.md`.
  Auto-draft from the codebase (README, landing pages, marketing copy,
  package.json) and ask the user to review and fill gaps. Do this before
  proceeding with the original request.

Every reference file assumes product context is loaded. Outputs without
product context will be generic and low-value.

## Request Routing

Map user intent to the correct reference file and workflow.

| User Request | Load Reference | Scripts |
|---|---|---|
| Copywriting, page copy, headlines, value props | `references/copy.md` | -- |
| CRO, conversion optimization, forms, popups, signup flows | `references/cro.md` | -- |
| Email sequences, cold email, drip campaigns, nurture flows | `references/email.md` | -- |
| Onboarding, churn prevention, paywall, pricing strategy | `references/retention.md` | -- |
| Paid ads, ad creative, ROAS optimization | `references/ads.md` | -- |
| Analytics, A/B testing, tracking setup, attribution | `references/analytics.md` | CLI scripts for platform data |
| Launch strategy, lead magnets, referral programs, free tools | `references/growth.md` | -- |
| Sales enablement, RevOps, lead scoring, sales decks | `references/sales.md` | -- |
| Marketing psychology, ideas, strategy, positioning | `references/foundations.md` | -- |
| CRM integrations (HubSpot, Salesforce, Close, Intercom) | `references/integrations-crm.md` | CLI scripts |
| Ad platform integrations (Google, Meta, LinkedIn, TikTok) | `references/integrations-ads.md` | CLI scripts |
| Analytics integrations (GA4, Amplitude, Mixpanel, Segment) | `references/integrations-analytics.md` | CLI scripts |
| Email integrations (Mailchimp, Customer.io, Kit, Resend) | `references/integrations-email.md` | CLI scripts |

Load references on-demand as needed. Do NOT load all at startup. For tasks
spanning multiple domains, load references progressively as each area is
addressed.

## Workflow

Follow these steps for every marketing task.

### Step 1 -- Load Product Context

Read `.agents/product-marketing-context.md`. If missing, create it using the
template before proceeding. See "First Step: Product Context" above.

### Step 2 -- Route to Reference

Match the user request to the routing table. Load the primary reference file.
If the request spans multiple domains (e.g., "launch plan with email sequence
and ad creative"), load references one at a time as you work through each
component.

### Step 3 -- Check for Platform Data

If the task benefits from live platform data (analytics numbers, ad
performance, CRM records, email metrics), check for available CLI scripts or
MCP tools. Use them to ground recommendations in real data rather than
assumptions.

### Step 4 -- Execute and Deliver

Apply the reference file's frameworks, templates, and checklists to produce
the deliverable. Every output must:

1. Reference specific product context (ICPs, positioning, customer language).
2. Include concrete examples, not abstract advice.
3. Provide implementation-ready copy, configs, or plans.
4. State assumptions explicitly when data is unavailable.

### Step 5 -- Recommend Next Steps

After delivering the primary output, suggest related actions from other
domains. Examples:
- After writing landing page copy, suggest CRO audit of the page.
- After email sequence, suggest analytics tracking setup.
- After launch plan, suggest ad creative and referral program.

## Scripts

When a reference calls for platform data, use the CLI scripts at
`${CLAUDE_PLUGIN_ROOT}/skills/unmassk-marketing/scripts/`. Each script is a
zero-dependency Node.js CLI that calls the platform API. Run:

```
node ${CLAUDE_PLUGIN_ROOT}/skills/unmassk-marketing/scripts/<platform>.js <command> [args]
```

Scripts require API keys set as environment variables. Each script prints
usage instructions when invoked with no arguments.

### Script Categories

| Category | Scripts | Use For |
|---|---|---|
| CRM | `close.js`, `intercom.js` | Contact data, deal pipeline, conversations |
| Ad Platforms | `google-ads.js`, `meta-ads.js`, `linkedin-ads.js`, `tiktok-ads.js` | Campaign performance, spend, ROAS |
| Analytics | `ga4.js`, `amplitude.js`, `mixpanel.js`, `segment.js`, `plausible.js`, `hotjar.js`, `adobe-analytics.js` | Traffic, events, funnels, heatmaps |
| Email | `mailchimp.js`, `customer-io.js`, `kit.js`, `resend.js`, `sendgrid.js`, `postmark.js`, `klaviyo.js`, `brevo.js`, `beehiiv.js`, `activecampaign.js` | Campaign metrics, sequences, deliverability |
| SEO / Content | `dataforseo.js`, `ahrefs.js`, `semrush.js`, `google-search-console.js`, `keywords-everywhere.js`, `similarweb.js` | Keywords, rankings, backlinks, traffic estimates |
| Sales / Outreach | `apollo.js`, `hunter.js`, `snov.js`, `instantly.js`, `lemlist.js`, `outreach.js`, `zoominfo.js`, `clearbit.js`, `clay.js` | Lead enrichment, prospecting, outreach sequences |
| Growth / Referral | `rewardful.js`, `tolt.js`, `dub.js`, `mention-me.js`, `partnerstack.js`, `crossbeam.js` | Affiliate programs, referral tracking, partnerships |
| Testing / Optimization | `optimizely.js`, `typeform.js` | A/B tests, form analytics |
| Scheduling / Webinars | `calendly.js`, `savvycal.js`, `demio.js`, `livestorm.js` | Event data, booking metrics |
| Social | `buffer.js` | Social scheduling, engagement metrics |
| Reviews | `trustpilot.js`, `g2.js` | Review data, sentiment |
| Automation | `zapier.js`, `airops.js`, `supermetrics.js`, `coupler.js` | Workflow data, cross-platform sync |
| Payments | `paddle.js` | Subscription data, MRR, churn |
| Push / Messaging | `onesignal.js`, `pendo.js`, `wistia.js` | Push notifications, in-app guides, video analytics |

### Script Usage Rules

- Run scripts via Bash. Do not attempt to replicate their logic manually.
- If a script fails due to missing API key, inform the user which environment
  variable to set and proceed with the task using available data.
- Batch related queries when possible to minimize API calls.
- Use `--dry-run` flag when available to preview requests before sending.

## MCP Integration

If Composio MCP is available, prefer MCP tools over CLI scripts for platforms
that require OAuth (HubSpot, Salesforce, Meta Ads, LinkedIn Ads). MCP tools
handle token refresh automatically and avoid manual API key setup.

### MCP Quick Reference

| Platform | Prefer MCP When | Fall Back To |
|---|---|---|
| HubSpot | Composio MCP configured | CLI not available (OAuth required) |
| Salesforce | Composio MCP configured | CLI not available (OAuth required) |
| Meta Ads | Composio MCP configured | `meta-ads.js` (with manual token) |
| LinkedIn Ads | Composio MCP configured | `linkedin-ads.js` (with manual token) |
| Google Sheets | Composio MCP configured | Manual export/import |
| Slack | Composio MCP configured | Manual notification |

### MCP Usage Rules

- Check for MCP tool availability before calling. Do not assume availability.
- Use MCP data to supplement script output, not replace it.
- When MCP data conflicts with script data, flag the discrepancy.
- For platforms with both CLI and MCP options, prefer MCP when OAuth is
  required and CLI when API key auth is sufficient.

## Reference Files

All paths relative to the skill root (`skills/unmassk-marketing/`).

| File | Domain | Load When |
|---|---|---|
| `references/copy.md` | Copywriting frameworks, headline formulas, value proposition templates, page copy patterns, voice and tone | User asks to write or improve any marketing copy |
| `references/cro.md` | Conversion rate optimization, page audits, form optimization, popup strategy, signup flows, CTA placement | User asks about conversions, CRO, or optimizing any page element |
| `references/email.md` | Email sequences, cold email templates, drip campaigns, nurture flows, subject lines, deliverability | User asks about email marketing, cold outreach, or email sequences |
| `references/retention.md` | Onboarding flows, churn prevention, paywall optimization, pricing strategy, lifecycle stages, NPS | User asks about retention, churn, onboarding, pricing, or paywalls |
| `references/ads.md` | Paid ad strategy, ad creative frameworks, audience targeting, budget allocation, ROAS optimization | User asks about paid ads, ad creative, or advertising campaigns |
| `references/analytics.md` | A/B test design, analytics tracking plans, attribution models, event taxonomy, dashboard setup | User asks about A/B testing, analytics, tracking, or measurement |
| `references/growth.md` | Launch playbooks, lead magnet creation, referral programs, free tool strategy, viral loops, PLG | User asks about launches, lead magnets, referrals, or growth tactics |
| `references/sales.md` | Sales enablement content, RevOps workflows, lead scoring models, sales decks, battle cards, pipeline | User asks about sales support, RevOps, lead scoring, or sales decks |
| `references/foundations.md` | Marketing psychology principles, ideation frameworks, strategic planning, competitive positioning | User asks about marketing ideas, psychology, strategy, or positioning |
| `references/integrations-crm.md` | CRM platform integration guides for HubSpot, Salesforce, Close, Intercom, and related tools | User needs CRM data or asks about CRM setup and workflows |
| `references/integrations-ads.md` | Ad platform integration guides for Google Ads, Meta Ads, LinkedIn Ads, TikTok Ads | User needs ad performance data or asks about ad platform configuration |
| `references/integrations-analytics.md` | Analytics platform integration guides for GA4, Amplitude, Mixpanel, Segment, Plausible, Hotjar | User needs analytics data or asks about tracking implementation |
| `references/integrations-email.md` | Email platform integration guides for Mailchimp, Customer.io, Kit, Resend, SendGrid, Klaviyo | User needs email metrics or asks about email platform configuration |
| `references/product-context-template.md` | Template for creating product marketing context documents with all required sections | Product context document does not exist and needs to be created |

## Priority Levels

Assign every recommendation one of these levels.

| Priority | Meaning | Expected Impact |
|---|---|---|
| Critical | Blocking revenue or causing active harm | Fix immediately |
| High | Significant missed opportunity or inefficiency | Address within 1 week |
| Medium | Optimization that improves performance | Address within 1 month |
| Low | Nice-to-have improvement | Backlog |

## Multi-Domain Tasks

Some requests span multiple marketing domains. Handle them by loading
references sequentially and producing a unified deliverable.

### Common Multi-Domain Patterns

| User Request | References to Load | Execution Order |
|---|---|---|
| "Launch my product" | `growth.md`, `copy.md`, `email.md`, `ads.md` | Plan first (growth), then assets (copy, email, ads) |
| "Improve my funnel" | `cro.md`, `analytics.md`, `email.md` | Diagnose (analytics), audit (CRO), nurture (email) |
| "Set up my marketing stack" | Integration references, `analytics.md` | Analytics first, then CRM, email, ads |
| "Create a sales playbook" | `sales.md`, `copy.md`, `email.md` | Strategy (sales), content (copy), outreach (email) |
| "Reduce churn" | `retention.md`, `analytics.md`, `email.md` | Diagnose (analytics), strategy (retention), execute (email) |

For multi-domain tasks, produce one unified deliverable with clear sections
per domain, not separate disconnected outputs. Cross-reference dependencies
between sections (e.g., "the welcome email from Section 3 should link to the
onboarding flow described in Section 2").

## Quality Gates

Hard rules that apply to every marketing output. Do not override based on
user preference.

### Copy Rules

- Never use placeholder text like "[Company Name]" or "[Product]" in final
  deliverables. Pull actual names from the product context document.
- Every headline must have a clear value proposition. "Welcome to Our
  Platform" is not a headline -- it is a greeting.
- CTAs must be specific. "Learn More" is weak. "Start Your Free Trial" or
  "See Pricing" tells the user what happens next.

### Data Rules

- Never present fabricated metrics as real data. If you do not have actual
  numbers from scripts or MCP, label projections explicitly as estimates.
- When citing benchmarks (average open rates, conversion rates, CTR), specify
  the source and note that benchmarks vary by industry and audience.
- Do not recommend A/B test durations shorter than 2 weeks or sample sizes
  below statistical significance thresholds.

### Strategy Rules

- Never recommend a channel or tactic without considering the user's
  resources (team size, budget, technical capability). Ask if unclear.
- Paid ad recommendations must include budget guardrails. Do not suggest
  "start running Meta Ads" without minimum viable spend guidance.
- Email frequency recommendations must account for list size and engagement
  history. Sending daily emails to a cold list of 200 is counterproductive.

### Integration Rules

- When recommending tool integrations, verify the user's current stack first.
  Do not suggest migrating from Mailchimp to Customer.io as a casual aside.
- Script outputs may contain sensitive data (revenue, customer emails, deal
  values). Never include raw API responses in user-facing deliverables
  without redacting PII.

## Output Standards

Every deliverable must meet these criteria.

1. **Grounded in product context** -- Reference the user's specific product,
   audience, and positioning. Never produce generic "SaaS company" outputs.
2. **Implementation-ready** -- Provide copy that can be used as-is, configs
   that can be pasted into platforms, and plans with specific action items.
3. **Data-informed** -- Use platform data from scripts/MCP when available.
   State assumptions when data is unavailable.
4. **Prioritized** -- Rank recommendations by expected impact. Lead with
   quick wins.
5. **Cross-referenced** -- Note when a recommendation connects to another
   marketing domain (e.g., copy change that affects CRO, email sequence that
   needs analytics tracking).

## Output Format

Structure deliverables consistently based on task type.

### For Audits (CRO, Analytics, Funnel)

```
## Audit: [Area]

### Summary
- Current state: [data-backed assessment]
- Key issues: [count] findings across [domains]

### Findings
| # | Priority | Domain | Issue | Recommendation | Effort |
|---|----------|--------|-------|----------------|--------|

### Quick Wins
[Top 3 low-effort, high-impact actions]

### Implementation Roadmap
[Sequenced plan with dependencies noted]
```

### For Copy Deliverables (Headlines, Pages, Emails)

```
## [Deliverable Type]

### Context
- Target audience: [from product context]
- Goal: [conversion, awareness, retention]
- Tone: [from product context or reference]

### Primary Version
[Ready-to-use copy]

### Variant
[Alternative angle or approach for testing]

### Implementation Notes
[Where to place, what to measure, when to test]
```

### For Strategy Plans (Launch, Growth, Retention)

```
## [Strategy Type] Plan

### Objectives
[Specific, measurable goals with timeframes]

### Phases
1. [Phase name] -- [timeline] -- [key actions]
2. [Phase name] -- [timeline] -- [key actions]

### Resource Requirements
[Team, budget, tools needed]

### Success Metrics
[KPIs to track with target values]

### Risks
[What could go wrong and how to handle it]
```

## Validation (Evals)

159 test cases at `${CLAUDE_PLUGIN_ROOT}/skills/unmassk-marketing/evals/evals.json` validate reference quality. Each eval has a prompt, expected output, and assertions.

Search evals with:
```
python3 ${CLAUDE_PLUGIN_ROOT}/skills/unmassk-marketing/evals/search-evals.py --reference copy.md
python3 ${CLAUDE_PLUGIN_ROOT}/skills/unmassk-marketing/evals/search-evals.py --keyword pricing
python3 ${CLAUDE_PLUGIN_ROOT}/skills/unmassk-marketing/evals/search-evals.py --random
```

Use evals to verify output quality after completing a marketing task. Compare agent output against the expected output and assertions for the relevant reference.

## Attribution

Based on marketingskills by coreyhaines31 (MIT License).
