---
name: compliance-cookies
description: Use when the user asks about "cookie consent", "cookie banner", "consentimiento de cookies", "banner de cookies", "política de cookies", "cookie policy", "CMP", "consent management platform", "gestión de consentimiento", "RGPD cookies", "GDPR cookies", "ePrivacy cookies", "Google Consent Mode", "GCM v2", "IAB TCF", "Transparency and Consent Framework", "cookies técnicas", "cookies analíticas", "cookies de marketing", "cookies de terceros", "opt-in cookies", "opt-out cookies", "Guía de Cookies AEPD", "cookie wall", "cookie audit", "auditoría de cookies", "cookiebot", "klaro", "tarteaucitron", "onetrust", "axeptio", or when reviewing, implementing, or auditing cookie consent on any website or web application targeting EU users.
version: 1.0.0
---

# Cookie Consent — GDPR / ePrivacy Implementation

## Overview

Cookie implementation on websites targeting EU users is regulated by:
- **ePrivacy Directive** (2002/58/EC, amended 2009/136/EC): requires prior consent for non-essential cookies
- **GDPR** (Regulation EU 2016/679): defines consent requirements (freely given, specific, informed, unambiguous)
- **LOPDGDD** + **AEPD Cookie Guide** (2023): Spanish-specific application

**Core principle**: Non-essential cookies MUST NOT load until explicit user consent is obtained. Consent cannot be implied, pre-checked, or inferred from continued browsing.

**Official sources**:
- AEPD Cookie Guide (2023): https://www.aepd.es/guias/guia-cookies.pdf
- IAB Europe TCF v2.2: https://iabeurope.eu/tcf-2-2/
- Google Consent Mode v2: https://developers.google.com/tag-platform/security/guides/consent
- Klaro (open source CMP): https://github.com/kiprotect/klaro

## Routing Table

| Task | Reference |
|------|-----------|
| Cookie classification and categories | `references/cookies-clasificacion.md` |
| Technical banner and CMP requirements | `references/cookies-implementacion.md` |
| Google Consent Mode v2 | `references/cookies-gcm.md` |
| Cookie policy template | `references/cookies-politica-template.md` |

Load references on-demand as needed. Do NOT load all at startup.

## Workflow

### Step 0 — Audit Existing Cookies

Before implementing or reviewing a CMP, audit what cookies the site loads:

**Audit tools**:
- Chrome DevTools → Application → Cookies
- Cookiebot scanner: https://www.cookiebot.com/en/cookie-checker/
- Cookie Metadata Checker: available as Chrome extension

For each cookie found, document:
1. Cookie name
2. Domain (first-party or third-party)
3. Duration (session / persistent — how many days)
4. Purpose (what is it for?)
5. Category: essential / functionality / analytics / marketing
6. Whether it loads before consent

Save to `.compliance/cookies-audit.md`.

### Step 1 — Cookie Classification

Load `references/cookies-clasificacion.md`.

**Mandatory classification**:
- **Technical / Essential**: No consent required. Necessary for basic site functionality.
- **Functionality / Preferences**: Consent required. Remember user preferences.
- **Analytics**: Consent required. Measure site usage.
- **Marketing / Advertising**: Consent required. Tracking for personalized advertising.

**Critical rule**: If there is any doubt whether a cookie is essential, treat it as non-essential and request consent.

### Step 2 — Banner Evaluation

If a banner already exists, evaluate it against AEPD/GDPR requirements:

**Banner checklist** (load `references/cookies-implementacion.md` for detail):

- [ ] Displayed on first visit before loading non-essential cookies?
- [ ] Has "Accept All" and "Reject All" buttons equally prominent?
- [ ] Reject button is as easy to use as accept? (same level, same visual size)
- [ ] Granular configuration option by category?
- [ ] Categories have checkboxes unchecked by default (opt-in)?
- [ ] Essential cookies marked as mandatory and non-disableable?
- [ ] Consent can be withdrawn as easily as it was given?
- [ ] Banner links to Cookie Policy?
- [ ] Permanent link to manage preferences (floating or in footer)?
- [ ] Consent recorded with timestamp, banner version, and selected options?

**Critical failures** (likely fine):
- Cookie wall: access denied if not accepted → ILLEGAL per AEPD and CJEU
- Pre-checked optional categories → ILLEGAL
- Only "Accept" button with no reject option → ILLEGAL
- Third-party cookies loading before consent → ILLEGAL

### Step 3 — CMP Selection or Evaluation

**Option A — Open source CMP (recommended for own projects)**:
- **Klaro**: https://github.com/kiprotect/klaro — MIT license, configurable, no backend needed
- **Tarteaucitron**: https://tarteaucitron.io — popular in France, integrates multiple services
- **CookieConsent v3** (orestbida): https://github.com/orestbida/cookieconsent — modern, accessible

**Option B — SaaS CMP**:
- Cookiebot / Usercentrics — enterprise, paid
- OneTrust — enterprise
- Axeptio — French, good UX

**Selection criteria**:
- Blocks third-party cookies automatically (script blocking)
- Records consent on server (not just localStorage)
- Compatible with Google Consent Mode v2
- Has API for consent renewal
- Supports per-category granularity

### Step 4 — Technical Implementation

Load `references/cookies-implementacion.md` for reference code.

**Critical implementation points**:

1. **Pre-consent script blocking**:
   - Google Analytics, Meta Pixel, LinkedIn Insight, etc. MUST NOT execute before consent
   - Use `type="text/plain"` and `data-cookiecategory` or CMP equivalent
   - Alternative: dynamically load scripts only after consent

2. **Google Tag Manager**:
   - Implement Google Consent Mode v2 BEFORE any Google tag
   - Default state: `denied` for analytics_storage and ad_storage
   - Activate with `gtag('consent', 'update', {...})` after consent

3. **Consent storage**:
   - Save: what was accepted, when, banner version, language
   - Maximum consent duration: 12 months (AEPD recommends annual renewal)
   - Renew if cookie policy changes

4. **Banner accessibility**:
   - Keyboard navigable (Tab/Enter)
   - Screen reader compatible (ARIA)
   - Sufficient contrast (WCAG AA)
   - Available in user's language

### Step 5 — Cookie Policy

Load `references/cookies-politica-template.md` for the template.

The cookie policy must be on a dedicated page linked from:
- The cookie banner
- The site footer
- The legal notice and privacy policy

**Mandatory content** per AEPD Guide:
- What cookies are and what they do
- List of all cookies: name, domain, duration, purpose, type
- How to manage and disable cookies (instructions per browser)
- How to withdraw consent
- Policy updates

**Update**: Every time cookies are added or removed from the site, update the policy.

### Step 6 — Google Consent Mode v2

Load `references/cookies-gcm.md`.

**Mandatory since March 2024** to use Google Analytics 4 and Google Ads with EU/EEA users.

Without GCM v2 implementation: Google Analytics stops working correctly for European users who reject cookies.

### Step 7 — Final Verification

Before publishing the implementation:

- [ ] Test in incognito mode (no prior cookies)
- [ ] Verify no analytics or marketing cookies load before interacting with banner
- [ ] Verify "Reject All" works and does not load non-essential cookies
- [ ] Verify granular configuration correctly saves preferences
- [ ] Verify in Chrome DevTools → Network that GA/Meta Pixel makes no requests before consent
- [ ] Verify "Manage cookies" link in footer works and opens preferences
- [ ] Test on mobile that the banner is usable

## Output Standards

- Never generate code that loads analytics or marketing cookies without prior consent
- If existing code violates this, mark as `[CRITICAL NON-COMPLIANCE]` and fix
- All generated cookie code must include comments explaining what it does and why
- Cite the AEPD Cookie Guide (2023) when making claims about legal requirements in Spain
- Third-party cookies (Google, Meta, etc.) are shared responsibility — document sub-processors
