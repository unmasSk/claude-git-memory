---
name: db-schema-design
description: >
  Use when the user asks to "design database schema", "normalize schema",
  "database selection", "ERD diagram", "index strategy",
  "row-level security", "seed data", "schema analysis",
  or mentions any of: schema design, normalization, 1NF, 2NF, 3NF, BCNF,
  denormalization, ERD, entity relationship, database selection,
  SQL vs NoSQL, index strategy, covering index, composite index,
  partial index, RLS, row-level security, seed data, fixtures.
  Use this for designing database schemas from requirements with
  normalization analysis (1NF through BCNF), selecting the right
  database technology for the use case, creating index strategies,
  implementing row-level security policies, generating ERD diagrams,
  and analyzing existing schemas for optimization opportunities.
  Includes 2 Python scripts for schema analysis and index optimization.
  5 reference files from claude-skills by alirezarezvani (MIT).
  Based on claude-skills by alirezarezvani (MIT).
version: 1.0.0
---

# Schema Design -- Database Modeling and Optimization

## References

| File | Topic |
|------|-------|
| `references/schema-designer-workflow.md` | Schema design process, RLS policies, seed data, ERD generation, common pitfalls |
| `references/schema-normalization-guide.md` | 1NF through BCNF with examples, denormalization patterns, trade-offs |
| `references/schema-normalization-forms.md` | Normalization forms reference, index patterns, data modeling (star, snowflake, graph) |
| `references/schema-index-strategies.md` | B-tree, hash, partial, covering, functional indexes, composite column ordering |
| `references/schema-database-selection.md` | Database selection decision tree, category deep-dive, selection checklist |

## Scripts

| Script | What it does |
|--------|-------------|
| `${CLAUDE_PLUGIN_ROOT}/skills/db-schema-design/scripts/schema_analyzer.py` | Analyzes DDL for normalization compliance, constraint validation, naming conventions, produces ERD |
| `${CLAUDE_PLUGIN_ROOT}/skills/db-schema-design/scripts/index_optimizer.py` | Analyzes schema + query patterns, detects missing/redundant indexes, outputs CREATE INDEX statements |

## Routing

| User asks about | Load these references |
|-----------------|----------------------|
| Schema design from requirements | schema-designer-workflow |
| Normalization, 1NF/2NF/3NF/BCNF | schema-normalization-guide, schema-normalization-forms |
| Which database to use | schema-database-selection |
| Index design (which indexes to create) | schema-index-strategies |
| RLS, multi-tenancy, soft deletes | schema-designer-workflow |
| ERD, entity relationships | schema-designer-workflow |
| Schema audit/analysis | schema-normalization-guide, schema-index-strategies |

## Design Process

1. **Requirements → Entities:** Extract entities and relationships from requirements.
2. **Normalize to 3NF:** Eliminate partial and transitive dependencies.
3. **Add cross-cutting concerns:** Multi-tenancy (org_id), soft deletes (deleted_at), audit trail (created_at, updated_at, created_by).
4. **Index strategy:** Index every FK, add composite indexes for common query patterns, partial indexes for filtered queries.
5. **RLS policies:** Implement row-level security at the database layer for multi-tenant apps.
6. **Validate with schema_analyzer.py** if DDL is available.

## Key Rules

- Every FK column must have an index.
- Use `deleted_at TIMESTAMPTZ` for soft deletes — add `WHERE deleted_at IS NULL` partial indexes.
- Never use email, slug, or mutable values as PKs — use UUID/CUID/BIGINT AUTO_INCREMENT.
- Adding `NOT NULL` without a default to an existing table requires migration planning.
- Test RLS policies with a non-superuser role before deploying.
- Denormalize only for measured hot paths — start normalized, optimize later.

## Scope Boundaries

- **db-mysql**: MySQL-specific DDL, InnoDB mechanics, EXPLAIN analysis
- **db-postgres**: PostgreSQL-specific features (MVCC, VACUUM, partitioning, pgvector)
- **db-migrations**: Zero-downtime migration patterns for changing existing schemas
- **db-vector-rag**: Vector/embedding schema considerations
