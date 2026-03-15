# Google Consent Mode v2 — Implementation

Reference for correctly implementing Google Consent Mode v2 (GCM v2). Mandatory since March 2024 for sites using Google products (GA4, Google Ads) with EU/EEA users.

Official source: https://developers.google.com/tag-platform/security/guides/consent

---

## What Is Google Consent Mode

GCM v2 is the mechanism that communicates user consent preferences to Google services. Without it, Google Analytics and Google Ads do not properly respect cookie preferences in Europe.

**Without GCM v2**: Google may process data even if the user has rejected cookies — GDPR violation.

**With GCM v2**: Google adjusts its behavior according to user consent.

---

## The 7 Consent Parameters

| Parameter | What It Controls | Recommended Default |
|-----------|-----------------|---------------------|
| `analytics_storage` | GA4 cookies and metrics | `denied` |
| `ad_storage` | Google Ads cookies | `denied` |
| `ad_user_data` | User data for advertising | `denied` |
| `ad_personalization` | Personalized remarketing | `denied` |
| `functionality_storage` | Google functionality cookies | `denied` |
| `personalization_storage` | YouTube personalization, etc. | `denied` |
| `security_storage` | Security cookies (reCAPTCHA) | `granted` |

**Rule**: Default to `denied`. Only change to `granted` when the user has given explicit consent for that category.

---

## Basic Implementation

### Step 1 — Default Consent Command (FIRST)

This code must execute BEFORE the GTM/GA4 script and BEFORE the user sees the banner.

```html
<head>
  <!-- 1. Google Tag (gtag.js) or GTM snippet -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=GTM-XXXXXXX"></script>

  <!-- 2. Initialize with default values — BEFORE any configuration -->
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}

    // Set default state — DENIAL FIRST
    gtag('consent', 'default', {
      'analytics_storage': 'denied',
      'ad_storage': 'denied',
      'ad_user_data': 'denied',
      'ad_personalization': 'denied',
      'functionality_storage': 'denied',
      'personalization_storage': 'denied',
      'security_storage': 'granted',    // Always granted (reCAPTCHA, etc.)
      'wait_for_update': 500,           // Wait 500ms for CMP before processing
    });

    // GTM configuration
    gtag('js', new Date());
    gtag('config', 'GTM-XXXXXXX');
  </script>
</head>
```

### Step 2 — Update Consent After User Decision

Call this when the user accepts or configures their preferences:

```javascript
// Function to update GCM v2 after user decision
function updateGoogleConsent(preferences) {
  gtag('consent', 'update', {
    'analytics_storage': preferences.analytics ? 'granted' : 'denied',
    'ad_storage': preferences.marketing ? 'granted' : 'denied',
    'ad_user_data': preferences.marketing ? 'granted' : 'denied',
    'ad_personalization': preferences.marketing ? 'granted' : 'denied',
    'functionality_storage': preferences.functional ? 'granted' : 'denied',
    'personalization_storage': preferences.functional ? 'granted' : 'denied',
  });
}

// Example: user accepts analytics but rejects marketing
updateGoogleConsent({
  analytics: true,
  marketing: false,
  functional: true,
});

// Example: user accepts all
updateGoogleConsent({
  analytics: true,
  marketing: true,
  functional: true,
});

// Example: user rejects all
updateGoogleConsent({
  analytics: false,
  marketing: false,
  functional: false,
});
```

### Step 3 — Restore Consent on Subsequent Visits

On page load, if the user has previously consented, restore the state BEFORE Google loads its scripts:

```javascript
// In the initialization block, after default values:
(function restoreConsent() {
  try {
    const saved = JSON.parse(
      document.cookie.split('; ')
        .find(row => row.startsWith('cookie_consent='))
        ?.split('=')[1] || '{}'
    );

    if (saved.decisions && saved.version === '2.1') {
      // Consent exists and is valid — restore immediately
      gtag('consent', 'update', {
        'analytics_storage': saved.decisions.analytics ? 'granted' : 'denied',
        'ad_storage': saved.decisions.marketing ? 'granted' : 'denied',
        'ad_user_data': saved.decisions.marketing ? 'granted' : 'denied',
        'ad_personalization': saved.decisions.marketing ? 'granted' : 'denied',
      });
    }
  } catch(e) {
    // If parsing fails, keep default values (denied)
    console.warn('Could not restore consent preferences', e);
  }
})();
```

---

## Klaro Integration

When using Klaro as CMP, update GCM v2 from Klaro callbacks. The callback must map each service's consent to the correct Google parameter — do NOT apply a single service's consent to all parameters.

```javascript
// In Klaro configuration, use the global consent listener
var klaroConfig = {
  // ... rest of configuration ...

  // Use the global callback that fires after ALL consent decisions are collected
  callback: function(consent, app) {
    // consent = boolean for THIS specific app
    // app = the service object (app.name = 'google-analytics', 'google-ads', etc.)
    //
    // Map each Klaro service to the correct Google consent parameter
    if (typeof gtag === 'function') {
      var consentUpdate = {};

      if (app.name === 'google-analytics') {
        consentUpdate['analytics_storage'] = consent ? 'granted' : 'denied';
      }
      if (app.name === 'google-ads') {
        consentUpdate['ad_storage'] = consent ? 'granted' : 'denied';
        consentUpdate['ad_user_data'] = consent ? 'granted' : 'denied';
        consentUpdate['ad_personalization'] = consent ? 'granted' : 'denied';
      }

      if (Object.keys(consentUpdate).length > 0) {
        gtag('consent', 'update', consentUpdate);
      }
    }
  },
};
```

**Critical**: The callback receives consent for ONE service at a time. Each service must only update its own Google consent parameters. Consenting to analytics must NOT grant `ad_storage` — that would be a GDPR violation.

---

## Google Tag Manager Integration

When using GTM (recommended for managing multiple tags):

1. In GTM, create a "Consent State" variable for each parameter
2. Configure triggers based on consent events
3. Use the "Google Consent Mode" template available in the GTM Template Gallery

**GTM template available**: In GTM → Templates → Search "Consent Mode" → use the official Google template.

---

## GCM v2 Verification

### In Google Tag Assistant

1. Enable Google Tag Assistant in Chrome
2. Navigate to the site in incognito mode
3. Check that `analytics_storage` and `ad_storage` appear as `denied` before consent
4. Accept analytics cookies
5. Verify that `analytics_storage` changes to `granted`

### In Chrome DevTools

1. Open Network tab
2. Filter for requests to `google-analytics.com`
3. Before consent: there should be no requests with user data
4. After analytics consent: normal requests appear

### In DataLayer (Console)

```javascript
// In the browser console, view the current consent state
console.log(window.dataLayer.filter(item => item[0] === 'consent'));
```

---

## Conversion Modeling (Advanced GCM v2)

A benefit of GCM v2: when a user rejects cookies but completes a conversion, Google can use statistical modeling to estimate the impact without processing individual data.

**This does NOT replace consent** — correct implementation is still mandatory. Modeling only works if GCM v2 is implemented correctly with `denied` default values.

---

## GCM v2 and Google Analytics 4

With GA4 and GCM v2 correctly implemented:
- Users who accept analytics: full tracking
- Users who reject: aggregated modeling data only (no cookies, no individual tracking)
- Without GCM v2: GA4 may not function in GDPR-compliant mode — legal risk

**Verify in GA4**: Admin → Property → Data collection → Google signals → should be "off" or correctly configured for EU users.
