# NIS2 Scope — Entity Classification and Sectors

Reference for determining whether an organization is in scope for NIS2, and whether
it qualifies as an Essential or Important Entity.

Source: Directive EU 2022/2555, Annexes I and II.
Official text: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555

---

## Size Thresholds

NIS2 applies to medium and large organizations in covered sectors.

| Size | Employees | Annual Revenue OR Balance Sheet |
|------|-----------|-------------------------------|
| Large | ≥250 | >€50M revenue OR >€43M balance sheet |
| Medium | 50–249 | >€10M revenue OR >€10M balance sheet |
| Small / Micro | <50 | ≤€10M — generally out of scope |

**Override — small organizations always in scope regardless of size**:
- Trust service providers
- Top-level domain (TLD) name registries
- DNS service providers
- Domain name registrars
- Providers of electronic communications networks/services
- Sole providers of critical services in a member state
- Entities whose disruption would have significant cross-border impact
- National competent authorities may designate additional entities as essential

---

## Annex I — Essential Entity Sectors (Proactive Supervision)

| Sector | Subsectors |
|--------|-----------|
| Energy | Electricity, oil, gas, district heating/cooling, hydrogen |
| Transport | Air, rail, water, road |
| Banking | Credit institutions |
| Financial market infrastructure | Trading venues, central counterparties (CCPs) |
| Health | Healthcare providers, EU reference labs, pharmaceutical manufacturers, medical device manufacturers |
| Drinking water | Suppliers and distributors |
| Wastewater | Wastewater treatment operators |
| Digital infrastructure | IXPs, DNS providers, TLD registries, cloud computing providers, data center services, CDNs, trust service providers, public electronic communications networks |
| ICT service management (B2B) | Managed service providers (MSPs), managed security service providers (MSSPs) |
| Public administration | Central government, regional government |
| Space | Ground-based infrastructure for space-based services |

---

## Annex II — Important Entity Sectors (Ex-Post Supervision)

| Sector | Subsectors |
|--------|-----------|
| Postal and courier services | Postal service providers, courier services |
| Waste management | Waste collection and treatment operators |
| Chemicals | Manufacturers and distributors |
| Food | Production, processing, and distribution (medium/large businesses) |
| Manufacturing of critical products | Medical devices, computers/electronics, electrical equipment, machinery, motor vehicles, other transport equipment |
| Digital providers | Online marketplaces, online search engines, social networking platforms |
| Research organizations | Public research organizations |

---

## Classification Comparison

| Aspect | Essential Entity | Important Entity |
|--------|-----------------|-----------------|
| Supervision | Proactive (audits without prior incident) | Ex-post (triggered by incident/complaint) |
| Max fine | €10M or 2% global annual turnover | €7M or 1.4% global annual turnover |
| Registration | Mandatory with NCA | Mandatory with NCA |
| Article 21 obligations | Same for both | Same for both |
| Article 23 reporting | Same for both | Same for both |

**Management accountability**: NIS2 Article 20 makes management bodies personally liable.
Board members cannot delegate away accountability. Document board approval of the security
program regardless of entity classification.

---

## Out-of-Scope Checklist

An organization is likely out of scope if ALL of the following are true:

- [ ] Fewer than 50 employees AND revenue/balance sheet ≤€10M
- [ ] Not a trust service provider, DNS provider, TLD registry, or domain registrar
- [ ] Not providing services to essential sectors where disruption could cascade
- [ ] Not designated by national authority as an exception

Document the scope assessment rationale and retain for potential supervisory review.

---

## National Competent Authority (NCA) Directory

For multi-country organizations, the NCA of the Member State where the entity's main
establishment is located has primary jurisdiction.

| Country | NCA — Private Sector | NCA — Public Sector |
|---------|---------------------|---------------------|
| Spain | INCIBE (INCIBE-CERT) | CCN (CCN-CERT) |
| Germany | BSI | BSI |
| France | ANSSI | ANSSI |
| Italy | ACN | ACN |
| Netherlands | NCSC-NL | NCSC-NL |
| Portugal | CNCS | CNCS |
| Belgium | CCB (Centre for Cybersecurity Belgium) | CCB |
| Poland | CERT Polska / CSIRT NASK | CERT.GOV.PL |
| Sweden | NCSC-SE | NCSC-SE |

Full list: https://www.enisa.europa.eu/topics/cybersecurity-policy/nis-directive-new/national-competent-authorities-and-single-points-of-contact

---

## Spain-Specific Transposition

Spain's NIS2 transposition is through national legislation implementing Directive EU 2022/2555. Note: Real Decreto-ley 7/2022 implemented the original NIS Directive (NIS1), not NIS2. Verify the current NIS2 transposition status at INCIBE or CCN-CERT.

- **INCIBE-CERT**: Incident notifications for private-sector entities. Registration portal: https://www.incibe.es/incibe-cert/nis2
- **CCN-CERT**: Public administration and essential entities in the public sector: https://www.ccn-cert.cni.es
- **CNPIC** (Centro Nacional de Protección de Infraestructuras y Ciberseguridad): Critical infrastructure coordination

Spanish entities: verify current requirements at https://www.incibe.es and https://www.ccn-cert.cni.es

---

## Belgium and Netherlands Status

**Belgium**: NIS2 transposed into national law October 2024. Obligations active. Register with CCB at ccb.belgium.be. Enforcement is live.

**Netherlands**: NIS2 transposition expected Q2 2026. Not yet in force as of March 2026. Begin compliance preparation now. Verify current status at ncsc.nl before submitting any notifications.

All EU member states were required to transpose NIS2 by October 17, 2024. Check national transposition status before assuming procedures apply. ENISA CSIRT directory: enisa.europa.eu/topics/csirts-in-europe
