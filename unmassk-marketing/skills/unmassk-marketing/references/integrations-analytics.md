# Analytics Integrations Reference

Consolidated reference for analytics, tracking, experimentation, and user behavior platforms. Use these integrations to track events, run reports, analyze funnels, measure retention, and manage A/B tests.

## Google Analytics 4 (GA4)

**What it does:** Web analytics for tracking user behavior, conversions, and marketing performance. Run reports via the Data API, configure properties via the Admin API, send server-side events via the Measurement Protocol, and track client-side with gtag.js.

**Auth method:** OAuth 2.0 or Service Account. Scopes: `analytics.readonly` (read), `analytics.edit` (write). Create credentials in Google Cloud Console.

**CLI script:** `${CLAUDE_PLUGIN_ROOT}/skills/unmassk-marketing/scripts/ga4.js`

**Composio MCP toolkit:** `GOOGLEANALYTICS` (OAuth 2.0, Medium coverage). Actions: run reports, get real-time data, list properties. GA4 also has a native MCP server with deeper coverage -- prefer the native MCP server when available.

**Key API operations:**

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Run report | POST | `/v1beta/properties/{property_id}:runReport` |
| Real-time report | POST | `/v1beta/properties/{property_id}:runRealtimeReport` |
| List conversion events | GET | `/v1beta/properties/{property_id}/conversionEvents` |
| Create conversion event | POST | `/v1beta/properties/{property_id}/conversionEvents` |

**Base URLs:** Data API: `https://analyticsdata.googleapis.com`. Admin API: `https://analyticsadmin.googleapis.com`.

**Report request example:**
```json
{
  "dateRanges": [{"startDate": "30daysAgo", "endDate": "today"}],
  "dimensions": [{"name": "sessionSource"}],
  "metrics": [{"name": "sessions"}, {"name": "conversions"}]
}
```

**Common dimensions:** `sessionSource`, `sessionMedium`, `sessionCampaignName`, `landingPage`, `deviceCategory`, `country`.

**Common metrics:** `sessions`, `activeUsers`, `newUsers`, `conversions`, `engagementRate`, `averageSessionDuration`.

**Measurement Protocol (server-side events):**
```
POST https://www.google-analytics.com/mp/collect?measurement_id={id}&api_secret={secret}

{
  "client_id": "client_123",
  "events": [{"name": "purchase", "params": {"value": 99.99, "currency": "USD"}}]
}
```

**Client-side tracking (gtag.js):**
```javascript
gtag('event', 'signup_completed', { 'method': 'email', 'plan': 'free' });
```

**Rate limits:** Data API: 10 requests/second per property. Measurement Protocol: 1M hits/day (free tier).

---

## Amplitude

**What it does:** Product analytics for user behavior, retention, funnels, cohort analysis, and experimentation. Track events via HTTP API, query user activity, export raw events, and analyze retention patterns.

**Auth method:** HTTP API uses API Key (public, for event ingestion). Export/Dashboard API uses API Key + Secret Key with Basic Auth: `Authorization: Basic {base64(api_key:secret_key)}`.

**CLI script:** `${CLAUDE_PLUGIN_ROOT}/skills/unmassk-marketing/scripts/amplitude.js`

**Composio MCP toolkit:** Not available. Use CLI script or direct API.

**Key API operations:**

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Track event | POST | `https://api2.amplitude.com/2/httpapi` |
| Batch events | POST | `https://api2.amplitude.com/batch` |
| Get user activity | GET | `https://amplitude.com/api/2/useractivity?user={id}` |
| Export events | GET | `https://amplitude.com/api/2/export?start={}&end={}` |
| Get retention data | GET | `https://amplitude.com/api/2/retention?e={event}&start={}&end={}` |

**Track event payload:**
```json
{
  "api_key": "{api_key}",
  "events": [{
    "user_id": "user_123",
    "event_type": "signup_completed",
    "event_properties": { "plan": "pro" },
    "user_properties": { "email": "user@example.com" }
  }]
}
```

**JavaScript SDK:**
```javascript
amplitude.init('API_KEY');
amplitude.setUserId('user_123');
amplitude.track('Feature Used', { feature_name: 'export' });

// User properties
const identify = new amplitude.Identify();
identify.set('plan', 'pro');
amplitude.identify(identify);
```

**Key concepts:** Events (user actions), User Properties (persistent attributes), Cohorts (behavioral segments), Funnels (multi-step conversion), Retention (return patterns), Journeys (path analysis).

**Export date format:** `YYYYMMDDTHH` (e.g., `20240101T00` to `20240131T23`).

**Rate limits:** HTTP API: 1,000 events/second. Export API: 360 requests/hour.

---

## Mixpanel

**What it does:** Product analytics for event tracking, funnel analysis, retention measurement, and user segmentation. Track events via the Ingestion API, query data through the Insights API, and export raw events.

**Auth method:** Ingestion API uses Project Token (public). Query API uses Service Account with Basic Auth. Export uses API Secret.

**CLI script:** `${CLAUDE_PLUGIN_ROOT}/skills/unmassk-marketing/scripts/mixpanel.js`

**Composio MCP toolkit:** Not available. Use CLI script or direct API.

**Key API operations:**

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Track event | POST | `https://api.mixpanel.com/track` |
| Set user profile | POST | `https://api.mixpanel.com/engage` |
| Query insights | POST | `https://mixpanel.com/api/2.0/insights` |
| Get funnel data | GET | `https://mixpanel.com/api/2.0/funnels?funnel_id={id}` |
| Export raw events | GET | `https://data.mixpanel.com/api/2.0/export?from_date={}&to_date={}` |
| Get retention | GET | `https://mixpanel.com/api/2.0/retention?from_date={}&to_date={}` |

**Track event payload:**
```json
{
  "event": "signup_completed",
  "properties": {
    "token": "{project_token}",
    "distinct_id": "user_123",
    "plan": "pro",
    "time": 1705312800
  }
}
```

**User profile update:**
```json
{
  "$token": "{project_token}",
  "$distinct_id": "user_123",
  "$set": { "$email": "user@example.com", "$name": "John Doe", "plan": "pro" }
}
```

**JavaScript SDK:**
```javascript
mixpanel.init('YOUR_TOKEN');
mixpanel.identify('user_123');
mixpanel.people.set({ '$email': 'user@example.com', 'plan': 'pro' });
mixpanel.track('Feature Used', { 'feature_name': 'export' });
```

**Key concepts:** Events (user actions), Properties (event attributes), User Profiles (persistent data), Cohorts (saved segments), Funnels (conversion sequences), Retention (return patterns).

**Retention query parameters:** `from_date`, `to_date`, `retention_type` (birth, compounding), `born_event` (the event that starts the cohort).

**Rate limits:** Ingestion: no hard limit (batch recommended). Query API: varies by plan.

---

## Hotjar

**What it does:** Behavior analytics with heatmaps, session recordings, surveys, and form analysis. Understand how users interact with pages through visual data. Use the API to pull survey responses, list recordings, and access heatmap data.

**Auth method:** OAuth 2.0 Client Credentials. POST to `https://api.hotjar.io/v1/oauth/token` with `grant_type=client_credentials&client_id={id}&client_secret={secret}`. Tokens expire after 3600 seconds. Pass `Authorization: Bearer {access_token}`.

**CLI script:** `${CLAUDE_PLUGIN_ROOT}/skills/unmassk-marketing/scripts/hotjar.js`

**Composio MCP toolkit:** Not available. Use CLI script or direct API.

**Key API operations:**

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List sites | GET | `/v1/sites` |
| List surveys | GET | `/v1/sites/{site_id}/surveys` |
| Get survey responses | GET | `/v1/sites/{site_id}/surveys/{survey_id}/responses?limit=100` |
| List heatmaps | GET | `/v1/sites/{site_id}/heatmaps` |
| List recordings | GET | `/v1/sites/{site_id}/recordings` |
| List forms | GET | `/v1/sites/{site_id}/forms` |

**Base URL:** `https://api.hotjar.io`

**Survey response data:** `response_id`, `answers` (question/answer pairs), `created_at`, `device_type` (desktop, mobile, tablet).

**Heatmap data:** `url`, `click_count`, `visitors`, `created_at`.

**Recording data:** `recording_id`, `duration`, `pages_visited`, `device`.

**Pagination:** Cursor-based with `cursor` and `limit` parameters.

**Recording filters:** `date_from`, `date_to`, `limit`, `cursor`.

**Rate limits:** 3,000 requests/minute (50 per second).

---

## Segment

**What it does:** Customer data platform for collecting, routing, and activating user data. Send events from any source (website, app, server) and route them to 300+ destinations (analytics, CRM, ads, data warehouse). Build unified user profiles and sync audiences.

**Auth method:** Tracking API uses Write Key (per source) with Basic Auth: `Authorization: Basic {base64(write_key:)}`. Profile API uses Access Token (OAuth 2.0).

**CLI script:** `${CLAUDE_PLUGIN_ROOT}/skills/unmassk-marketing/scripts/segment.js`

**Composio MCP toolkit:** Not available. Use CLI script or direct API.

**Key API operations:**

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Track event | POST | `https://api.segment.io/v1/track` |
| Identify user | POST | `https://api.segment.io/v1/identify` |
| Track page view | POST | `https://api.segment.io/v1/page` |
| Batch events | POST | `https://api.segment.io/v1/batch` |
| Get user profile | GET | `https://profiles.segment.com/v1/spaces/{space_id}/collections/users/profiles/user_id:{id}/traits` |
| Get user events | GET | `https://profiles.segment.com/v1/spaces/{space_id}/collections/users/profiles/user_id:{id}/events` |

**Track event payload:**
```json
{
  "userId": "user_123",
  "event": "signup_completed",
  "properties": { "plan": "pro", "method": "email" }
}
```

**Identify payload:**
```json
{
  "userId": "user_123",
  "traits": { "email": "user@example.com", "name": "John Doe", "plan": "pro" }
}
```

**Batch payload:**
```json
{
  "batch": [
    {"type": "identify", "userId": "user_1", "traits": {"plan": "free"}},
    {"type": "track", "userId": "user_1", "event": "signup"}
  ]
}
```

**JavaScript SDK:**
```javascript
analytics.load('WRITE_KEY');
analytics.identify('user_123', { email: 'user@example.com', plan: 'pro' });
analytics.track('Feature Used', { feature_name: 'export' });
analytics.page('Pricing');
```

**Key concepts:** Sources (where data comes from), Destinations (where it goes), Tracking Plan (event schema), Protocols (data governance), Personas (unified profiles), Audiences (computed segments).

**Common destinations:** GA4, Mixpanel, Amplitude, HubSpot, Salesforce, Customer.io, Mailchimp, Google Ads, Meta, BigQuery, Snowflake.

**Rate limits:** 500 requests/second per source. Batch up to 500KB or 32KB per event.

---

## Plausible Analytics

**What it does:** Privacy-focused, open-source web analytics without cookies or personal data collection. Query site stats via the Stats v2 API, track goals and conversions, and break down traffic by source, page, country, device, and UTM parameters. GDPR/CCPA-compliant by design.

**Auth method:** Bearer Token. Pass `Authorization: Bearer {api_key}`. Generate at https://plausible.io/settings > API Keys.

**CLI script:** `${CLAUDE_PLUGIN_ROOT}/skills/unmassk-marketing/scripts/plausible.js`

**Composio MCP toolkit:** Not available. Use CLI script or direct API.

**Key API operations:**

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Stats query (v2) | POST | `https://plausible.io/api/v2/query` |
| Realtime visitors | GET | `https://plausible.io/api/v1/stats/realtime/visitors?site_id={domain}` |
| List sites | GET | `https://plausible.io/api/v1/sites` |

**Stats query payload examples:**

```json
// Overview metrics
{ "site_id": "example.com", "metrics": ["visitors", "pageviews", "bounce_rate", "visit_duration"], "date_range": "30d" }

// Top pages
{ "site_id": "example.com", "metrics": ["visitors", "pageviews"], "date_range": "30d", "dimensions": ["event:page"] }

// Traffic sources
{ "site_id": "example.com", "metrics": ["visitors", "bounce_rate"], "date_range": "30d", "dimensions": ["visit:source"] }

// Time series
{ "site_id": "example.com", "metrics": ["visitors"], "date_range": "30d", "dimensions": ["time:day"] }

// Filtered by page
{ "site_id": "example.com", "metrics": ["visitors", "bounce_rate"], "date_range": "30d", "filters": [["is", "event:page", ["/pricing"]]] }
```

**Available metrics:** `visitors`, `visits`, `pageviews`, `views_per_visit`, `bounce_rate`, `visit_duration`, `events`, `conversion_rate`, `time_on_page`, `scroll_depth`, `percentage`.

**Available dimensions:** `event:page`, `event:goal`, `visit:source`, `visit:referrer`, `visit:channel`, `visit:utm_source`, `visit:utm_medium`, `visit:utm_campaign`, `visit:device`, `visit:browser`, `visit:os`, `visit:country`, `visit:region`, `visit:city`, `visit:entry_page`, `visit:exit_page`, `time:day`, `time:week`, `time:month`.

**Date ranges:** `"day"`, `"7d"`, `"30d"`, `"month"`, `"6mo"`, `"12mo"`, `"year"`, or custom `["2024-01-01", "2024-01-31"]`.

**Filter operators:** `is`/`is_not` (exact), `contains`/`contains_not` (substring), `matches`/`matches_not` (wildcard).

**Rate limits:** 600 requests/hour per API key.

---

## Adobe Analytics

**What it does:** Enterprise analytics for cross-channel measurement and attribution. Run reports against report suites using dimensions (eVars, props) and metrics, manage segments, and insert data server-side. Part of the Adobe Experience Cloud ecosystem.

**Auth method:** OAuth 2.0 (Service Account JWT). Create integration in Adobe Developer Console. Pass `Authorization: Bearer {access_token}` and `x-api-key: {client_id}`.

**CLI script:** `${CLAUDE_PLUGIN_ROOT}/skills/unmassk-marketing/scripts/adobe-analytics.js`

**Composio MCP toolkit:** Not available. Use CLI script or direct API.

**Key API operations:**

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List report suites | GET | `/api/{company_id}/reportsuites` |
| Get dimensions | GET | `/api/{company_id}/dimensions?rsid={report_suite_id}` |
| Get metrics | GET | `/api/{company_id}/metrics?rsid={report_suite_id}` |
| Run report | POST | `/api/{company_id}/reports` |
| List segments | GET | `/api/{company_id}/segments?rsid={report_suite_id}` |

**Base URL:** `https://analytics.adobe.io`

**Report request example:**
```json
{
  "rsid": "{report_suite_id}",
  "globalFilters": [{ "type": "dateRange", "dateRange": "2024-01-01T00:00:00/2024-01-31T23:59:59" }],
  "metricContainer": {
    "metrics": [
      {"id": "metrics/visits"},
      {"id": "metrics/pageviews"},
      {"id": "metrics/orders"}
    ]
  },
  "dimension": "variables/evar1"
}
```

**Key concepts:** Report Suite (data container), eVars (conversion variables, persistent), props (traffic variables, hit-level), Events (success metrics), Segments (user/visit filters), Calculated Metrics.

**Common dimensions:** `variables/page`, `variables/evar1`, `variables/prop1`, `variables/marketingchannel`, `variables/referringdomain`.

**Common metrics:** `metrics/visits`, `metrics/pageviews`, `metrics/uniquevisitors`, `metrics/orders`, `metrics/revenue`.

**Rate limits:** 12 requests/second per company. 120 requests/minute.

---

## Optimizely

**What it does:** A/B testing and experimentation platform. Create and manage experiments with variations, pull statistical results, manage audiences and feature flags, and run personalization campaigns. Full experiment lifecycle through the API.

**Auth method:** Bearer Token (Personal Access Token or OAuth 2.0). Pass `Authorization: Bearer {token}`. Generate at https://app.optimizely.com/v2/profile/api.

**CLI script:** `${CLAUDE_PLUGIN_ROOT}/skills/unmassk-marketing/scripts/optimizely.js`

**Composio MCP toolkit:** Not available. Use CLI script or direct API.

**Key API operations:**

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List projects | GET | `/v2/projects` |
| List experiments | GET | `/v2/experiments?project_id={id}` |
| Get experiment | GET | `/v2/experiments/{experiment_id}` |
| Get experiment results | GET | `/v2/experiments/{experiment_id}/results` |
| Create experiment | POST | `/v2/experiments` |
| Update experiment | PATCH | `/v2/experiments/{experiment_id}` |
| List campaigns | GET | `/v2/campaigns?project_id={id}` |
| Get campaign results | GET | `/v2/campaigns/{campaign_id}/results` |
| List audiences | GET | `/v2/audiences?project_id={id}` |
| List events | GET | `/v2/events?project_id={id}` |

**Base URL:** `https://api.optimizely.com`

**Create experiment example:**
```json
{
  "project_id": 12345,
  "name": "Homepage CTA Test",
  "type": "a/b",
  "variations": [
    { "name": "Control", "weight": 5000 },
    { "name": "Variation 1", "weight": 5000 }
  ],
  "metrics": [{ "event_id": 67890 }],
  "status": "not_started"
}
```

**Experiment statuses:** `not_started`, `running`, `paused`, `archived`.

**Experiment types:** `a/b`, `multivariate`, `personalization`.

**Results fields:** `variation_id`, `variation_name`, `visitors`, `conversions`, `conversion_rate`, `improvement` (vs control), `statistical_significance`, `is_baseline`.

**Traffic allocation:** Integer 0-10000 representing 0-100% of traffic.

**Rate limits:** 50 requests/second per personal token.

---

## Platform Selection Guide

| Use case | Recommended platform |
|----------|---------------------|
| Website traffic + marketing attribution | GA4 |
| Product usage analytics + funnels | Amplitude or Mixpanel |
| Privacy-first analytics (no cookies) | Plausible |
| UX research (heatmaps, recordings) | Hotjar |
| Event routing to multiple tools | Segment |
| Enterprise cross-channel analytics | Adobe Analytics |
| A/B testing + experimentation | Optimizely |
| Retention + cohort analysis | Amplitude or Mixpanel |

## Composio MCP Quick Reference

| Toolkit | Auth | Coverage | Key actions |
|---------|------|----------|-------------|
| `GOOGLEANALYTICS` | OAuth 2.0 | Medium | Run reports, real-time data, list properties |

List available Composio actions:
```bash
npx composio actions list --app GOOGLEANALYTICS
```

## Event Tracking Comparison

All product analytics platforms follow the same core pattern: identify users, track events with properties. Here is how the call differs:

| Platform | Identify | Track event | User properties |
|----------|----------|-------------|-----------------|
| GA4 | `gtag('config', ...)` | `gtag('event', name, props)` | User properties in config |
| Amplitude | `amplitude.setUserId(id)` | `amplitude.track(name, props)` | `amplitude.identify(identify)` |
| Mixpanel | `mixpanel.identify(id)` | `mixpanel.track(name, props)` | `mixpanel.people.set(props)` |
| Segment | `analytics.identify(id, traits)` | `analytics.track(name, props)` | Traits in identify call |
| Customer.io | `_cio.identify({id, ...})` | `_cio.track(name, data)` | Attributes in identify call |
