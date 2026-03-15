# LOPDGDD — Records of Processing Activities (RAT / ROPA)

Reference for maintaining the Records of Processing Activities (Registro de Actividades de Tratamiento, RAT) under Article 30 GDPR as applied in Spain. The RAT is the core accountability document for every data controller.

Source: Article 30 GDPR, LOPDGDD, AEPD guidance. Full text: https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673

---

## Legal Obligation

Every **data controller** must maintain a written RAT of all processing activities carried out under their responsibility (Article 30(1) GDPR). Every **data processor** must maintain a separate RAT of all processing categories carried out on behalf of controllers (Article 30(2) GDPR).

The RAT must be made available to the supervisory authority (AEPD) on request.

---

## SME Exemption

Organizations with **fewer than 250 employees** may be exempt from maintaining a RAT if ALL of the following conditions are met:

1. Processing is **not carried out on a regular basis**
2. Processing is **unlikely to result in a risk** to the rights and freedoms of data subjects
3. Processing does **not include special category data** (Article 9 GDPR)
4. Processing does **not include personal data relating to criminal convictions and offences** (Article 10 GDPR)

**Warning:** If even one condition fails, the RAT is mandatory regardless of employee count. The AEPD recommends maintaining a RAT even when exempt, as it demonstrates accountability.

AEPD FACILITA tool simplifies RAT creation for low-risk activities: https://www.aepd.es/herramientas/facilita

---

## Required Fields per Processing Activity

For each processing activity, the RAT must document:

| Field | Description | Example |
|-------|-------------|---------|
| **1. Name of the activity** | Descriptive name identifying the processing purpose | "Customer relationship management" |
| **2. Controller identity** | Full name, address, and contact details of the controller | Company name, registered address, email |
| **3. DPO contact** | Name and contact details of the DPO (if designated) | DPO name, email |
| **4. Joint controllers** | Identity of joint controllers and their responsibilities (if applicable) | Partner company, agreed contact point |
| **5. Purposes** | Specific purposes for which the data is processed | "Managing orders and billing" |
| **6. Legal basis** | Article 6 GDPR legal basis for each purpose | Contractual necessity (Art. 6(1)(b)) |
| **7. Categories of data subjects** | Groups of individuals whose data is processed | Customers, employees, website visitors |
| **8. Categories of personal data** | Types of data processed | Name, email, postal address, payment data |
| **9. Special categories** | Any special category data (Art. 9 GDPR) | Health data (with applicable exception) |
| **10. Recipients** | Categories of recipients — processors, third parties, public authorities | Payment processor, shipping company |
| **11. Third-country transfers** | Any transfer outside the EEA — destination country and safeguard | UK — adequacy decision; US — Standard Contractual Clauses |
| **12. Retention period** | Time limit for keeping the data or criteria used to determine it | "5 years after contract end (tax obligation)" |
| **13. Security measures** | General description of technical and organizational security measures | Encryption at rest, access controls, pseudonymization |

---

## RAT Template

Generate this template in `.compliance/lopdgdd-rat.md`:

```markdown
# Records of Processing Activities (RAT)

**Controller:** [Organization name]
**Address:** [Registered address]
**Contact:** [Email]
**DPO:** [Name and email, or "Not designated"]
**Last updated:** [YYYY-MM-DD]

---

## Activity 1: [Name]

| Field | Content |
|-------|---------|
| Purpose(s) | [Description] |
| Legal basis | [Art. 6(1)(X) GDPR — reason] |
| Data subjects | [Categories] |
| Personal data | [Types] |
| Special categories | [None / Type + Art. 9 exception] |
| Recipients | [List processors and third parties] |
| Third-country transfers | [None / Country + safeguard] |
| Retention | [Period or criteria] |
| Security measures | [Description] |

---

## Activity 2: [Name]

[Repeat structure]
```

---

## Common Processing Activities to Document

| Activity | Typical Legal Basis | Common Data Types |
|----------|--------------------|--------------------|
| Customer management (CRM) | Art. 6(1)(b) — contract | Name, email, address, purchase history |
| Employee records | Art. 6(1)(b) — contract; Art. 6(1)(c) — legal obligation | Name, ID, salary, social security number |
| Website analytics | Art. 6(1)(a) — consent (if cookies) | IP address, browsing behavior, device info |
| Email marketing | Art. 6(1)(a) — consent | Name, email |
| Supplier management | Art. 6(1)(b) — contract | Contact name, email, bank details |
| Video surveillance | Art. 6(1)(f) — legitimate interest | Images/video of individuals |
| Access control | Art. 6(1)(f) — legitimate interest | Name, badge ID, access logs |
| Accounting and billing | Art. 6(1)(c) — legal obligation | Name, address, tax ID, payment data |

---

## Processor RAT (Article 30(2) GDPR)

Data processors must maintain their own RAT covering:

1. Name and contact details of each controller on whose behalf they process
2. DPO contact details (for each controller)
3. Categories of processing carried out on behalf of each controller
4. Third-country transfers (destination, safeguard)
5. General description of security measures (Article 32 GDPR)

---

## AEPD Enforcement Notes

The AEPD actively requests RATs during inspections. Key risks:

- **No RAT:** Serious infringement — up to €10M or 2% global turnover
- **Incomplete RAT:** May be treated as a serious infringement
- **RAT not updated:** Indicates lack of ongoing accountability

The AEPD has sanctioned organizations specifically for failing to maintain a RAT even when no actual data breach occurred.
