# Cookie Technical Implementation — Reference

Code and configuration reference for correctly implementing cookie consent. Includes examples with Klaro (open source), vanilla JS, and script blocking patterns.

Sources: Klaro docs (https://klaro.org/docs), Google Consent Mode v2 docs, IAB TCF v2.2.

---

## Pattern 1 — Script Blocking (Without CMP)

Block third-party scripts until consent is obtained. Minimal pattern without a library.

### HTML — Disable script

```html
<!-- BEFORE consent: type="text/plain" prevents execution -->
<script
  type="text/plain"
  data-category="analytics"
  data-src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"
  id="ga-script"
></script>

<!-- Inline script also blocked -->
<script type="text/plain" data-category="analytics" id="ga-init">
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### JavaScript — Activate after consent

```javascript
// Activate scripts for a category after consent
function activateCategory(category) {
  // Activate external scripts (src)
  document.querySelectorAll(`script[type="text/plain"][data-category="${category}"][data-src]`)
    .forEach(script => {
      const newScript = document.createElement('script');
      newScript.src = script.dataset.src;
      document.head.appendChild(newScript);
    });

  // Activate inline scripts
  document.querySelectorAll(`script[type="text/plain"][data-category="${category}"]:not([data-src])`)
    .forEach(script => {
      const newScript = document.createElement('script');
      newScript.textContent = script.textContent;
      document.head.appendChild(newScript);
    });
}

// Call when the user accepts a category
// activateCategory('analytics');
// activateCategory('marketing');
```

---

## Pattern 2 — Klaro (Recommended Open Source CMP)

Klaro is an open source CMP (MIT) that automatically handles script blocking.

### Installation

```html
<!-- Via CDN (or self-host for better privacy) -->
<script src="https://cdn.jsdelivr.net/gh/kiprotect/klaro@v0.7.18/dist/klaro-no-css.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/kiprotect/klaro@v0.7.18/dist/klaro.min.css">
```

### Basic configuration

```javascript
// klaro-config.js — load BEFORE the Klaro script
var klaroConfig = {
  version: 1,
  elementID: 'klaro',
  storageMethod: 'cookie',       // 'cookie' or 'localStorage'
  storageName: 'klaro',
  cookieExpiresAfterDays: 365,   // 1 year — renew annually
  default: false,                // Opt-in by default
  mustConsent: false,            // false = no cookie wall
  acceptAll: true,               // Show "Accept All" button
  hideDeclineAll: false,         // IMPORTANT: show "Reject All" button
  lang: 'en',                   // Set to user's language

  // Translations (add per language as needed)
  translations: {
    en: {
      privacyPolicyUrl: '/cookie-policy',
      consentNotice: {
        description: 'We use cookies to improve your experience. You can accept all, reject them, or configure them according to your preferences.',
        learnMore: 'Configure',
      },
      consentModal: {
        title: 'Cookie Management',
        description: 'Here you can see and customize the services we use on this website.',
        privacyPolicy: {
          text: 'More information in our {privacyPolicy}.',
          name: 'cookie policy',
        },
      },
      acceptAll: 'Accept All',
      declineAll: 'Reject All',
      acceptSelected: 'Accept Selected',
    },
  },

  // Service definitions (cookie categories)
  services: [
    {
      name: 'google-analytics',
      title: 'Google Analytics',
      purposes: ['analytics'],
      cookies: [['_ga', '/', '.yourdomain.com'], ['_ga_*', '/', '.yourdomain.com']],
      default: false,           // opt-in
      required: false,
      optOut: false,
      onlyOnce: false,
    },
    {
      name: 'google-ads',
      title: 'Google Ads',
      purposes: ['marketing'],
      cookies: [['_gcl_*', '/', '.yourdomain.com']],
      default: false,
      required: false,
    },
    {
      name: 'meta-pixel',
      title: 'Meta Pixel (Facebook/Instagram)',
      purposes: ['marketing'],
      cookies: [['_fbp', '/', '.yourdomain.com'], ['_fbc', '/', '.yourdomain.com']],
      default: false,
      required: false,
    },
  ],

  // Purpose groups (categories shown to user)
  purposes: {
    analytics: {
      title: 'Analytics',
      description: 'Measure website usage to improve our services.',
    },
    marketing: {
      title: 'Marketing',
      description: 'Personalized advertising based on your interests.',
    },
    functional: {
      title: 'Functional',
      description: 'Remember your site usage preferences.',
    },
  },
};
```

### HTML — Mark scripts managed by Klaro

```html
<!-- Google Analytics — managed by Klaro -->
<script
  type="text/plain"
  data-type="application/javascript"
  data-name="google-analytics"
  async
  src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"
></script>
<script type="text/plain" data-name="google-analytics">
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>

<!-- Meta Pixel — managed by Klaro -->
<script type="text/plain" data-name="meta-pixel">
  !function(f,b,e,v,n,t,s){/* ... pixel code ... */}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', 'YOUR_PIXEL_ID');
  fbq('track', 'PageView');
</script>
```

---

## Pattern 3 — Consent Storage

Consent must be recorded with sufficient metadata.

```javascript
// Recommended structure for storing consent
const consentRecord = {
  version: '2.1',               // Cookie policy version
  timestamp: new Date().toISOString(),
  userAgent: navigator.userAgent,
  language: navigator.language,
  decisions: {
    analytics: true,            // true = accepted, false = rejected
    marketing: false,
    functional: true,
  },
  method: 'explicit-click',    // How it was obtained: 'accept-all', 'reject-all', 'custom'
};

// Save in cookie (recommended over localStorage for better compatibility)
document.cookie = `cookie_consent=${JSON.stringify(consentRecord)}; max-age=31536000; path=/; SameSite=Lax; Secure`;
```

---

## Pattern 4 — Manage Preferences Link

Mandatory: the user must be able to withdraw consent as easily as they gave it.

### Footer HTML

```html
<footer>
  <!-- ... other links ... -->
  <a href="/cookie-policy">Cookie Policy</a>
  |
  <a href="#" onclick="klaro.show(); return false;" id="manage-cookies-link">
    Manage Cookies
  </a>
</footer>
```

### Floating button (alternative)

```html
<button
  id="cookie-settings-btn"
  aria-label="Manage cookie preferences"
  style="position:fixed; bottom:20px; left:20px; z-index:9999;"
  onclick="klaro.show()"
>
  Cookies
</button>
```

---

## Implementation Checklist

Before publishing, verify:

### DevTools Verification

1. Open Chrome DevTools → Application → Storage → Cookies
2. Delete all cookies (Clear site data)
3. Reload the page in normal mode (not incognito)
4. **Verify**: Only essential cookies should appear
5. Click "Accept All"
6. **Verify**: Analytics and marketing cookies now appear
7. Reload again
8. **Verify**: Cookies persist correctly

### Network Verification

1. Chrome DevTools → Network → filter by GA domain (`google-analytics.com`)
2. Before consent: **there should be no requests to GA**
3. After accepting analytics: **the GA request should appear**

### Banner Verification

- [ ] Does the banner appear on first visit?
- [ ] Does the "Reject All" button exist and is it as accessible as "Accept All"?
- [ ] Are toggles unchecked by default (except essential)?
- [ ] Does the cookie policy link work?
- [ ] Is the banner keyboard navigable?
- [ ] Does the banner work on mobile?
- [ ] Does the "Manage Cookies" link in the footer open preferences?
