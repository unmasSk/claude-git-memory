---
name: db-postgres
description: >
  Use when the user asks to "design PostgreSQL schema", "optimize Postgres query",
  "create index strategy", "configure TimescaleDB", "set up pgvector",
  "full-text search Postgres", "PostGIS tables", "VACUUM tuning",
  "MVCC troubleshooting", "partitioning", "connection pooling",
  or mentions any of: PostgreSQL, Postgres, pg, psql, EXPLAIN ANALYZE,
  pg_stat, VACUUM, MVCC, WAL, replication, pgvector, PostGIS,
  TimescaleDB, hypertable, full-text search, tsvector, GIN index,
  BRIN index, partitioning, RLS, row-level security, pg_catalog,
  connection pooling, PgBouncer, dead tuples, XID wraparound,
  JSONB, generated always as identity, composite index, covering index.
  Use this for designing production-ready PostgreSQL schemas with proper
  data types, constraints, and indexing strategies, optimizing query
  performance with EXPLAIN ANALYZE and index gap analysis, configuring
  TimescaleDB for time-series workloads (hypertables, continuous
  aggregates), implementing semantic search with pgvector (HNSW, IVF),
  building hybrid text search with tsvector and trigrams, designing
  spatial tables with PostGIS, and tuning VACUUM and MVCC for
  high-throughput environments. 22 reference files from pg-aiguide
  by Timescale (MIT) and database-skills by PlanetScale (MIT).
  Based on pg-aiguide by Timescale (MIT) and database-skills by PlanetScale (MIT).
version: 1.0.0
---

# PostgreSQL -- Schema Design, Query Optimization, and Extensions

## References

| File | Topic |
|------|-------|
| `references/postgres-schema-design.md` | Primary keys, data types, FK naming conventions |
| `references/postgres-table-design.md` | Full table design: types, constraints, JSONB, RLS, partitioning, extensions |
| `references/postgres-indexing.md` | Index types, composite, partial, covering, BRIN, GIN |
| `references/postgres-index-optimization.md` | Unused/duplicate/invalid index detection, bloat, HOT, write amplification |
| `references/postgres-query-patterns.md` | SARGable rewrites, N+1, pagination, UNION ALL, EXISTS |
| `references/postgres-optimization-checklist.md` | Optimization checklist for auditing a database |
| `references/postgres-partitioning.md` | RANGE/LIST partitioning, pg_partman, retention |
| `references/postgres-mvcc-transactions.md` | Isolation levels, XID wraparound, long transactions, serialization errors |
| `references/postgres-mvcc-vacuum.md` | VACUUM internals, autovacuum tuning, bloat prevention |
| `references/postgres-text-search.md` | Hybrid BM25 + pgvector search, RRF fusion, pg_textsearch, pgvectorscale |
| `references/postgres-pgbouncer-configuration.md` | Pool sizing, max_connections, monitoring |
| `references/postgres-process-architecture.md` | Multi-process model, connection pooling, common problems |
| `references/postgres-memory-management-ops.md` | shared_buffers, work_mem, OOM prevention |
| `references/postgres-storage-layout.md` | PGDATA structure, TOAST, fillfactor, tablespaces |
| `references/postgres-monitoring.md` | pg_stat_* views, logging, pg_activity, host metrics |
| `references/postgres-wal-operations.md` | WAL fundamentals, checkpoints, crash recovery |
| `references/postgres-replication.md` | Streaming replication, slots, sync commit levels, failover |
| `references/postgres-backup-recovery.md` | pg_dump, pg_basebackup, PITR, WAL archiving, tool comparison |
| `references/postgres-timescaledb-setup.md` | Hypertable creation, compression, retention, continuous aggregates |
| `references/postgres-timescaledb-migration.md` | Migration planning, in-place vs blue-green, validation |
| `references/postgres-timescaledb-candidates.md` | Candidacy scoring, pattern recognition, schema analysis |
| `references/postgres-postgis-design.md` | GEOMETRY vs GEOGRAPHY, SRIDs, spatial indexes, table examples |

## Scope Boundaries

- **db-mysql**: MySQL-specific schema and query patterns
- **db-migrations**: Framework-level migration tooling (Flyway, Liquibase, etc.)
- **db-vector-rag**: RAG pipeline architecture beyond the pgvector extension itself
- **db-schema-design**: Database-agnostic schema design principles
