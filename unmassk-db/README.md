# unmassk-db

**Database toolkit covering PostgreSQL, MySQL, MongoDB, Redis, migrations, vector/RAG, and schema design.**

7 skills for database operations: PostgreSQL deep dive (schema design, indexing, TimescaleDB, pgvector, PostGIS, MVCC), MySQL (schema, queries, replication, InnoDB), MongoDB (CRUD, aggregation, sharding, Atlas), Redis (data structures, caching, vector search, streams, security), zero-downtime migrations (expand-contract, CDC, rollback), vector/RAG pipelines (pgvector, chunking, embeddings, evaluation), and database schema design (normalization, index strategy, RLS).

Based on:
- [pg-aiguide](https://github.com/timescale/pg-aiguide) by Timescale (MIT)
- [database-skills](https://github.com/planetscale/database-skills) by PlanetScale (MIT)
- [claude-skills](https://github.com/alirezarezvani/claude-skills) engineering/ by alirezarezvani (MIT)
- [agent-skills](https://github.com/redis/agent-skills) by Redis (MIT)
- MongoDB official documentation (mongodb.com/docs)

## What's included

| Skill | References | Scripts | Covers |
|-------|-----------|---------|--------|
| `db-postgres` | 22 | 0 | PostgreSQL, TimescaleDB, pgvector, PostGIS |
| `db-mysql` | 19 | 0 | MySQL, InnoDB, replication |
| `db-mongodb` | 10 | 0 | MongoDB CRUD, aggregation, sharding, Atlas |
| `db-redis` | 35 | 0 | Redis data structures, caching, vector search, streams |
| `db-migrations` | 4 | 4 | Zero-downtime migrations, rollback, reconciliation |
| `db-vector-rag` | 5 | 0 | pgvector, RAG pipelines, chunking, embeddings |
| `db-schema-design` | 5 | 2 | Normalization, index strategy, schema analysis |
| **Total** | **100** | **6** | |

## Quick start

Run `/plugin` in Claude Code and install `unmassk-db` from the marketplace.

## Dependencies

Requires the **unmassk-toolkit** plugin (core). Install it from the marketplace before using unmassk-db.

## Scripts

Migration and schema design scripts are Python CLI tools. They generate SQL output that requires human review before execution. All SQL identifiers are validated against injection.

## BM25 skill discovery

All 7 skills include `catalog.skillcat` files for BM25-indexed discovery by agents in unmassk-toolkit. db-postgres had a pre-existing skillcat; the remaining 6 were added in 1.1.0.

## Audited by

- **Cerberus** — code review + security audit of all 6 scripts (2 Critical + 7 Warning fixed)
- **Cerberus** — MongoDB content verified against official documentation via Context7
- **Bilbo** — source repo exploration and quality assessment
