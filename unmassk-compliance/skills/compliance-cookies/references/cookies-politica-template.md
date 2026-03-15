# Cookie Policy Template

Template for drafting a cookie policy compliant with the AEPD Cookie Guide (2023) and GDPR. Adapt fields in `[BRACKETS]` to each project.

Source: AEPD Cookie Guide, January 2023. Download: https://www.aepd.es/guias/guia-cookies.pdf

---

## Complete Template

```markdown
# Cookie Policy

**Last updated**: [DATE]

## 1. What Are Cookies?

Cookies are small text files that websites store on your device (computer, tablet, or mobile) when you visit them. They are used to make the website function correctly, to improve your browsing experience, and to provide information to site owners.

## 2. Data Controller

- **Controller**: [COMPANY NAME]
- **Tax ID**: [NUMBER]
- **Address**: [FULL ADDRESS]
- **Contact email**: [EMAIL]
- **Data Protection Officer** (if applicable): [DPO DETAILS]

## 3. What Types of Cookies Do We Use?

### 3.1 Technical Cookies (Essential)

Necessary for basic website functionality. No consent required.

| Cookie | Domain | Duration | Purpose |
|--------|--------|----------|---------|
| [NAME] | [DOMAIN] | [DURATION] | [PURPOSE] |

### 3.2 Functionality Cookies

Allow remembering your preferences. Require your prior consent.

| Cookie | Domain | Duration | Purpose |
|--------|--------|----------|---------|
| [NAME] | [DOMAIN] | [DURATION] | [PURPOSE] |

### 3.3 Analytics Cookies

Allow us to measure and analyze website usage to improve our services. Require your prior consent.

| Cookie | Domain | Duration | Purpose |
|--------|--------|----------|---------|
| [NAME] | [DOMAIN] | [DURATION] | [PURPOSE] |

### 3.4 Marketing / Advertising Cookies

Allow managing advertising and creating profiles to show relevant ads. Require your prior consent.

| Cookie | Domain | Duration | Purpose |
|--------|--------|----------|---------|
| [NAME] | [DOMAIN] | [DURATION] | [PURPOSE] |

## 4. How to Manage Cookies

### 4.1 From Our Website

You can manage your cookie preferences at any time by clicking the "Manage Cookies" link available in the footer of our website.

### 4.2 From Your Browser

You can also configure your browser to block or delete cookies:

- **Google Chrome**: Settings → Privacy and security → Cookies and other site data
  https://support.google.com/chrome/answer/95647

- **Mozilla Firefox**: Options → Privacy & Security → Cookies and Site Data
  https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer

- **Safari**: Preferences → Privacy → Cookies and website data
  https://support.apple.com/guide/safari/sfri11471/mac

- **Microsoft Edge**: Settings → Cookies and site permissions → Cookies and stored data
  https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09

- **Opera**: Settings → Advanced → Privacy & security → Cookies
  https://help.opera.com/en/latest/web-preferences/#cookies

**Note**: If you disable all cookies, some website functionality may not work correctly.

## 5. Third-Party Cookies

This website uses third-party services that may install their own cookies:

| Third Party | Purpose | Privacy Policy |
|-------------|---------|---------------|
| [THIRD PARTY NAME] | [PURPOSE] | [POLICY URL] |

Third parties act as controllers or processors as applicable. Consult their privacy policies for more information.

## 6. International Transfers

[IF APPLICABLE: Some of the third parties mentioned may transfer data outside the European Economic Area. These transfers are carried out under the appropriate safeguards provided by the GDPR (adequacy decisions, standard contractual clauses, etc.).]

[IF NOT APPLICABLE: No international data transfers are made through cookies.]

## 7. Legal Basis for Processing

- **Essential cookies**: Legitimate interest of the controller (Article 6.1.f GDPR) — necessary to provide the requested service.
- **Functionality, analytics, and marketing cookies**: User consent (Article 6.1.a GDPR), obtained through the cookie banner before installation.

## 8. How to Withdraw Consent

You can withdraw your consent at any time:
- By clicking "Manage Cookies" in the footer
- By deleting cookies from your browser settings
- By contacting us at [EMAIL]

Withdrawal of consent does not affect the lawfulness of processing based on consent given prior to withdrawal.

## 9. Updates to This Policy

This cookie policy will be reviewed and updated each time the cookies used on the website are modified. The last update date is indicated at the beginning of this document.

## 10. More Information

For more information about the use of cookies and your rights, you can consult:
- AEPD Cookie Guide: https://www.aepd.es/guias/guia-cookies.pdf
- Spanish Data Protection Agency: https://www.aepd.es
```

---

## Generation Notes

When generating a cookie policy for a project:

1. **Audit first**: List all actual cookies on the site before drafting the policy. Use Chrome DevTools → Application → Cookies.

2. **Fill in the tables**: Each cookie must have a name, domain, exact duration, and concrete purpose. Do not use generic descriptions.

3. **Third parties**: Identify all third-party services (GA4, Meta Pixel, etc.) and link to their privacy policies.

4. **International transfers**: If using Google, Meta, or any provider with servers outside the EEA, document the safeguards (typically standard contractual clauses or Data Privacy Framework).

5. **Language**: The policy must be available in the user's language. If the site is multilingual, the policy must be too.

6. **Location**: Dedicated page accessible from the cookie banner, the footer, and the legal notice.

7. **Update**: Record the date of each change. AEPD recommends renewing consent if the policy changes substantially.
