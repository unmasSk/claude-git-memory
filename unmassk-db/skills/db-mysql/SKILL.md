---
name: db-mysql
description: >
  Use when the user asks to "design MySQL schema", "optimize MySQL query",
  "configure MySQL replication", "MySQL indexing", "InnoDB tuning",
  "MySQL partitioning", "MySQL security",
  or mentions any of: MySQL, MariaDB, InnoDB, MyISAM, mysqldump,
  MySQL replication, binlog, slow query log, EXPLAIN, MySQL 8,
  MySQL optimizer, foreign keys MySQL, stored procedures MySQL.
  Use this for designing MySQL schemas, optimizing queries with
  EXPLAIN and index analysis, configuring replication and high
  availability, InnoDB tuning, and MySQL security hardening.
  19 reference files from database-skills by PlanetScale (MIT).
  Based on database-skills by PlanetScale (MIT).
version: 1.0.0
---

# MySQL -- Schema Design and Query Optimization

## References

| File | Topic |
|------|-------|
| `references/mysql-overview.md` | Workflow, schema rules, guardrails |
| `references/mysql-primary-keys.md` | Clustered index, BIGINT vs UUID, auto-increment |
| `references/mysql-data-types.md` | Numeric, string, date/time, JSON, generated columns |
| `references/mysql-character-sets.md` | utf8mb4, collations, migration from utf8mb3 |
| `references/mysql-json-column-patterns.md` | JSON storage, generated column indexes, pitfalls |
| `references/mysql-composite-indexes.md` | Leftmost prefix, equality-before-range, sort order |
| `references/mysql-covering-indexes.md` | Index-only scans, ICP vs covering, write amplification |
| `references/mysql-fulltext-indexes.md` | FULLTEXT setup, boolean mode, min token size |
| `references/mysql-index-maintenance.md` | Unused indexes, redundant indexes, INVISIBLE indexes |
| `references/mysql-explain-analysis.md` | Access types, Extra flags, key_len, EXPLAIN ANALYZE |
| `references/mysql-query-optimization-pitfalls.md` | Non-sargable predicates, OR rewrites, OFFSET pagination |
| `references/mysql-n-plus-one.md` | ORM eager loading, batch IN queries, joins vs separate queries |
| `references/mysql-isolation-levels.md` | REPEATABLE READ, READ COMMITTED, SERIALIZABLE |
| `references/mysql-deadlocks.md` | Causes, diagnosis, retry pattern (error 1213) |
| `references/mysql-row-locking-gotchas.md` | Next-key locks, gap locks, index-less UPDATE |
| `references/mysql-partitioning.md` | RANGE/LIST/HASH, partition pruning, foreign key restriction |
| `references/mysql-online-ddl.md` | INSTANT/INPLACE/COPY, pt-osc, gh-ost |
| `references/mysql-connection-management.md` | max_connections, pool sizing, idle timeouts, ProxySQL |
| `references/mysql-replication-lag.md` | Detecting lag, GTID wait, semi-sync, replication pitfalls |

## Routing

| User asks about | Load these references |
|-----------------|----------------------|
| Schema design, types | overview, primary-keys, data-types, character-sets |
| JSON storage | json-column-patterns |
| Index design | composite-indexes, covering-indexes, fulltext-indexes |
| Index audit/cleanup | index-maintenance |
| Slow queries, EXPLAIN | explain-analysis, query-optimization-pitfalls, n-plus-one |
| Transactions, locking | isolation-levels, deadlocks, row-locking-gotchas |
| Large tables, retention | partitioning |
| Schema changes, migrations | online-ddl |
| Connections, pooling | connection-management |
| Replication, HA | replication-lag |

## Scope Boundaries

- **db-postgres**: PostgreSQL-specific features (MVCC, VACUUM, TimescaleDB, PostGIS)
- **db-migrations**: Zero-downtime migration patterns and tooling beyond DDL
- **db-vector-rag**: RAG pipelines and vector search
- **db-schema-design**: Database-agnostic normalization and schema modeling
