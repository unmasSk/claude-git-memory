# unmassk-seo

**Technical SEO toolkit for auditing, optimizing, and monitoring websites.**

Full site audits, single-page deep analysis, Core Web Vitals diagnostics, schema markup detection and validation, E-E-A-T content assessment, image optimization, sitemap analysis, hreflang validation, programmatic SEO at scale, competitor comparison pages, and Generative Engine Optimization (GEO) for AI Overviews, ChatGPT, and Perplexity citations. Industry detection for SaaS, e-commerce, local business, publishers, and agencies.

Based on [claude-seo](https://github.com/AgriciDaniel/claude-seo) by AgriciDaniel (MIT License).

## What's included

- 1 skill (`unmassk-seo`)
- 12 reference files
- 4 Python scripts
- 2 hooks
- 5 MCP servers

## Quick start

Run `/plugin` in Claude Code and install `unmassk-seo` from the marketplace.

## Dependencies

Requires the **unmassk-crew** plugin for agent execution. Install it from the marketplace before using unmassk-seo.

## MCP setup

The plugin configures 5 MCP servers for live SEO data enrichment. All are optional -- the toolkit works without them using script-based analysis only.

Set the required environment variables in your shell before launching Claude Code.

| MCP Server | Env Variables | Where to get credentials | What it provides |
|---|---|---|---|
| **DataForSEO** | `DATAFORSEO_USERNAME`, `DATAFORSEO_PASSWORD` | [dataforseo.com](https://dataforseo.com/) -- API credentials from your account dashboard | SERP analysis, keyword data, backlinks, on-page audits, tech stack detection, AI search tracking |
| **Ahrefs** | `AHREFS_API_KEY` | [ahrefs.com](https://ahrefs.com/) -- API key from Account Settings | Backlink analysis, domain ratings, keyword research |
| **Semrush** | `SEMRUSH_API_KEY` | [semrush.com](https://semrush.com/) -- API key from your subscription | Competitive intelligence, keyword analytics, domain analysis |
| **Google Search Console** | `GSC_CREDENTIALS_PATH` | [Google Cloud Console](https://console.cloud.google.com/) -- service account JSON with Search Console API access | Search performance data, indexing status, Core Web Vitals reports |
| **PageSpeed** | `PAGESPEED_API_KEY` | [Google Cloud Console](https://console.cloud.google.com/) -- enable PageSpeed Insights API and generate an API key | Real-time Lighthouse audits, CrUX field data, Core Web Vitals measurements |

## Scripts

Four Python scripts handle data retrieval and analysis. They are mandatory tools -- Claude runs them automatically during audits.

| Script | What it does |
|---|---|
| `fetch_page.py` | Retrieves page HTML with proper User-Agent headers and redirect handling. Captures final HTTP status code. |
| `parse_html.py` | Extracts structured SEO data from HTML: title, meta tags, headings, canonical, robots directives, Open Graph, Twitter Card, schema markup, images with alt text, internal/external links, word count. |
| `capture_screenshot.py` | Captures desktop (1440px) and mobile (375px) viewport screenshots for visual analysis. |
| `analyze_visual.py` | Evaluates above-fold content density, CTA visibility, mobile rendering quality, layout shift indicators, font readability, and touch target spacing. |

### Dependencies

Install before first use:

```
pip install -r ${CLAUDE_PLUGIN_ROOT}/skills/unmassk-seo/scripts/requirements.txt
```

Requires: `requests`, `beautifulsoup4`, `lxml`, `playwright`.

After installing, run `playwright install` to download browser binaries for screenshot capture.

## Hooks

Two non-blocking, warning-only hooks run automatically.

| Hook | Trigger | What it checks |
|---|---|---|
| **Pre-commit SEO check** | `PreToolUse` on Bash (git commit) | Warns if a commit touches SEO-critical files (meta tags, schema markup, robots.txt, sitemap) without corresponding test or validation. |
| **Schema validation** | `PostToolUse` on Edit/Write | Validates JSON-LD schema markup in edited files. Checks for deprecated types, missing required properties, and syntax errors. |

## References

Twelve reference files provide the knowledge base for all audit types. Claude loads them on-demand based on the analysis requested.

| Reference | Domain |
|---|---|
| `technical.md` | Crawlability, indexability, Core Web Vitals, mobile optimization, JS rendering, security headers, AI crawler management |
| `content.md` | E-E-A-T framework, content quality assessment, AI content detection, readability, keyword optimization |
| `schema.md` | Schema.org types (active, restricted, deprecated), JSON-LD validation rules, templates |
| `geo.md` | Generative Engine Optimization, AI search visibility, citability signals, llms.txt, AI crawler access |
| `images.md` | Image optimization, alt text rules, format recommendations, lazy loading, CLS prevention, responsive images |
| `sitemap.md` | XML sitemap validation, generation, quality gates for programmatic pages, sitemap index architecture |
| `hreflang.md` | International SEO, hreflang validation (8 checks), language/region codes, implementation methods |
| `programmatic.md` | Programmatic SEO at scale, template quality, thin content safeguards, index bloat prevention |
| `plan.md` | SEO strategy templates per industry (SaaS, e-commerce, local, publisher, agency), competitive analysis |
| `competitor.md` | Competitor comparison pages, "X vs Y" layouts, feature matrices, conversion optimization |
| `page-analysis.md` | Deep single-page audit, on-page scoring, content gap analysis, above-fold visual analysis |
| `thresholds.md` | Core Web Vitals threshold values, scoring weights, content minimums, quality gate numbers |

## License

MIT
