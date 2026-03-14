# Enterprise Quality Standards

> Executable reference for AI agents. Binary rules (IF/THEN).
> Quality test: if two AIs read the same rule, they reach the same action.

---

## 1. Tier System

Every rule and finding has a tier. The tier determines whether it blocks merge.

| Tier | Scope | Blocks merge | Action |
|------|-------|--------------|--------|
| T1 | Security, data integrity, crashes | Yes, always | Immediate fix |
| T2 | Error handling, testing core, structure | Yes, unless written justification | Fix before merge |
| T3 | JSDoc, naming, cosmetics, extra coverage | No | Fix when convenient |

### Finding Classification by Tier

| Finding | Tier |
|---------|------|
| Concatenated SQL (injection) | T1 |
| Possible auth bypass | T1 |
| Hardcoded secret | T1 |
| Unhandled error that crashes process | T1 |
| Critical data without validation | T1 |
| Environment guard with blacklist (`!== 'production'`) | T1 |
| Generic `throw new Error()` in service | T2 |
| Level A service function without requestId | T2 |
| API module without happy path test | T2 |
| File >500 LOC without split | T2 |
| Manual validation instead of Zod | T2 |
| `console.log` in committed code | T2 |
| Excessive JSDoc on helper | T3 |
| Missing `performance.now()` on internal helper | T3 |
| Unused import | T3 |
| Naming inconsistent with project conventions | T3 |
| Coverage below target | T3 |

IF uncertain about tier THEN assign T2 (neither blocks everything nor gets ignored).

### Execution Priority (Business Order)

When multiple findings or tasks exist, execute in this order:

1. **Security** -- auth bypass, SQL injection, exposed secrets, broken guards
2. **Data integrity** -- validation, permissions, unprotected destructive operations
3. **Critical happy paths** -- main routes functioning without crash
4. **Structure and testing** -- typed error handling, API tests, file size limits
5. **Cleanup** -- JSDoc, naming, imports, cosmetics

IF a module has T1 security findings AND T3 JSDoc findings THEN fix security first. NEVER touch JSDoc while T1 findings remain open.

---

## 2. Core Principles

### SOLID

- **Single Responsibility**: one class/method = one job
- **Open/Closed**: open for extension, closed for modification
- **Liskov Substitution**: subtypes must be substitutable for base types
- **Interface Segregation**: many specific interfaces > one general
- **Dependency Inversion**: depend on abstractions, not concretions

### DRY (Don't Repeat Yourself)

Extract after 2nd duplication. IF pattern repeats 3+ times THEN abstraction is mandatory.

### KISS (Keep It Simple, Stupid)

The simplest solution that works. IF abstraction requires 4+ config params THEN too generic -- simplify.

### YAGNI (You Aren't Gonna Need It)

Only implement what is needed NOW. No speculative features, no "just in case" code.

### OWASP Top 10

| OWASP Risk | Project Rule | Tier |
|------------|-------------|------|
| A03: Injection (SQL) | All queries use $1/$2 parameterized. ORDER BY with column whitelist. Zero concatenation. | T1 |
| A01: Broken Access Control | Auth headers validated. Role hierarchy enforced. Mock headers blocked in production. | T1 |
| A02: Cryptographic Failures | Secrets never hardcoded, always via envConfig. Redis URLs sanitized in logs. | T1 |
| A04: Insecure Design | Environment guards use allowlist (`=== 'development'`), never blacklist (`!== 'production'`). | T1 |
| A05: Security Misconfiguration | CORS whitelist explicit, no wildcard in production. Helmet configured. | T1 |
| A07: Cross-Site Scripting (XSS) | No `innerHTML` with user data. | T1 |
| A08: Software Integrity | Rate limiting applied on all endpoints. | T2 |
| A09: Logging Failures | Generic error messages for 5xx in production. No stack traces in responses. | T2 |

---

## 3. File Size Limits

| Type | Hard limit | Sweet spot |
|------|-----------|------------|
| TypeScript file | 500 LOC | 200-300 |
| Exported function/method | 50 LOC | 15-30 |
| Internal helper function | 30 LOC | 10-20 |
| Nesting level | 3 max | 2 |
| Function parameters | 5 max | 3 (use object if more) |
| Test file | 500 LOC | 200-400 |
| Controller method | 50 LOC | 20-30 |
| React component | 300 LOC | 150-200 |
| CSS file | 800 LOC | 300-500 |

LOC = total lines of code (not executable-only).

```
IF file > 500 LOC THEN mandatory split (T2)
IF file 300-500 LOC AND has 2+ responsibilities THEN recommended split
IF file 300-500 LOC AND has 1 responsibility THEN do NOT split
IF file < 300 LOC THEN do NOT split
```

**What is "responsibility"** (binary definition):
IF all functions in the file need the same mocks in tests THEN 1 responsibility.
IF different groups need different mocks THEN 2+ responsibilities.

---

## 4. Project Context

| Key | Value |
|-----|-------|
| Backend stack | Node.js 22+ / Express 5 / TypeScript (ESM strict) |
| Frontend stack | React 18 / TypeScript / Vite |
| Database | PostgreSQL 17 + PostGIS 3.3 (Supabase cloud) |
| Cache | Upstash Redis (cloud) |
| Validation | Zod |
| Logging | Winston + Morgan |
| Testing | Vitest |
| Monitoring | Sentry |
| Auth (dev) | Mock headers (X-Mock-User-ID, X-Mock-User-Role) |
| Auth (prod) | JWT (pending full implementation) |

---

## 5. Mandatory Patterns

### 4.1 Service Layer: Exported Functions (NOT classes)

Service functions have two levels based on caller:

**Level A -- Entry point** (called directly by route handler):

| Requirement | Tier if missing |
|-------------|-----------------|
| `requestId` as parameter | T2 |
| `createLoggerWithContext` with requestId, service, action | T2 |
| `performance.now()` for duration | T3 |
| Duration log on completion | T3 |
| Typed errors from system classes (never generic `new Error()`) | T2 (T1 if leaks sensitive info or breaks security error handler) |
| Re-throw AppError without wrapping | T2 |

**Level B -- Internal helper** (called by another service function):

| Requirement | Tier if missing |
|-------------|-----------------|
| Typed errors if it throws | T1 |
| requestId only if it runs queries or has its own logging | T2 |
| Does NOT need its own logger | - |
| Does NOT need performance.now() | - |

**How to distinguish:**
IF function appears in a route handler THEN Level A.
IF function is called by another service function THEN Level B.
IF uncertain THEN Level B (less ceremony > more ceremony).

### 4.2 Route Handler

| Requirement | Tier if missing |
|-------------|-----------------|
| Rate limiter applied | T2 |
| Validation via Zod middleware (validateParams/Query/Body) | T2 |
| `try/catch` with `next(error)` | T1 |
| Extract requestId from typed req | T2 |
| NEVER `res.status(4xx).json()` direct (delegate to error handler) | T2 |

### 4.3 Error Handling

Use ALWAYS the system error classes (`utils/errors.ts`):

| Class | HTTP | Usage |
|-------|------|-------|
| `ValidationError` | 400 | Invalid input data |
| `AuthenticationError` | 401 | Missing or invalid token |
| `PermissionError` | 403 | No permissions for action |
| `NotFoundError` | 404 | Resource not found |
| `ConflictError` | 409 | Data conflict (unique constraint) |
| `DatabaseError` | 500 | Database error |
| `AppError` | variable | Generic application error |

IF service throws generic `new Error()` THEN finding T2.
IF route handler responds with `res.status().json()` directly THEN finding T2.

**Exception: boot-time initialization errors**
IF throw occurs during process initialization (before Express starts) THEN generic `new Error()` is acceptable -- `AppError` classes with HTTP status codes have no meaning outside the request lifecycle.

### 4.4 Zod Validation

Schemas in separate file `module.schemas.ts`. Always `.strict()`.

| Rule | Tier if missing |
|------|-----------------|
| `.strict()` on all object schemas | T2 |
| String-to-number transforms in params/query | T2 |
| Export inferred types | T3 |
| Schemas in separate file (not inline in routes) | T3 |

### 4.5 SQL Queries

| Rule | Tier |
|------|------|
| ALWAYS parameterized with $1, $2 | T1 |
| ORDER BY with column whitelist | T1 |
| PostGIS: store EPSG:4326, transform to 3857 only for MVT | T2 |
| `&&` operator (bbox) before ST_Intersects | T2 |

---

## 6. JSDoc Policy

### What to Document

| Element | JSDoc | Content |
|---------|-------|---------|
| Exported function with non-obvious params | Yes | 1-2 line description, @throws if applicable |
| Exported interface/type | Yes | Brief description |
| Non-obvious exported constant | Yes | Brief description |
| Internal helper | No | Only if logic is non-evident |
| Trivial getter/setter | No | Never |
| Function whose name already says it | No | `validateParams` needs no JSDoc |

### Prohibited Tags

NEVER use: `@audit`, `@security`, `@module`, `@file`, `@requires`.
NEVER use `@see` unless linking to a real external spec.
NEVER repeat TypeScript signature in JSDoc (`@param id: number - the id` is redundant).

### Tags to Remove

- `@description` (first line IS the description)
- `@param {Type}` (remove {Type}, keep `@param name - desc`)
- `@returns {Type}` (remove {Type}, keep `@returns desc`)
- `@returns {void}` (remove completely)
- `@function`, `@const`, `@interface`, `@property {Type}`, `@typedef`
- `@module`, `@file`, `@requires`, `@since`, `@see`
- `@audit` tags (temporary, remove when fix applied)
- File-level header blocks (remove entirely)
- JSDoc longer than the function it documents

### Tags to Keep

- `@throws` with description
- `@example` with code
- `@summary` (no type, 1 line)
- `@param name - description` (no type)
- `@returns description` (no type)

RULE: Maximum 4 lines of description. IF more is needed, the code is too complex -- refactor.
IF JSDoc has more lines than the function THEN finding T3.

---

## 7. Testing Policy

### What to Test by Module Type

**Security module** (auth, permissions, access middleware):

| Test | Tier |
|------|------|
| Happy path (valid access) | T2 |
| Missing token/header | T1 |
| Manipulated token/header | T1 |
| Privilege escalation (lower role, higher action) | T1 |
| Environment guards: mock headers blocked in prod | T1 |

**API module** (service + routes):

| Test | Tier |
|------|------|
| Happy path (successful flow) | T2 |
| Invalid input (Zod validation error) | T2 |
| Resource not found (404) | T2 |
| DB error (mock failed query) | T2 |
| Insufficient permissions | T1 if sensitive data, T2 if not |

**Utility module** (helpers, formatters, config):

| Test | Tier |
|------|------|
| Happy path | T3 |
| Input edge cases | T3 |

### What NOT to Test

- Getters without logic
- Re-exports from facades
- External library behavior (Zod, Express, Helmet)
- Every possible parameter combination (cover boundaries, not exhaustive)

### Test Quality Rules

| Rule | Tier |
|------|------|
| AAA pattern (Arrange-Act-Assert) | T3 |
| `vi.clearAllMocks()` in `beforeEach` | T2 |
| Auth mock in integration: `.set('X-Mock-User-ID', '1').set('X-Mock-User-Role', 'Coordinador')` | T2 |
| Mock logger to avoid output in tests | T3 |
| Tautological assertions (`expect(true).toBe(true)`) | T2 -- forbidden |
| Tests depending on execution order | T2 -- forbidden |
| Mocks replicating production logic | T2 -- forbidden |

### Singleton Reset for Tests

Modules with singletons (DB pool, Redis client, cache) must export `__resetForTests()` functions.
Prefix `__` indicates internal API for tests. NEVER call in production code.
Only export `__reset*` if the module has mutable state (singleton, cache, global Map).

---

## 8. Security

### Critical Data Traceability (T1)

For EACH critical datum that crosses the module:

1. **Where is it SENT?** (origin: client, service, config)
2. **Where is it CONSUMED?** (destination: middleware, service, route)
3. **Who BLOCKS it?** (validation, auth, sanitization)

IF no blocker exists THEN finding T1 CRITICAL.
IF data reaches production without validation THEN finding T1 CRITICAL.

Critical data = credentials, tokens, user IDs, roles, geolocation, SQL parameters.

### Security Checklist

| Rule | Verification | Tier |
|------|-------------|------|
| SQL injection | Parameterized queries ($1, $2) | T1 |
| XSS | No innerHTML with user data | T1 |
| Auth bypass | Mock headers blocked in prod | T1 |
| Secrets | Zero hardcoded, all via envConfig | T1 |
| CORS | Explicit whitelist, no wildcard in prod | T1 |
| Environment guards | Allowlist, not blacklist | T1 |
| Rate limiting | Applied on endpoints | T2 |
| Errors in prod | Generic messages for 5xx | T2 |
| Permissions | Validated in service layer | T1 |

### Roles

```
Coordinador > Supervisor > Tecnico > Municipio
```

Permissions inherit downward. Municipio requires `municipio_id` validated in Zod schema.

### Environment Guards

```typescript
// CORRECT: explicit allowlist
if (envConfig.NODE_ENV === 'development' || envConfig.NODE_ENV === 'test') {
  // development feature
}

// INCORRECT: fragile blacklist (staging, uat, prod1 slip through)
if (envConfig.NODE_ENV !== 'production') {
  // development feature
}
```

RULE: Guards ALWAYS with allowlist, never blacklist (T1).

---

## 9. Logging and Observability

### Format (Level A Functions)

```typescript
import { createLoggerWithContext } from '../../config/logger.js';

const contextLogger = createLoggerWithContext({
  requestId,
  service: 'inventario.service',
  action: 'findById',
});

contextLogger.info('Completado', { duration: durationMs, resultCount: results.length });
contextLogger.error('Error consultando DB', { error: error.message, duration: durationMs });
```

### Log Levels

| Level | Usage | Example |
|-------|-------|---------|
| `error` | Non-recoverable failure | DB down, crash |
| `warn` | Abnormal but recoverable | Rate limit, cache miss |
| `info` | Significant operations | Request completed, tile generated |
| `debug` | Troubleshooting detail | Params received, queries |

RULE: NEVER `console.log()` or `console.error()` (T2).

**Exception: boot-time logging**
IF logging occurs before Winston is available THEN a designated `bootLogger` using `console` is acceptable. The file must document explicitly why it does not use Winston.

### requestId Propagation

requestId is generated in `middleware/request-id.ts` and propagated to:
- Level A service functions (mandatory parameter)
- Logs (via createLoggerWithContext)
- Sentry (scope.setTag)
- Response header (X-Request-ID)

IF Level A function does not receive requestId THEN finding T2.
IF Level B function runs queries without requestId THEN finding T2.

---

## 10. Performance

### Thresholds

| Metric | Normal | Slow | Critical |
|--------|--------|------|----------|
| API response | <100ms | <500ms | >1000ms |
| SQL query | <100ms | <500ms | >1000ms |
| Tile generation | <200ms | <1000ms | >2000ms |

IF endpoint consistently exceeds "slow" THEN propose optimization (T2).

### PostGIS

| Rule | Tier |
|------|------|
| GIST indexes on geometry columns used in spatial queries | T2 |
| `&&` operator (bbox) BEFORE ST_Intersects | T2 |
| ST_Transform at the end, not in intermediates | T2 |
| ST_AsMVT with ST_AsMVTGeom for tiles | T2 |
| Simplification by zoom (ST_Simplify / ST_SnapToGrid) | T3 |

---

## 11. Decision Trees

### When to Split a File

```
IF file > 500 LOC
  THEN mandatory split (T2)

IF file 300-500 LOC AND has 2+ responsibilities
  THEN recommended split

IF file 300-500 LOC AND has 1 responsibility
  THEN do NOT split

IF file < 300 LOC
  THEN do NOT split
```

When splitting:
- Each resulting module < 300 LOC
- NEVER modules under 30 LOC (overhead > benefit)
- Facade re-export ONLY if existing external consumers exist
- NEVER extract function to own file if called only once (over-splitting)
- IF function used from only one place THEN keep it in the consuming file

### When to Extract to shared/utils

```
IF function used in 2 modules
  THEN note, do not extract yet

IF function used in 3+ modules
  THEN mandatory extraction to utils/ or shared/

IF type/interface used in 2+ modules
  THEN move to types/

IF helper specific to one module
  THEN keep it there (do not pollute utils/)
```

### When to Create Abstraction

```
IF pattern repeats 2 times
  THEN note the duplication, do not abstract

IF pattern repeats 3+ times
  THEN mandatory abstraction

IF abstraction requires 4+ config params
  THEN too generic, simplify

IF abstraction saves <5 LOC per use
  THEN repeated code is clearer
```

### When to Refactor vs Leave Alone

```
IF works + has tests + under limits
  THEN do NOT touch (do not refactor for aesthetics)

IF works but violates T1 rule
  THEN mandatory fix

IF works but violates T2 rule
  THEN report, propose fix

IF works but violates T3 rule
  THEN report, optional fix

IF duplication 3+
  THEN propose abstraction with before/after

IF change affects auth/permissions/data
  THEN STOP, request confirmation
```

---

## 12. Anti-Patterns

Real errors from existing code. Reference of what NOT to do.

### 11.1 Duplicated instanceof Chain

```typescript
// ANTI-PATTERN: 10 identical blocks with instanceof
if (err instanceof ValidationError) {
  logger.warn(`Error: ${err.message}`, { requestId });
  res.status(err.statusCode).json(createErrorResponse({ ... }));
  return true;
}
if (err instanceof AuthenticationError) {
  // ... identical block
}

// FIX: Map of error class to config, single handler
const ERROR_HANDLERS = new Map<Function, { level: 'warn' | 'error' }>([
  [ValidationError, { level: 'warn' }],
  [AuthenticationError, { level: 'warn' }],
]);

for (const [ErrorClass, config] of ERROR_HANDLERS) {
  if (err instanceof ErrorClass) {
    contextLogger[config.level](`Error: ${err.message}`, { requestId });
    res.status(err.statusCode).json(createErrorResponse({ ... }));
    return true;
  }
}
```

### 11.2 JSDoc as Decoration

```typescript
// ANTI-PATTERN: more comment than code
/**
 * @description Handles request without Origin header
 * @param {CorsOriginCallback} callback - CORS callback
 * @audit FIX-SRP-006: Extracted from createOriginValidator
 */
export function handleNoOrigin(callback: CorsOriginCallback): void {

// FIX: TypeScript already types the parameters
/** Accepts requests without Origin (same-origin, curl, etc). */
export function handleNoOrigin(callback: CorsOriginCallback): void {
```

### 11.3 Over-Splitting (Excessive Granularity)

Split when the module has its own entity (>30 LOC, responsibility that can grow). Not by dogmatic SRP.

### 11.4 Unnecessary Deep Freeze

```typescript
// ANTI-PATTERN: deepFreeze runtime for object nobody mutates
function deepFreeze<T>(obj: T): Readonly<T> { ... } // 15 LOC
const CONFIG = deepFreeze({ ... });

// FIX: as const (compile-time, zero runtime overhead)
const CONFIG = { ... } as const;
```

### 11.5 Duplicated validate* Functions

```typescript
// ANTI-PATTERN: 3 identical functions changing only req.body/query/params

// FIX: one parameterized function
const createValidator = (section: 'body' | 'query' | 'params') =>
  <T extends ZodSchema>(schema: T) =>
    (req: Request, res: Response, next: NextFunction) => {
      try {
        req[section] = schema.parse(req[section]);
        next();
      } catch (error) {
        handleValidationError(context, error, req, res, next);
      }
    };

export const validateBody = createValidator('body');
export const validateQuery = createValidator('query');
export const validateParams = createValidator('params');
```

### 11.6 Permanent @audit Tags

```typescript
// ANTI-PATTERN: audit tags as permanent documentation
/** @audit FIX-SRP-007: Extracted from createOriginValidator */
/** @security CRIT-CORS-001: Normalization prevents bypass */
```

Audit tags are temporary. Once the fix is applied, remove them. Git preserves history.

---

## 13. Error Response Contract

Every API error response follows the contract defined in `middleware/error.handler.types.ts`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | `'error'` | Yes | Always the string literal `'error'` |
| `message` | `string` | Yes | Human-readable message for consumer |
| `requestId` | `string` | Yes | Request UUID (traceability) |
| `error` | `string` | No | Brief technical error description |
| `errors` | `Array<{ field, message, code? }>` | No | Zod validation error list |
| `errorCode` | `string` | No | Internal error class code (e.g., `NOT_FOUND`) |
| `errorId` | `string` | No | Sentry ID if error was reported |
| `details` | `Record<string, unknown>` | No | Additional details (sanitized by environment) |

**Sanitization rule**: Production shows only whitelisted fields (`validationErrors`). Dev/Test shows everything except `originalError`.

IF creating a new endpoint THEN error response MUST follow this contract. NEVER build error JSON manually -- delegate to `next(error)` and the global error handler.

IF error is 5xx and `NODE_ENV === 'production'` THEN message is replaced with generic text. NEVER filter `details` manually -- `safeDetailsForClient` does it automatically.

---

## 14. Dependency Policy

IF functionality can be solved in <30 LOC THEN implement it in the project. NEVER add a dependency for something trivial.

| Rule | Tier |
|------|------|
| Dependency for trivial functionality (left-pad, isEven) | T2 |
| Dependency without TypeScript types (nor `@types/*`) | T2 |
| `npm install` without `--save` or `--save-dev` explicit | T3 |
| Private fork of OSS library without justification | T2 |
| `npm audit` with HIGH/CRITICAL vulnerabilities before merge | T2 |
| Dependency with HIGH/CRITICAL CVE and no patch available | T1 |

---

## 15. Environment Variables

EVERY environment variable MUST be validated by `envConfig` (defined in `config/env.validator.ts`).

```typescript
// CORRECT: access via validated envConfig
import { envConfig } from '../config/env.validator.js';
const port = envConfig.PORT;

// INCORRECT: direct access -- NEVER in application code
const port = process.env.PORT;
```

| Rule | Tier |
|------|------|
| Direct `process.env` in application code (services, middleware, routes) | T2 |
| New variable without Zod schema in `env/schema.ts` | T2 |
| New variable without entry in `.env.example` | T3 |
| Secret without entropy validation | T2 |

**Permitted exceptions**: `config/env/*.ts` (the validator itself), `config/logger/*.ts` (terminal detection), `scripts/*.ts` (standalone CLI), `**/__tests__/*.ts` (test scenarios).

---

## 16. Rate Limiting

### Decision Tree

```
IF auth endpoint (login, register)
  THEN windowMs = 5 min, max = 5 req/window

IF password reset endpoint
  THEN windowMs = 1 hour, max = 3 req/window

IF tiles / high-frequency endpoint (zoom, pan)
  THEN windowMs = 5 min, max = 500 req/window

IF general API endpoint (CRUD, queries)
  THEN use defaults: windowMs = 15 min, max = 100 (prod) / 1000 (dev)

IF critical/destructive operations (bulk DELETE, bulk UPDATE)
  THEN windowMs = 5 min, max = 50 req/window (STRICT)
```

| Rule | Tier |
|------|------|
| New endpoint without rate limiter | T2 |
| Auth endpoint without strict rate limiter | T1 |
| Custom limit with magic numbers (use `RATE_LIMIT_CONFIG` constants) | T2 |

### Behavior by Environment

| Environment | Effect |
|-------------|--------|
| `test` | Rate limiting disabled |
| `development` | Private/local IPs exempt; high limit (1000 req) |
| `production` | Strict limits; all IPs controlled |

---

## 17. Cache Strategy (Redis)

IF cache is needed in a new module THEN use `saveToCache()` / `getFromCache()` from `services/cache.service.ts`. NEVER call `getRedisClient().set()` directly.

### Key Naming Convention

Pattern: `{domain}:{entity-or-operation}:{specific-identifiers}`

IF new key does not follow `domain:entity:id` pattern THEN finding T3.
IF key contains sensitive data (tokens, passwords) THEN finding T1.

### TTL Guidelines

```
CACHE:
  IF reference data that changes rarely (municipios, layers, catastro) THEN long cache (1h-7d)
  IF expensive geospatial operations (tiles, buffer, intersect) THEN medium cache (15min-24h)
  IF search results / nearby THEN short cache (5-15min)
  IF user permissions THEN medium cache (30min-1h)

DO NOT CACHE:
  IF write operation (POST, PUT, DELETE) THEN NEVER cache response
  IF sensitive data (tokens, credentials) THEN NEVER in Redis
  IF data that changes every request (timestamps, counters) THEN pointless
```

### Fail-Open Pattern

Cache service implements fail-open: if Redis is unavailable, a warning is logged and execution continues without cache. A Redis failure must NOT bring down the API.

| Rule | Tier |
|------|------|
| Fail-open: if Redis fails, main operation must NOT fail | T2 |
| NEVER `flushdb()` in production | T1 |
| Custom TTL with inline magic number | T3 (use constant if repeated 2+ times) |
| Cache of sensitive data in Redis | T1 |
| Read endpoint without cache when operation is costly (>200ms) | T3 |

---

## 18. Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Variables/functions | camelCase | `getUserById` |
| Classes/interfaces/types | PascalCase | `AuthUser`, `TileParams` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES` |
| Module files | kebab-case | `error-handler.middleware.ts` |
| Test files | `*.test.ts` | `tiles.service.test.ts` |
| Directories | kebab-case | `query-executor/` |
| Zod schemas | PascalCase + Schema | `TileParamsSchema` |
| Zod types | PascalCase + Input/Output | `CreateInventarioInput` |

### Language in Code

| Element | Language |
|---------|----------|
| Comments and JSDoc | Spanish |
| Variable/function names | English (camelCase) |
| User-facing error messages | Spanish |
| Log messages | Spanish |
| TODO/FIXME/STUB | Spanish |

RULE: do not mix languages within the same file. Comments always in Spanish. Identifiers always in English. Violation = T3.

---

## 19. Code Format

| Rule | Value |
|------|-------|
| Semicolons | Required |
| Quotes | Single |
| Indentation | 2 spaces |
| Max line length | 100 characters |
| Trailing commas | Required in multiline |
| Imports | Grouped: 1) external, 2) internal |
| Relative imports | ALWAYS with `.js` extension (ESM requirement) |
| Type-only imports | Use `import type` when import is used only as type |

---

## 20. Existing Infrastructure (DO NOT Duplicate)

| Feature | Location | API |
|---------|----------|-----|
| Zod validation | `middleware/validation.middleware.ts` | `validateParams()`, `validateQuery()`, `validateBody()` |
| Rate limiting | `middleware/rate-limit.middleware.ts` | `getRateLimitMiddleware()`, `RATE_LIMIT_CONFIG` |
| Error handling | `middleware/error.handler.middleware.ts` | Global centralized middleware |
| Request ID | `middleware/request-id.ts` | UUID per request, `X-Request-ID` header |
| Logging | `config/logger.ts` | `createLoggerWithContext()` |
| Database | `config/database.ts` | `query()` parameterized |
| Redis | `config/redis.ts` | `getRedisClient()` |
| Error classes | `utils/errors.ts` | `DatabaseError`, `ValidationError`, `PermissionError`, etc. |

IF a function already exists in this table THEN use it. NEVER create a custom version.

---

## 21. Reference Model Files

These files represent the target quality level. Copy structure for new modules.

| File | Why it is a model |
|------|-------------------|
| `backend/src/api/tiles/tiles.service.ts` | Service with metrics, logging, error handling |
| `backend/src/api/tiles/tiles.schemas.ts` | Zod with string-to-number transform, exported types |
| `backend/src/api/tiles/tiles.routes.ts` | Routes with rate limiting, validation, OpenAPI |
| `backend/src/config/morgan/skip.ts` | Perfect SRP: ~26 executable LOC, one responsibility |

---

## 22. Audit Scoring

### Closed Checklist by Dimension

#### Security (x3)

- [ ] SQL: all queries use $1/$2 parameterized (0 concatenation)
- [ ] Environment guards: allowlist (`=== 'production'`), NOT blacklist
- [ ] Secrets: never logged in clear (Redis URLs sanitized, tokens not in logs)
- [ ] Auth bypass: no routes skip permission validation
- [ ] Input validation: user data validated with Zod before use
- [ ] Cast `as any` / `as Type`: only with documented justification

#### Error Handling (x3)

- [ ] Typed errors: uses system classes (AuthenticationError, DatabaseError, etc.), NOT `throw new Error()`
- [ ] Routes/middleware: errors delegated with `next(error)`, NOT `res.status(500).json()` direct
- [ ] try/catch: all async service functions have catch with logging
- [ ] Contextual logging: errors logged with context (userId, requestId, operation)
- [ ] Correct re-throw: errors not silently swallowed (except intentional cache invalidation)

#### Structure (x2)

- [ ] LOC < 500 per file (HARD LIMIT)
- [ ] Functions < 50 LOC
- [ ] Factory pattern: exported functions, NOT classes in service layer
- [ ] Level A service: receives requestId (optional ok) and creates contextLogger
- [ ] Separation: types in .types.ts files, queries separated, helpers extracted
- [ ] No significant duplication (same logic in 2+ places without abstraction)
- [ ] Imports: no circular, with .js extension

#### Testing (x2)

- [ ] Tests exist for ALL files with business logic
- [ ] Tests pass 100% (run 2 times)
- [ ] Real assertions (not tautological)
- [ ] Happy path + error paths covered
- [ ] NOTE: stub/pending files do NOT penalize for missing dedicated tests

#### Maintainability (x1)

- [ ] JSDoc: conforms to section 5 (no @description, no @param {Type}, no @returns {Type}, no @requires)
- [ ] Comments in Spanish
- [ ] Named constants (no magic numbers/strings)
- [ ] No dead code, console.log, debugger, unused imports
- [ ] No emojis in log messages (descriptive text)

### Scoring Rules

- Each dimension is scored 0-10 based ONLY on checklist items
- 10/10 = all items pass
- 9/10 = 1 item fails or has minor finding
- 8/10 = 2+ items fail
- <8/10 = serious problems
- Do NOT invent criteria outside the checklist
- IF something works correctly and violates no checklist item THEN it is NOT a finding

### Weighted Score Calculation

| Dimension | Score | Weight | Total |
|-----------|-------|--------|-------|
| Security | X/10 | x3 | XX |
| Error Handling | X/10 | x3 | XX |
| Structure | X/10 | x2 | XX |
| Testing | X/10 | x2 | XX |
| Maintainability | X/10 | x1 | XX |
| **TOTAL** | | | **XX/110** |

---

## 23. Severities

| Severity | Definition | Typical tier |
|----------|-----------|--------------|
| CRITICAL | Security risk or data loss in production | T1 |
| HIGH | Violates hard standard rule, potential bug | T1-T2 |
| MEDIUM | Reduces maintainability or violates recommendation | T2 |
| LOW | Minor improvement | T3 |
| INFO | Observation without required action | - |

IF finding is HIGH and unclear whether T1 or T2:
- Affects security/auth/data THEN T1.
- Affects structure/testing/patterns THEN T2.

---

## 24. Universal Prohibitions

| Never | Tier |
|-------|------|
| `console.log` / `debugger` in commits | T2 |
| Inline styles / `onclick=""` | T2 |
| SQL concatenation | T1 |
| `innerHTML` with user data | T1 |
| `any` without justification in comment | T2 |
| Bulk DELETE or DELETE without parameterized WHERE | T1 |
| Magic numbers/strings in config/security/timeouts | T2 |
| Magic numbers/strings in general logic | T3 |
| `as Type` without type guard | T2 |
| `!` (non-null assertion) without justification | T2 |
| `// @ts-ignore` without reason | T2 |
| Test depending on execution order | T2 |
| Mock replicating production logic | T2 |
| Direct commit to main/staging (only via Pull Request) | Blocked |
