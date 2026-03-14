---
name: unmassk-seo
description: >
  Use when the user asks to "audit a website", "audit a page",
  "check SEO", "analyze SEO", "technical SEO audit", "check Core Web Vitals",
  "check CWV", "check page speed", "optimize images for SEO", "check alt text",
  "validate schema markup", "generate JSON-LD", "check structured data",
  "analyze sitemap", "generate sitemap", "check hreflang", "international SEO audit",
  "E-E-A-T analysis", "content quality check", "AI Overviews optimization",
  "GEO optimization", "optimize for ChatGPT", "optimize for Perplexity",
  "AI search visibility", "programmatic SEO", "SEO at scale",
  "SEO strategy", "SEO plan", "competitor SEO analysis",
  "compare vs competitor", "alternatives page SEO",
  or mentions any of: SEO, schema, sitemap, hreflang, Core Web Vitals, INP, LCP, CLS,
  E-E-A-T, GEO, AI Overviews, structured data, robots.txt, crawlability, indexability,
  rich results, JSON-LD, PageSpeed, Lighthouse, image optimization, meta tags,
  canonical tags, redirect audit, mobile SEO, JavaScript SEO, IndexNow.
  Covers full site audits, single-page deep analysis, technical SEO (9 categories),
  content quality (E-E-A-T framework with scoring), schema markup (detection,
  validation, generation with JSON-LD templates), image optimization, XML sitemap
  analysis and generation, hreflang validation (8 checks), programmatic SEO at scale
  with quality gates, strategic SEO planning (4 phases, 6 industry templates),
  competitor comparison pages, and Generative Engine Optimization (GEO) for
  AI Overviews, ChatGPT, Perplexity, and Bing Copilot. Industry detection for
  SaaS, e-commerce, local service, publisher, and agency sites.
  Includes 4 mandatory Python scripts for page fetching, HTML parsing, screenshot
  capture, and visual analysis. Integrates with 5 MCP servers: DataForSEO, Ahrefs,
  Semrush, Google Search Console, and PageSpeed Insights.
  Based on claude-seo by AgriciDaniel (MIT License).
version: 1.0.0
---

# SEO -- Technical SEO Toolkit

Comprehensive SEO analysis across all industries. Orchestrate audits, generate
optimized markup, and produce prioritized action plans using mandatory analysis
scripts and on-demand reference files.

Based on claude-seo by AgriciDaniel (MIT License).

## Request Routing

Map user intent to the correct reference file and workflow.

| User Request | Load Reference | Script Pipeline |
|---|---|---|
| Full site audit | All references as needed | fetch + parse + screenshot + visual |
| Technical SEO check | `references/technical.md` | fetch + parse |
| Content quality / E-E-A-T | `references/content.md` | fetch + parse |
| Schema / structured data | `references/schema.md` | fetch + parse |
| AI search / GEO / AEO | `references/geo.md` | fetch + parse |
| Image optimization | `references/images.md` | fetch + parse + screenshot + visual |
| Sitemap analysis | `references/sitemap.md` | fetch + parse |
| Hreflang / international SEO | `references/hreflang.md` | fetch + parse |
| Programmatic SEO | `references/programmatic.md` | fetch + parse |
| SEO strategy / plan | `references/plan.md` | fetch + parse (if URL provided) |
| Competitor comparison | `references/competitor.md` | fetch + parse |
| Deep single-page audit | `references/page-analysis.md` | fetch + parse + screenshot + visual |
| Scoring thresholds / CWV values | `references/thresholds.md` | -- |

Load references on-demand as needed. Do NOT load all at startup.

## SEO Health Score (0-100)

Weighted aggregate across all audit categories.

| Category | Weight | Reference |
|---|---|---|
| Technical SEO | 22% | `references/technical.md` |
| Content Quality | 23% | `references/content.md` |
| On-Page SEO | 20% | `references/content.md`, `references/page-analysis.md` |
| Schema / Structured Data | 10% | `references/schema.md` |
| Performance (CWV) | 10% | `references/thresholds.md` |
| AI Search Readiness | 10% | `references/geo.md` |
| Images | 5% | `references/images.md` |

Compute each category score as 0-100, then multiply by weight. Sum all weighted
scores for the final SEO Health Score.

See `references/thresholds.md` for exact CWV values, scoring breakpoints, and
quality gates.

## Priority Levels

Assign every finding one of these levels.

| Priority | Meaning | Fix Timeline |
|---|---|---|
| Critical | Blocks indexing or causes penalties | Immediate |
| High | Significantly impacts rankings | Within 1 week |
| Medium | Optimization opportunity | Within 1 month |
| Low | Nice to have | Backlog |

## Industry Detection

Detect business type from homepage signals before generating recommendations.

- **SaaS** -- pricing page, /features, /integrations, /docs, "free trial", "sign up"
- **E-commerce** -- /products, /collections, /cart, "add to cart", product schema
- **Local Service** -- phone number, address, service area, "serving [city]", Google Maps embed
- **Publisher** -- /blog, /articles, /topics, article schema, author pages, publication dates
- **Agency** -- /case-studies, /portfolio, /industries, "our work", client logos

Apply industry-specific weighting and recommendations from `references/plan.md`
after detection.

## Audit Workflow

Follow these steps in order. Steps 1-4 are MANDATORY for every audit. Do not
skip any step or attempt to replicate script logic manually.

### Step 1 -- Fetch HTML

Run the fetch script to retrieve the target page.

```
${CLAUDE_PLUGIN_ROOT}/skills/unmassk-seo/scripts/fetch_page.py <url>
```

This produces a local HTML file for subsequent analysis. The script handles
redirects, sets proper User-Agent headers, and captures the final HTTP status.
If the fetch fails, report the HTTP status code and stop -- do not proceed with
stale or missing HTML.

For full site audits, fetch the homepage first, then fetch key interior pages
(pricing, about, blog index, product/service pages) as needed.

### Step 2 -- Parse SEO Elements

Run the parse script against the fetched HTML file.

```
${CLAUDE_PLUGIN_ROOT}/skills/unmassk-seo/scripts/parse_html.py <file>
```

This extracts structured SEO data including: title tag, meta description,
heading hierarchy (H1-H6), canonical URL, robots meta directives, Open Graph
and Twitter Card tags, schema markup (JSON-LD, Microdata, RDFa), all images
with alt text status, internal and external link inventory, and total word count.

Review the parsed output before proceeding. Flag immediately visible issues
(missing title, no H1, multiple H1s, missing canonical) as early findings.

### Step 3 -- Capture Screenshot

Run the screenshot script for visual analysis.

```
${CLAUDE_PLUGIN_ROOT}/skills/unmassk-seo/scripts/capture_screenshot.py <url>
```

Captures desktop (1440px) and mobile (375px) viewport screenshots. These
screenshots are required for above-fold content assessment, mobile rendering
validation, and CTA visibility checks.

Skip this step only if the URL is an API endpoint, XML sitemap, or non-HTML
resource.

### Step 4 -- Visual Analysis

Run the visual analysis script against the captured screenshots.

```
${CLAUDE_PLUGIN_ROOT}/skills/unmassk-seo/scripts/analyze_visual.py <file>
```

Evaluates above-fold content density, CTA visibility and placement, mobile
rendering quality, layout shift indicators, font readability, and touch target
spacing. Cross-reference visual findings with parse output from Step 2 to
identify discrepancies between HTML structure and rendered appearance.

### Step 5 -- Load References and Analyze

Based on audit type and parsed data, load the relevant reference files from the
routing table above. For a full audit, load references progressively as each
category is analyzed -- not all at once.

For each loaded reference:
1. Compare parsed data against the checklist in the reference file.
2. Apply industry-specific rules from `references/plan.md` if detected.
3. Record every finding with its priority level.
4. Check MCP tool availability and enrich with live data where possible.

### Step 6 -- Score and Prioritize

Apply the SEO Health Score weights. Classify every finding by priority level.
Produce the final report with:

1. SEO Health Score (0-100) with category breakdown
2. Individual category scores showing the calculation
3. Findings table sorted by priority (Critical first, then High, Medium, Low)
4. Actionable recommendation for each finding with estimated effort
5. Industry-specific guidance based on detected business type
6. Quick wins section highlighting low-effort, high-impact fixes

## Reference Files

All paths relative to the skill root (`skills/unmassk-seo/`).

| File | Domain | Load When |
|---|---|---|
| `references/technical.md` | Crawlability, indexability, CWV, mobile, JS rendering, security headers, AI crawler management | Technical audit or full audit |
| `references/content.md` | E-E-A-T framework, content quality, AI content assessment, readability, keyword optimization | Content audit or full audit |
| `references/schema.md` | Schema.org types, validation rules, JSON-LD templates, deprecated types, generation guidelines | Schema analysis or structured data detected |
| `references/geo.md` | AI search optimization, GEO/AEO, citability signals, llms.txt compliance, AI crawler accessibility | GEO analysis or AI search readiness check |
| `references/images.md` | Image optimization, alt text rules, format recommendations, lazy loading, CLS prevention, responsive images | Image audit or full audit |
| `references/sitemap.md` | XML sitemap analysis, validation checks, generation templates, quality gates, sitemap index format | Sitemap analysis or generation request |
| `references/hreflang.md` | International SEO, hreflang validation, language/region codes, implementation methods, return tag rules | Hreflang audit or multi-language site detected |
| `references/programmatic.md` | Programmatic SEO at scale, template quality, thin content safeguards, index bloat prevention | Programmatic SEO analysis or large-scale page generation |
| `references/plan.md` | SEO strategy templates per industry, competitive positioning, keyword research frameworks | SEO plan or strategy request |
| `references/competitor.md` | Competitor comparison pages, "X vs Y" layouts, feature matrices, conversion optimization | Competitor comparison analysis or page generation |
| `references/page-analysis.md` | Deep single-page audit, on-page scoring, content gap analysis, internal linking assessment | Single-page deep analysis request |
| `references/thresholds.md` | CWV threshold values (LCP, INP, CLS), scoring weight breakpoints, quality gate numbers | Any audit requiring numeric thresholds |

## Scripts

These scripts are MANDATORY tools. Run them via Bash -- do not attempt to
replicate their logic manually.

| Script | Purpose | Usage |
|---|---|---|
| `fetch_page.py` | Retrieve page HTML with proper headers and redirect handling | `${CLAUDE_PLUGIN_ROOT}/skills/unmassk-seo/scripts/fetch_page.py <url>` |
| `parse_html.py` | Extract all SEO elements from HTML into structured data | `${CLAUDE_PLUGIN_ROOT}/skills/unmassk-seo/scripts/parse_html.py <file>` |
| `capture_screenshot.py` | Capture desktop and mobile viewport screenshots | `${CLAUDE_PLUGIN_ROOT}/skills/unmassk-seo/scripts/capture_screenshot.py <url>` |
| `analyze_visual.py` | Analyze screenshots for above-fold content and mobile rendering | `${CLAUDE_PLUGIN_ROOT}/skills/unmassk-seo/scripts/analyze_visual.py <file>` |

Install dependencies before first run:

```
pip install -r ${CLAUDE_PLUGIN_ROOT}/skills/unmassk-seo/scripts/requirements.txt
```

## MCP Integration (Optional)

When DataForSEO MCP tools are available, use them to enrich analysis with live
data. If MCP tools are not configured, proceed with script-based analysis only.

### MCP Quick Reference

| Domain | MCP Tools | Use For |
|---|---|---|
| Technical SEO | `on_page_instant_pages`, `on_page_lighthouse`, `domain_analytics_technologies_domain_technologies` | Real page analysis (status codes, timing, broken links), Lighthouse scores, tech stack detection |
| Content Quality | `kw_data_google_ads_search_volume`, `dataforseo_labs_bulk_keyword_difficulty`, `dataforseo_labs_search_intent`, `content_analysis_summary` | Keyword volume, difficulty scores, intent classification, content quality metrics |
| Page Analysis | `serp_organic_live_advanced`, `backlinks_summary` | Real SERP positions, backlink profiles, spam scores |
| AI Search / GEO | `ai_optimization_chat_gpt_scraper`, `ai_opt_llm_ment_search`, `ai_opt_llm_ment_top_domains` | ChatGPT search visibility, LLM mention tracking across AI platforms |
| SEO Strategy | `dataforseo_labs_google_competitors_domain`, `dataforseo_labs_google_domain_intersection`, `dataforseo_labs_bulk_traffic_estimation` | Competitive intelligence, domain overlap, traffic estimates |
| Keyword Research | `kw_data_google_ads_search_volume`, `dataforseo_labs_bulk_keyword_difficulty` | Search volume, keyword difficulty |
| Local SEO | `business_data_business_listings_search` | Local business data, NAP consistency |
| Full Audit | All of the above | Spawn MCP queries alongside script pipeline for enriched audit |

### MCP Usage Rules

- Check for MCP tool availability before calling. Do not assume availability.
- Use MCP data to supplement script output, not replace it.
- When MCP data conflicts with parsed HTML, flag the discrepancy in findings.
- Rate-limit MCP calls -- batch where possible.

## Quality Gates

Hard rules that apply to every audit. Violations of these rules are
non-negotiable -- do not override based on user preference.

### Schema Rules

- Never recommend HowTo schema (deprecated September 2023).
- FAQ schema for Google rich results: only government and healthcare sites
  (restricted August 2023). Existing FAQPage on commercial sites: flag as Info
  priority noting AI/LLM citation benefit. Adding new FAQPage: not recommended
  for Google benefit.
- SpecialAnnouncement schema deprecated July 31, 2025 -- do not recommend.
- Serve critical structured data in initial server-rendered HTML, not via
  JavaScript injection (per Google December 2025 JS SEO guidance).

### Core Web Vitals Rules

- All CWV references use INP (Interaction to Next Paint), never FID.
- FID was fully removed from all Chrome tools on September 9, 2024.
- Evaluation uses 75th percentile of real user data.
- See `references/thresholds.md` for exact LCP, INP, and CLS threshold values.

### Programmatic SEO Rules

- WARNING at 30+ location pages (enforce 60%+ unique content).
- HARD STOP at 50+ location pages (require user justification before proceeding).
- Unique content per programmatic page must exceed 40% -- flag below that as
  thin content risk.

### Indexing Rules

- Mobile-first indexing is 100% complete as of July 5, 2024. Google crawls and
  indexes all websites exclusively with the mobile Googlebot user-agent.
- Blocking Google-Extended in robots.txt prevents Gemini training but does NOT
  affect Google Search indexing or AI Overviews.

## Output Format

Every audit produces a structured report.

### SEO Health Score: XX/100

### Category Breakdown

| Category | Score | Weight | Weighted |
|---|---|---|---|
| Technical SEO | XX/100 | 22% | XX |
| Content Quality | XX/100 | 23% | XX |
| On-Page SEO | XX/100 | 20% | XX |
| Schema / Structured Data | XX/100 | 10% | XX |
| Performance (CWV) | XX/100 | 10% | XX |
| AI Search Readiness | XX/100 | 10% | XX |
| Images | XX/100 | 5% | XX |
| **Total** | | | **XX/100** |

### Findings

| # | Priority | Category | Issue | Recommendation |
|---|---|---|---|---|
| 1 | Critical | ... | ... | ... |
| 2 | High | ... | ... | ... |

### Industry-Specific Recommendations

Tailored actions based on detected business type.
