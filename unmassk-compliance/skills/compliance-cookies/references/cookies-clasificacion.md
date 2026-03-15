# Cookie Classification — Complete Reference

Reference for correctly classifying cookies according to the AEPD Cookie Guide (2023) and GDPR/ePrivacy regulations.

Source: AEPD Cookie Guide, January 2023. Download: https://www.aepd.es/guias/guia-cookies.pdf

---

## Classification by Purpose

### 1. Technical / Essential Cookies

**Definition**: Strictly necessary for the website to function or for the user to access an explicitly requested service.

**No consent required**.

**Inclusion criteria**: The cookie is indispensable for basic functionality. If removed, the site or the requested function stops working.

| Cookie Example | Purpose | Essential? |
|----------------|---------|-----------|
| `session_id`, `PHPSESSID` | Authenticated user session | Yes |
| `csrf_token` | CSRF protection | Yes |
| `cart_id` | Shopping cart (e-commerce) | Yes |
| `cookie_consent` | Store consent preference | Yes |
| `load_balancer` | Server routing | Yes |
| `__Secure-*`, `__Host-*` | Security cookies | Yes (if technically necessary) |

**Exclusion criteria** (NOT essential even if they seem so):
- Cookies that remember the user's preferred language (these are preference cookies)
- Long-term "remember me" login cookies (beyond session)
- A/B testing cookies (these are analytics)

---

### 2. Functionality / Preference Cookies

**Definition**: Allow remembering user preferences to improve their experience, but are not strictly necessary.

**Consent required**.

| Cookie Example | Purpose |
|----------------|---------|
| `lang_preference` | User-selected language |
| `theme` | Light/dark theme |
| `remember_me` | Maintain session between visits |
| `recently_viewed` | Last viewed products |
| `currency` | Selected currency |
| `font_size` | Accessibility font size |

---

### 3. Analytics / Measurement Cookies

**Definition**: Allow quantifying the number of users and measuring site usage to improve the service.

**Consent required**.

**Special case — consent exemption** (AEPD criteria):
First-party analytics cookies may be exempt from consent if they meet ALL of these criteria:
1. They are first-party cookies (own domain, not shared with third parties)
2. They are used exclusively for anonymous statistics
3. They are not combined with other user data
4. The user is informed of their use (in privacy policy)
5. The analytics provider is the controller itself or a processor with a signed DPA

**Analytics tools that REQUIRE consent** (send data to third parties):
- Google Analytics 4 (data sent to Google)
- Adobe Analytics
- Mixpanel
- Hotjar / Microsoft Clarity (with recordings)
- Heap

**Analytics alternatives without consent** (if configured correctly):
- Matomo (self-hosted, no data sharing, IP anonymization)
- Plausible (privacy by design, no cookies)
- Fathom Analytics (no cookies)
- Umami (self-hosted)

| Cookie Example | Purpose | Requires Consent? |
|----------------|---------|-------------------|
| `_ga`, `_ga_*` | Google Analytics 4 | Yes (always) |
| `_gid` | Google Analytics session | Yes |
| `_hj*` | Hotjar | Yes |
| `mp_*` | Mixpanel | Yes |
| `MATOMO_SESSID` | Matomo (self-hosted, anon.) | Depends on configuration |

---

### 4. Marketing / Advertising Cookies

**Definition**: Allow managing advertising spaces on the website and creating user profiles for personalized advertising.

**Consent required**. These have the highest privacy impact.

| Cookie Example | Purpose |
|----------------|---------|
| `_fbp` | Meta Pixel (Facebook/Instagram Ads) |
| `_fbc` | Meta click ID |
| `_gcl_*` | Google Click ID (Google Ads) |
| `IDE`, `NID` | Google DoubleClick |
| `li_*` | LinkedIn Insight Tag |
| `twclid` | Twitter/X Ads |
| `_tt_*` | TikTok Pixel |
| `_pin_unauth` | Pinterest |
| `ajs_*` | Segment.io |

---

## Classification by Duration

| Type | Duration | Implication |
|------|----------|-------------|
| Session cookies | Deleted when the browser is closed | No additional implication |
| Persistent cookies | Remain after closing the browser | Duration must be proportional to the purpose |

**AEPD guidance on duration**: Duration must be proportional to purpose. Google analytics cookies with 2-year expiry may be disproportionate for many uses.

---

## Classification by Origin

| Type | Definition | Implication |
|------|-----------|-------------|
| First-party | Domain = website domain | More control, generally less intrusive |
| Third-party | Different domain from the website | Data sharing with third parties, higher risk |

Third-party cookies imply data transfer to that third party — DPA or equivalent agreement recommended.

---

## Cookie-Like Technologies (same rules apply)

The AEPD Guide extends the same rules to:
- **Local Storage / Session Storage** (WebStorage API)
- **IndexedDB**
- **Device fingerprinting** (even without cookies)
- **Pixel tracking** (1x1 tracking pixels)
- **Service Workers with identifying data**

If the site uses any of these mechanisms to track users, apply the same rules as for cookies.

---

## Quick Reference Table

| Category | Prior Consent? | User Configurable? |
|----------|---------------|-------------------|
| Technical/Essential | No | No (cannot be disabled) |
| Functionality/Preferences | Yes | Yes (opt-in) |
| Analytics | Yes | Yes (opt-in) |
| Marketing | Yes | Yes (opt-in) |
