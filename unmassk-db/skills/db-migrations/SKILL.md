---
name: db-migrations
description: >
  Use when the user asks to "create migration", "rollback migration",
  "zero-downtime migration", "schema evolution", "expand-contract pattern",
  "database migration strategy", "data reconciliation", "blue-green migration",
  or mentions any of: migration, rollback, schema evolution, expand-contract,
  dual write, CDC, change data capture, strangler fig, canary migration,
  blue-green deployment database, data reconciliation, backfill,
  migration planner, rollback strategy, compatibility check.
  Use this for planning zero-downtime database migrations with expand-contract
  patterns, generating rollback strategies, validating schema compatibility,
  reconciling data between old and new schemas, and executing phased
  migration plans with validation gates. Includes 4 Python scripts
  for migration planning, rollback generation, compatibility checking,
  and migration code generation. 4 reference files cover zero-downtime
  techniques, migration pattern catalog, and data reconciliation strategies.
  Based on claude-skills engineering/migration-architect by alirezarezvani (MIT).
version: 1.0.0
---

# Migrations -- Zero-Downtime Database Migration Toolkit

## References

| File | Topic |
|------|-------|
| `references/migration-patterns.md` | Core patterns: expand-contract, parallel schema, strangler fig, CDC |
| `references/migration-zero-downtime.md` | Multi-phase schema evolution, online DDL, chunked data migration |
| `references/migration-patterns-catalog.md` | Pattern selection matrix, anti-patterns, service migration patterns |
| `references/migration-data-reconciliation.md` | Detecting inconsistencies, row count validation, delta detection, correction |

## Scripts

| Script | What it does |
|--------|-------------|
| `${CLAUDE_PLUGIN_ROOT}/skills/db-migrations/scripts/migration_planner.py` | Generates phased migration plan with validation gates from config |
| `${CLAUDE_PLUGIN_ROOT}/skills/db-migrations/scripts/rollback_generator.py` | Generates rollback procedures for each migration phase |
| `${CLAUDE_PLUGIN_ROOT}/skills/db-migrations/scripts/compatibility_checker.py` | Validates schema compatibility between old and new versions |
| `${CLAUDE_PLUGIN_ROOT}/skills/db-migrations/scripts/migration_generator.py` | Generates migration SQL/code from schema diff |

## Routing

| User asks about | Load these references |
|-----------------|----------------------|
| Zero-downtime schema changes | migration-patterns, migration-zero-downtime |
| Pattern selection (which approach to use) | migration-patterns-catalog |
| Data consistency after migration | migration-data-reconciliation |
| Rollback strategy | migration-patterns, migration-patterns-catalog |
| Blue-green, canary deployments | migration-zero-downtime, migration-patterns-catalog |

## Workflow

1. Identify migration type: schema-only, data-only, or combined.
2. Select pattern from catalog based on risk tolerance and downtime window.
3. Generate phased plan with `migration_planner.py` if config is available.
4. Validate compatibility with `compatibility_checker.py` before executing.
5. Execute expand phase, then dual-write, then backfill, then contract.
6. Run `migration-data-reconciliation` checks between phases.
7. Generate and test rollback with `rollback_generator.py` before each phase.

## Key Principles

- Every migration step must have a tested rollback procedure.
- Validate data consistency at each checkpoint — not only at the end.
- Zero-downtime requires backward compatibility during the entire transition window.
- Big-bang migrations are an anti-pattern. Break into phases with gates.

## Scope Boundaries

- **db-mysql**: MySQL-specific DDL mechanics (ALGORITHM, LOCK options)
- **db-postgres**: PostgreSQL-specific online DDL (`CREATE INDEX CONCURRENTLY`)
- **db-schema-design**: Schema normalization and design decisions
