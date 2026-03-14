# Advertising Integrations Reference

Consolidated reference for paid advertising platforms. Use these integrations to manage campaigns, configure audience targeting, pull performance reports, and adjust budgets across search, social, and video channels.

## Google Ads

**What it does:** Pay-per-click advertising across search, display, shopping, video (YouTube), Performance Max, and Demand Gen campaigns. Query performance data with GAQL (Google Ads Query Language), manage campaigns, adjust budgets, and analyze keyword performance.

**Auth method:** OAuth 2.0. Scope: `https://www.googleapis.com/auth/adwords`. Create credentials in Google Cloud Console and link to Google Ads account. Required headers: `developer-token`, `login-customer-id` (for MCC accounts).

**CLI script:** `${CLAUDE_PLUGIN_ROOT}/skills/unmassk-marketing/scripts/google-ads.js`

**Composio MCP toolkit:** `GOOGLEADS` (OAuth 2.0, Medium coverage). Actions: get campaign performance, list ad groups, keyword stats. Google Ads also has a native MCP server with deeper coverage -- prefer the native MCP server when available.

**Key API operations:**

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List campaigns | POST | `/customers/{customer_id}/googleAds:searchStream` |
| Get campaign performance | POST | `/customers/{customer_id}/googleAds:searchStream` |
| Get ad group performance | POST | `/customers/{customer_id}/googleAds:searchStream` |
| Get keyword performance | POST | `/customers/{customer_id}/googleAds:searchStream` |
| Pause campaign | POST | `/customers/{customer_id}/campaigns:mutate` |
| Update budget | POST | `/customers/{customer_id}/campaignBudgets:mutate` |

**Base URL:** `https://googleads.googleapis.com/v14`

**GAQL query examples:**

```sql
-- Campaign performance last 30 days
SELECT campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
FROM campaign WHERE segments.date DURING LAST_30_DAYS

-- Top keywords by clicks
SELECT ad_group_criterion.keyword.text, metrics.impressions, metrics.clicks, metrics.average_cpc
FROM keyword_view WHERE segments.date DURING LAST_30_DAYS ORDER BY metrics.clicks DESC LIMIT 50

-- Active campaigns only
SELECT campaign.name, metrics.clicks, metrics.conversions
FROM campaign WHERE campaign.status = 'ENABLED' AND segments.date DURING LAST_30_DAYS
ORDER BY metrics.conversions DESC LIMIT 10
```

**Key metrics:**

| Metric | Description |
|--------|-------------|
| `metrics.impressions` | Ad impressions |
| `metrics.clicks` | Total clicks |
| `metrics.cost_micros` | Cost in micros (divide by 1,000,000 for currency) |
| `metrics.conversions` | Conversion count |
| `metrics.conversions_value` | Conversion monetary value |
| `metrics.average_cpc` | Average cost per click |
| `metrics.ctr` | Click-through rate |
| `metrics.conversion_rate` | Conversion rate |

**Campaign types:** `SEARCH`, `DISPLAY`, `SHOPPING`, `VIDEO`, `PERFORMANCE_MAX`, `DEMAND_GEN`.

**Pause campaign example:**
```json
{
  "operations": [{
    "update": {
      "resourceName": "customers/{customer_id}/campaigns/{campaign_id}",
      "status": "PAUSED"
    },
    "updateMask": "status"
  }]
}
```

**Budget update:** Set `amountMicros` on the campaign budget resource. Value is in micros (50000000 = $50).

**Date range predicates for GAQL:** `DURING LAST_7_DAYS`, `DURING LAST_30_DAYS`, `DURING THIS_MONTH`, `DURING LAST_MONTH`, `DURING LAST_QUARTER`. For custom ranges use `segments.date BETWEEN '2024-01-01' AND '2024-01-31'`.

**Mutate operations pattern:** All write operations use the `mutate` endpoint on the target resource. Each mutation requires an `operations` array with `create`, `update`, or `remove` entries. Updates require an `updateMask` field specifying which fields change.

**Common GAQL resources:** `campaign`, `ad_group`, `ad_group_ad`, `keyword_view`, `campaign_budget`, `search_term_view`, `geo_target_constant`, `change_status`.

**Developer token levels:** Basic (15,000 ops/day), Standard (unlimited but throttled), Test (limited to test accounts). Apply for higher levels through Google Ads API Center.

**Rate limits:** 15,000 operations per day (basic). Higher limits with elevated developer token levels.

---

## Meta Ads (Facebook / Instagram)

**What it does:** Advertising across Facebook, Instagram, Messenger, and Audience Network. Create campaigns with various objectives, build custom and lookalike audiences, manage ad sets with detailed targeting, and pull performance insights.

**Auth method:** OAuth 2.0 Access Token passed as query parameter `access_token={token}`. Create app in Meta Business Suite and generate a System User token for server-to-server access.

**CLI script:** `${CLAUDE_PLUGIN_ROOT}/skills/unmassk-marketing/scripts/meta-ads.js`

**Composio MCP toolkit:** `FACEBOOKADS` (OAuth 2.0, Medium coverage). Actions: get campaign insights, list ad sets, get ad performance, read audience data. Use Composio for MCP access.

**Key API operations:**

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Get ad accounts | GET | `/me/adaccounts` |
| List campaigns | GET | `/act_{ad_account_id}/campaigns` |
| Get campaign insights | GET | `/{campaign_id}/insights` |
| Get ad sets | GET | `/act_{ad_account_id}/adsets` |
| Get ads | GET | `/{ad_set_id}/ads` |
| Create campaign | POST | `/act_{ad_account_id}/campaigns` |
| Update campaign status | POST | `/{campaign_id}` |
| List custom audiences | GET | `/act_{ad_account_id}/customaudiences` |
| Create lookalike audience | POST | `/act_{ad_account_id}/customaudiences` |

**Base URL:** `https://graph.facebook.com/v18.0`

**Key metrics:**

| Metric | Description |
|--------|-------------|
| `impressions` | Ad impressions |
| `clicks` | All clicks |
| `spend` | Amount spent |
| `reach` | Unique people reached |
| `frequency` | Average impressions per person |
| `cpm` | Cost per 1,000 impressions |
| `cpc` | Cost per click |
| `actions` | Conversions array (by action type) |
| `cost_per_action_type` | CPA broken down by action |

**Campaign objectives:** `AWARENESS`, `TRAFFIC`, `ENGAGEMENT`, `LEADS`, `APP_PROMOTION`, `SALES`.

**Insights date presets:** `last_7d`, `last_30d`, `last_90d`, `this_month`, `last_month`. Or use `time_range` with `since` and `until` dates.

**Targeting structure:**
```json
{
  "geo_locations": { "countries": ["US"], "cities": [{"key": "2420379"}] },
  "age_min": 25,
  "age_max": 45,
  "genders": [1, 2],
  "interests": [{"id": "6003139266461", "name": "Marketing"}],
  "behaviors": [{"id": "6002714895372"}]
}
```

**Lookalike audience creation:**
```json
{
  "name": "Lookalike - Top Customers",
  "subtype": "LOOKALIKE",
  "origin_audience_id": "{source_audience_id}",
  "lookalike_spec": {"type": "similarity", "country": "US"}
}
```

**Batch request pattern:** Combine up to 50 API calls in a single batch request to `https://graph.facebook.com/` with `batch` parameter. Each sub-request specifies `method`, `relative_url`, and optionally `body`.

**Custom audience types:** Website Custom Audiences (pixel-based retargeting), Customer File Audiences (CRM upload), Engagement Audiences (people who interacted with content), App Activity Audiences, Offline Activity Audiences.

**Ad set budget modes:** `DAILY_BUDGET` (spend up to X per day) or `LIFETIME_BUDGET` (spend up to X over campaign duration). Set at the ad set level for campaign budget optimization (CBO) or at the campaign level.

**Conversion tracking:** Install Meta Pixel on site, then configure conversion events (Purchase, Lead, CompleteRegistration, AddToCart, ViewContent). Use the Conversions API for server-side event tracking to improve attribution accuracy.

**Ad creative fields:** `title`, `body`, `image_hash` or `image_url`, `link`, `call_to_action` (LEARN_MORE, SIGN_UP, SHOP_NOW, etc.).

**Rate limits:** 200 calls/hour per ad account. 60 calls/hour for marketing API. Use batch requests for efficiency.

---

## LinkedIn Ads

**What it does:** B2B advertising with professional targeting by job title, function, seniority, company, industry, skills, and groups. Run sponsored content, text ads, message ads (InMail), and dynamic ads. Pull campaign analytics and estimate audience sizes.

**Auth method:** OAuth 2.0. Pass `Authorization: Bearer {access_token}`. Scopes: `r_ads`, `r_ads_reporting`, `rw_ads`.

**CLI script:** `${CLAUDE_PLUGIN_ROOT}/skills/unmassk-marketing/scripts/linkedin-ads.js`

**Composio MCP toolkit:** `LINKEDIN` (OAuth 2.0, Medium coverage). Actions: get campaign analytics, list campaigns, get company page stats. Use Composio for MCP access.

**Key API operations:**

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Get ad accounts | GET | `/v2/adAccountsV2?q=search` |
| List campaigns | GET | `/v2/adCampaignsV2?q=search&search.account.values[0]=urn:li:sponsoredAccount:{id}` |
| Get campaign analytics | GET | `/v2/adAnalyticsV2?q=analytics&pivot=CAMPAIGN&...` |
| Create campaign | POST | `/v2/adCampaignsV2` |
| Update campaign status | POST | `/v2/adCampaignsV2/{campaign_id}` |
| Get creatives | GET | `/v2/adCreativesV2?q=search&search.campaign.values[0]=urn:li:sponsoredCampaign:{id}` |
| Estimate audience size | POST | `/v2/audienceCountsV2` |

**Base URL:** `https://api.linkedin.com`

**Analytics query parameters:** `q=analytics`, `pivot=CAMPAIGN`, `dateRange.start.year`, `dateRange.start.month`, `dateRange.start.day`, `dateRange.end.*`, `campaigns=urn:li:sponsoredCampaign:{id}`, `fields=impressions,clicks,costInLocalCurrency,conversions`.

**Key metrics:**

| Metric | Description |
|--------|-------------|
| `impressions` | Ad impressions |
| `clicks` | Total clicks |
| `costInLocalCurrency` | Amount spent |
| `conversions` | Conversion count |
| `leadGenerationMailContactInfoShares` | Lead form submissions |

**Campaign types:** `SPONSORED_UPDATES` (sponsored content), `TEXT_AD`, `SPONSORED_INMAILS` (message ads), `DYNAMIC`.

**Targeting options:**

- **Job-based:** Job titles, job functions, seniority levels, years of experience
- **Company-based:** Company names, industries, company size, company followers
- **Professional:** Skills, groups, schools, degrees

**Campaign creation example:**
```json
{
  "account": "urn:li:sponsoredAccount:{account_id}",
  "name": "Campaign Name",
  "type": "SPONSORED_UPDATES",
  "costType": "CPC",
  "unitCost": { "amount": "5.00", "currencyCode": "USD" },
  "dailyBudget": { "amount": "100.00", "currencyCode": "USD" },
  "status": "PAUSED"
}
```

**Status update via patch:**
```json
{ "patch": { "$set": { "status": "ACTIVE" } } }
```

**Audience estimation:**
```json
{
  "audienceCriteria": {
    "include": {
      "and": [{
        "or": { "urn:li:adTargetingFacet:titles": ["urn:li:title:123"] }
      }]
    }
  }
}
```

**LinkedIn URN format:** All LinkedIn API references use URN format: `urn:li:sponsoredAccount:{id}`, `urn:li:sponsoredCampaign:{id}`, `urn:li:title:{id}`. Extract numeric IDs from the Campaign Manager UI.

**Cost types:** `CPC` (cost per click), `CPM` (cost per impression), `CPS` (cost per send for InMail).

**Lead Gen Forms:** LinkedIn native lead forms capture user info without leaving the platform. Access submissions via the Lead Gen Forms API. Fields auto-populated from LinkedIn profiles improve conversion rates for B2B campaigns.

**Matched Audiences:** Upload company lists or email lists for account-based targeting. Create website retargeting audiences with the LinkedIn Insight Tag. Combine with professional targeting facets for precision B2B campaigns.

**Reporting dimensions:** Pivot by `CAMPAIGN`, `CREATIVE`, `CAMPAIGN_GROUP`, `MEMBER_COMPANY`, `MEMBER_JOB_TITLE`, `MEMBER_INDUSTRY`.

**Rate limits:** 100 requests/day (basic). 10,000 requests/day (Marketing Developer Platform).

---

## TikTok Ads

**What it does:** Advertising on TikTok's short-form video platform. Create campaigns, manage ad groups, pull performance reports, and work with custom audiences. Optimized for video-first creative and younger demographics (18-34).

**Auth method:** Access Token. Pass `Access-Token: {access_token}` header. Create app in TikTok for Business to get token.

**CLI script:** `${CLAUDE_PLUGIN_ROOT}/skills/unmassk-marketing/scripts/tiktok-ads.js`

**Composio MCP toolkit:** Not available. Use CLI script or direct API.

**Key API operations:**

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Get advertiser info | GET | `/open_api/v1.3/advertiser/info/` |
| List campaigns | GET | `/open_api/v1.3/campaign/get/` |
| Get campaign report | POST | `/open_api/v1.3/report/integrated/get/` |
| Create campaign | POST | `/open_api/v1.3/campaign/create/` |
| Update campaign status | POST | `/open_api/v1.3/campaign/status/update/` |
| Get ad groups | GET | `/open_api/v1.3/adgroup/get/` |
| List custom audiences | GET | `/open_api/v1.3/dmp/custom_audience/list/` |

**Base URL:** `https://business-api.tiktok.com`

**Report request example:**
```json
{
  "advertiser_id": "{advertiser_id}",
  "report_type": "BASIC",
  "dimensions": ["campaign_id"],
  "metrics": ["spend", "impressions", "clicks", "conversion"],
  "data_level": "AUCTION_CAMPAIGN",
  "start_date": "2024-01-01",
  "end_date": "2024-01-31"
}
```

**Key metrics:**

| Metric | Description |
|--------|-------------|
| `spend` | Amount spent |
| `impressions` | Ad impressions |
| `clicks` | Total clicks |
| `ctr` | Click-through rate |
| `cpc` | Cost per click |
| `cpm` | Cost per 1,000 impressions |
| `conversion` | Conversions |
| `cost_per_conversion` | CPA |
| `video_play_actions` | Video views |
| `video_watched_6s` | 6-second video views |

**Campaign objectives:** `REACH`, `TRAFFIC`, `VIDEO_VIEWS`, `LEAD_GENERATION`, `CONVERSIONS`, `APP_PROMOTION`.

**Targeting options:**

- **Demographics:** Age ranges, gender, languages, locations
- **Interests & Behavior:** Interest categories, video interactions, creator interactions, hashtag interactions
- **Custom audiences:** Customer file uploads, website visitors (pixel), app activity, engagement audiences

**Campaign status update:**
```json
{
  "advertiser_id": "{advertiser_id}",
  "campaign_ids": ["{campaign_id}"],
  "opt_status": "ENABLE"
}
```

**Report dimensions:** `campaign_id`, `adgroup_id`, `ad_id`, `country_code`, `gender`, `age`, `placement`. Combine multiple dimensions for cross-tabulated reports.

**Report metrics categories:**
- **Cost:** `spend`, `cpc`, `cpm`, `cost_per_conversion`
- **Engagement:** `impressions`, `clicks`, `ctr`
- **Video:** `video_play_actions`, `video_watched_2s`, `video_watched_6s`, `average_video_play_per_user`
- **Conversion:** `conversion`, `cost_per_conversion`, `conversion_rate`

**Pixel setup:** Install TikTok Pixel on site for conversion tracking. Required for `CONVERSIONS` objective campaigns. Use Events API for server-side tracking to supplement pixel data.

**Budget modes:** `BUDGET_MODE_DAY` (daily budget) or `BUDGET_MODE_TOTAL` (lifetime budget). Set at campaign level.

**Bid strategies:** `BID_TYPE_CUSTOM` (manual CPC/CPA bid), `BID_TYPE_NO_BID` (lowest cost auto-bidding).

**Rate limits:** 10 requests/second. 100,000 requests/day.

---

## Platform Selection Guide

| Use case | Recommended platform |
|----------|---------------------|
| Search intent (bottom-funnel) | Google Ads |
| B2B professional targeting | LinkedIn Ads |
| Visual/social (broad reach) | Meta Ads |
| Video-first, younger demographics | TikTok Ads |
| Retargeting across web | Meta Ads or Google Ads |
| Lead form campaigns | LinkedIn Ads or Meta Ads |
| Shopping/product feeds | Google Ads |
| App installs | Meta Ads or TikTok Ads |

## Composio MCP Quick Reference

| Toolkit | Auth | Coverage | Key actions |
|---------|------|----------|-------------|
| `GOOGLEADS` | OAuth 2.0 | Medium | Campaign performance, ad groups, keyword stats |
| `FACEBOOKADS` | OAuth 2.0 | Medium | Campaign insights, ad sets, ad performance, audiences |
| `LINKEDIN` | OAuth 2.0 | Medium | Campaign analytics, list campaigns, company page stats |

List available Composio actions:
```bash
npx composio actions list --app GOOGLEADS
npx composio actions list --app FACEBOOKADS
npx composio actions list --app LINKEDIN
```

## Cross-Platform Metric Normalization

When comparing across platforms, normalize these metrics:

| Concept | Google Ads | Meta Ads | LinkedIn | TikTok |
|---------|-----------|----------|----------|--------|
| Spend | `cost_micros / 1M` | `spend` | `costInLocalCurrency` | `spend` |
| Clicks | `clicks` | `clicks` | `clicks` | `clicks` |
| Impressions | `impressions` | `impressions` | `impressions` | `impressions` |
| Conversions | `conversions` | `actions` | `conversions` | `conversion` |
| CPC | `average_cpc` | `cpc` | compute | `cpc` |
| CPM | compute | `cpm` | compute | `cpm` |
