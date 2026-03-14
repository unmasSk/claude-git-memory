# unmassk-marketing

**Strategic marketing toolkit for analysis, copywriting, and growth execution.**

Covers 9 marketing domains: copywriting, CRO, email, retention, paid ads, analytics, growth, sales enablement, and marketing foundations. 61 CLI scripts for platform API access across CRM, ad platforms, analytics, email, SEO, sales, growth, testing, social, reviews, automation, payments, and messaging. Composio MCP for OAuth-based platforms. Product context system that grounds every output in your specific product, audience, and positioning.

Based on [marketingskills](https://github.com/coreyhaines31/marketingskills) by Corey Haines (MIT License).

## What's included

- 1 skill (`unmassk-marketing`)
- 9 domain references
- 4 integration references
- 61 CLI scripts
- 197 evals
- Composio MCP server
- Product-context template

## Quick start

Run `/plugin` in Claude Code and install `unmassk-marketing` from the marketplace.

## Product context

Before any marketing task, the skill checks for a product marketing context document at `.agents/product-marketing-context.md` in your project root.

- **If it exists** -- the skill reads your product, audience, positioning, and messaging data to inform all outputs.
- **If it does not exist** -- the skill creates one from a built-in template, auto-drafting from your codebase (README, landing pages, marketing copy, package.json) and asking you to review and fill gaps.

Every reference file assumes product context is loaded. Outputs without product context will be generic.

## Domain references

Nine reference files provide frameworks, templates, and checklists for each marketing domain. The skill loads them on-demand based on your request.

| Reference | Domain |
|---|---|
| `copy.md` | Copywriting frameworks, headline formulas, value proposition templates, page copy patterns |
| `cro.md` | Conversion rate optimization, page audits, form optimization, popup strategy, signup flows |
| `email.md` | Email sequences, cold email templates, drip campaigns, nurture flows, deliverability |
| `retention.md` | Onboarding flows, churn prevention, paywall optimization, pricing strategy, lifecycle stages |
| `ads.md` | Paid ad strategy, ad creative frameworks, audience targeting, budget allocation, ROAS optimization |
| `analytics.md` | A/B test design, analytics tracking plans, attribution models, event taxonomy, dashboard setup |
| `growth.md` | Launch playbooks, lead magnet creation, referral programs, free tool strategy, viral loops |
| `sales.md` | Sales enablement content, RevOps workflows, lead scoring models, sales decks, battle cards |
| `foundations.md` | Marketing psychology, ideation frameworks, strategic planning, competitive positioning |

## Integration references

Four integration references cover platform-specific setup, authentication, and data retrieval patterns.

| Reference | Platforms |
|---|---|
| `integrations-crm.md` | HubSpot, Salesforce, Close, Intercom |
| `integrations-ads.md` | Google Ads, Meta Ads, LinkedIn Ads, TikTok Ads |
| `integrations-analytics.md` | GA4, Amplitude, Mixpanel, Segment, Plausible, Hotjar |
| `integrations-email.md` | Mailchimp, Customer.io, Kit, Resend, SendGrid, Klaviyo |

## CLI scripts

61 zero-dependency Node.js scripts that call platform APIs directly. Each script prints usage instructions when invoked with no arguments. Scripts require API keys set as environment variables.

```
node ${CLAUDE_PLUGIN_ROOT}/skills/unmassk-marketing/scripts/<platform>.js <command> [args]
```

### Platforms by category

| Category | Platforms |
|---|---|
| CRM | Close, Intercom |
| Ad Platforms | Google Ads, Meta Ads, LinkedIn Ads, TikTok Ads |
| Analytics | GA4, Amplitude, Mixpanel, Segment, Plausible, Hotjar, Adobe Analytics |
| Email | Mailchimp, Customer.io, Kit, Resend, SendGrid, Postmark, Klaviyo, Brevo, Beehiiv, ActiveCampaign |
| SEO / Content | DataForSEO, Ahrefs, Semrush, Google Search Console, Keywords Everywhere, SimilarWeb |
| Sales / Outreach | Apollo, Hunter, Snov, Instantly, Lemlist, Outreach, ZoomInfo, Clearbit, Clay |
| Growth / Referral | Rewardful, Tolt, Dub, Mention Me, PartnerStack, Crossbeam |
| Testing / Optimization | Optimizely, Typeform |
| Scheduling / Webinars | Calendly, SavvyCal, Demio, Livestorm |
| Social | Buffer |
| Reviews | Trustpilot, G2 |
| Automation | Zapier, AirOps, Supermetrics, Coupler |
| Payments | Paddle |
| Push / Messaging | OneSignal, Pendo, Wistia |

## MCP setup

The plugin configures one MCP server for OAuth-based platform access.

| MCP Server | Env Variable | What it provides |
|---|---|---|
| **Composio** | `COMPOSIO_API_KEY` | OAuth-based access to HubSpot, Salesforce, Meta Ads, LinkedIn Ads, Google Sheets, Slack |

Set the environment variable in your shell before launching Claude Code. Get your API key from [composio.dev](https://composio.dev/).

When both CLI scripts and Composio MCP are available for a platform, the skill prefers MCP for OAuth-required platforms and CLI for API-key-based platforms.

## Evals

197 evals validate skill behavior across all 9 marketing domains and 4 integration categories. Each eval tests a specific routing decision, reference loading pattern, or output quality gate.

Run evals to verify that the skill correctly routes requests, loads appropriate references, applies product context, and produces outputs that meet quality standards.

## Attribution

Based on [marketingskills](https://github.com/coreyhaines31/marketingskills) by Corey Haines (MIT License).

## License

MIT
