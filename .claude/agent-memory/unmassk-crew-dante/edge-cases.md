---
name: omawamapas-search-edge-cases
description: Recurring edge cases for search module — LIKE injection, RBAC, parameterized SQL, pagination
type: project
---

## LIKE Pattern Injection (escapeLikePattern)
Three special chars to escape: `%` (wildcard), `_` (single-char wildcard), `\` (escape char).
Order matters: escape `\` FIRST, then `%`, then `_`.
Test: `%_\` -> `\%\_\\`
Double-application is NOT idempotent — `%` -> `\%` -> `\\\%`. Test this explicitly.
Adversarial payloads: `\%`, `\_`, `\\\`, `%_\%_\` (sequences of all three).

## Parameterized Query Assertions
SQL injection test pattern:
1. Assert payload is NOT in the SQL string
2. Assert escaped version of payload IS in the params array
3. Assert SQL contains `$\d+` placeholders

SQL injection payloads confirmed covered:
- `'; DROP TABLE municipio; --`
- `' OR '1'='1`
- `' UNION SELECT * FROM usuario --`
- `1; DELETE FROM inventario`
- `' AND 1=1 --`
- `test\\'; DROP TABLE --`

## ParamBuilder snapshot() for COUNT vs DATA
COUNT params = `pb.snapshot()` before adding relevance params.
DATA params = `pb.params()` which includes relevance + limit + offset added after snapshot.
This split is critical — asserting on COUNT params[0] for LIKE term, but DATA params[-2]/[-1]
for limit/offset.

## RBAC Roles (omawamapas)
Roles: `Coordinador`, `Supervisor`, `Operador`, `Tecnico`, `Municipio`, `Ciudadano`
User search access: only `Coordinador`, `Supervisor`, `Operador` (from SEARCH_USER_ACCESS_ROLES)
Inventory RBAC:
  - Coordinador: no restriction
  - Supervisor: subquery via `supervisor_municipio WHERE usuario_id = $N`
  - Operador: subquery via `operador_municipio` + `i.usuario_id` (userId appears TWICE in params)
  - Tecnico: `i.usuario_id` + `SELECT municipio_id FROM usuario` (userId appears TWICE)
  - Municipio: `SELECT municipio_id FROM usuario WHERE id = $N`
  - Unknown/Ciudadano: `1 = 0` (deny-all)

## Pagination Edge Cases
- offset = (page - 1) * limit
- Assert: `dataParams[-2]` = limit, `dataParams[-1]` = offset
- Zod caps page at 10000 (confirmed: `9999999` rejected)
- Large page (999999) produces large offset but stays within INT4_MAX

## INT4 Overflow Protection
PostgreSQL INT4_MAX = 2_147_483_647
municipioId, layerId capped at INT4_MAX by Zod schema
Test both INT4_MAX (accept) and INT4_MAX+1 (reject)

## Empty Term Behavior
When term is empty string: no LIKE condition added to SQL.
Assert: `countParams` does not contain any value starting with `%`.
