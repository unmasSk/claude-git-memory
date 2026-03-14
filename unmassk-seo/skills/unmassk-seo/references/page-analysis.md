# Single Page Analysis -- Reference

Deep single-page SEO audit covering on-page elements, content quality,
technical meta tags, schema markup, images, Core Web Vitals indicators,
and above-fold visual analysis. Use this reference when the user says
"analyze this page", "check page SEO", "page audit", or provides a single
URL for review.

---

## Audit Pipeline

Execute these steps in order for every single-page analysis. Do not skip
steps or attempt to replicate script logic manually.

### Step 1 -- Fetch HTML

```
${CLAUDE_PLUGIN_ROOT}/skills/unmassk-seo/scripts/fetch_page.py <url>
```

Retrieve the target page HTML. The script handles redirects, sets proper
User-Agent headers, and captures the final HTTP status code. If the fetch
fails, report the HTTP status and stop.

### Step 2 -- Parse SEO Elements

```
${CLAUDE_PLUGIN_ROOT}/skills/unmassk-seo/scripts/parse_html.py <file>
```

Extract structured SEO data: title tag, meta description, heading hierarchy,
canonical URL, robots directives, Open Graph and Twitter Card tags, schema
markup, all images with alt text status, internal and external link
inventory, and word count.

### Step 3 -- Capture Screenshots

```
${CLAUDE_PLUGIN_ROOT}/skills/unmassk-seo/scripts/capture_screenshot.py <url>
```

Capture desktop (1440px) and mobile (375px) viewport screenshots. Required
for above-fold analysis and mobile rendering validation.

Skip this step only if the URL is an API endpoint, XML sitemap, or non-HTML
resource.

### Step 4 -- Visual Analysis

```
${CLAUDE_PLUGIN_ROOT}/skills/unmassk-seo/scripts/analyze_visual.py <file>
```

Run the visual analysis script at
`${CLAUDE_PLUGIN_ROOT}/skills/unmassk-seo/scripts/analyze_visual.py`
against captured screenshots. Evaluate above-fold content density, CTA
visibility and placement, mobile rendering quality, layout shift indicators,
font readability, and touch target spacing.

Cross-reference visual findings with parse output from Step 2 to identify
discrepancies between HTML structure and rendered appearance.

### Step 5 -- Apply Analysis Checks

Load this reference and evaluate every check below against the parsed data
and visual analysis results.

---

## On-Page SEO Checks

Evaluate each element and record findings with priority level.

### Title Tag

| Check | Criteria | Priority if Failing |
|-------|----------|-------------------|
| Present | Page has a `<title>` tag | Critical |
| Length | 30-60 characters | Medium |
| Keyword inclusion | Primary keyword appears in title | High |
| Uniqueness | Title is unique across the site | High |
| Truncation risk | Title does not exceed 60 characters (Google truncates beyond this) | Medium |
| Brand placement | Brand name at end, separated by pipe or dash | Low |
| Compelling copy | Title is descriptive and click-worthy, not keyword-stuffed | Medium |

**Scoring:**
- Missing title: 0/100 (Critical)
- Title present but wrong length: -15 points
- No keyword in title: -20 points
- Duplicate title: -25 points

### Meta Description

| Check | Criteria | Priority if Failing |
|-------|----------|-------------------|
| Present | Page has a `<meta name="description">` tag | High |
| Length | 150-160 characters | Medium |
| Keyword inclusion | Primary keyword appears naturally | Medium |
| Compelling copy | Includes a value proposition or call-to-action | Low |
| Uniqueness | Description is unique across the site | Medium |
| No truncation | Does not exceed 160 characters | Medium |

**Scoring:**
- Missing description: -20 points
- Wrong length: -10 points
- Duplicate description: -15 points

### H1 Tag

| Check | Criteria | Priority if Failing |
|-------|----------|-------------------|
| Present | Page has at least one H1 | Critical |
| Single H1 | Exactly one H1 per page | High |
| Keyword inclusion | Primary keyword appears in H1 | High |
| Matches intent | H1 reflects the page's primary topic | Medium |
| Differs from title | H1 is not identical to the title tag | Low |
| Length | Under 70 characters | Low |

**Scoring:**
- Missing H1: 0/100 for on-page (Critical)
- Multiple H1s: -20 points
- No keyword in H1: -15 points

### Heading Hierarchy (H2-H6)

| Check | Criteria | Priority if Failing |
|-------|----------|-------------------|
| Logical order | No skipped levels (e.g., H1 then H3 without H2) | Medium |
| Descriptive text | Headings describe the section content | Medium |
| Keyword distribution | Secondary keywords appear in H2/H3 headings | Low |
| No empty headings | All heading tags contain text | High |
| Not used for styling | Headings used for structure, not visual formatting | Low |

### URL Structure

| Check | Criteria | Priority if Failing |
|-------|----------|-------------------|
| Short and descriptive | URL reflects page content | Medium |
| Hyphenated words | Words separated by hyphens, not underscores | Medium |
| No parameters | Clean URL without query parameters for primary content | Medium |
| Lowercase | No uppercase characters in URL | Low |
| No stop words | Unnecessary words (the, and, of) removed | Low |
| Length | Under 100 characters | Low |

### Internal Links

| Check | Criteria | Priority if Failing |
|-------|----------|-------------------|
| Sufficient count | At least 3 internal links in body content | High |
| Relevant anchors | Anchor text is descriptive, not "click here" | Medium |
| No broken links | All internal links resolve (no 404s) | Critical |
| Link diversity | Links point to different sections of the site | Low |
| Orphan check | Page is linked from at least one other page | High |

### External Links

| Check | Criteria | Priority if Failing |
|-------|----------|-------------------|
| Authoritative sources | External links point to reputable, relevant sources | Medium |
| Working links | No broken external links | Medium |
| Reasonable count | Not excessive (>50 external links on a single page is unusual) | Low |
| Nofollow on sponsored | Sponsored or affiliate links use rel="nofollow sponsored" | High |
| Open in new tab | External links use target="_blank" (user preference, not SEO) | Low |

---

## Content Quality Checks

### Word Count

Evaluate against page type minimums.

| Page Type | Minimum Words | Recommended |
|-----------|--------------|-------------|
| Homepage | 500 | 800-1200 |
| Product/Service page | 800 | 1000-2000 |
| Blog post | 1,500 | 2000-3000 |
| Category page | 400 | 600-1000 |
| Landing page | 600 | 800-1500 |
| About page | 400 | 600-1000 |
| Comparison page | 1,500 | 2000-3000 |

### Readability

| Check | Criteria | Priority if Failing |
|-------|----------|-------------------|
| Grade level | Appropriate for target audience (typically 8th-10th grade for general content) | Medium |
| Sentence length | Average sentence under 25 words | Low |
| Paragraph length | No paragraph exceeds 4-5 sentences | Low |
| Formatting | Uses bullet points, numbered lists, tables where appropriate | Low |
| Scanability | Headings every 200-300 words for long content | Medium |

### Keyword Optimization

| Check | Criteria | Priority if Failing |
|-------|----------|-------------------|
| Density | Primary keyword appears 1-3% of total words | Medium |
| Semantic variations | Related terms and synonyms present | Medium |
| First 100 words | Primary keyword appears in first 100 words | Medium |
| No stuffing | Keyword density does not exceed 3% | High |
| Natural usage | Keywords read naturally in context | Medium |

### E-E-A-T Signals

| Check | Criteria | Priority if Failing |
|-------|----------|-------------------|
| Author bio | Page has author attribution with credentials | High |
| Author page | Author name links to a dedicated author page | Medium |
| Experience markers | Content shows first-hand experience with the topic | Medium |
| Citations | Claims supported by sources or data | Medium |
| Publication date | Page shows when it was published | Medium |
| Last updated date | Page shows when it was last updated | Medium |
| Trust signals | Contact information, privacy policy, terms of service accessible | High |

### Content Freshness

| Check | Criteria | Priority if Failing |
|-------|----------|-------------------|
| Publication date | Present and in a standard format | Medium |
| Last updated date | Present if content has been modified | Medium |
| Stale content | Content references outdated information (old years, discontinued products) | High |
| Evergreen signals | Content is structured for long-term relevance | Low |

---

## Technical Element Checks

### Canonical Tag

| Check | Criteria | Priority if Failing |
|-------|----------|-------------------|
| Present | Page has a canonical tag | Critical |
| Self-referencing | Canonical points to the page's own URL (unless intentional cross-page canonical) | High |
| Absolute URL | Canonical uses absolute URL, not relative | High |
| HTTPS | Canonical URL uses HTTPS | High |
| No redirect chain | Canonical URL does not redirect | Medium |
| Matches sitemap | Canonical URL matches the URL in the sitemap | Medium |

### Meta Robots

| Check | Criteria | Priority if Failing |
|-------|----------|-------------------|
| Present | Meta robots tag exists | Low (defaults to index,follow) |
| Intentional | If noindex/nofollow, verify it is intentional | Critical |
| No conflicts | Robots meta does not conflict with robots.txt | High |
| X-Robots-Tag | Check HTTP header for X-Robots-Tag directives | Medium |

### Open Graph Tags

| Check | Criteria | Priority if Failing |
|-------|----------|-------------------|
| og:title | Present, compelling, under 70 characters | Medium |
| og:description | Present, under 200 characters | Medium |
| og:image | Present, minimum 1200x630 pixels, under 1MB | Medium |
| og:url | Present, matches canonical | Medium |
| og:type | Present (website, article, product) | Low |
| og:site_name | Present | Low |

### Twitter Card Tags

| Check | Criteria | Priority if Failing |
|-------|----------|-------------------|
| twitter:card | Present (summary, summary_large_image) | Medium |
| twitter:title | Present (can fall back to og:title) | Low |
| twitter:description | Present (can fall back to og:description) | Low |
| twitter:image | Present (can fall back to og:image) | Low |

### Hreflang (if multi-language)

| Check | Criteria | Priority if Failing |
|-------|----------|-------------------|
| Present | Hreflang tags exist for all language versions | High |
| Return tags | Each referenced page includes a return hreflang tag | Critical |
| x-default | An x-default hreflang tag exists | Medium |
| Valid codes | Language and region codes are valid ISO codes | High |
| Self-referencing | Current page is included in its own hreflang set | High |

---

## Schema Markup Checks

### Detection

Detect all structured data on the page. Check for JSON-LD (preferred),
Microdata, and RDFa formats.

| Check | Criteria | Priority if Failing |
|-------|----------|-------------------|
| Schema present | Page has at least one schema type | High |
| JSON-LD format | Schema uses JSON-LD (preferred over Microdata/RDFa) | Medium |
| Valid syntax | JSON-LD parses without errors | Critical |
| Required properties | All required properties for the schema type are present | High |
| Server-rendered | Schema is in initial HTML, not injected via JavaScript | High |

### Validation

For each detected schema type, validate required and recommended properties
against the Schema.org specification.

### Opportunity Identification

Based on the page type and content, identify missing schema opportunities.

| Page Type | Expected Schema |
|-----------|----------------|
| Homepage | Organization, WebSite |
| Product page | Product, Offer, AggregateRating |
| Service page | Service, ProfessionalService |
| Blog post | Article or BlogPosting, Person (author) |
| Contact page | ContactPage, LocalBusiness |
| About page | Organization, AboutPage |
| FAQ page | (FAQPage only for gov/health sites) |
| Category page | CollectionPage, ItemList |

### Schema Rules

- Never recommend HowTo schema (deprecated September 2023).
- FAQ schema: only for government and healthcare sites for Google rich results
  (restricted August 2023).
- SpecialAnnouncement schema deprecated July 31, 2025 -- do not recommend.
- Serve structured data in initial server-rendered HTML, not via JavaScript
  injection (Google December 2025 JS SEO guidance).

---

## Image Checks

Evaluate every image on the page.

### Alt Text

| Check | Criteria | Priority if Failing |
|-------|----------|-------------------|
| Present | Every content image has alt text | High |
| Descriptive | Alt text describes the image content | Medium |
| Keyword inclusion | Alt text includes keywords where natural (not forced) | Low |
| Not too long | Alt text under 125 characters | Low |
| Decorative images | Decorative images use empty alt="" | Low |

### File Size

| Check | Criteria | Priority if Failing |
|-------|----------|-------------------|
| Warning threshold | Image >200KB | Medium |
| Critical threshold | Image >500KB | High |
| Total page weight | Sum of all images on page | Medium |

### Format

| Check | Criteria | Priority if Failing |
|-------|----------|-------------------|
| Modern format | Images use WebP or AVIF | Medium |
| Fallback | If using modern format, provide JPEG/PNG fallback | Low |
| Appropriate format | Photos as JPEG/WebP, graphics as PNG/SVG/WebP | Low |

### Dimensions and Loading

| Check | Criteria | Priority if Failing |
|-------|----------|-------------------|
| Width/height set | `width` and `height` attributes present (prevents CLS) | High |
| Lazy loading | Below-fold images use `loading="lazy"` | Medium |
| Above-fold eager | Above-fold images do NOT use `loading="lazy"` | Medium |
| Responsive | Uses `srcset` or `<picture>` for responsive images | Low |
| LCP candidate | Largest above-fold image is optimized for LCP | High |

---

## Core Web Vitals Assessment

CWV cannot be fully measured from HTML alone. Flag potential issues based
on HTML structure and visual analysis.

### Largest Contentful Paint (LCP)

| Flag | Indicator | Priority |
|------|-----------|----------|
| Large hero image | Hero image >500KB or not preloaded | High |
| Render-blocking resources | CSS/JS in head without async/defer | High |
| Server-rendered content | Main content is in initial HTML, not JS-rendered | High |
| Preload hints | LCP image uses `<link rel="preload">` | Medium |
| Font loading | Web fonts use `font-display: swap` or `optional` | Medium |

**Thresholds (from thresholds reference):**
- Good: <=2.5 seconds
- Needs Improvement: 2.5-4.0 seconds
- Poor: >4.0 seconds

### Interaction to Next Paint (INP)

| Flag | Indicator | Priority |
|------|-----------|----------|
| Heavy JavaScript | Large JS bundles in head without defer | High |
| Event handlers | Complex event handlers on interactive elements | Medium |
| Third-party scripts | Excessive third-party scripts that block main thread | High |
| No async/defer | Script tags without async or defer attributes | Medium |

**Thresholds:**
- Good: <=200 milliseconds
- Needs Improvement: 200-500 milliseconds
- Poor: >500 milliseconds

Note: FID is fully removed. All references must use INP. FID was removed
from all Chrome tools on September 9, 2024.

### Cumulative Layout Shift (CLS)

| Flag | Indicator | Priority |
|------|-----------|----------|
| Missing dimensions | Images or iframes without width/height attributes | High |
| Dynamic content injection | Content injected above existing content | Medium |
| Ad slots | Ad containers without reserved space | High |
| Web fonts | Font loading causes text reflow | Medium |
| Lazy loaded content | Content that shifts layout when loading | Medium |

**Thresholds:**
- Good: <=0.1
- Needs Improvement: 0.1-0.25
- Poor: >0.25

---

## Above-Fold Analysis

Use the visual analysis script output to assess above-fold content quality.

### Desktop (1440px viewport)

| Check | Criteria | Priority |
|-------|----------|----------|
| Value proposition visible | Main heading and value proposition are above fold | High |
| CTA visible | Primary call-to-action is visible without scrolling | High |
| Content density | Above-fold area is not dominated by navigation or whitespace | Medium |
| Image quality | Hero image is sharp and properly sized | Medium |
| Logo visible | Brand logo is visible above fold | Low |

### Mobile (375px viewport)

| Check | Criteria | Priority |
|-------|----------|----------|
| H1 visible | Main heading visible without scrolling | High |
| CTA accessible | Primary CTA is reachable within one scroll | High |
| Touch targets | All interactive elements are at least 48x48px | High |
| Font readability | Body text is at least 16px, no horizontal scroll | High |
| No content overflow | Content fits within viewport width | Critical |
| Navigation accessible | Menu or navigation is accessible (hamburger OK) | Medium |

---

## Page Score Card

Produce a visual score card summarizing the audit results.

```
Overall Score: XX/100

On-Page SEO:     XX/100  [bar chart]
Content Quality: XX/100  [bar chart]
Technical:       XX/100  [bar chart]
Schema:          XX/100  [bar chart]
Images:          XX/100  [bar chart]
```

### Score Calculation

| Category | Weight | Checks Included |
|----------|--------|-----------------|
| On-Page SEO | 30% | Title, meta description, H1, headings, URL, internal links, external links |
| Content Quality | 25% | Word count, readability, keyword optimization, E-E-A-T, freshness |
| Technical | 20% | Canonical, meta robots, OG tags, Twitter Card, hreflang |
| Schema | 15% | Schema presence, validity, required properties, opportunities |
| Images | 10% | Alt text, file size, format, dimensions, lazy loading |

For each category, calculate the percentage of checks passing and apply
the weight. The overall score is the weighted sum.

### Bar Chart Format

Generate visual bar charts using block characters.

```
XX/100  [filled blocks][empty blocks]
```

Each block represents 10 points. Use filled blocks for the score and
empty blocks for the remainder.

Example:
```
75/100  ████████░░
```

---

## Output Structure

### Page Score Card

Display the visual score card at the top of the report.

### Issues Found

Organize all findings by priority: Critical, High, Medium, Low.

For each issue:
- **Category**: Which audit category the issue belongs to.
- **Element**: The specific HTML element or aspect affected.
- **Current state**: What was found.
- **Expected state**: What the correct implementation looks like.
- **Recommendation**: Specific, actionable fix with code example if applicable.
- **Impact**: Expected improvement from fixing this issue.

### Schema Suggestions

Provide ready-to-use JSON-LD code for every detected schema opportunity.
Include all required and recommended properties populated with data
extracted from the page content.

### Recommendations Summary

Produce a prioritized action list.

1. **Quick wins**: Low-effort, high-impact fixes (missing alt text, title
   length, meta description).
2. **High-impact improvements**: Medium-effort changes with significant
   ranking potential (schema markup, content expansion, E-E-A-T signals).
3. **Long-term investments**: Higher-effort improvements for sustained gains
   (content freshness program, internal linking strategy, CWV optimization).

---

## MCP Integration

If DataForSEO MCP available, use `serp_organic_live_advanced` for the real
SERP position of the analyzed page for its target keyword. Use
`backlinks_summary` for backlink data including referring domains count,
domain rank, and spam score. Use `on_page_instant_pages` for server-side
page analysis (status codes, load time, page size). Use
`on_page_lighthouse` for real Lighthouse performance scores to supplement
the HTML-based CWV assessment.
