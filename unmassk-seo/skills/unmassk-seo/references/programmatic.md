# Programmatic SEO -- Reference

Build and audit SEO pages generated at scale from structured data sources.
Enforce quality gates to prevent thin content penalties and index bloat.
Use this reference when the user mentions "programmatic SEO", "pages at scale",
"dynamic pages", "template pages", "generated pages", or "data-driven SEO".

---

## Data Source Assessment

Evaluate the data powering programmatic pages before designing templates or
URL structures. Poor data quality produces poor pages at scale.

### Supported Data Source Types

- **CSV/JSON files**: Count rows, measure column uniqueness, identify missing
  values. Calculate the percentage of records with sufficient data to produce
  a standalone page.
- **API endpoints**: Inspect response structure, measure data freshness, note
  rate limits that constrain page generation frequency.
- **Database queries**: Count records, assess field completeness, determine
  update frequency. Stale data produces stale pages.

### Data Quality Checks

Run these checks against the raw data before proceeding to template design.

1. **Record uniqueness**: Each record must have enough unique attributes to
   generate distinct content. Flag duplicate or near-duplicate records with
   >80% field overlap.
2. **Missing values**: Calculate the percentage of records with null or empty
   fields in content-critical columns. If >20% of records lack a key field,
   the template must handle that gap gracefully (conditional sections, not
   blank space).
3. **Data freshness**: Determine the last update timestamp. Stale data
   produces stale pages. Flag any data source not updated in >90 days.
4. **Volume assessment**: Count total records. Apply quality gates (see below)
   based on projected page count.
5. **Content potential**: For each record, estimate the amount of unique text
   the template can produce. If most records yield <300 words of unique
   content, the data source may be insufficient for standalone pages.

### Data Quality Score

Produce a data quality assessment per source.

| Metric | Threshold | Status |
|--------|-----------|--------|
| Record count | Sufficient for planned pages | Pass/Fail |
| Field completeness | >80% of content-critical fields populated | Pass/Fail |
| Record uniqueness | <20% near-duplicate records | Pass/Fail |
| Data freshness | Updated within 90 days | Pass/Fail |
| Content potential | >300 words unique content per record | Pass/Fail |

---

## Template Engine Planning

Design templates that produce unique, valuable pages. The template is the
single most important factor in programmatic SEO quality.

### Variable Injection Points

Map every dynamic element in the template to a data field.

- **Title tag**: Primary keyword + unique record identifier (city, product
  name, tool name).
- **H1**: Must differ from title tag while targeting the same intent.
- **Meta description**: Unique per page, drawing from record-specific data.
- **Body sections**: Multiple dynamic blocks populated from different data
  fields.
- **Schema markup**: Dynamic properties injected from record data.

### Content Block Types

Classify every section of the template as one of three types.

- **Static blocks**: Identical across all pages. Keep these under 30% of
  total page content to avoid thin content flags.
- **Dynamic blocks**: Populated from record-specific data. These are the
  primary source of page uniqueness.
- **Conditional blocks**: Show/hide based on data availability. Use these
  for optional fields -- never leave blank sections or placeholder text.

### Template Review Checklist

Before generating pages at scale, verify the template against this list.

- [ ] Each page reads as a standalone, valuable resource.
- [ ] No "mad-libs" patterns (swapping city/product names in identical text).
- [ ] Dynamic sections add genuine information, not just keyword variations.
- [ ] Conditional logic handles missing data gracefully (hide section, do not
  show empty headings or "N/A" values).
- [ ] Static content does not exceed 30% of total page word count.
- [ ] The page answers a real user question that cannot be answered by another
  page in the set.

### Supplementary Content Strategies

Add unique value beyond the raw data to increase page differentiation.

- **Related items**: Link to 3-5 related programmatic pages based on shared
  attributes (same category, same city, same feature set).
- **Contextual tips**: Add advice, warnings, or recommendations relevant to
  the specific record (e.g., "Best time to visit [city]" on location pages).
- **User-generated content**: Embed reviews, ratings, or comments specific
  to the record where available.
- **Aggregated data**: Include statistics, comparisons, or rankings computed
  from the full dataset (e.g., "Ranked #3 of 47 tools in this category").
- **Visual content**: Charts, maps, or images unique to the record.

---

## URL Pattern Strategy

### Common Patterns

Select the pattern that matches the data structure and user intent.

| Pattern | Use Case | Example |
|---------|----------|---------|
| `/tools/[tool-name]` | Tool/product directory pages | `/tools/slack` |
| `/[city]/[service]` | Location + service pages | `/austin/plumbing` |
| `/integrations/[platform]` | Integration landing pages | `/integrations/zapier` |
| `/glossary/[term]` | Definition/reference pages | `/glossary/seo` |
| `/templates/[template-name]` | Downloadable template pages | `/templates/invoice` |
| `/compare/[a]-vs-[b]` | Comparison pages | `/compare/slack-vs-teams` |
| `/[category]/[item]` | Category + item hierarchy | `/databases/postgresql` |

### URL Rules

Enforce these rules for every programmatic URL.

1. Lowercase, hyphenated slugs derived directly from data fields.
2. Logical hierarchy reflecting the site architecture (category before item).
3. No duplicate slugs -- enforce uniqueness at generation time. If two records
   produce the same slug, append a disambiguator.
4. Keep URLs under 100 characters.
5. No query parameters for primary content URLs (use clean paths).
6. Consistent trailing slash usage (match the existing site pattern).
7. No special characters, accented characters normalized to ASCII equivalents.
8. Validate all generated URLs against the existing URL namespace to prevent
   collisions with manual pages.

### URL Collision Prevention

Before generating URLs at scale:

1. Export the full list of existing URLs from the CMS or sitemap.
2. Generate all programmatic URLs.
3. Diff the two lists. Flag any collisions.
4. If a programmatic URL collides with a manual page, the manual page takes
   priority. The programmatic page must use an alternate slug or be excluded.

---

## Internal Linking Automation

### Hub/Spoke Model

Implement a hub-and-spoke internal linking architecture for programmatic pages.

- **Hub pages**: Category-level pages that list and link to all programmatic
  pages within a group (e.g., `/tools/` links to all individual tool pages).
- **Spoke pages**: Individual programmatic pages that link back to their hub
  and to 3-5 related spokes.
- **Cross-hub links**: Where records share attributes across categories,
  link between hubs (e.g., a tool page linking to an integration page for
  the same platform).

### Link Generation Rules

- **Related items**: Auto-link to 3-5 related pages based on shared data
  attributes (same category, same city, same feature, same price tier).
- **Breadcrumbs**: Generate BreadcrumbList schema from the URL hierarchy.
  Every programmatic page must have breadcrumb navigation.
- **Cross-linking**: Link between programmatic pages sharing attributes.
  Vary the linked pages across the set -- do not link every page to the
  same 5 "most popular" pages.
- **Anchor text**: Use descriptive, varied anchor text. Avoid exact-match
  keyword repetition across links. Pull anchor text from record-specific
  data (product name, city + service, tool name + category).
- **Link density**: Target 3-5 internal links per 1000 words, consistent
  with general content linking guidelines.
- **Navigation links**: Include a "Related [items]" section at the bottom
  of each programmatic page with 5-8 links to sibling pages.
- **Orphan prevention**: Every programmatic page must be reachable from at
  least one hub page and the XML sitemap. Run an orphan check after
  generation.

### Breadcrumb Schema

Generate BreadcrumbList JSON-LD for every programmatic page.

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://example.com/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "[Category]",
      "item": "https://example.com/[category]/"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "[Page Title]",
      "item": "https://example.com/[category]/[item]"
    }
  ]
}
```

---

## Quality Gates

### Scale Thresholds

Apply these thresholds to all programmatic page generation projects.

| Metric | Threshold | Action |
|--------|-----------|--------|
| Pages without content review | 100+ | WARNING -- require content audit before publishing. Sample at least 10% of generated pages for manual quality review. |
| Pages without justification | 500+ | HARD STOP -- require explicit user approval and a thin content audit before proceeding. Document the business justification for scale. |
| Unique content per page | <40% | Flag as thin content -- likely penalty risk. Do not publish without remediation. |
| Unique content per page | <30% | HARD STOP -- scaled content abuse risk. Require template redesign before proceeding. |
| Word count per page | <300 | Flag for review -- may lack sufficient value for indexing. |

### Uniqueness Calculation

```
Unique content % = (words unique to this page) / (total words on page) x 100
```

Measure against all other pages in the programmatic set. Shared headers,
footers, and navigation are excluded from the calculation. Template
boilerplate text IS included in the calculation.

### Progressive Rollout Protocol

Never publish all programmatic pages simultaneously. Follow this rollout
sequence.

1. **Pilot batch**: Publish 10-20 pages. Monitor indexing in Search Console
   for 1 week.
2. **First expansion**: If pilot pages are indexed and show no quality
   flags, publish 50-100 additional pages. Monitor for 2 weeks.
3. **Scaled expansion**: If the first expansion shows healthy indexing
   rates (>80% indexed within 2 weeks) and no manual actions, proceed
   with larger batches of 100-200 pages.
4. **Full rollout**: Continue in batches until all pages are published.
   Never publish 500+ programmatic pages simultaneously without completing
   a full quality review.

### Human Review Requirements

- Minimum 5-10% sample review of generated pages before each batch publish.
- Review must cover: content quality, data accuracy, template rendering,
  link integrity, schema validity.
- Document review findings. If >10% of sampled pages fail quality checks,
  halt the rollout and fix the template.

---

## Scaled Content Abuse -- Enforcement Context (2025-2026)

Google's Scaled Content Abuse policy (introduced March 2024) saw major
enforcement escalation in 2025. Understand this context when planning
programmatic SEO.

### Timeline

- **March 2024**: Google introduces Scaled Content Abuse as a spam policy.
  Initial enforcement targets obvious content farms.
- **June 2025**: Wave of manual actions targeting websites with AI-generated
  content at scale. Sites publishing 1000+ AI-generated pages without human
  oversight received manual penalties.
- **August 2025**: SpamBrain spam update enhanced pattern detection for
  AI-generated link schemes and content farms. Automated detection became
  significantly more sophisticated.
- **Result**: Google reported 45% reduction in low-quality, unoriginal
  content in search results post-March 2024 enforcement.

### Enhanced Quality Gates for Programmatic Pages

Apply these additional checks on top of the standard quality gates.

1. **Content differentiation**: 30-40% or more of content must be genuinely
   unique between any two programmatic pages. City/keyword string replacement
   alone does not count as unique content.
2. **Human review**: Minimum 5-10% sample review of generated pages before
   publishing each batch.
3. **Progressive rollout**: Publish in batches of 50-100 pages. Monitor
   indexing and rankings for 2-4 weeks before expanding. Never publish 500+
   programmatic pages simultaneously without explicit quality review.
4. **Standalone value test**: Each page must pass: "Would this page be worth
   publishing even if no other similar pages existed?" If the answer is no,
   the page adds no value and creates penalty risk.
5. **Site reputation abuse**: If publishing programmatic content under a
   high-authority domain that is not your own, this may trigger site
   reputation abuse penalties. Google began enforcing this aggressively in
   November 2024.

### Safe Programmatic Pages (acceptable at scale)

These page types pass the standalone value test when executed properly.

- Integration pages with real setup docs, API details, screenshots.
- Template/tool pages with downloadable content and usage instructions.
- Glossary pages with 200+ word definitions, examples, and related terms.
- Product pages with unique specs, reviews, and comparison data.
- Data-driven pages with unique statistics, charts, and analysis per record.

### Penalty Risk (avoid at scale)

These page types consistently fail the standalone value test.

- Location pages with only the city name swapped in identical text.
- "Best [tool] for [industry]" without industry-specific value-add.
- "[Competitor] alternative" pages without real comparison data.
- AI-generated pages without human review and unique value-add.
- Pages where >60% of content is shared template boilerplate.

---

## Canonical Strategy

Every programmatic page must have a properly configured canonical tag.

### Rules

1. **Self-referencing canonical**: Every programmatic page must include a
   self-referencing canonical tag pointing to its own URL.
2. **Parameter variations**: Sort, filter, and pagination parameters must
   canonical to the base URL (e.g., `/tools/slack?sort=price` canonicals
   to `/tools/slack`).
3. **Paginated series**: Canonical page 1 of paginated results, or use
   `rel=next`/`rel=prev` for the series.
4. **Manual page priority**: If a programmatic page overlaps with a manual
   page, the manual page is the canonical. Either redirect the programmatic
   URL to the manual page or noindex the programmatic page.
5. **No cross-domain canonical**: Do not canonical to a different domain
   unless there is an intentional cross-domain setup with the same content.
6. **HTTPS canonical**: Always use the HTTPS version in canonical tags.
7. **Trailing slash consistency**: The canonical URL must match the site's
   trailing slash convention exactly.

### Canonical Audit Checklist

After generating programmatic pages, verify:

- [ ] Every page has exactly one canonical tag.
- [ ] No page canonicals to a 404 or redirect chain.
- [ ] No circular canonical references.
- [ ] Parameter URLs canonical to clean base URLs.
- [ ] Canonical URLs are absolute (not relative).
- [ ] Canonical URLs match the URL in the sitemap.

---

## Sitemap Integration

Auto-generate sitemap entries for all programmatic pages and maintain them
as the data source changes.

### Generation Rules

1. **Auto-generate**: Create sitemap entries for every published programmatic
   page automatically during the generation process.
2. **Split limit**: Maximum 50,000 URLs per sitemap file (protocol limit).
   For larger sets, split into multiple sitemap files.
3. **Sitemap index**: If multiple sitemap files are needed, create a sitemap
   index file referencing all individual sitemaps.
4. **lastmod accuracy**: The `<lastmod>` timestamp must reflect the actual
   data update timestamp, not the page generation time. If the underlying
   data has not changed, do not update lastmod.
5. **Exclude noindexed pages**: Do not include noindexed programmatic pages
   in the sitemap. If a page is noindexed for quality reasons, remove it
   from the sitemap.
6. **Register in robots.txt**: Add a `Sitemap:` directive in robots.txt
   pointing to the sitemap (or sitemap index).
7. **Dynamic updates**: Update the sitemap automatically when new records
   are added to or removed from the data source.

### Sitemap Format

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/tools/slack</loc>
    <lastmod>2026-02-15</lastmod>
  </url>
</urlset>
```

### Sitemap Index Format

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.com/sitemap-tools-1.xml</loc>
    <lastmod>2026-02-15</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-tools-2.xml</loc>
    <lastmod>2026-02-15</lastmod>
  </sitemap>
</sitemapindex>
```

---

## Index Bloat Prevention

Monitor and control the ratio of indexed pages to intended pages. Index
bloat wastes crawl budget and dilutes ranking signals.

### Prevention Strategies

1. **Noindex low-value pages**: Apply `noindex` to pages that do not meet
   the quality gates (word count, uniqueness thresholds).
2. **Pagination control**: Noindex paginated results beyond page 1, or
   implement `rel=next`/`rel=prev` and let Google decide.
3. **Faceted navigation**: Noindex all filtered/faceted views. Canonical
   each filtered view to the base category page.
4. **Crawl budget monitoring**: For sites with >10,000 programmatic pages,
   monitor crawl stats in Google Search Console monthly. If crawl rate
   drops or crawl budget is exhausted before reaching important pages,
   consolidate or noindex low-value pages.
5. **Thin page consolidation**: Merge records with insufficient data into
   aggregated pages rather than publishing individual thin pages. Example:
   instead of 50 location pages with 100 words each, create 5 regional
   pages with 1000 words each.
6. **Regular audits**: Monthly review comparing indexed page count (from
   Search Console) against intended count. If indexed count significantly
   exceeds intended count, investigate and resolve duplicate or unintended
   indexing.

### Index Health Metrics

Track these metrics monthly for programmatic page sets.

| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| Indexed / Published ratio | 80-100% | 50-79% | <50% |
| Crawl budget utilization | <70% | 70-90% | >90% |
| Soft 404 rate | <2% | 2-5% | >5% |
| Duplicate content flags | 0 | 1-5 | >5 |

---

## Output Format

### Programmatic SEO Score: XX/100

### Assessment Summary

| Category | Status | Score |
|----------|--------|-------|
| Data Quality | (pass/warn/fail) | XX/100 |
| Template Uniqueness | (pass/warn/fail) | XX/100 |
| URL Structure | (pass/warn/fail) | XX/100 |
| Internal Linking | (pass/warn/fail) | XX/100 |
| Thin Content Risk | (pass/warn/fail) | XX/100 |
| Index Management | (pass/warn/fail) | XX/100 |

### Critical Issues (fix immediately)

List all findings that block publishing or create immediate penalty risk.

### High Priority (fix within 1 week)

List findings that significantly impact page quality or indexing health.

### Medium Priority (fix within 1 month)

List optimization opportunities that improve page performance.

### Low Priority (backlog)

List improvements that add incremental value.

### Recommendations

Provide specific, actionable recommendations organized by category:

- Data source improvements (field completeness, freshness, deduplication).
- Template modifications (increase dynamic content, add conditional logic).
- URL pattern adjustments (collision prevention, hierarchy fixes).
- Quality gate compliance actions (uniqueness improvements, rollout plan).
- Internal linking enhancements (hub/spoke gaps, anchor text diversity).
- Index management actions (noindex candidates, sitemap cleanup).

---

## MCP Integration

If DataForSEO MCP available, use `serp_organic_live_advanced` for SERP
tracking of programmatic pages. Monitor indexing velocity and ranking
positions for pilot batches. Use `on_page_instant_pages` to verify
generated pages are rendering correctly for search engines. Use
`dataforseo_labs_bulk_keyword_difficulty` to validate keyword targets
for programmatic page sets before committing to generation.
