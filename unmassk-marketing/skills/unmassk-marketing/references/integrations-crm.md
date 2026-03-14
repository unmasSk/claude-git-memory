# CRM Integrations Reference

Consolidated reference for CRM platforms, lead enrichment tools, and customer data systems. Use these integrations to manage contacts, deals, companies, and prospect data.

## HubSpot

**What it does:** Full CRM platform for marketing, sales, and customer service. Manage contacts, companies, deals, tickets, forms, and marketing emails through a unified API.

**Auth method:** Private App Token or OAuth 2.0. Pass `Authorization: Bearer {access_token}`. Generate tokens at Settings > Integrations > Private Apps.

**CLI script:** `${CLAUDE_PLUGIN_ROOT}/skills/unmassk-marketing/scripts/hubspot.js`

**Composio MCP toolkit:** `HUBSPOT` (OAuth 2.0, Deep coverage -- 20+ actions). Use Composio for MCP access since HubSpot has no native MCP server.

**Key API operations:**

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List contacts | GET | `/crm/v3/objects/contacts?limit=10` |
| Search contacts | POST | `/crm/v3/objects/contacts/search` |
| Create contact | POST | `/crm/v3/objects/contacts` |
| Update contact | PATCH | `/crm/v3/objects/contacts/{contact_id}` |
| List deals | GET | `/crm/v3/objects/deals?limit=10&properties=dealname,amount,dealstage` |
| Create deal | POST | `/crm/v3/objects/deals` |
| Associate contact with deal | PUT | `/crm/v3/objects/deals/{deal_id}/associations/contacts/{contact_id}/deal_to_contact` |
| Get form submissions | GET | `/form-integrations/v1/submissions/forms/{form_guid}` |
| Get marketing emails | GET | `/marketing/v3/emails?limit=10` |

**Base URL:** `https://api.hubapi.com`

**Key objects:** Contacts (people), Companies (organizations), Deals (sales opportunities), Tickets (support), Products, Line Items.

**Contact properties:** `email`, `firstname`, `lastname`, `lifecyclestage`, `hs_lead_status`.

**Deal properties:** `dealname`, `amount`, `dealstage`, `closedate`, `pipeline`.

**Rate limits:** 100 requests per 10 seconds. Higher on enterprise plans.

**Search filter syntax:**
```json
{
  "filterGroups": [{
    "filters": [{
      "propertyName": "email",
      "operator": "EQ",
      "value": "user@example.com"
    }]
  }]
}
```

---

## Salesforce

**What it does:** Enterprise CRM with REST API, SOAP API, and Bulk API. Manage leads, contacts, accounts, opportunities, cases, and campaigns. Query data with SOQL and search with SOSL.

**Auth method:** OAuth 2.0 (Web Server Flow or JWT Bearer). Pass `Authorization: Bearer {access_token}`. Use the `instance_url` from the auth response as the base URL.

**CLI script:** `${CLAUDE_PLUGIN_ROOT}/skills/unmassk-marketing/scripts/salesforce.js`

**Composio MCP toolkit:** `SALESFORCE` (OAuth 2.0, Deep coverage). Use Composio for MCP access.

**Key API operations:**

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Query records (SOQL) | GET | `/services/data/v59.0/query?q={SOQL}` |
| Get record by ID | GET | `/services/data/v59.0/sobjects/{object}/{record_id}` |
| Create record | POST | `/services/data/v59.0/sobjects/{object}` |
| Update record | PATCH | `/services/data/v59.0/sobjects/{object}/{record_id}` |
| Search records (SOSL) | GET | `/services/data/v59.0/search?q={SOSL}` |
| Describe object schema | GET | `/services/data/v59.0/sobjects/{object}/describe` |

**Base URL:** `https://{instance}.salesforce.com`

**Key objects:** Lead (potential customer), Contact (person at account), Account (company), Opportunity (sales deal), Case (support ticket), Campaign.

**SOQL examples:**
```sql
-- Contacts by industry
SELECT Id, Name, Email, Account.Name FROM Contact WHERE Account.Industry = 'Technology'

-- Open opportunities by stage
SELECT StageName, COUNT(Id) FROM Opportunity GROUP BY StageName

-- Recent leads
SELECT Id, Name, Company, Status FROM Lead WHERE CreatedDate = LAST_N_DAYS:30 ORDER BY CreatedDate DESC
```

**Rate limits:** 15,000 API calls per 24 hours (Enterprise). Higher limits available.

**CLI commands:**
```bash
sf org login web                    # Authenticate
sf data query --query "SELECT..."   # Query records
sf data create record --sobject Account --values "Name='New Account'"
```

---

## ActiveCampaign

**What it does:** Email marketing automation platform with CRM, contacts, deals pipeline, tags, automations, and campaign management. Combines marketing automation with sales CRM capabilities.

**Auth method:** API Key. Pass `Api-Token: {api_token}` header. Base URL is account-specific: `https://{yourAccountName}.api-us1.com/api/3`. Find key at Settings > Developer.

**CLI script:** `${CLAUDE_PLUGIN_ROOT}/skills/unmassk-marketing/scripts/activecampaign.js`

**Composio MCP toolkit:** `ACTIVECAMPAIGN` (API Key, Medium coverage). Actions: get contacts, list automations, add contacts to lists, get campaign stats.

**Key API operations:**

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List contacts | GET | `/api/3/contacts?limit=20&offset=0` |
| Search by email | GET | `/api/3/contacts?email=user@example.com` |
| Create contact | POST | `/api/3/contacts` |
| Sync contact (upsert) | POST | `/api/3/contact/sync` |
| Subscribe to list | POST | `/api/3/contactLists` |
| List deals | GET | `/api/3/deals?limit=20` |
| Create deal | POST | `/api/3/deals` |
| Update deal | PUT | `/api/3/deals/{dealId}` |
| List automations | GET | `/api/3/automations` |
| Add to automation | POST | `/api/3/contactAutomations` |
| List tags | GET | `/api/3/tags` |
| Tag contact | POST | `/api/3/contactTags` |
| List pipelines | GET | `/api/3/dealGroups` |

**API pattern:** REST with resource wrapping -- requests use `{ "contact": {...} }` format. Related resources managed via junction endpoints (`/contactLists`, `/contactTags`, `/contactAutomations`). Pagination with `limit` and `offset`.

**Contact list status codes:** `1` = subscribed, `2` = unsubscribed.

**Deal status codes:** `0` = open, `1` = won, `2` = lost.

**Rate limits:** 5 requests per second per account. 429 responses include `Retry-After` header.

---

## Apollo.io

**What it does:** B2B prospecting and data enrichment platform with 210M+ contacts and 35M+ companies. Search people by title, location, and company size. Enrich leads with verified email, phone, LinkedIn, and firmographic data.

**Auth method:** API Key. Pass `x-api-key: {api_key}` or `Authorization: Bearer {token}`. Generate at Settings > Integrations > API.

**CLI script:** `${CLAUDE_PLUGIN_ROOT}/skills/unmassk-marketing/scripts/apollo.js`

**Composio MCP toolkit:** Not available. Use CLI script or direct API.

**Key API operations:**

| Operation | Method | Endpoint |
|-----------|--------|----------|
| People search | POST | `/api/v1/mixed_people/api_search` |
| Person enrichment | POST | `/api/v1/people/match` |
| Bulk people enrichment | POST | `/api/v1/people/bulk_match` |
| Organization search | POST | `/api/v1/mixed_companies/search` |
| Organization enrichment | POST | `/api/v1/organizations/enrich` |

**Base URL:** `https://api.apollo.io`

**People search parameters:** `person_titles` (array), `person_locations` (array), `person_seniorities` (array: owner, founder, c_suite, partner, vp, head, director, manager, senior, entry), `organization_num_employees_ranges` (array, e.g. `"1,100"`), `page`, `per_page` (max 100).

**Person enrichment inputs:** `email`, or `first_name` + `last_name` + `domain`, or `linkedin_url`. Optional: `reveal_personal_emails`, `reveal_phone_number`.

**Person data returned:** `first_name`, `last_name`, `title`, `email`, `linkedin_url`, `organization`, `seniority`, `departments`.

**Organization data returned:** `name`, `website_url`, `estimated_num_employees`, `industry`, `annual_revenue`, `technologies`, `funding_total`.

**Rate limits:** 100 requests/minute. Bulk enrichment: up to 10 people per request. Search: max 50,000 records.

---

## Clearbit (HubSpot Breeze Intelligence)

**What it does:** Company and person data enrichment API with 100+ firmographic and technographic attributes. Enrich leads by email, look up companies by domain, de-anonymize website visitors by IP, and find employees at target companies.

**Auth method:** Bearer Token or Basic Auth with API key as username. Pass `Authorization: Bearer {api_key}`. Get key at https://dashboard.clearbit.com/api.

**CLI script:** `${CLAUDE_PLUGIN_ROOT}/skills/unmassk-marketing/scripts/clearbit.js`

**Composio MCP toolkit:** Not available. Use CLI script or direct API.

**Key API operations:**

| Operation | Method | Base URL | Endpoint |
|-----------|--------|----------|----------|
| Person enrichment | GET | `person.clearbit.com` | `/v2/people/find?email={email}` |
| Company enrichment | GET | `company.clearbit.com` | `/v2/companies/find?domain={domain}` |
| Combined (person+company) | GET | `person.clearbit.com` | `/v2/combined/find?email={email}` |
| IP to company (Reveal) | GET | `reveal.clearbit.com` | `/v1/companies/find?ip={ip}` |
| Name to domain | GET | `company.clearbit.com` | `/v1/domains/find?name={name}` |
| Find employees (Prospector) | GET | `prospector.clearbit.com` | `/v1/people/search?domain={domain}` |

**API pattern:** Separate subdomains per API. Standard endpoints return `202 Accepted` if data is processing -- use webhooks or stream endpoints (`person-stream.clearbit.com`, `company-stream.clearbit.com`) which block up to 60s.

**Person attributes:** `name.fullName`, `title`, `role`, `seniority`, `employment.name`, `linkedin.handle`.

**Company attributes:** `name`, `domain`, `category.industry`, `metrics.employees`, `metrics.estimatedAnnualRevenue`, `tech` (technology stack array), `metrics.raised`.

**Prospector parameters:** `domain` (required), `role` (sales, engineering, marketing, etc.), `seniority` (executive, director, manager, etc.), `title`, `page`, `page_size` (max 20).

**Rate limits:** Enrichment: 600 requests/minute. Prospector: 100 requests/minute. Reveal: 600 requests/minute.

---

## Close

**What it does:** Sales CRM for SMBs with built-in calling, email, and pipeline management. Manage leads, contacts, opportunities, activities (calls, emails, meetings), and tasks.

**Auth method:** Basic Auth. Pass `Authorization: Basic {base64(api_key + ':')}`. Generate keys at Settings > API Keys.

**CLI script:** `${CLAUDE_PLUGIN_ROOT}/skills/unmassk-marketing/scripts/close.js`

**Composio MCP toolkit:** Not available. Use CLI script or direct API.

**Key API operations:**

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List leads | GET | `/api/v1/lead/` |
| Search leads | GET | `/api/v1/lead/?query={search}` |
| Create lead | POST | `/api/v1/lead/` |
| Get contact | GET | `/api/v1/contact/{contact_id}/` |
| Create contact | POST | `/api/v1/contact/` |
| Create opportunity | POST | `/api/v1/opportunity/` |
| List activities | GET | `/api/v1/activity/?lead_id={lead_id}` |
| Create task | POST | `/api/v1/task/` |

**Base URL:** `https://api.close.com`

**Lead data:** `id`, `display_name`, `url`, `description`, `status_id`, `contacts`, `opportunities`, `tasks`.

**Opportunity data:** `id`, `lead_id`, `value` (in cents), `status_type` (active, won, lost), `confidence` (0-100), `date_won`.

**Pagination parameters:** `_skip` (offset), `_limit` (max results, default 100), `_fields` (comma-separated field list).

**Activity filters:** `lead_id`, `_type__type` (Email, Call, Note, SMS, Meeting), `date_created__gt`, `date_created__lt`.

**Rate limits:** ~100 requests/minute. 429 responses include `Retry-After` header.

---

## Intercom

**What it does:** Customer messaging and support platform. Manage contacts (users and leads), conversations, in-app messages, companies, articles, tags, and events. Use for customer onboarding, support workflows, and product-led engagement.

**Auth method:** Bearer Token or OAuth 2.0. Pass `Authorization: Bearer {token}` and `Intercom-Version: 2.11`. Get credentials at Developer Hub.

**CLI script:** `${CLAUDE_PLUGIN_ROOT}/skills/unmassk-marketing/scripts/intercom.js`

**Composio MCP toolkit:** Not available. Use CLI script or direct API.

**Key API operations:**

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List contacts | GET | `/contacts` |
| Search contacts | POST | `/contacts/search` |
| Create contact | POST | `/contacts` |
| Update contact | PUT | `/contacts/{id}` |
| List conversations | GET | `/conversations` |
| Search conversations | POST | `/conversations/search` |
| Reply to conversation | POST | `/conversations/{id}/reply` |
| Create message | POST | `/messages` |
| List companies | GET | `/companies` |
| Create/update company | POST | `/companies` |
| Tag a contact | POST | `/contacts/{contact_id}/tags` |
| Submit events | POST | `/events` |
| List articles | GET | `/articles` |

**Base URL:** `https://api.intercom.io`

**Search query syntax:**
```json
{
  "query": {
    "field": "email",
    "operator": "=",
    "value": "user@example.com"
  }
}
```

**Search operators:** `=`, `!=`, `>`, `<`, `~`, `IN`, `NIN`.

**Contact roles:** `user` (known customer) or `lead` (anonymous/prospect).

**Pagination:** Cursor-based with `per_page` (max 150) and `starting_after`.

**Rate limits:** 10,000 API calls per minute per app. 25,000 per workspace. Distributed in 10-second windows.

---

## ZoomInfo

**What it does:** B2B contact database with 100M+ business contacts, company intelligence, intent data signals, and company news (scoops). Search contacts and companies, enrich leads, and identify in-market accounts.

**Auth method:** JWT Token. POST to `/authenticate` with username + password to receive JWT. Pass `Authorization: Bearer {jwt_token}`. Tokens expire after ~12 hours. Env vars: `ZOOMINFO_USERNAME` + `ZOOMINFO_PRIVATE_KEY` or `ZOOMINFO_ACCESS_TOKEN`.

**CLI script:** `${CLAUDE_PLUGIN_ROOT}/skills/unmassk-marketing/scripts/zoominfo.js`

**Composio MCP toolkit:** Not available. ZoomInfo has a native MCP connector.

**Key API operations:**

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Authenticate | POST | `/authenticate` |
| Contact search | POST | `/search/contact` |
| Contact enrichment | POST | `/enrich/contact` |
| Company search | POST | `/search/company` |
| Company enrichment | POST | `/enrich/company` |
| Intent data lookup | POST | `/lookup/intent` |
| Scoops lookup | POST | `/lookup/scoops` |

**Base URL:** `https://api.zoominfo.com`

**Contact search parameters:** `jobTitle` (array), `companyName` (array), `managementLevel` (array: C-Level, VP, Director, Manager, Staff), `department` (array: Marketing, Sales, Engineering, etc.), `personLocationCity`, `personLocationState`, `personLocationCountry`, `rpp` (results per page, max 100), `page`.

**Contact enrichment inputs:** `matchEmail` (array), `personId` (array), or `matchFirstName` + `matchLastName` + `matchCompanyName`.

**Company search parameters:** `companyName`, `industry`, `employeeCountMin`/`employeeCountMax`, `revenueMin`/`revenueMax`, `companyLocationCity`, `rpp`, `page`.

**Intent data fields:** `topicName`, `signalScore`, `audienceStrength`, `firstSeenDate`, `lastSeenDate`.

**Rate limits:** ~200 requests/minute. Authentication tokens expire after ~12 hours.

---

## Integration Selection Guide

| Use case | Recommended platform |
|----------|---------------------|
| Full CRM + marketing automation | HubSpot or Salesforce |
| Enterprise CRM with complex objects | Salesforce |
| SMB sales pipeline + calling | Close |
| Email automation + CRM deals | ActiveCampaign |
| B2B prospecting (find emails/phones) | Apollo.io |
| Lead/company enrichment | Clearbit or ZoomInfo |
| Intent signals (who is in-market) | ZoomInfo |
| Customer messaging + support | Intercom |
| IP de-anonymization (visitor reveal) | Clearbit |

## Composio MCP Quick Reference

| Toolkit | Auth | Coverage | Key actions |
|---------|------|----------|-------------|
| `HUBSPOT` | OAuth 2.0 | Deep (20+) | Get/create contacts, list deals, manage lists, search by property |
| `SALESFORCE` | OAuth 2.0 | Deep (20+) | Run SOQL, get/create leads, list opportunities, update records |
| `ACTIVECAMPAIGN` | API Key | Medium (5-20) | Get contacts, list automations, add to lists, campaign stats |

List available Composio actions:
```bash
npx composio actions list --app HUBSPOT
npx composio actions list --app SALESFORCE
npx composio actions list --app ACTIVECAMPAIGN
```
