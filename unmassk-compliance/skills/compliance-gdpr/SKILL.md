---
name: compliance-gdpr
description: >
  Use when the user asks to "scan for PII", "check GDPR compliance",
  "detect sensitive data", "audit data privacy", "check data protection",
  "scan privacy issues", "validate GDPR", "check CCPA compliance",
  "check HIPAA compliance", "find PII in code", "check data retention",
  "audit consent mechanisms", "check anonymization",
  or mentions any of: GDPR, CCPA, HIPAA, LGPD, PII, personal data,
  data privacy, data protection, consent, data retention, anonymization,
  pseudonymization, right to erasure, Article 6, Article 7, Article 15,
  Article 17, data subject rights, DPA, data processing agreement,
  CWE-312, CWE-532, CWE-359, sensitive data, privacy scan.
  Covers codebase scanning for PII exposure (email, SSN, credit card,
  phone numbers), PII in logs and database schemas, unencrypted PII
  in transit, consent management gaps, data retention controls,
  anonymization checks, and compliance gap matrices across GDPR, CCPA,
  HIPAA, and LGPD. Produces PII inventory, findings report with
  severity and CWE references, data flow diagrams, and remediation plans.
  Based on privacy-security-skills by Jeremy Longshore (MIT License).
version: 1.0.0
---

# GDPR -- Data Privacy and PII Detection Toolkit

Scan codebases for data privacy violations, PII exposure, and non-compliance
with GDPR, CCPA, HIPAA, and LGPD. Detect hardcoded personal data, unprotected
PII in logs and databases, missing consent mechanisms, improper data retention,
and insufficient anonymization.

Based on privacy-security-skills by Jeremy Longshore (MIT License).

## Request Routing

Map user intent to the correct reference file.

| User Request | Load Reference |
|---|---|
| Scan for PII, detect sensitive data, find hardcoded PII in code | `references/gdpr-pii-detection.md` |
| Full GDPR compliance audit, check data privacy posture | `references/gdpr-pii-detection.md` + `references/gdpr-scanning.md` |
| Check consent, lawful basis, data retention, data subject rights, DPO, DPIA, cross-border transfers | `references/gdpr-scanning.md` |
| Organizational GDPR posture, generate compliance report, audit data processing records | `references/gdpr-scanning.md` |

Load references on-demand as needed. Do NOT load all at startup.

## Severity Levels

Assign every finding one of these levels.

| Severity | Meaning | Fix Timeline |
|---|---|---|
| Critical | PII exposed in plaintext, no encryption, CWE-312 | Immediate |
| High | PII in logs (CWE-532), missing consent, no retention controls | Within 1 week |
| Medium | Missing anonymization in non-prod, incomplete DPA | Within 1 month |
| Low | Test data with realistic PII patterns, missing privacy policy links | Backlog |

## Audit Workflow

Follow these steps in order for every privacy audit.

### Step 1 -- Define PII Scope

Identify the PII categories relevant to the application: email addresses, phone
numbers, SSN, credit card numbers, IP addresses, geolocation data, biometric
data, health records, and any domain-specific identifiers. Load
`references/gdpr-pii-detection.md` for the full category list and regex patterns.

### Step 2 -- Scan Source Code for Hardcoded PII

Use Grep with the regex patterns from the reference file to detect:
- Email patterns: `[a-zA-Z0-9+_.-]+@[a-zA-Z0-9.-]+`
- SSN patterns: `\d{3}-\d{2}-\d{4}`
- Credit card patterns: Luhn-valid 13-19 digit sequences
- Phone number patterns

Flag each match as CWE-312 (Cleartext Storage of Sensitive Information).

### Step 3 -- Scan Logs and Database Schemas

Search logging statements (`console.log`, `logger.info`, `logging.debug`,
`Log.d`) for PII field references. Flag as CWE-532 (Insertion of Sensitive
Information into Log File), severity high.

Analyze database schemas and ORM models for PII fields stored without
encryption. Check columns named `email`, `phone`, `ssn`, `date_of_birth`,
`address` for encryption-at-rest annotations.

### Step 4 -- Assess Consent and Retention

Search for cookie consent implementations, privacy policy links, data processing
agreements, and opt-in/opt-out mechanisms. Flag applications collecting PII
without documented consent flows as GDPR Article 6/7 gap.

Check for automated data deletion jobs, retention policy configurations, and
user data export/deletion endpoints (GDPR Article 17 Right to Erasure).

### Step 5 -- Check Anonymization

Verify that analytics, reporting, and non-production environments use anonymized
or pseudonymized data rather than production PII. Flag test fixtures containing
real PII patterns.

### Step 6 -- Produce Report

Generate the structured output with:
1. PII inventory table (type, location, storage mechanism, encryption status)
2. Findings sorted by severity with regulation reference and CWE
3. Data flow diagram (entry points, processing, storage, exit points)
4. Compliance gap matrix (GDPR/CCPA/HIPAA mapped to implementation status)
5. Prioritized remediation plan

## Reference Files

| File | Domain | Load When |
|---|---|---|
| `references/gdpr-pii-detection.md` | PII detection patterns, CWE mappings, 10-step code scanning procedure, output format | PII scan, privacy audit, sensitive data detection in code |
| `references/gdpr-scanning.md` | GDPR organizational posture: ROPA (Art. 30), lawful basis (Art. 6), consent (Art. 7), DPA vendor contracts (Art. 28), DPO (Art. 37), cross-border transfers (Art. 44-46), DPIA triggers (Art. 35), breach notification (Art. 33) | Organizational GDPR compliance check, posture audit, compliance report |

## Mandatory Rules

- Always scan `src/`, `api/`, `config/` directories first for highest risk.
- Exclude `node_modules/`, `vendor/`, and build artifacts from scans.
- Every finding must include: severity, regulation reference (GDPR Article, CCPA Section, HIPAA Rule), CWE reference, affected file, and remediation steps.
- Never skip consent and retention checks -- these are the most commonly missed GDPR gaps.
- Flag PII in URL query parameters as high severity (visible in server logs and browser history).

## Done Criteria

A task is complete when:
- All PII categories relevant to the application have been scanned
- Logging statements checked for PII leakage
- Database schemas checked for unencrypted PII
- Consent and retention mechanisms assessed
- Compliance gap matrix produced for applicable regulations
- Findings report delivered with severity, CWE, and remediation for each finding
