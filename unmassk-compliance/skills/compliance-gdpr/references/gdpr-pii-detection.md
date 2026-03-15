# PII Detection and Data Privacy Scanning

On-demand reference for scanning codebases and systems for PII exposure, data privacy violations, and non-compliance with GDPR, CCPA, HIPAA, and LGPD.

---

## 1. Define PII Scope

Before scanning, identify which PII categories the application processes:

| Category | Examples | Regulations |
|---|---|---|
| Identity | Name, DOB, national ID, SSN | GDPR, CCPA, HIPAA |
| Contact | Email, phone, postal address | GDPR, CCPA, LGPD |
| Financial | Credit card, IBAN, account number | GDPR, CCPA, PCI DSS |
| Health | Diagnoses, prescriptions, PHI | HIPAA, GDPR Art. 9 |
| Location | GPS coordinates, IP address | GDPR, CCPA |
| Biometric | Fingerprints, face recognition | GDPR Art. 9 |
| Behavioral | Browsing history, purchase patterns | GDPR, CCPA |

---

## 2. Regex Patterns for Source Code Scanning

Apply these patterns with the Grep tool. Exclude `node_modules/`, `vendor/`, `.git/`, and build artifact directories.

### Email Addresses

```
[a-zA-Z0-9+_.-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}
```

Flag as: CWE-312 if stored in plaintext, CWE-532 if found in log statements.

### US Social Security Numbers

```
\b\d{3}-\d{2}-\d{4}\b
```

Flag as: CWE-312, severity Critical.

### Credit Card Numbers (Luhn-candidate sequences)

```
\b[0-9]{4}[- ]?[0-9]{4}[- ]?[0-9]{4}[- ]?[0-9]{1,4}\b
```

Validate with Luhn algorithm before filing findings. Flag as: CWE-312 + PCI DSS Requirement 3, severity Critical.

### Phone Numbers (international)

```
(\+?[1-9]\d{0,2}[\s.-]?)(\(?\d{1,4}\)?[\s.-]?)(\d{1,4}[\s.-]?\d{1,9})
```

Flag as: CWE-312 if hardcoded, CWE-532 if in logs.

### IP Addresses

```
\b(?:\d{1,3}\.){3}\d{1,3}\b
```

Under GDPR, IP addresses are personal data. Flag logging of IP addresses without anonymization.

### Date of Birth patterns

```
\b(19|20)\d{2}[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b
```

Flag as: CWE-312 if stored in plaintext non-encrypted columns.

---

## 3. Scanning Procedure — 10 Steps

### Step 1 — Scan for hardcoded PII in source code

```
Grep pattern: [a-zA-Z0-9+_.-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}
Scope: src/, api/, config/, tests/, fixtures/
```

For each match: determine if it is test data (synthetic) or real PII. Flag real PII as CWE-312, severity Critical. Flag synthetic data with realistic patterns as Low (recommend using `test@example.com` or RFC 2606 reserved domains).

### Step 2 — Scan logging statements for PII leakage

Target logging functions by language:

- JavaScript/TypeScript: `console.log`, `console.error`, `logger.info`, `logger.debug`, `logger.warn`
- Python: `logging.debug`, `logging.info`, `logging.warning`, `logger.error`
- Java/Kotlin: `Log.d`, `Log.i`, `Log.e`, `log.info`
- Go: `log.Printf`, `log.Println`, `zap.`, `logrus.`

Grep for combinations: `(console\.log|logger\.\w+).*\b(email|password|phone|ssn|token|card)\b`

Flag each as: CWE-532 (Insertion of Sensitive Information into Log File), severity High.

### Step 3 — Analyze database schemas and ORM models

Look for these column names in schema files, migration files, and ORM model definitions:

```
email, phone, phone_number, ssn, social_security, date_of_birth, dob, address,
postal_code, credit_card, card_number, cvv, passport_number, national_id,
health_condition, diagnosis, prescription
```

For each PII column: check for encryption-at-rest annotations (`@Encrypted`, `encrypted_type`, `pgcrypto`, `aes_encrypt`). Flag unencrypted PII columns as CWE-312, severity Critical for financial/health data, High for contact data.

### Step 4 — Verify PII in transit uses TLS

Scan HTTP client configurations for plaintext endpoints:

```
Grep: http://(?!localhost|127\.0\.0\.1)
Scope: src/, api/, config/
```

Flag any non-localhost HTTP URL used in API calls transmitting PII. Check TLS certificate validation settings — flag `verify=False`, `rejectUnauthorized: false`, `InsecureSkipVerify: true` as CWE-295, severity High.

### Step 5 — Check for PII in URL query parameters

```
Grep: \?(email|phone|ssn|user_id|token)=
```

PII in URLs appears in server logs, browser history, and HTTP referrer headers. Flag as severity High, GDPR Article 5(1)(f) (integrity and confidentiality).

### Step 6 — Assess consent management

Search for these patterns indicating consent infrastructure exists:

- Cookie consent: `cookieConsent`, `gdpr-consent`, `CookieBot`, `OneTrust`, `Cookiebar`
- Privacy policy links: `privacy-policy`, `datenschutz`, `privacyPolicy`
- Consent storage: `hasConsent`, `consentGiven`, `userConsent`
- Opt-in/opt-out: `optIn`, `optOut`, `unsubscribe`

If none found AND the application collects PII → flag as GDPR Article 6/7 gap, severity Critical.

### Step 7 — Check data retention controls

Search for:

- Scheduled deletion jobs: `cron`, `scheduler`, `deleteExpired`, `purgeOldRecords`
- Retention configuration: `retention_days`, `data_ttl`, `expire_after`
- Data subject deletion endpoints: `DELETE /users/:id`, `DELETE /api/accounts`
- Data export endpoints: `GET /users/:id/export`, `GET /data/download`

If no retention mechanism exists → flag as GDPR Article 17 gap (Right to Erasure), severity High.
If no data export endpoint exists → flag as GDPR Article 15 gap (Right of Access), severity High.

### Step 8 — Evaluate anonymization in non-production environments

Check test fixtures, seed files, factory definitions, and test helpers for real PII patterns. Apply email regex against `tests/`, `spec/`, `fixtures/`, `seeds/`.

If real PII found in test data → flag as severity Medium (GDPR Article 5(1)(e) — storage limitation).

Verify analytics and reporting pipelines use aggregated or anonymized data, not raw user records.

### Step 9 — Scan configuration and environment files

Check `.env.example`, `config/*.json`, `docker-compose.yml`, `kubernetes/` manifests for PII used as default values or seed data.

```
Grep: (EMAIL|PHONE|SSN|PASSWORD)\s*=\s*[a-zA-Z0-9+_.-]+@[a-zA-Z0-9.-]+
Scope: ., config/, infra/, k8s/
```

Flag hardcoded real PII in configuration as CWE-312, severity Critical.

### Step 10 — Classify and produce output

For each finding, record:
- Severity: Critical / High / Medium / Low
- Regulation: GDPR Article, CCPA Section, HIPAA Rule (as applicable)
- CWE: CWE-312, CWE-532, CWE-295, or CWE-359
- File and line number
- Remediation action

---

## 4. CWE Reference Table

| CWE | Name | Common Source | Default Severity |
|---|---|---|---|
| CWE-312 | Cleartext Storage of Sensitive Information | Unencrypted PII columns, hardcoded PII | Critical |
| CWE-532 | Insertion of Sensitive Information into Log File | PII in log statements | High |
| CWE-295 | Improper Certificate Validation | `verify=False`, `InsecureSkipVerify` | High |
| CWE-359 | Exposure of Private Information | PII in API responses, URL params | High |
| CWE-613 | Insufficient Session Expiration | No session timeout for PII-handling sessions | Medium |

---

## 5. Regulation Article Reference

| Requirement | GDPR | CCPA | HIPAA |
|---|---|---|---|
| Lawful basis for processing | Art. 6 | § 1798.100 | 45 CFR § 164.502 |
| Consent | Art. 7 | § 1798.120 | Authorization (§ 164.508) |
| Right of access | Art. 15 | § 1798.110 | 45 CFR § 164.524 |
| Right to erasure | Art. 17 | § 1798.105 | N/A |
| Data minimization | Art. 5(1)(c) | § 1798.100(b) | Minimum necessary rule |
| Security / confidentiality | Art. 5(1)(f) + Art. 32 | § 1798.150 | 45 CFR § 164.312 |
| Data breach notification | Art. 33-34 | § 1798.150 | 45 CFR § 164.400 |
| Special category data | Art. 9 | § 1798.140 | All PHI |

---

## 6. Output Format

### PII Inventory Table

| Type | File | Line | Storage | Encrypted | Severity |
|---|---|---|---|---|---|
| Email | src/models/user.js | 42 | Database column | No | Critical |
| Phone | src/utils/logger.js | 87 | Log output | N/A | High |

### Findings Table

| # | Severity | CWE | Regulation | File:Line | Description | Remediation |
|---|---|---|---|---|---|---|
| 1 | Critical | CWE-312 | GDPR Art. 5(1)(f) | src/models/user.js:42 | Email stored without encryption | Apply column-level encryption or use pgcrypto |

### Compliance Gap Matrix

| Requirement | GDPR Article | Status |
|---|---|---|
| Consent mechanism | Art. 6/7 | Gap / Compliant / N/A |
| Right to erasure endpoint | Art. 17 | Gap / Compliant / N/A |
| Encrypted PII at rest | Art. 32 | Gap / Compliant / N/A |
| Data retention policy | Art. 5(1)(e) | Gap / Compliant / N/A |
| Anonymized test data | Art. 5(1)(e) | Gap / Compliant / N/A |

---

## 7. Error Handling

| Error | Cause | Solution |
|---|---|---|
| High false positive rate on PII patterns | Regex matching UUIDs or codes with similar structure | Refine with context: check surrounding variable names, file type, and whether string is hardcoded vs. runtime |
| Encrypted PII not detected as protected | Application uses transparent encryption invisible at code level | Check ORM type definitions and DB extension config separately; mark as "protected" in inventory |
| Third-party processors not captured | PII sent to external services via HTTP clients | Grep for HTTP client calls; map destination URLs; flag services without Data Processing Agreements |
| Large codebase scan timeout | Millions of lines | Start with `src/`, `api/`, `config/`; exclude `node_modules/`, `vendor/`, build dirs |
| Test data flagged as real PII | Fixtures use realistic but synthetic data | Verify synthetically; recommend RFC 2606 reserved domains (`example.com`, `test`) and E.164 reserved numbers |
