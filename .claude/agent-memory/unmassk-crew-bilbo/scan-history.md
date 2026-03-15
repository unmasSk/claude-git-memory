---
name: scan-history
description: Key findings from Bilbo scans on unmassk-crew codebase
type: project
---

## 2026-03-15 — BM25 skill-search.py architecture trace

Full data-flow map of skill-search.py (unmassk-crew 1.3.0). Key findings:

**Search dirs (ordered, first-seen wins on name collision):**
1. `~/.claude/plugins/cache` — cache versions, ALWAYS win over dev-repo
2. `~/.claude/skills` — user skills (empty on this machine)
3. `<git-root>/.claude/skills` — project skills (empty)
4. `<git-root>/` — dev repo (all 36 names duplicated here, all shadowed)

**Corpus: exactly 36 skills indexed** (confirmed by `--json` output). Cache wins on all 36 names.

**4 skills UNREACHABLE via BM25** — have SKILL.md but no .skillcat:
- `unmassk-audit/skills/unmassk-audit` — invoked only via explicit Skill tool
- `unmassk-gitmemory/skills/unmassk-gitmemory` — same
- `unmassk-gitmemory/skills/unmassk-gitmemory-lifecycle` — same
- `unmassk-gitmemory/skills/unmassk-gitmemory-issues` — same
These are intentionally excluded from BM25 (orchestrator-level skills, not domain skills).

**Deduplication: two-stage.**
1. Path-level: `resolved` path set (skips symlinks and re-paths to same file)
2. Name-level: `seen_names` set (first-seen by name wins — cache over dev-repo)
Note: `plugin` column is NOT in SEARCH_COLS, so plugin affiliation does not affect BM25 scores.

**IDF variant: smoothed BM25+** — `log((N-f+0.5)/(f+0.5)+1)` prevents negative scores.
Range with N=36: IDF_min=0.0136 (omnipresent terms), IDF_max≈3.21 (hapax terms).

**Tokenizer:** lowercases, strips `[^\w\s\-]`, drops tokens of length <=1.
All compliance acronyms (NIS2, OWASP, SOC2, ENS, GDPR, LOPDGDD) survive tokenization.

**SKILL_SEARCH_EXTRA_DIRS:** undocumented env var for adding scan dirs at runtime (colon-separated paths). Only noted in Ultron memory. Not used in production.

**1.2.0 vs 1.3.0 skill-search.py:** byte-for-byte identical. Dev-repo copy also identical.

## 2026-03-14 — marketingskills ref-repo survey

Mapped 27 non-SEO skills from `.ref-repos/marketingskills/skills/`.
Produced word-count table + proposed reference grouping into 10 thematic groups for the marketing plugin.
No orphan or dead-code findings — this was an inventory scan, not a dependency trace.
No escalation needed.

## 2026-03-14 — unmassk-design plugin source survey (5 repos)

Surveyed 5 design ref-repos for unmassk-design plugin consolidation:
- **Impeccable** (~10,400 words): frontend-design SKILL.md + 7 reference files + 5 command skills. Best-in-class anti-AI-slop philosophy. 17 command skills total (audit, critique, polish, bolder, animate, etc.). No scripts/data.
- **UI/UX Pro Max** (~6,500 words SKILL.md alone): searchable CSV database (products, styles, colors, typography, ux-guidelines, charts, google-fonts, react-performance, etc.) + 3 Python scripts (search.py, core.py, design_system.py). Separate design/brand/banner-design/ui-styling/design-system skills each have their own scripts and CSVs. The only source with a working search engine.
- **bencium-controlled-ux-designer** (~10,500 words across 5 files): Deep accessible-code patterns (ARIA, shadcn/Tailwind, Phosphor icons). Unique: DESIGN-SYSTEM-TEMPLATE.md fixed/project-specific/adaptable framework. Heavy React/Tailwind specificity.
- **typography** (~3,800 words): Rooted in Butterick's Practical Typography. Unique: HTML entities table, OpenType features, JSX/React curly-quote implementation guide. CSS baseline template. Enforcement-mode design.
- **relationship-design** (~9,400 words across 4 files): Unique domain — agentic UX, memory architecture, trust evolution (3 stages), compounding value metrics. TypeScript implementation patterns. No overlap with any other source.

Key consolidation recommendation: Impeccable provides the design principles core; UI/UX Pro Max provides the data/search infrastructure; bencium provides deep accessibility + component patterns; typography provides typographic correctness layer; relationship-design is entirely orthogonal (agentic/AI UX only).

No orphans, no dead code — inventory scan only. No escalation needed.

## 2026-03-15 — unmassk-ops plugin integrity verification (all 5 skills)

Full cross-reference audit of `/unmassk-ops/skills/` against all 5 SKILL.md declarations.

**Result: ALL 5 SKILLS PASS — zero integrity failures.**

Counts confirmed:
- ops-iac: 20 scripts, 14 references — all declared, all physical, all match
- ops-containers: 22 scripts, 19 references — all declared, all physical, all match
- ops-cicd: 29 scripts (+jenkins-lib/__init__.py as undeclared but expected), 30 references — all match
- ops-observability: 10 scripts, 9 references — all declared, all physical, all match
- ops-scripting: 11 scripts, 21 references — all declared, all physical, all match

Syntax checks: all .py files compile (python3 -m py_compile), all .sh files pass (bash -n). Zero failures.
Path checks: all SKILL.md code blocks use `${CLAUDE_PLUGIN_ROOT}` — no absolute or relative paths.

Minor observations (not failures):
- `__pycache__/` dirs present in 4 skills (ops-cicd, ops-containers, ops-iac, ops-observability) — build artifacts committed to repo, not referenced in SKILL.md (expected, not a defect)
- `jenkins-lib/__init__.py` exists physically in ops-cicd but not in SKILL.md script table — correct: it's a Python package init file, not a callable script
- ops-cicd SKILL.md description says "29 scripts" but table has 30 entries (2 jenkins-lib files) — minor count discrepancy in metadata, not a structural failure

No escalation needed.

## 2026-03-15 — unmassk-db plugin integrity verification (all 7 skills)

Full cross-reference audit of `/unmassk-db/skills/` against all 7 SKILL.md declarations.

**Result: 5 SKILLS PASS, 2 SKILLS FAIL.**

Counts confirmed:
- db-postgres: 22 references — all declared, all physical, all match. No scripts. PASS.
- db-mysql: 19 references — all declared, all physical, all match. No scripts. PASS.
- db-mongodb: 10 references — all declared, all physical, all match. No scripts. PASS. (routing table uses bare filenames without references/ prefix — format difference only)
- db-redis: 35 physical files, 34 declared in routing table. `redis-overview.md` is on disk and counted in frontmatter ("35 reference files") but missing from routing table. FAIL — dead reference file.
- db-migrations: 4 references + 4 scripts — all declared, all physical, all match. PASS.
- db-vector-rag: 5 references — all declared, all physical, all match. No scripts. PASS.
- db-schema-design: 5 references + 2 scripts — all declared, all physical, all match. PASS.

Syntax checks: all 6 .py files compile (python3 -m py_compile). Zero failures.
Path checks: all SKILL.md script blocks use `${CLAUDE_PLUGIN_ROOT}` — no absolute or relative paths.

Minor observations (not failures):
- `__pycache__/` dirs present in db-migrations and db-schema-design — build artifacts, not in SKILL.md (expected)

No escalation needed.

## 2026-03-15 — compliance-i18n skill content audit

Full read of all 10 reference files in `/unmassk-compliance/skills/compliance-i18n/references/`.

**Critical finding: SKILL.md is MISSING.** The directory contains only references, no frontmatter, no trigger declarations, no workflow. The skill cannot be invoked by any agent — it is structurally incomplete.

**Content reality: this is NOT a compliance skill. It is 100% localization tooling documentation for the "Better i18n" SaaS platform.** Zero regulatory, legal, or compliance content.

Reference files confirmed:
- `i18n-best-practices.md` — Master index/architecture overview + CDN URL structure + caching tables
- `getting-started.md` — Platform onboarding (account, project, i18n.config.ts, CLI scan, SDK install)
- `cli-usage.md` — CLI commands: scan, check/check:missing/check:unused, sync, push, pull + CI/CD + pre-commit hooks
- `key-management.md` — Key naming conventions, namespace patterns, translation status lifecycle, CRUD operations
- `ai-translation.md` — AI translation workflow, glossary management, ICU MessageFormat handling, batch translation, language-specific notes
- `github-sync.md` — GitHub App setup, AST-based key discovery, PR workflow, webhooks, conflict resolution
- `cdn-delivery.md` — Cloudflare CDN, URL structure, output formats (flat/nested/namespaced), caching headers, service worker
- `mcp-integration.md` — MCP server for Claude/Cursor: 10 tools (listProjects, getProject, getAllTranslations, listKeys, createKeys, updateKeys, deleteKeys, addLanguage, getPendingChanges, publishTranslations, getSyncs, getSync)
- `sdk-integration.md` — @better-i18n/next (Next.js/next-intl), @better-i18n/use-intl (React/Vite/TanStack Start), ICU MessageFormat, TypeScript support
- `best-practices.md` — ICU pluralization, gender/select, numbers/currency/dates, RTL, text expansion, accessibility, pseudo-localization testing

Scripts: NONE. No scripts in this skill.
Escalation: Ultron needs to create SKILL.md before this skill is usable.

## 2026-03-15 — Full toolkit capability map (all production plugins + agents)

Scanned all 47 production skills + 10 crew agents = 57 capability units across 11 plugins.

**Top 10 confirmed gaps** (nothing in toolkit covers these):
1. Backend framework skill (Node/Express/Fastify/Bun/Go — no framework patterns)
2. Authentication implementation skill (JWT, OAuth2/OIDC, sessions, RBAC — only audited, never built)
3. Frontend development skill (React/Next.js patterns, state management, forms, React Query)
4. API design skill (OpenAPI/Swagger, REST conventions, GraphQL, gRPC — entirely absent)
5. Payment integration skill (Stripe, subscriptions, webhooks — absent)
6. Email service skill (transactional email — Resend/Postmark/AWS SES + templating)
7. Serverless/PaaS deployment skill (Vercel, Railway, Fly.io, Cloudflare Workers — ops is K8s-only)
8. Application error tracking skill (Sentry, OpenTelemetry instrumentation — ops-observability is infra-only)
9. ORM/data access layer skill (Prisma, Drizzle, TypeORM — db plugin covers engines, not access layer)
10. Product analytics/event tracking skill (PostHog, Mixpanel — marketing assumes events exist, no one creates them)

**Structural anomaly confirmed**: `compliance-i18n` is a localization tooling skill (Better i18n SaaS), misclassified in the compliance plugin. SKILL.md now exists (was missing in earlier scan, created since). Content mismatch remains — it's a dev tooling skill, not a compliance skill.

**Coverage summary by phase**:
- Database: best-covered (7 skills, all engines)
- Compliance: deepest EU/Spanish coverage (9 skills)
- Ops/DevOps: enterprise-grade K8s/IaC (5 skills) but misses PaaS/serverless
- Marketing/SEO: well-covered (2 aggregate skills, ~27+ marketing capabilities)
- Frontend: design only — no development patterns
- Backend: workflow/audit only — no framework patterns
- Auth: audit only — no implementation
- API: entirely absent

No escalation to Argus/Moriarty/Cerberus needed — inventory scan only.

## 2026-03-15 — OmawaMapas external project technology scan

Scanned `/Users/unmassk/Workspace/omawamapas/` — a geospatial SPA for asbestos inventory management.

**Confirmed tech stack:**
- Backend: Node.js 22+ / Express 5 / TypeScript ESM / Knex (query builder) / pg (direct driver)
- Frontend: React 19 / Vite / TypeScript / Radix UI Themes / Mapbox GL JS / Turf.js / Axios / react-router-dom 7
- Database: PostgreSQL 17 + PostGIS 3.3/3.4 via Supabase (cloud, session pooler — eu-west-1)
- Cache: Upstash Redis (cloud, TLS — ioredis client)
- Auth: Mock headers in dev (X-Mock-User-ID / X-Mock-User-Role), JWT in production
- API docs: Swagger/OpenAPI (swagger-jsdoc + swagger-ui-express)
- Testing: Vitest + Supertest + Testing Library
- Monitoring: Sentry (@sentry/node 9.x + profiling)
- Rate limiting: express-rate-limit / Helmet / compression / opossum (circuit breaker)
- Hosting target: Supabase (DB) + Upstash (Redis) + AWS EC2/RDS/ElastiCache for staging/prod

**Toolkit skill matches:**
- db-postgres: DIRECT match — PostgreSQL + PostGIS, connection pooling, migrations (Knex), query optimization
- db-redis: DIRECT match — Redis cache layer (Upstash via ioredis), TTL management, cache.service.ts
- db-migrations: DIRECT match — Knex migrations in `backend/src/db/migrations/`
- db-schema-design: RELEVANT — schema.sql exists at root, PostGIS spatial types
- compliance-owasp: RELEVANT — OWASP Top 10 explicitly in CLAUDE.md, SQL injection/XSS guards
- compliance-gdpr: POTENTIALLY relevant — user data, roles, municipio data
- ops-observability: PARTIAL match — Sentry present but ops-observability is infra-level (Prometheus/Grafana), not app-level
- ops-iac: RELEVANT for AWS staging — EC2 + RDS + ElastiCache + ALB architecture planned

**Confirmed gaps in toolkit for this project:**
- No Sentry/application error tracking skill (app-level vs infra-level)
- No Mapbox GL JS / geospatial frontend skill
- No Supabase skill (connection pooler specifics, RLS, auto-pause behavior)
- No Knex/ORM skill (db plugin covers engines, not query builders)
- No React 19 / Vite frontend dev skill

No orphans or dead code investigated — technology inventory scan only.

## 2026-03-15 — OmawaMapas db/ deep trace (PostgreSQL schema + Knex + pool config)

Full trace of `/Users/unmassk/Workspace/omawamapas/backend/src/db/` + `/schema.sql` + connection pool config.

**Schema (source of truth: `/Users/unmassk/Workspace/omawamapas/schema.sql`):**
4 tables: `municipio`, `usuario`, `inventario_amianto`, `asignacion_tecnico_municipio`
PostGIS columns: `inventario_amianto.geom GEOMETRY(Geometry,4326)` and `municipio.geometria_limite GEOMETRY(MultiPolygon,4326)`
MVT function: `public.inventario_amianto_mvt(z,x,y,query_params)` — transforms to EPSG:3857, ST_TileEnvelope, ST_AsMVT

**Critical anomalies confirmed:**
1. PHANTOM TABLES in permissions + search modules — 5 tables queried that DON'T EXIST in schema.sql:
   - `usuarios` (plural) — used in permissions.access.service.ts, permissions.lookup.service.ts; real table is `usuario` (singular)
   - `layer_permissions` — used in permissions.assign/revoke/lookup/access/helpers
   - `spatial_layers` — JOIN'd from layer_permissions queries
   - `supervisor_municipio` — used in search.queries.usuarios.ts, search.queries.inventario.ts
   - `operador_municipio` — used in search.queries.usuarios.ts
   These modules will throw PostgreSQL UNDEFINED_TABLE (42P01) at runtime.

2. DUPLICATE INDEX on `asignacion_tecnico_municipio(usuario_id)`:
   - `idx_asignacion_tecnico_municipio_usuario` at line 539
   - `idx_asignacion_tecnico_municipio_usuario_id` at line 546
   Both are btree on the same column. One is redundant.

3. KNEX IS VESTIGIAL — Knex is installed and has a CLI script alias, but the single migration file (`20250507162238_initial_schema_setup.ts`) has completely empty `up()` and `down()`. The schema was deployed via `schema.sql` (pg_dump) and the MVT function via `create-mvt-function.ts`. Knex is not actually used for schema management.

4. `asignacion_tecnico_municipio` has `fecha_asignacion` column referenced in INSERT in permissions.assign.service.ts, but this column does NOT exist in schema.sql. Will fail at runtime.

**Connection pool config (pg direct driver, NOT Knex):**
- Max connections: env `DB_MAX_CONNECTIONS` (default: 20)
- Idle timeout: 30,000ms (hardcoded)
- Connection timeout: env `DB_CONNECTION_TIMEOUT_MS` (default: 5,000ms)
- Statement timeout: 30,000ms (hardcoded)
- Query timeout: env `DB_QUERY_TIMEOUT_MS` (default: 35,000ms)
- Idle-in-transaction timeout: 60,000ms (hardcoded)
- Keepalive: enabled, 10,000ms delay
- SSL: dev/test = rejectUnauthorized:false; prod = strict (provider-detected Supabase/AWS RDS)
- Telemetry: 60s periodic log; saturation alert at MAX_CONNECTIONS-2; waiting alert at 5+ queued

**Architecture: `database.ts` is the facade; `query-executor.ts` wraps all SQL execution.**
Most API modules import `query` from `config/database.js` (re-export) or `config/query-executor.js` directly.
Search and some permissions modules import from `config/database.js` (the re-export path).
Geo and most permissions modules import from `config/query-executor.js` directly.

Escalation: Cerberus/Argus should review permissions module for schema drift causing runtime failures.

## 2026-03-14 — cc-devops-skills ref-repo full inventory

Surveyed all 31 skills in `.ref-repos/cc-devops-skills/devops-skills-plugin/skills/`.
- 103 total script files (Python + shell), 63 reference files, 31 docs files (94 combined support docs)
- 6 skills have NO scripts: ansible-generator, azure-pipelines-generator, gitlab-ci-generator, k8s-yaml-generator, promql-generator, terragrunt-generator
- 14 script names are duplicated across skills (confirmed DIFFERENT implementations — not copies, except detect_crd.py between k8s-yaml-validator and helm-validator which diverged significantly)
- Heaviest scripts: jenkinsfile-generator (~1,900 lines + 1,014 line lib/), loki-config-generator (~1,900 lines), fluentbit-generator (~1,835 lines), terraform-validator (~1,331 lines)
- 3 skills use __pycache__/.pyc artifacts committed to repo: k8s-yaml-validator, loki-config-generator, promql-validator, terraform-validator
- fluentbit-generator has a committed output/ dir with 2 generated config files — likely stale test artifacts
- Domain grouping: IaC (terraform, terragrunt, ansible, helm, k8s-yaml, k8s-debug — 7 skills), CI/CD (github-actions, gitlab-ci, azure-pipelines, jenkins, makefile — 9 skills), Containers/K8s (dockerfile, helm, k8s-yaml, k8s-debug — 4 skills), Observability (promql, logql, loki, fluentbit — 8 skills), Scripting (bash-script, makefile — 3 skills)
- No orphan SKILL.md files found — all 31 dirs have a SKILL.md

## 2026-03-15 — OmawaMapas frontend/src deep trace (React 19 + Mapbox GL JS)

Full structural map of `/Users/unmassk/Workspace/omawamapas/frontend/src/`.

**Component hierarchy (top-down, confirmed):**
main.tsx → AuthProvider (AuthContext) → BrowserRouter → App → MainLayout → HomePage → MapContainer (components/MapContainer.tsx)
MapContainer orchestrates: MapInitializer, MapFeatureHandler, MapHoverHandler, MapCenterer, MapRestrictionHandler, MapDiagnostics, MapOverlay/LoadingSpinner, InfoPanel
InfoPanel → FloatingControls + (AmiantoVisorPanel or AmiantoGestorPanel based on isEditMode)
AmiantoVisorPanel → VisorPanel → BasePanel + tabs/ (IdentificacionTab, CaracteristicasTab, MaterialesTab, ActuacionTab)
AmiantoGestorPanel → GestorPanel → BasePanel + gestor-tabs/ (InfoBasicaTab, EdificioTab, MaterialesTab, RiesgoTab)

**State management (no global state lib):**
- AuthContext (React.createContext) — sole global state container: user, isAuthenticated, isLoading, login, logout
- All map state lives in MapContainer local state (map, selectedFeature, mapReady, authReady) via single-object useState
- No React Query, Zustand, Redux — pure React state + hooks
- Services: api.ts (Axios singleton) + municipioService + authService. Mock auth via localStorage + X-Mock-* headers — hardcoded userId=2, role='Tecnico'

**Mapbox GL JS integration (confirmed):**
- Worker URL: `mapbox-gl/dist/mapbox-gl-csp-worker.js?url` loaded via Vite's `?url` import in useMapUtils
- Map instance created in useMapUtils.initializeMap, passed up to MapContainer state via setMap callback
- Layer type used in production: ONLY 'fill' polygon (inventario-polygons) — addPointLayer, addLineLayer, addClusterLayer are defined but NOT consumed
- Tile source: pg_tileserv MVT endpoint `${VITE_TILESERV_URL}/public.inventario_amianto_mvt/{z}/{x}/{y}.pbf`
- Source layer ID: 'inventario_data' (matches backend MVT function confirmed)
- Service Worker registered in main.tsx for vector tile caching

**Confirmed orphans / dead code:**
1. `components/map/MapContainer.tsx` — a second MapContainer component. exports MapContainer. The real MapContainer is `components/MapContainer.tsx`. The map/MapContainer is re-exported from `components/map/index.ts` BUT is never imported by any consumer outside its own index. ORPHAN (exported but consumed by nobody).
2. `components/panels/amianto/visor-tabs/` — 4 tab files (IdentificacionTab, CaracteristicasTab, MaterialesTab, ActuacionTab). NEVER imported anywhere. AmiantoVisorPanel.tsx imports from `./tabs/`, not `./visor-tabs/`. CONFIRMED ORPHAN DIRECTORY (4 files, ~1,129 LOC total).
3. `components/panels/amianto/AmiantoVisorPanel.optimized.tsx` — alternative optimized version of AmiantoVisorPanel. Never imported by any consumer (panels/amianto/index.ts only exports AmiantoVisorPanel, not the .optimized variant). CONFIRMED ORPHAN.
4. `hooks/useMapFilters.ts` — exported from hooks/index.ts but never imported in any component or hook. CONFIRMED ORPHAN.
5. `utils/clusterLayers.ts` — never imported anywhere. CONFIRMED ORPHAN.
6. `utils/mapHelpers.ts` — never imported anywhere. CONFIRMED ORPHAN.
7. `utils/renderCounter.ts` — never imported anywhere. CONFIRMED ORPHAN.
8. `utils/performance-observer.ts` — never imported anywhere. CONFIRMED ORPHAN.
9. `src/mapbox-shim/index.ts` — never imported anywhere. CONFIRMED ORPHAN.
10. `src/mapbox-gl-worker-setup.ts` — never imported anywhere (worker setup done inline in useMapUtils via ?url import). CONFIRMED ORPHAN.
11. `useMapLayers`: returns addPointLayer, addLineLayer, addLayerControls, addClusterLayer, updateLayerFilter — ALL returned but only addPolygonLayer and addLegend are consumed by MapContainer. 5 exported functions are dead-wired.
12. `useMapUtils`: returns isPointInCurrentView — never consumed by any caller. Dead export from hook.
13. `services/api.ts`: exports clearMockAuthHeaders — never imported anywhere outside the file (AuthContext.tsx references it in a log comment string but never imports or calls it). CONFIRMED ORPHAN EXPORT.
14. `components/panels/KeyValuePair.tsx` — exported from panels/index.ts but never imported by any component. CONFIRMED ORPHAN.
15. `components/panels/amianto/StatusCard.tsx` — exported from amianto/index.ts but never imported by any component. CONFIRMED ORPHAN.
16. `components/panels/amianto/BaseInfoList.tsx` — same. CONFIRMED ORPHAN.
17. `components/panels/amianto/InventarioTable.tsx` — same. CONFIRMED ORPHAN.
18. `components/panels/amianto/QuickCreateForm.tsx` — same. CONFIRMED ORPHAN.

**Duplicate tab directory anomaly (confirmed):**
`tabs/` and `visor-tabs/` export the same 4 component names (IdentificacionTab etc) but are DIFFERENT implementations.
- tabs/ = richer/larger versions (1,017 LOC for IdentificacionTab alone) — these are what AmiantoVisorPanel actually uses
- visor-tabs/ = leaner versions (229 LOC for IdentificacionTab) — completely orphaned
This is a refactor remnant: visor-tabs/ was likely the old directory superseded by tabs/.

**Auth architecture reality:**
Auth is entirely mock-only. logout() does NOT clear credentials, it calls setMockAuthHeaders(2,'Tecnico') — which RE-SETS the mock user, not clears it. The app can never truly log out to an unauthenticated state. LoginPage.tsx exists as a route but its form has no onSubmit handler — it renders but does nothing.

**useMapEvents vs MapHoverHandler duplication:**
Both useMapEvents (called in MapContainer body) and MapHoverHandler (rendered as component) independently handle hover on 'inventario-polygons'. Both create Mapbox Popup instances on hover. This is CONFIRMED DOUBLE hover handling on the same layer.

**Performance bloat in production tree:**
PerformanceProfiler wraps are rendered in ALL production code paths (MapContainer, MapInitializer, MapFeatureHandler, MapHoverHandler, MapCenterer, MapDiagnostics, InfoPanel, AmiantoGestorPanel, AmiantoVisorPanel). PerfTest component (Shift+T debug tool) is rendered on every App mount. PerformanceMonitor (Shift+P debug tool) same. These are dev tools living in the production tree.
