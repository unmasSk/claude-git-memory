# LOPDGDD — Public Administration Obligations

Reference for the special data protection regime applicable to Spanish public administrations under the LOPDGDD. Load when the project involves public sector entities, public authorities, or public service providers.

Source: Ley Orgánica 3/2018, Article 77 and complementary provisions. Full text: https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673

---

## Special Regime for Public Entities (Article 77 LOPDGDD)

Public administrations are subject to all GDPR and LOPDGDD obligations. However, the sanctions regime differs from the private sector: public entities do not receive economic fines but are subject to a specific corrective and disciplinary regime.

**Entities covered by the public sector regime:**

- State General Administration (Administración General del Estado)
- Autonomous community administrations (Comunidades Autónomas)
- Local entities (municipalities, provinces, islands)
- Institutional public sector (public agencies, autonomous bodies, public enterprises)
- Constitutional bodies (Congress, Senate, Constitutional Court, Court of Auditors, Ombudsman)
- Regional parliaments and ombudsman institutions
- Public universities
- Public media corporations
- Any other public entity under public law

---

## Mandatory DPO for All Public Entities

Every public administration and public entity must designate a Data Protection Officer (DPO) — this obligation is absolute and admits no exceptions.

**DPO requirements for public sector:**
- May be an individual or a shared DPO among several public entities (permitted for municipalities and small local bodies)
- Must have expert knowledge of data protection law and practices
- Must be registered with the AEPD: https://sedeagpd.gob.es/sede-electronica-web/
- Must not receive instructions regarding the exercise of their tasks
- Cannot be dismissed or penalized for performing their duties
- Must be reachable by data subjects for exercising their rights

**Shared DPO for local entities:** Small municipalities may share a single DPO with neighboring municipalities or with their provincial administration (Diputación Provincial), provided the DPO is accessible to data subjects in each entity.

---

## Sanctions Regime for Public Entities

Unlike private sector organizations, public administrations **do not receive financial penalties** for LOPDGDD/GDPR infringements. The AEPD applies a specific corrective regime:

| Measure | Description |
|---------|-------------|
| **Formal reprimand** (apercibimiento) | Official written notification of infringement — published in the AEPD resolution register |
| **Correction orders** | Binding AEPD orders to implement specific remedial measures within a defined deadline |
| **Referral to Parliament** | The AEPD may refer serious or repeated infringements to the relevant Parliament (national or regional) |
| **Referral to internal oversight bodies** | AEPD may inform the entity's internal control organs (inspección de servicios) for disciplinary proceedings against responsible officials |
| **Publication** | AEPD resolutions are always public — reputational impact is the primary deterrent |

**Individual liability:** While public entities do not receive fines, individual civil servants and officials who are personally responsible for infringements may face administrative disciplinary proceedings.

---

## Supervisory Authority — AEPD

The Agencia Española de Protección de Datos (AEPD) is the national supervisory authority for Spain under Article 51 GDPR.

**AEPD contact and resources:**
- Main website: https://www.aepd.es
- DPO registry: https://sedeagpd.gob.es/sede-electronica-web/
- Prior consultation channel: https://www.aepd.es/es/derechos-y-deberes/cumple-tus-deberes/consultas-previas
- AEPD public resolutions: https://www.aepd.es/es/prensa-y-comunicacion/resoluciones

**Regional data protection authorities:** Some autonomous communities have their own data protection authorities competent for regional public sector data:
- Catalonia: Autoritat Catalana de Protecció de Dades (APDCAT) — https://apdcat.gencat.cat
- Basque Country: Datuak Babestekoaren Euskal Bulegoa / Agencia Vasca de Protección de Datos (AVPD) — https://www.avpd.eus
- For all other autonomous communities: AEPD is competent

---

## Coordination with ENS (Esquema Nacional de Seguridad)

For public sector data processing, the LOPDGDD and the ENS (National Security Framework, Real Decreto 311/2022) are complementary frameworks that must be applied simultaneously.

| Framework | Governs |
|-----------|---------|
| LOPDGDD + GDPR | Data subjects' rights, lawfulness of processing, information obligations, accountability |
| ENS | Technical and organizational security measures for information systems processing public data |

**Key coordination points:**
- ENS security categories (Basic, Medium, High) map to GDPR risk levels — ENS High implies DPIA obligation
- ENS security audits generate evidence for GDPR Article 32 compliance (technical and organizational measures)
- ENS certification of a system contributes to demonstrating GDPR accountability
- Systems processing health data, criminal data, or financial data typically require ENS Medium or High category

See skill compliance-ens for full ENS requirements and certification workflow.

---

## Public Sector Specific Obligations

### Prior Consultation with the AEPD (Article 36 GDPR)

When a DPIA indicates that residual risk remains high after mitigation measures, public entities must consult the AEPD before starting the processing. The AEPD has up to 8 weeks to respond (extendable by 6 additional weeks).

### Publication in the Official Gazette (BOE / BOCA)

Some public processing activities require publication of a notice in the official gazette as part of the transparency obligation (e.g., video surveillance systems, certain registers).

### Interoperability and Data Sharing between Public Bodies

Data sharing between public administrations is permitted under Article 8 LOPDGDD when:
- It is necessary for the exercise of competences and functions
- The original legal basis for collection permits the sharing
- The data subjects are informed (or an exception applies under GDPR Article 13/14)

### Retention and Archiving

Public administrations are subject to archiving legislation (Ley 16/1985 del Patrimonio Histórico Español and sector-specific norms) that may override standard GDPR retention principles. Archiving in the public interest is a recognized exception under Article 89 GDPR.

---

## Checklist for Public Sector Projects

- [ ] DPO designated and registered with AEPD
- [ ] RAT maintained and kept up to date
- [ ] DPIA conducted for high-risk processing
- [ ] ENS security category assigned to each system
- [ ] Prior consultation with AEPD completed (if residual risk high)
- [ ] Privacy notices published for all processing (Articles 13/14 GDPR)
- [ ] Data subject rights exercise channel established
- [ ] Processing agreements (encargados del tratamiento) signed with all processors
- [ ] Third-country transfer safeguards in place (if applicable)
- [ ] Internal data breach notification procedure established (72-hour AEPD notification)
