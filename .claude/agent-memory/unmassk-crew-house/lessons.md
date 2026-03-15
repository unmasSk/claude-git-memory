---
name: lessons
description: Failed hypotheses and investigation lessons to avoid repeating dead ends
type: feedback
---

## Lesson: Check ALL schema sources, not just schema.sql

When investigating schema-code divergence, check:
1. schema.sql (pg_dump of actual DB)
2. Migration files (may contain CREATE TABLE)
3. supabase_migration.sql (deployment SQL)
4. The migration runner config (Knex, etc.)

In omawamapas, the Knex migration was a no-op stub, and supabase_migration.sql matched schema.sql exactly. This confirmed that the missing tables were never created anywhere.
