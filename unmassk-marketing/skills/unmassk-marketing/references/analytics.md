# Analytics and Experimentation Reference

Complete reference for analytics implementation, tracking plans, event instrumentation, UTM strategy, A/B testing, and experimentation methodology.

---

## Tracking Plan Framework

### Core Philosophy: Track for Decisions, Not Data

Every event must inform a decision. Before instrumenting anything, answer:

1. What question does this data answer?
2. What action will you take based on the result?
3. Who will use this data and how often?

Work backwards from decisions to events. If no one will act on the data, do not track it. Quality of events always beats quantity.

### Tracking Plan Structure

Build tracking plans as structured documents:

```
Event Name | Category | Properties | Trigger | Decision It Informs
---------- | -------- | ---------- | ------- | --------------------
```

### Event Types

| Type | Description | Examples |
|------|-------------|----------|
| Pageviews | Automatic page load tracking, enhanced with metadata | page_view with content_group, page_title |
| User Actions | Explicit interactions initiated by the user | button_clicked, form_submitted, feature_used |
| System Events | State changes triggered by backend processes | signup_completed, purchase_completed, subscription_changed |
| Custom Conversions | Goal completions mapped to business outcomes | trial_started, demo_requested, plan_selected |

### Start with Questions

Before building a tracking plan, document:

- What decisions will this data inform?
- What are the key conversion points?
- What funnel stages matter most?
- What segments need separate analysis?
- What privacy/compliance requirements apply?

---

## Event Naming Conventions

### Object-Action Format

Use lowercase with underscores. The format is `object_action` or `object_qualifier_action`:

```
signup_completed
button_clicked
form_submitted
article_read
checkout_payment_completed
cta_hero_clicked
```

### Naming Rules

- Lowercase with underscores exclusively. No spaces, no camelCase, no special characters.
- Be specific: `cta_hero_clicked` not `button_clicked`. Context goes in properties, not the event name.
- Use past tense for completed actions: `form_submitted` not `form_submit`.
- Avoid generic names that require properties to understand: `click` tells you nothing.
- Document every naming decision in the tracking plan.

---

## Essential Events

### Marketing Site Events

**Navigation and Engagement:**

| Event Name | Properties | Purpose |
|------------|------------|---------|
| page_view | page_title, page_location, content_group | Automatic, enhanced with metadata |
| scroll_depth | depth (25, 50, 75, 100) | Content engagement measurement |
| outbound_link_clicked | link_url, link_text | External exit tracking |
| video_played | video_id, video_title, duration | Media engagement |
| video_completed | video_id, video_title, duration | Media completion rate |

**CTA and Form Interactions:**

| Event Name | Properties | Purpose |
|------------|------------|---------|
| cta_clicked | button_text, cta_location, page | Click-through measurement |
| form_started | form_name, form_location | Form engagement funnel |
| form_field_completed | form_name, field_name | Field-level drop-off analysis |
| form_submitted | form_name, form_location | Conversion tracking |
| form_error | form_name, error_type | Friction identification |
| resource_downloaded | resource_name, resource_type | Content performance |

**Conversion Events:**

| Event Name | Properties | Purpose |
|------------|------------|---------|
| signup_started | source, page | Funnel entry tracking |
| signup_completed | method, plan, source | Core conversion metric |
| demo_requested | company_size, industry | Sales pipeline attribution |
| contact_submitted | inquiry_type | Lead capture measurement |
| newsletter_subscribed | source, list_name | List growth tracking |
| trial_started | plan, source | Product adoption metric |

### Product/App Events

**Onboarding:**

| Event Name | Properties |
|------------|------------|
| onboarding_started | - |
| onboarding_step_completed | step_number, step_name |
| onboarding_completed | steps_completed, time_to_complete |
| onboarding_skipped | step_skipped_at |
| first_key_action_completed | action_type |

**Core Usage:**

| Event Name | Properties |
|------------|------------|
| session_started | session_number |
| feature_used | feature_name, feature_category |
| action_completed | action_type, count |
| content_created | content_type |
| search_performed | query, results_count |
| settings_changed | setting_name, new_value |
| invite_sent | invite_type, count |

**Monetization:**

| Event Name | Properties |
|------------|------------|
| pricing_viewed | source |
| plan_selected | plan_name, billing_cycle |
| checkout_started | plan, value |
| payment_info_entered | payment_method |
| purchase_completed | plan, value, currency, transaction_id |
| purchase_failed | error_reason, plan |
| subscription_upgraded | from_plan, to_plan, value |
| subscription_downgraded | from_plan, to_plan |
| subscription_cancelled | plan, reason, tenure |

**E-commerce Events (if applicable):**

| Event Name | Properties |
|------------|------------|
| product_viewed | product_id, product_name, category, price |
| product_added_to_cart | product_id, product_name, price, quantity |
| cart_viewed | cart_value, items_count |
| checkout_started | cart_value, items_count |
| purchase_completed | transaction_id, value, currency, items[] |

**B2B/SaaS Specific:**

| Event Name | Properties |
|------------|------------|
| team_created | team_size, plan |
| team_member_invited | role, invite_method |
| integration_connected | integration_name |
| account_upgraded | from_plan, to_plan |
| account_churned | reason, tenure, mrr_lost |

### Standard Event Properties

Include these properties contextually across events:

| Category | Properties |
|----------|------------|
| Page | page_title, page_location, page_referrer |
| User | user_id, user_type, account_id, plan_type |
| Campaign | source, medium, campaign, content, term |
| Product | product_id, product_name, category, price |
| Timing | timestamp, time_on_page, session_duration |

### Funnel Event Sequences

**Signup Funnel:** signup_started -> signup_step_completed (email) -> signup_step_completed (password) -> signup_completed -> onboarding_started

**Purchase Funnel:** pricing_viewed -> plan_selected -> checkout_started -> payment_info_entered -> purchase_completed

**E-commerce Funnel:** product_viewed -> product_added_to_cart -> cart_viewed -> checkout_started -> shipping_info_entered -> payment_info_entered -> purchase_completed

---

## GA4 Implementation

### Initial Configuration

1. Create a GA4 property with one data stream per platform (web, iOS, Android).
2. Enable enhanced measurement for automatic event tracking.
3. Configure data retention to 14 months (max available; default is 2 months).
4. Enable Google Signals for cross-device tracking if consent is obtained.
5. Set up data stream filters to exclude internal traffic.

### Enhanced Measurement Events (Automatic)

| Event | Description | Configuration |
|-------|-------------|---------------|
| page_view | Page loads | Automatic |
| scroll | 90% scroll depth | Toggle on/off |
| outbound_click | Click to external domain | Automatic |
| site_search | Search query used | Configure search parameter name |
| video_engagement | YouTube video plays | Toggle on/off |
| file_download | PDF, docs, etc. | Configurable file extensions |

### Custom Event Implementation

**gtag.js (direct implementation):**

```javascript
// Basic custom event
gtag('event', 'signup_completed', {
  'method': 'email',
  'plan': 'free'
});

// Event with conversion value
gtag('event', 'purchase', {
  'transaction_id': 'T12345',
  'value': 99.99,
  'currency': 'USD',
  'items': [{
    'item_id': 'SKU123',
    'item_name': 'Product Name',
    'price': 99.99
  }]
});

// Set user properties for segmentation
gtag('set', 'user_properties', {
  'user_type': 'premium',
  'plan_name': 'pro'
});

// Set user ID for logged-in users
gtag('config', 'GA_MEASUREMENT_ID', {
  'user_id': 'USER_ID'
});
```

**Google Tag Manager (dataLayer):**

```javascript
// Custom event via dataLayer
dataLayer.push({
  'event': 'signup_completed',
  'method': 'email',
  'plan': 'free'
});

// E-commerce purchase (clear ecommerce first)
dataLayer.push({ ecommerce: null });
dataLayer.push({
  'event': 'purchase',
  'ecommerce': {
    'transaction_id': 'T12345',
    'value': 99.99,
    'currency': 'USD',
    'items': [{
      'item_id': 'SKU123',
      'item_name': 'Product Name',
      'price': 99.99,
      'quantity': 1
    }]
  }
});
```

### Conversions Setup

1. Ensure the event is firing in GA4 (verify in DebugView or Realtime).
2. Navigate to Admin > Events > Mark as conversion.
3. Set counting method: "Once per session" for leads/signups, "Every event" for purchases.
4. Import to Google Ads for conversion-optimized bidding if running paid campaigns.

### Custom Dimensions and Metrics

Register custom dimensions in Admin > Data display > Custom definitions. Choose scope:

| Scope | Use Case | Example |
|-------|----------|---------|
| Event | Per-event attribute | content_type, form_name |
| User | Per-user attribute | user_type, plan_name, account_tier |
| Item | Per-product attribute | product_category, brand |

The parameter name must exactly match the parameter sent with events.

### Audiences

Create audiences in Admin > Data display > Audiences for:

- **High-intent visitors**: Viewed pricing page + did not convert in last 7 days.
- **Engaged users**: 3+ sessions or 5+ minutes total engagement.
- **Purchasers**: Completed purchase event (for exclusion or lookalike).

Export audiences to Google Ads for remarketing, customer match, and similar audiences.

### Debugging and Validation

| Tool | Purpose |
|------|---------|
| GA4 DebugView | Real-time event monitoring. Enable with URL parameter `?debug_mode=true`, Chrome GA Debugger extension, or `'debug_mode': true` in config. |
| GTM Preview Mode | Test triggers and tag firing before publishing. |
| Realtime Reports | Verify events appearing within 30 minutes. |
| Tag Assistant | Browser extension for tag validation. |

**Validation Checklist:**

- Events fire on correct triggers
- Property values populate correctly
- No duplicate events
- Works across browsers and mobile
- Conversions recorded correctly
- No PII leaking in event parameters

**Common Issues:**

| Issue | Resolution |
|-------|-----------|
| Events not appearing | Check DebugView first. Verify gtag/GTM loaded. Check filter exclusions. |
| Parameter values missing | Custom dimension not created in GA4, or parameter name mismatch. Data processing takes 24-48 hours. |
| Conversions not recording | Event not marked as conversion, event name mismatch, or wrong counting method. |
| Duplicate events | Multiple containers loaded, or trigger firing twice on the same action. |

### Data Quality

- **Internal traffic exclusion**: Admin > Data streams > Configure tag settings > Define internal traffic. Exclude office IPs, developer traffic, and testing environments.
- **Cross-domain tracking**: Admin > Data streams > Configure tag settings > Configure your domains. List all domains that share sessions.
- **Session settings**: Adjust session timeout (default 30 min) and engaged session duration (default 10 sec) as needed.

### Google Ads Integration

1. Link GA4 to Google Ads: Admin > Product links > Google Ads links.
2. Enable auto-tagging in Google Ads.
3. Import conversions from GA4 into Google Ads.
4. Export audiences for remarketing campaigns.

---

## Google Tag Manager Setup

### Container Architecture

| Component | Purpose | Examples |
|-----------|---------|----------|
| Tags | Code that executes when triggered | GA4 Config, GA4 Event, Facebook Pixel, LinkedIn Insight, Custom HTML |
| Triggers | Conditions that cause tags to fire | Page View (All/DOM Ready/Window Loaded), Click, Form Submit, Scroll, Custom Event |
| Variables | Dynamic values used by tags and triggers | Data Layer variables, Click Text, Page Path, JavaScript variables, Lookup tables |

### Naming Conventions

Use consistent prefixes:

```
Tags:     GA4 - Event - Signup Completed
          GA4 - Config - Base Configuration
          FB - Pixel - Page View
          HTML - LiveChat Widget

Triggers: Click - CTA Button
          Submit - Contact Form
          View - Pricing Page
          Custom - signup_completed

Variables: DL - user_id
           JS - Current Timestamp
           LT - Campaign Source Map
```

### Data Layer Patterns

Initialize the data layer before GTM container loads:

```javascript
// In <head> before GTM snippet
window.dataLayer = window.dataLayer || [];
dataLayer.push({
  'pageType': 'product',
  'contentGroup': 'products',
  'user': {
    'loggedIn': true,
    'userId': '12345',
    'userType': 'premium'
  }
});
```

Push events from application code:

```javascript
// Form submission
document.querySelector('#contact-form').addEventListener('submit', function() {
  dataLayer.push({
    'event': 'form_submitted',
    'formName': 'contact',
    'formLocation': 'footer'
  });
});

// Button click
document.querySelector('.cta-button').addEventListener('click', function() {
  dataLayer.push({
    'event': 'cta_clicked',
    'ctaText': this.innerText,
    'ctaLocation': 'hero'
  });
});
```

### Common Tag Configurations

**GA4 Configuration Tag:** Tag Type: GA4 Configuration. Measurement ID: G-XXXXXXXX. Send page view: checked. Trigger: All Pages. Add user properties for user-level dimensions.

**GA4 Event Tag:** Tag Type: GA4 Event. Reference your config tag. Set event name from dataLayer or hardcode. Map event parameters from dataLayer variables. Trigger: Custom Event matching the dataLayer event name.

**Facebook Pixel (Custom HTML):** Initialize with pixel ID on All Pages. Fire standard events (Lead, Purchase) on matching custom event triggers via additional Custom HTML tags.

### Consent Management

Implement consent mode before any tags fire:

```javascript
// Default state (before consent granted)
gtag('consent', 'default', {
  'analytics_storage': 'denied',
  'ad_storage': 'denied'
});

// Update when user grants consent
function grantConsent() {
  gtag('consent', 'update', {
    'analytics_storage': 'granted',
    'ad_storage': 'granted'
  });
}
```

Enable Consent Overview in GTM Admin and configure consent requirements for each tag.

### Advanced Patterns

- **Tag sequencing**: Ensure config tags fire before event tags. Configure in Tag > Advanced Settings > Tag Sequencing.
- **Trigger exceptions**: Prevent tags from firing on specific pages, for internal traffic, or during testing.
- **Custom JavaScript variables**: Extract URL parameters, cookie values, or page data for use in tags and triggers.

### Workspace and Version Management

- Use separate workspaces for large changes.
- Name every published version descriptively with change notes.
- Review all changes before publishing.
- Document which version is in production.

---

## UTM Parameter Strategy

### Standard Parameters

| Parameter | Purpose | Example Values |
|-----------|---------|----------------|
| utm_source | Traffic source | google, newsletter, twitter, partner_name |
| utm_medium | Marketing medium | cpc, email, social, referral, display |
| utm_campaign | Campaign identifier | spring_sale, product_launch_q1, webinar_seo |
| utm_content | Differentiate creatives/placements | hero_cta, sidebar_banner, email_header_link |
| utm_term | Paid search keywords | running+shoes, crm+software |

### UTM Naming Conventions

- Lowercase everything. Mixed case creates duplicate entries in reports.
- Use underscores or hyphens consistently (pick one, never mix).
- Be specific but concise: `blog_footer_cta` not `cta1`.
- Include campaign date or quarter for time-bound campaigns: `spring_2024` or `q1_launch`.
- Document all UTM parameters in a central spreadsheet or tracking document.
- Never use UTM parameters on internal links (they override session attribution).

---

## A/B Test Hypothesis Framework

### Hypothesis Structure

Every test begins with a structured hypothesis:

```
Because [observation or data],
we believe [specific change]
will cause [expected outcome]
for [target audience].
We will know this is true when [primary metric] changes by [minimum threshold].
```

### Weak vs. Strong Hypotheses

**Weak:** "Changing the button color might increase clicks."

**Strong:** "Because heatmap data shows users do not scroll past the fold (72% exit before reaching the CTA), we believe moving the primary CTA above the fold will increase CTA click-through rate by 15%+ for new visitors. We will measure click-through rate from page view to signup start."

### Hypothesis Quality Checklist

- Based on data or specific observation, not intuition alone
- Identifies a single variable to change
- Predicts a specific, measurable outcome
- Defines the audience segment
- Specifies the metric and minimum detectable effect

---

## Test Types

| Type | Description | Traffic Needed | When to Use |
|------|-------------|----------------|-------------|
| A/B | Two versions, single variable change | Moderate | Default for most tests. Clean isolation of variables. |
| A/B/n | Multiple variants of one element | Higher (1.5-2x per additional variant) | When you have several strong hypotheses for the same element. |
| MVT (Multivariate) | Multiple elements changed in combinations | Very high | When testing interactions between elements. Requires substantial traffic. |
| Split URL | Different URLs serve different page versions | Moderate | When variants require fundamentally different page structures. |

### Multiple Variant Adjustments

With more than 2 variants, apply corrections for multiple comparisons:

| Variants | Sample Multiplier |
|----------|------------------|
| 2 (A/B) | 1x |
| 3 (A/B/C) | ~1.5x |
| 4 (A/B/C/D) | ~2x |
| 5+ | Strongly consider reducing variants |

Apply Bonferroni correction or use testing tools that handle this automatically (Optimizely Stats Accelerator, VWO SmartStats, PostHog Bayesian).

---

## Sample Size Reference

### Quick Reference Table

At 95% confidence and 80% power:

| Baseline Rate | 10% Relative Lift | 20% Relative Lift | 50% Relative Lift | 100% Relative Lift |
|---------------|-------------------|-------------------|-------------------|-------------------|
| 1% | 380,000/variant | 97,000/variant | 16,000/variant | 4,200/variant |
| 3% | 120,000/variant | 31,000/variant | 5,200/variant | 1,400/variant |
| 5% | 72,000/variant | 18,000/variant | 3,100/variant | 810/variant |
| 10% | 34,000/variant | 8,700/variant | 1,500/variant | 400/variant |
| 20% | 16,000/variant | 4,000/variant | 700/variant | 200/variant |

### Extended Tables (Per Variant)

**1% Baseline:** 5% lift = 1,500,000 | 10% lift = 380,000 | 20% lift = 97,000 | 50% lift = 16,000 | 100% lift = 4,200

**3% Baseline:** 5% lift = 480,000 | 10% lift = 120,000 | 20% lift = 31,000 | 50% lift = 5,200 | 100% lift = 1,400

**5% Baseline:** 5% lift = 280,000 | 10% lift = 72,000 | 20% lift = 18,000 | 50% lift = 3,100 | 100% lift = 810

**10% Baseline:** 5% lift = 130,000 | 10% lift = 34,000 | 20% lift = 8,700 | 50% lift = 1,500 | 100% lift = 400

**20% Baseline:** 5% lift = 60,000 | 10% lift = 16,000 | 20% lift = 4,000 | 50% lift = 700 | 100% lift = 200

### Duration Calculation

```
Duration (days) = (Sample per variant x Number of variants) / (Daily traffic x % exposed to test)
```

**Example:** 30,000 per variant, 2 variants, 2,000 daily visitors, 100% exposed = 60,000 / 2,000 = 30 days.

### Duration Rules

- **Minimum**: Always run at least 1 full week to capture day-of-week variation. For B2B, run at least 2 business cycles. For e-commerce, include paydays (beginning/end of month).
- **Maximum**: Avoid running longer than 4-8 weeks. Novelty effects wear off, external factors intervene, and opportunity cost grows.
- **Feasibility check**: If duration exceeds 60 days, consider increasing MDE, reducing variants, testing upstream in the funnel, or making the decision without a test.

### When Sample Size Is Unachievable

1. Increase MDE (accept detecting only larger effects, 20%+ lift).
2. Lower confidence to 90% (document the tradeoff).
3. Reduce to two variants only.
4. Combine traffic from multiple similar pages.
5. Test earlier in the funnel where traffic is higher.
6. Make the decision based on qualitative data instead of testing.

### Recommended Calculators

- Evan Miller: https://www.evanmiller.org/ab-testing/sample-size.html
- Optimizely: https://www.optimizely.com/sample-size-calculator/
- VWO Duration Calculator: https://vwo.com/tools/ab-test-duration-calculator/
- AB Test Guide (includes Bayesian): https://www.abtestguide.com/calc/

---

## Metrics Selection

### Primary Metric

- Select a single metric that directly maps to the hypothesis.
- Must be tied to business value, not vanity.
- This is the metric that determines whether the test wins or loses.
- Example: For a pricing page test, the primary metric is plan selection rate.

### Secondary Metrics

- Support interpretation of the primary metric.
- Explain why or how the change worked (or did not).
- Examples: Time on page, plan distribution, scroll depth, clicks on specific elements.

### Guardrail Metrics

- Metrics that must not get worse. Stop the test if they decline significantly.
- Examples: Support ticket volume, refund rate, page load time, error rate, bounce rate on downstream pages.

### Metric Selection by Page Type

| Page | Primary | Secondary | Guardrails |
|------|---------|-----------|------------|
| Pricing | Plan selection rate | Plan distribution, time on page | Support tickets, refund rate |
| Homepage | CTA click-through rate | Scroll depth, bounce rate | Page load time |
| Signup | Completion rate | Time to complete, field drop-off | Error rate, support contacts |
| Landing page | Conversion rate | Scroll depth, engagement time | Bounce rate |

---

## Traffic Allocation

| Approach | Split | When to Use |
|----------|-------|-------------|
| Standard | 50/50 | Default for A/B tests. Fastest to reach significance. |
| Conservative | 90/10 or 80/20 | When limiting exposure risk of an unproven variant. |
| Ramping | Start at 10/90, increase gradually | When mitigating technical risk of new implementations. |

### Allocation Requirements

- **Consistency**: Users must see the same variant on return visits. Use cookie-based or user-ID-based assignment.
- **Balance**: Ensure exposure is balanced across time of day and day of week. Do not start tests on weekends or holidays unless that is your peak traffic.

---

## Analysis Checklist and Result Interpretation

### Pre-Analysis Checklist

1. **Sample size reached?** If not, the result is preliminary regardless of what the numbers show.
2. **Statistically significant?** 95% confidence (p < 0.05). Check confidence intervals, not just p-values.
3. **Effect size meaningful?** Compare observed lift to MDE. A statistically significant 0.1% lift may not be worth implementing.
4. **Secondary metrics consistent?** Do they support the primary metric's story?
5. **Guardrail metrics safe?** Nothing got worse?
6. **Segment differences?** Check mobile vs. desktop, new vs. returning, traffic source. Large segment differences may indicate the variant works for some audiences but not others.

### Interpreting Results

| Result | Action |
|--------|--------|
| Significant winner (variant beats control) | Implement variant. Document learnings. |
| Significant loser (control beats variant) | Keep control. Analyze why the hypothesis was wrong. |
| No significant difference | Need more traffic, a bolder change, or accept that this element does not materially affect the metric. |
| Mixed signals (primary up, guardrail down) | Investigate deeper. Segment analysis may reveal the answer. Consider a follow-up test. |

### The Peeking Problem

Looking at results before reaching the predetermined sample size and stopping early inflates false positive rates. A test showing 95% confidence at 30% of the required sample size does not actually have 95% confidence. Pre-commit to sample size and honor it. If you must check early, use sequential testing methods (available in Optimizely, VWO SmartStats, PostHog).

### Common Analysis Mistakes

- **Stopping early** based on premature significance.
- **Cherry-picking segments** to find a winner when the overall result is flat.
- **Ignoring confidence intervals** and treating point estimates as truth.
- **Over-interpreting inconclusive results** as "no difference" when the test was underpowered.
- **Not documenting learnings** from failed tests.

### Test Documentation

Document every test:

| Field | Content |
|-------|---------|
| Hypothesis | Full hypothesis statement |
| Variants | Screenshots and descriptions of control and variant(s) |
| Sample size | Target vs. actual per variant |
| Primary metric | Result with confidence interval |
| Secondary metrics | Results table |
| Guardrail metrics | Any concerns |
| Segment analysis | Mobile/desktop, new/returning, traffic source |
| Decision | Implement, keep control, or re-test |
| Learnings | What was learned, what to test next |

### Experiment Prioritization

Score test ideas before running them:

| Factor | Weight |
|--------|--------|
| Potential impact on business metric | 30% |
| Confidence in hypothesis (data backing) | 25% |
| Ease of implementation | 20% |
| Risk if the variant performs poorly | 15% |
| Strategic alignment | 10% |

Score 1-5 per factor. Prioritize highest weighted scores.

---

## Privacy and Compliance

- Implement cookie consent before firing analytics tags (required in EU/UK/CA).
- Never include PII (names, emails, phone numbers) in event properties.
- Configure data retention settings appropriately.
- Ensure user deletion capabilities are functional.
- Use GA4 Consent Mode to respect user choices.
- IP anonymization is default in GA4.
- Integrate with your consent management platform (OneTrust, Cookiebot, etc.).

---

## CLI Script Reference

All CLI tools are zero-dependency Node.js scripts. Run with `node tools/clis/<name>.js`. Run without arguments to see usage. Use `--dry-run` to preview API requests without sending.

### ga4.js

**Environment variable:** `GA4_ACCESS_TOKEN`

| Command | Description |
|---------|-------------|
| `ga4.js reports run --property PROP_ID --dimensions date --metrics sessions --start 7daysAgo` | Run a Data API report with dimensions, metrics, and date range |
| `ga4.js realtime run --property PROP_ID` | Fetch realtime report data |
| `ga4.js conversions list --property PROP_ID` | List configured conversion events |
| `ga4.js conversions create --property PROP_ID --event signup_completed` | Mark an event as a conversion |
| `ga4.js events send --measurement-id G-XXXX --api-secret SECRET --client-id CID --name event_name` | Send events via Measurement Protocol |

### amplitude.js

**Environment variables:** `AMPLITUDE_API_KEY`, `AMPLITUDE_SECRET_KEY` (for queries)

| Command | Description |
|---------|-------------|
| `amplitude.js track event --event-type signup_completed --user-id USER` | Track a single event |
| `amplitude.js track batch --events '[...]'` | Send batch events |
| `amplitude.js users activity --user USER` | Get user activity timeline |
| `amplitude.js export events --start DATE --end DATE` | Export raw event data |
| `amplitude.js retention get --event EVENT` | Get retention analysis |

### mixpanel.js

**Environment variables:** `MIXPANEL_TOKEN` (ingestion), `MIXPANEL_API_KEY` + `MIXPANEL_SECRET` (queries)

| Command | Description |
|---------|-------------|
| `mixpanel.js track event --event signup_completed --distinct-id USER --token TOKEN` | Track a single event |
| `mixpanel.js profiles set --distinct-id USER --properties '{"plan":"pro"}'` | Set user profile properties |
| `mixpanel.js query events --event EVENT --from DATE --to DATE` | Query event data |
| `mixpanel.js funnels get --funnel-id ID` | Get funnel analysis |
| `mixpanel.js retention get --event EVENT --born-event BORN` | Get retention data |
| `mixpanel.js export events --from DATE --to DATE` | Export raw events |

### hotjar.js

**Environment variables:** `HOTJAR_CLIENT_ID`, `HOTJAR_CLIENT_SECRET`

| Command | Description |
|---------|-------------|
| `hotjar.js sites list` | List connected sites |
| `hotjar.js surveys list --site-id ID` | List surveys for a site |
| `hotjar.js surveys responses --survey-id ID` | Get survey responses |
| `hotjar.js heatmaps list --site-id ID` | List heatmaps |
| `hotjar.js recordings list --site-id ID` | List session recordings |
| `hotjar.js forms list --site-id ID` | List form analytics |

### segment.js

**Environment variables:** `SEGMENT_WRITE_KEY` (tracking), `SEGMENT_ACCESS_TOKEN` (profiles)

| Command | Description |
|---------|-------------|
| `segment.js track event --event signup_completed --user-id USER --properties '{"plan":"free"}'` | Track event |
| `segment.js identify user --user-id USER --traits '{"name":"...","plan":"pro"}'` | Identify user |
| `segment.js page view --user-id USER --name "Pricing"` | Track page view |
| `segment.js batch send --messages '[...]'` | Send batch of events |
| `segment.js profiles traits --space SPACE --collection COLL --profile-id ID` | Get profile traits |
| `segment.js profiles events --space SPACE --collection COLL --profile-id ID` | Get profile events |

### optimizely.js

**Environment variable:** `OPTIMIZELY_API_KEY`

| Command | Description |
|---------|-------------|
| `optimizely.js projects list` | List all projects |
| `optimizely.js experiments list --project-id ID` | List experiments in a project |
| `optimizely.js experiments get --experiment-id ID` | Get experiment details |
| `optimizely.js experiments create --project-id ID --name NAME` | Create a new experiment |
| `optimizely.js experiments results --experiment-id ID` | Get experiment results and stats |
| `optimizely.js experiments archive --experiment-id ID` | Archive an experiment |
| `optimizely.js audiences list --project-id ID` | List audiences |
| `optimizely.js events list --project-id ID` | List tracked events |

### plausible.js

**Environment variables:** `PLAUSIBLE_API_KEY`, `PLAUSIBLE_BASE_URL` (optional, defaults to plausible.io)

| Command | Description |
|---------|-------------|
| `plausible.js stats aggregate --site-id DOMAIN --period 30d --metrics visitors,pageviews,bounce_rate` | Aggregate stats |
| `plausible.js stats timeseries --site-id DOMAIN --period 7d --metrics visitors` | Time series data |
| `plausible.js stats pages --site-id DOMAIN --period 30d` | Top pages report |
| `plausible.js stats sources --site-id DOMAIN --period 30d` | Traffic sources |
| `plausible.js stats utm --site-id DOMAIN --period 30d --property utm_source` | UTM breakdown |
| `plausible.js stats realtime --site-id DOMAIN` | Current visitors |
| `plausible.js goals list --site-id DOMAIN` | List conversion goals |
| `plausible.js goals create --site-id DOMAIN --event-name signup_completed` | Create a goal |

---

## Composio MCP for Analytics

For analytics platforms that lack native MCP servers, use Composio to get MCP access.

**Setup:** Run `npx @composio/mcp@latest setup` to install the Composio MCP server. Authenticate each tool via the Connect Link provided on first use.

**Available analytics integrations via Composio:**

| Tool | Composio Toolkit | Capabilities |
|------|-----------------|--------------|
| Google Analytics (GA4) | `GOOGLEANALYTICS` | Read reports, manage properties (also has native MCP) |
| Google Sheets | `GOOGLESHEETS` | Read/write tracking plan spreadsheets, export data |
| Slack | `SLACK` | Send analytics alerts, experiment results |

For tools with CLI scripts (GA4, Amplitude, Mixpanel, Segment, Hotjar, Optimizely, Plausible), use the CLI tools directly for most operations. Composio is most valuable when you need cross-tool orchestration or OAuth-heavy integrations without managing tokens manually.
