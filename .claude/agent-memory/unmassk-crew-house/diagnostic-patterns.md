---
name: diagnostic-patterns
description: Recurring root cause patterns found during investigations in omawamapas and related projects
type: reference
---

## Pattern: Schema-Code Divergence (Phantom Tables)

**Project:** omawamapas
**First seen:** 2026-03-15

Code references tables that do not exist in schema.sql or any migration file. Root cause: code was written against an aspirational/planned schema that was never migrated into the database. The schema.sql is a pg_dump of the ACTUAL database; the code was authored (likely by AI agents during audit rounds) assuming tables that would exist in a future state.

**Detection:** grep for FROM/JOIN/INTO + table name, then verify against schema.sql CREATE TABLE statements.

**Affected tables (as of 2026-03-15):**
- `usuarios` (code uses plural; DB has singular `usuario`)
- `layer_permissions` (no CREATE TABLE anywhere)
- `spatial_layers` (no CREATE TABLE anywhere)
- `supervisor_municipio` (no CREATE TABLE anywhere)
- `operador_municipio` (no CREATE TABLE anywhere)
- `inventario` (code uses short form; DB has `inventario_amianto`)
- `capa` (no CREATE TABLE anywhere)
- `eventos` (no CREATE TABLE anywhere)

**Key insight:** The initial Knex migration (`20250507162238_initial_schema_setup.ts`) is a no-op stub (empty up/down). All schema was created via raw SQL (supabase_migration.sql or direct pg_dump). Code modules were built by audit agents without verifying against actual DB state.
