<h1 align="center">unmassk toolkit</h1>

<p align="center">
  <strong>Claude Code that remembers, delegates, and delivers enterprise-quality code.</strong>
</p>

---

## The problem

Every Claude Code session starts from zero. You repeat your preferences. You re-explain your architecture. You correct the same mistakes. Claude forgets what you decided yesterday, writes code without reading existing patterns, and improvises when it should follow a plan.

## The fix

One install. Claude remembers everything, delegates to specialized agents, follows structured workflows, and applies enterprise quality standards to every line of code — automatically.

The user sees none of the machinery. You give instructions. Claude delivers.

---

## Install

Add the marketplace and install the core:

```
/plugin marketplace add unmassk/claude-toolkit
/plugin install unmassk-toolkit@unmassk-claude-toolkit
```

Then install the domain plugins you need:

```
/plugin install unmassk-db@unmassk-claude-toolkit
/plugin install unmassk-ops@unmassk-claude-toolkit
/plugin install unmassk-compliance@unmassk-claude-toolkit
/plugin install unmassk-media@unmassk-claude-toolkit
/plugin install unmassk-design@unmassk-claude-toolkit
/plugin install unmassk-seo@unmassk-claude-toolkit
/plugin install unmassk-marketing@unmassk-claude-toolkit
```

Restart Claude Code. Done.

---

## What changes

| Before | After |
|--------|-------|
| Every session starts from zero | Claude remembers decisions, preferences, and your personality across sessions |
| Claude writes all the code | Claude orchestrates 10 agents — each with a defined role |
| "Review this code" → generic feedback | Agents auto-discover 40+ domain skills and apply specific checklists |
| You ask for an audit, Claude improvises | 14-step enterprise audit with scoring /110 |
| You ask to build a feature, Claude jumps in | 8-step creative pipeline from brainstorm to merge |
| No quality standards | T1/T2/T3 tiers, OWASP, React patterns, TypeScript strict, async, API contracts |
| You manage everything | The machinery is invisible — you give instructions, Claude delivers |

---

## What's inside

### Core (unmassk-toolkit)

Always installed. Contains everything Claude needs to orchestrate.

| Component | What it does |
|-----------|-------------|
| **Memory** | Persistent memory via git commits. Decisions, memos, remembers survive across sessions. |
| **10 Agents** | Bilbo (explore), Ultron (implement), Dante (test), Cerberus (review), Argus (security), Moriarty (break), House (diagnose), Yoda (judge), Alexandria (document), Gitto (query memory) |
| **Flow** | 8-step pipeline: triage → brainstorm → research → plan → execute → verify → document → close |
| **Audit** | 14-step enterprise audit with weighted scoring /110 and adversarial validation |
| **Standards** | 33 sections of quality criteria — tiers, OWASP, React, TypeScript, async, API contracts, concurrency |
| **Calibration** | Memory calibration trained on 30 independent analyses of real conversations — teaches Claude when to save, what type to use, and when to shut up |

### Domain plugins

Install what you need. Agents discover them automatically.

| Plugin | Skills | What it covers |
|--------|--------|---------------|
| **unmassk-db** | 7 | PostgreSQL, MySQL, MongoDB, Redis, migrations, schema design, vector/RAG |
| **unmassk-ops** | 7 | Terraform, Docker/K8s/Helm, CI/CD, observability, scripting, deploy, error tracking |
| **unmassk-compliance** | 9 | GDPR, LOPDGDD, NIS2, ENS, SOC2/ISO, OWASP, cookies, i18n, legal docs |
| **unmassk-media** | 8 | Video (Remotion/ffmpeg), image gen/edit, mermaid, PDF, screenshots, transcription |
| **unmassk-design** | 1 | Design systems, color, typography, motion, accessibility, agentic UX |
| **unmassk-seo** | 1 | Technical SEO, schema markup, Core Web Vitals, GEO/AEO |
| **unmassk-marketing** | 1 | CRO, copywriting, email, retention, paid ads, analytics, growth |

---

## License

MIT
