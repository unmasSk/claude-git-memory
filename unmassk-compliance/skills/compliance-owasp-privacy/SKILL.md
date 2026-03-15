---
name: compliance-owasp-privacy
description: >
  Use when the user asks to "check OWASP compliance", "OWASP review",
  "ASVS audit", "check agentic security", "review security best practices",
  "check OWASP Top 10", "audit application security", "ASVS verification",
  "check supply chain security", "review prompt injection risks",
  "check tool misuse", "audit AI agent security",
  or mentions any of: OWASP, OWASP Top 10, ASVS, ASVS 5.0,
  application security, A01 broken access control, A02 security misconfiguration,
  A03 supply chain, A04 cryptographic failures, A05 injection, A06 insecure design,
  A07 authentication failures, A08 data integrity,
  A09 logging monitoring, A10 exceptional conditions, XSS, SSRF,
  CSRF, agentic security, prompt injection, tool misuse, memory poisoning,
  rogue agents, ASI01, ASI02, ASI03, ASI04, ASI05, ASI06, ASI07,
  ASI08, ASI09, ASI10, verification level L1 L2 L3.
  Covers three OWASP frameworks: Top 10:2025 (175,000+ CVEs, 2.8M apps),
  ASVS 5.0.0 (~350 requirements, 17 categories, 3 levels), and Top 10 for
  Agentic Applications 2026 (AI agent-specific risks). Single reference file
  with prevention code examples in Python, JavaScript, YAML, and shell.
version: 1.0.0
---

# OWASP -- Application Security Compliance Toolkit

Review and audit application security against OWASP standards. Covers the
Top 10:2025, ASVS 5.0.0, and the Agentic Applications Top 10:2026.

## Request Routing

| User Request | Load Reference | Focus Section |
|---|---|---|
| General OWASP review, Top 10 check | `references/owasp-2025-2026-report.md` | OWASP Top 10:2025 |
| ASVS audit, verification level assessment | `references/owasp-2025-2026-report.md` | OWASP ASVS 5.0.0 |
| AI agent security, prompt injection, tool misuse | `references/owasp-2025-2026-report.md` | OWASP Top 10 for Agentic Applications 2026 |
| Full security compliance audit | `references/owasp-2025-2026-report.md` | All sections |

Load reference on-demand. The reference covers all three frameworks in one file.

## OWASP Top 10:2025

Released at AppSec EU Barcelona 2025. Based on 175,000+ CVEs and 2.8M applications.

| Rank | Category | Key Changes |
|---|---|---|
| A01 | Broken Access Control | Retained from 2021 |
| A02 | Security Misconfiguration | Moved up from A05 |
| A03 | Software Supply Chain Failures | NEW |
| A04 | Cryptographic Failures | Moved down from A02 |
| A05 | Injection | Moved down from A03 |
| A06 | Insecure Design | Moved down from A04 |
| A07 | Identification and Authentication Failures | Retained |
| A08 | Software and Data Integrity Failures | Retained |
| A09 | Security Logging and Monitoring | Retained |
| A10 | Mishandling of Exceptional Conditions | NEW |

## ASVS 5.0.0 Verification Levels

Released May 2025. ~350 security requirements across 17 categories.

| Level | Target | Scope |
|---|---|---|
| L1 | All applications | Basic security controls |
| L2 | Applications handling sensitive data | Standard security controls |
| L3 | Critical applications (medical, financial, military) | Advanced security controls |

New ASVS 5.0 categories: OAuth/OIDC (V15), Self-Contained Tokens (V16), WebSockets (V17).

## Agentic Applications Top 10:2026

Released December 2025. AI agent-specific risks.

| Code | Risk |
|---|---|
| ASI01 | Agent Goal Hijack (prompt injection) |
| ASI02 | Tool Misuse |
| ASI03 | Identity & Privilege Abuse |
| ASI04 | Supply Chain Vulnerabilities |
| ASI05 | Unexpected Code Execution |
| ASI06 | Memory & Context Poisoning |
| ASI07 | Insecure Inter-Agent Communication |
| ASI08 | Cascading Failures |
| ASI09 | Human-Agent Trust Exploitation |
| ASI10 | Rogue Agents |

## Audit Workflow

### Step 1 -- Determine Scope

Identify which frameworks apply:
- Web application → Top 10:2025 + ASVS
- AI agent system → Agentic Top 10:2026 + Top 10:2025
- Critical system → All three frameworks, ASVS L3

### Step 2 -- Load Reference

Load `references/owasp-2025-2026-report.md` and navigate to the
relevant framework section.

### Step 3 -- Review Code

For each applicable category:
1. Search codebase for the vulnerability pattern described in the reference.
2. Check if prevention measures match the code examples provided.
3. Record findings with OWASP category, severity, and remediation.

### Step 4 -- Produce Report

Generate findings with:
1. OWASP category and rank reference
2. Affected files and code locations
3. Severity assessment
4. Prevention code examples from the reference
5. ASVS verification level compliance status (if applicable)

## Reference Files

| File | Domain | Load When |
|---|---|---|
| `references/owasp-2025-2026-report.md` | Top 10:2025, ASVS 5.0.0, Agentic Top 10:2026, prevention code examples | Any OWASP review or security compliance audit |

## Mandatory Rules

- Always reference the specific OWASP category (A01-A10) or ASVS requirement (V2.1.1, etc.) in findings.
- Never skip Supply Chain (A03) -- it is new in 2025 and commonly overlooked.
- For agentic applications, always check prompt injection (ASI01) and tool misuse (ASI02) first.
- Use the prevention code examples from the reference, not generic advice.
- When assessing ASVS, specify the verification level (L1/L2/L3) being targeted.

## Done Criteria

A task is complete when:
- All applicable OWASP categories have been reviewed against the codebase
- Findings include specific OWASP/ASVS references and affected code
- Prevention measures are provided with code examples
- ASVS verification level compliance is stated (if applicable)
- Report delivered with severity and prioritized remediation
