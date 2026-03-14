# Email Integrations Reference

Consolidated reference for email marketing, transactional email, and newsletter platforms. Use these integrations to send campaigns, manage subscribers, set up automations, and track email performance.

## Mailchimp

**What it does:** Email marketing platform for campaigns, automation, and audience management. Create and send campaigns, manage audiences (lists) and subscribers, set up automation workflows, and pull campaign performance reports.

**Auth method:** API Key or OAuth 2.0. Pass `Authorization: Bearer {api_key}` or `Authorization: apikey {api_key}`. Base URL uses datacenter from API key: `https://{dc}.api.mailchimp.com/3.0/`.

**CLI script:** Not available as standalone. Mailchimp has a native MCP server with deep coverage.

**Composio MCP toolkit:** `MAILCHIMP` (OAuth 2.0, Deep coverage -- 20+ actions). Actions: get audiences, list campaigns, get campaign reports, add subscribers. Mailchimp also has a native MCP server -- prefer the native MCP for deeper coverage.

**Key API operations:**

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List audiences | GET | `/3.0/lists` |
| Get audience members | GET | `/3.0/lists/{list_id}/members?count=100` |
| Add subscriber | POST | `/3.0/lists/{list_id}/members` |
| Update subscriber | PATCH | `/3.0/lists/{list_id}/members/{subscriber_hash}` |
| List campaigns | GET | `/3.0/campaigns?count=20` |
| Get campaign report | GET | `/3.0/reports/{campaign_id}` |
| Create campaign | POST | `/3.0/campaigns` |
| Send campaign | POST | `/3.0/campaigns/{campaign_id}/actions/send` |
| List automations | GET | `/3.0/automations` |

**Add subscriber payload:**
```json
{
  "email_address": "user@example.com",
  "status": "subscribed",
  "merge_fields": { "FNAME": "John", "LNAME": "Doe" }
}
```

**Subscriber hash:** Calculate with `md5(email.toLowerCase())` for update/delete operations.

**Subscriber statuses:** `subscribed` (active), `unsubscribed`, `cleaned` (hard bounce), `pending` (awaiting confirmation), `transactional`.

**Campaign report metrics:** `emails_sent`, `opens`, `unique_opens`, `open_rate`, `clicks`, `click_rate`, `unsubscribes`, `bounces`.

**Create campaign payload:**
```json
{
  "type": "regular",
  "recipients": { "list_id": "{list_id}" },
  "settings": { "subject_line": "Subject", "from_name": "Name", "reply_to": "reply@example.com" }
}
```

**Rate limits:** 10 concurrent connections. 10 requests per second. Batch endpoints available for bulk operations.

---

## Customer.io

**What it does:** Behavior-based messaging platform for email, push, SMS, and in-app messages. Identify customers with attributes, track behavioral events, trigger automated campaigns (journeys), send broadcasts, and deliver transactional emails.

**Auth method:** Track API uses Basic Auth with Site ID + API Key: `Authorization: Basic {base64(site_id:api_key)}`. App API uses Bearer Token: `Authorization: Bearer {app_api_key}`.

**CLI script:** `${CLAUDE_PLUGIN_ROOT}/skills/unmassk-marketing/scripts/customer-io.js`

**Composio MCP toolkit:** Not available. Use CLI script or direct API.

**Key API operations:**

| Operation | API | Method | Endpoint |
|-----------|-----|--------|----------|
| Identify customer | Track | PUT | `https://track.customer.io/api/v1/customers/{customer_id}` |
| Track event | Track | POST | `https://track.customer.io/api/v1/customers/{customer_id}/events` |
| Track anonymous event | Track | POST | `https://track.customer.io/api/v1/events` |
| Delete customer | Track | DELETE | `https://track.customer.io/api/v1/customers/{customer_id}` |
| Get customer | App | GET | `https://api.customer.io/v1/customers/{customer_id}/attributes` |
| List campaigns | App | GET | `https://api.customer.io/v1/campaigns` |
| Get campaign metrics | App | GET | `https://api.customer.io/v1/campaigns/{campaign_id}/metrics` |
| Trigger broadcast | App | POST | `https://api.customer.io/v1/campaigns/{campaign_id}/triggers` |
| Send transactional email | App | POST | `https://api.customer.io/v1/send/email` |

**Identify customer payload:**
```json
{
  "email": "user@example.com",
  "created_at": 1705312800,
  "first_name": "John",
  "plan": "pro"
}
```

**Track event payload:**
```json
{ "name": "purchase", "data": { "product": "Pro Plan", "amount": 99 } }
```

**Transactional email payload:**
```json
{
  "transactional_message_id": "1",
  "to": "user@example.com",
  "identifiers": { "id": "user_123" },
  "message_data": { "order_id": "ORD-456" }
}
```

**Trigger broadcast payload:**
```json
{ "emails": ["user@example.com"], "data": { "coupon_code": "SAVE20" } }
```

**JavaScript SDK:**
```javascript
_cio.identify({ id: 'user_123', email: 'user@example.com', created_at: 1705312800, plan: 'pro' });
_cio.track('purchase', { product: 'Pro Plan', amount: 99 });
_cio.page();
```

**Key concepts:** People (customers/leads), Segments (dynamic groups), Campaigns (automated journeys), Broadcasts (one-time sends), Transactional (triggered messages).

**Rate limits:** Track API: 100 requests/second. App API: 10 requests/second.

---

## SendGrid

**What it does:** Email delivery platform for transactional and marketing emails at scale. Send emails with dynamic templates, manage contacts and lists, track delivery statistics, handle bounces and spam reports, and validate email addresses.

**Auth method:** API Key. Pass `Authorization: Bearer {api_key}`. Generate at Settings > API Keys in SendGrid dashboard.

**CLI script:** `${CLAUDE_PLUGIN_ROOT}/skills/unmassk-marketing/scripts/sendgrid.js`

**Composio MCP toolkit:** Not available. Use CLI script or direct API.

**Key API operations:**

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Send email | POST | `/v3/mail/send` |
| Send with template | POST | `/v3/mail/send` |
| Add contact to list | PUT | `/v3/marketing/contacts` |
| Search contacts | POST | `/v3/marketing/contacts/search` |
| Get email statistics | GET | `/v3/stats?start_date={}&end_date={}` |
| Get bounces | GET | `/v3/suppression/bounces` |
| Get spam reports | GET | `/v3/suppression/spam_reports` |
| Validate email | POST | `/v3/validations/email` |
| Send batch emails | POST | `/v3/mail/batch` |

**Base URL:** `https://api.sendgrid.com`

**Send email payload:**
```json
{
  "personalizations": [{ "to": [{"email": "user@example.com"}] }],
  "from": {"email": "hello@example.com"},
  "subject": "Welcome!",
  "content": [{ "type": "text/html", "value": "<h1>Welcome!</h1>" }]
}
```

**Send with dynamic template:**
```json
{
  "personalizations": [{
    "to": [{"email": "user@example.com"}],
    "dynamic_template_data": { "name": "John", "order_id": "12345" }
  }],
  "from": {"email": "hello@example.com"},
  "template_id": "d-xxx"
}
```

**Contact search query:** SQL-like syntax, e.g., `"query": "email LIKE 'user@%'"`.

**Webhook events:** `processed`, `delivered`, `open`, `click`, `bounce`, `dropped`, `spamreport`, `unsubscribe`.

**Node.js SDK:**
```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey('SG.xxx');
await sgMail.send({ to: 'user@example.com', from: 'hello@example.com', subject: 'Welcome!', html: '<h1>Welcome!</h1>' });
```

**Rate limits:** Free: 100 emails/day. Paid: varies by plan (up to millions/month).

---

## Kit (formerly ConvertKit)

**What it does:** Email marketing platform for creators and newsletter businesses. Manage subscribers, forms, sequences (automated email series), tags, and broadcasts. Optimized for creator workflows with form-based list building.

**Auth method:** API Key or API Secret. Pass as query/body parameter: `api_key={key}` or `api_secret={secret}`. Get at Settings > Advanced in Kit dashboard.

**CLI script:** `${CLAUDE_PLUGIN_ROOT}/skills/unmassk-marketing/scripts/kit.js`

**Composio MCP toolkit:** Not available. Use CLI script or direct API.

**Key API operations:**

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List subscribers | GET | `/v3/subscribers?api_secret={secret}` |
| Get subscriber | GET | `/v3/subscribers/{id}?api_secret={secret}` |
| Add to form | POST | `/v3/forms/{form_id}/subscribe` |
| Add to sequence | POST | `/v3/sequences/{sequence_id}/subscribe` |
| Tag subscriber | POST | `/v3/tags/{tag_id}/subscribe` |
| Remove tag | DELETE | `/v3/subscribers/{id}/tags/{tag_id}?api_secret={secret}` |
| Update subscriber | PUT | `/v3/subscribers/{id}` |
| Unsubscribe | PUT | `/v3/unsubscribe` |
| List forms | GET | `/v3/forms?api_key={key}` |
| List sequences | GET | `/v3/sequences?api_key={key}` |
| List tags | GET | `/v3/tags?api_key={key}` |
| Create broadcast | POST | `/v3/broadcasts` |

**Base URL:** `https://api.convertkit.com`

**Add subscriber to form:**
```json
{
  "api_key": "{api_key}",
  "email": "user@example.com",
  "first_name": "John",
  "fields": { "company": "Example Inc" }
}
```

**Create broadcast:**
```json
{
  "api_secret": "{api_secret}",
  "subject": "Newsletter Subject",
  "content": "<p>Email content here</p>",
  "email_layout_template": "default"
}
```

**Subscriber states:** `active`, `unsubscribed`, `bounced`, `complained`, `inactive`.

**Key concepts:** Subscribers, Forms (signup), Sequences (automated series), Tags (labels), Broadcasts (one-time sends), Custom Fields.

**Rate limits:** 120 requests per minute.

---

## Resend

**What it does:** Developer-friendly transactional email service with a modern, minimal API. Send emails (including React Email templates), check delivery status, send batches, and manage domains. Built for developers who want simple, reliable email delivery.

**Auth method:** API Key. Pass `Authorization: Bearer {api_key}`. Get at API Keys section in Resend dashboard.

**CLI script:** `${CLAUDE_PLUGIN_ROOT}/skills/unmassk-marketing/scripts/resend.js`

**Composio MCP toolkit:** Not available. Resend has a native MCP server.

**Key API operations:**

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Send email | POST | `/emails` |
| Get email status | GET | `/emails/{email_id}` |
| List emails | GET | `/emails` |
| Send batch | POST | `/emails/batch` |
| List domains | GET | `/domains` |
| Verify domain | POST | `/domains/{domain_id}/verify` |

**Base URL:** `https://api.resend.com`

**Send email payload:**
```json
{ "from": "hello@example.com", "to": ["user@example.com"], "subject": "Welcome!", "html": "<h1>Welcome!</h1>" }
```

**Node.js SDK with React Email:**
```typescript
import { Resend } from 'resend';
const resend = new Resend('re_xxx');
await resend.emails.send({ from: 'hello@example.com', to: 'user@example.com', subject: 'Welcome!', react: WelcomeEmail({ name: 'John' }) });
```

**Email statuses:** `queued`, `sent`, `delivered`, `opened`, `clicked`, `bounced`, `complained`.

**Webhook events:** `email.sent`, `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`, `email.complained`.

**Rate limits:** Free: 100 emails/day, 3,000/month. Pro: 100 emails/second.

---

## Postmark

**What it does:** Transactional email delivery with fast performance, template management, bounce handling, and detailed delivery analytics. Separate message streams for transactional and broadcast email. Known for high deliverability and speed.

**Auth method:** Server Token or Account Token. Pass `X-Postmark-Server-Token: {server_token}` (server-level) or `X-Postmark-Account-Token: {account_token}` (account-level). Server tokens are per-server.

**CLI script:** `${CLAUDE_PLUGIN_ROOT}/skills/unmassk-marketing/scripts/postmark.js`

**Composio MCP toolkit:** Not available. Use CLI script or direct API.

**Key API operations:**

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Send email | POST | `/email` |
| Send with template | POST | `/email/withTemplate` |
| Send batch | POST | `/email/batch` |
| List templates | GET | `/templates?Count=100&Offset=0` |
| Create template | POST | `/templates` |
| Get delivery stats | GET | `/deliverystats` |
| List bounces | GET | `/bounces?count=50&offset=0&type=HardBounce` |
| Activate bounce | PUT | `/bounces/{bounceId}/activate` |
| Search messages | GET | `/messages/outbound?count=50&recipient={email}` |
| Get outbound stats | GET | `/stats/outbound?fromdate={}&todate={}` |
| Get open stats | GET | `/stats/outbound/opens?fromdate={}&todate={}` |
| Get click stats | GET | `/stats/outbound/clicks?fromdate={}&todate={}` |
| List suppressions | GET | `/message-streams/outbound/suppressions/dump` |

**Base URL:** `https://api.postmarkapp.com`

**Send email payload:**
```json
{
  "From": "sender@example.com",
  "To": "recipient@example.com",
  "Subject": "Welcome!",
  "HtmlBody": "<p>Hello!</p>",
  "TextBody": "Hello!",
  "MessageStream": "outbound",
  "TrackOpens": true,
  "TrackLinks": "HtmlAndText"
}
```

**Send with template:**
```json
{
  "From": "sender@example.com",
  "To": "recipient@example.com",
  "TemplateId": 12345,
  "TemplateModel": { "name": "Jane", "action_url": "https://example.com/verify" },
  "MessageStream": "outbound"
}
```

**Create template:**
```json
{
  "Name": "Welcome Email",
  "Alias": "welcome",
  "Subject": "Welcome {{name}}!",
  "HtmlBody": "<p>Hello {{name}}</p>",
  "TextBody": "Hello {{name}}"
}
```

**API pattern:** PascalCase field names. Custom auth headers (not `Authorization`). Pagination with `Count` and `Offset`. Synchronous delivery confirmation.

**Bounce types:** `HardBounce`, `SoftBounce`, `Transient`, `SpamNotification`.

**Message streams:** `outbound` (transactional), `broadcast` (marketing).

**Track links options:** `None`, `HtmlAndText`, `HtmlOnly`, `TextOnly`.

**Rate limits:** 500 messages per batch. 10 MB per message. 50 MB per batch.

---

## Brevo (formerly Sendinblue)

**What it does:** All-in-one marketing platform for email, SMS, and WhatsApp. Manage contacts and lists, create email campaigns, send transactional email and SMS, and import contacts in bulk. Affordable alternative for multi-channel marketing automation.

**Auth method:** API Key. Pass `api-key: {api_key}` header. Generate at SMTP & API settings in Brevo dashboard. Key shown only once on creation.

**CLI script:** `${CLAUDE_PLUGIN_ROOT}/skills/unmassk-marketing/scripts/brevo.js`

**Composio MCP toolkit:** Not available. Use CLI script or direct API.

**Key API operations:**

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List contacts | GET | `/v3/contacts?limit=50&offset=0` |
| Get contact by email | GET | `/v3/contacts/{email}` |
| Create contact | POST | `/v3/contacts` |
| Update contact | PUT | `/v3/contacts/{email}` |
| Import contacts | POST | `/v3/contacts/import` |
| List contact lists | GET | `/v3/contacts/lists` |
| Create list | POST | `/v3/contacts/lists` |
| Add to list | POST | `/v3/contacts/lists/{listId}/contacts/add` |
| Remove from list | POST | `/v3/contacts/lists/{listId}/contacts/remove` |
| Send transactional email | POST | `/v3/smtp/email` |
| List campaigns | GET | `/v3/emailCampaigns?limit=50&type=classic&status=sent` |
| Create campaign | POST | `/v3/emailCampaigns` |
| Send campaign | POST | `/v3/emailCampaigns/{campaignId}/sendNow` |
| Send test email | POST | `/v3/emailCampaigns/{campaignId}/sendTest` |
| Send SMS | POST | `/v3/transactionalSMS/sms` |

**Base URL:** `https://api.brevo.com`

**Create contact payload:**
```json
{
  "email": "user@example.com",
  "attributes": { "FIRSTNAME": "Jane", "LASTNAME": "Doe" },
  "listIds": [1, 2]
}
```

**Transactional email payload:**
```json
{
  "sender": { "name": "My App", "email": "noreply@example.com" },
  "to": [{ "email": "user@example.com", "name": "Jane Doe" }],
  "subject": "Order Confirmation",
  "htmlContent": "<p>Your order is confirmed.</p>"
}
```

**Create campaign payload:**
```json
{
  "name": "January Newsletter",
  "subject": "Monthly Update",
  "sender": { "name": "My Brand", "email": "news@example.com" },
  "htmlContent": "<p>Newsletter content</p>",
  "recipients": { "listIds": [1, 2] }
}
```

**Send SMS payload:**
```json
{ "sender": "MyApp", "recipient": "+15551234567", "content": "Your code is 123456", "type": "transactional" }
```

**API pattern:** Uppercase attribute names (`FIRSTNAME`, `LASTNAME`). Offset-based pagination. Transactional email uses `/smtp/email` endpoint.

**Campaign metrics:** `sent`, `delivered`, `openRate`, `clickRate`, `unsubscribed`, `hardBounces`, `softBounces`.

**Rate limits:** Vary by plan. Rate limit headers returned with responses.

---

## Klaviyo

**What it does:** E-commerce email and SMS marketing with profiles, flows (automated sequences), campaigns, segments, and event tracking. JSON:API specification. Deep Shopify/e-commerce integrations for purchase events, abandoned carts, and revenue attribution.

**Auth method:** Private API Key. Pass `Authorization: Klaviyo-API-Key {private_api_key}` and `revision: 2024-10-15` (required on every request). Private keys prefixed with `pk_`.

**CLI script:** `${CLAUDE_PLUGIN_ROOT}/skills/unmassk-marketing/scripts/klaviyo.js`

**Composio MCP toolkit:** `KLAVIYO` (API Key, Medium coverage). Actions: get profiles, list segments, get campaign metrics, add to lists.

**Key API operations:**

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List profiles | GET | `/api/profiles/?page[size]=20` |
| Filter profiles | GET | `/api/profiles/?filter=equals(email,"user@example.com")` |
| Create profile | POST | `/api/profiles/` |
| Update profile | PATCH | `/api/profiles/{profileId}/` |
| List all lists | GET | `/api/lists/` |
| Create list | POST | `/api/lists/` |
| Add profiles to list | POST | `/api/lists/{listId}/relationships/profiles/` |
| Track event | POST | `/api/events/` |
| List campaigns | GET | `/api/campaigns/?filter=equals(messages.channel,"email")` |
| List flows | GET | `/api/flows/` |
| Update flow status | PATCH | `/api/flows/{flowId}/` |
| List metrics | GET | `/api/metrics/` |
| List segments | GET | `/api/segments/` |

**Base URL:** `https://a.klaviyo.com`

**API pattern:** JSON:API specification. All bodies use `{ "data": { "type": "...", "attributes": {...} } }`. Relationships managed via `/relationships/` sub-endpoints. Revision header required on every request.

**Create profile payload:**
```json
{
  "data": {
    "type": "profile",
    "attributes": { "email": "user@example.com", "first_name": "Jane", "last_name": "Doe", "phone_number": "+15551234567" }
  }
}
```

**Track event payload:**
```json
{
  "data": {
    "type": "event",
    "attributes": {
      "metric": { "data": { "type": "metric", "attributes": { "name": "Placed Order" } } },
      "profile": { "data": { "type": "profile", "attributes": { "email": "user@example.com" } } },
      "properties": { "value": 99.99, "items": ["Product A"] },
      "time": "2025-01-15T10:00:00Z"
    }
  }
}
```

**Query parameters:** `page[size]` (max 100), `page[cursor]`, `filter` (e.g., `equals(email,"...")`), `sort` (prefix `-` for descending), `include`, `fields[resource]`.

**Campaign/flow metrics:** `send_count`, `open_rate`, `click_rate`, `revenue`.

**Rate limits:** 75 requests/second steady-state. Burst up to 700 requests/minute. Lower limits on write endpoints.

---

## Beehiiv

**What it does:** Newsletter platform with subscriber management, post publishing, automations, segments, and built-in referral programs. All endpoints scoped to a publication. Designed for newsletter-first businesses.

**Auth method:** Bearer Token. Pass `Authorization: Bearer {api_key}`. Generate at Settings > API under Workspace Settings. Key shown only once.

**CLI script:** `${CLAUDE_PLUGIN_ROOT}/skills/unmassk-marketing/scripts/beehiiv.js`

**Composio MCP toolkit:** Not available. Use CLI script or direct API.

**Key API operations:**

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List publications | GET | `/v2/publications` |
| Get publication | GET | `/v2/publications/{publicationId}` |
| List subscriptions | GET | `/v2/publications/{publicationId}/subscriptions?limit=10&status=active` |
| Filter by email | GET | `/v2/publications/{publicationId}/subscriptions?email={email}` |
| Create subscription | POST | `/v2/publications/{publicationId}/subscriptions` |
| Update subscription | PUT | `/v2/publications/{publicationId}/subscriptions/{subscriptionId}` |
| Delete subscription | DELETE | `/v2/publications/{publicationId}/subscriptions/{subscriptionId}` |
| List posts | GET | `/v2/publications/{publicationId}/posts?status=confirmed` |
| Create post | POST | `/v2/publications/{publicationId}/posts` |
| List segments | GET | `/v2/publications/{publicationId}/segments` |
| List automations | GET | `/v2/publications/{publicationId}/automations` |
| Get referral program | GET | `/v2/publications/{publicationId}/referral_program` |

**Base URL:** `https://api.beehiiv.com`

**Create subscription payload:**
```json
{
  "email": "user@example.com",
  "reactivate_existing": false,
  "send_welcome_email": true,
  "utm_source": "api",
  "tier": "free"
}
```

**Create post (Enterprise only):**
```json
{ "title": "Weekly Update", "subtitle": "What happened this week", "content": "<p>Hello subscribers...</p>", "status": "draft" }
```

**Subscription statuses:** `validating`, `invalid`, `pending`, `active`, `inactive`.

**Subscription tiers:** `free`, `premium`.

**Subscription tracking fields:** `utm_source`, `utm_medium`, `utm_campaign`, `referral_code`.

**Pagination:** Cursor-based with `cursor` and `limit` (1-100, default 10). Expand options: `stats`, `custom_fields`, `referrals`.

**Rate limits:** Per API key. No batch operations -- iterate with individual requests.

---

## Platform Selection Guide

| Use case | Recommended platform |
|----------|---------------------|
| E-commerce email/SMS (Shopify) | Klaviyo |
| Behavior-based automation | Customer.io |
| Newsletter business | Beehiiv |
| Creator/simple automation | Kit |
| General email marketing | Mailchimp |
| Transactional email (developer) | Resend or Postmark |
| Transactional at scale | SendGrid |
| Multi-channel (email + SMS + WhatsApp) | Brevo |
| High deliverability transactional | Postmark |

## Composio MCP Quick Reference

| Toolkit | Auth | Coverage | Key actions |
|---------|------|----------|-------------|
| `MAILCHIMP` | OAuth 2.0 | Deep (20+) | Get audiences, list campaigns, reports, add subscribers |
| `KLAVIYO` | API Key | Medium (5-20) | Get profiles, list segments, campaign metrics, add to lists |
| `ACTIVECAMPAIGN` | API Key | Medium (5-20) | Get contacts, list automations, add to lists, campaign stats |

List available Composio actions:
```bash
npx composio actions list --app MAILCHIMP
npx composio actions list --app KLAVIYO
npx composio actions list --app ACTIVECAMPAIGN
```

## Transactional vs Marketing Email

| Feature | Transactional | Marketing |
|---------|--------------|-----------|
| Purpose | Triggered by user action | Sent to segments/lists |
| Examples | Password reset, receipt, notification | Newsletter, promotion, announcement |
| Opt-in required | No (service messages) | Yes (CAN-SPAM, GDPR) |
| Best platforms | Resend, Postmark, SendGrid | Mailchimp, Klaviyo, Brevo |
| Delivery speed | Immediate | Scheduled or queued |
| Unsubscribe link | Not required | Required by law |
