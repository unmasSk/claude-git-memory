---
name: db-mongodb
description: >
  Use when the user asks to "design MongoDB schema", "MongoDB aggregation",
  "MongoDB indexing", "configure replica set", "MongoDB sharding",
  "MongoDB security", "MongoDB transactions", "Atlas Search",
  "MongoDB vector search", "change streams",
  or mentions any of: MongoDB, Mongo, mongosh, mongod, mongos,
  replica set, sharding, shard key, aggregation pipeline, $match,
  $group, $lookup, $unwind, $project, $facet, BSON, ObjectId,
  write concern, read preference, Atlas, CSFLE, change stream,
  time series collection, schema validation, $jsonSchema.
  Use this for designing MongoDB document schemas with proper
  data modeling patterns (embedded vs referenced), building
  aggregation pipelines for data transformation and analysis,
  optimizing query performance with indexes (compound, text,
  geospatial, wildcard, partial, TTL), configuring replica sets
  for high availability with proper write concern and read
  preference, implementing sharding for horizontal scaling,
  securing deployments with authentication, RBAC, and encryption,
  and using advanced features like Atlas Search, vector search,
  change streams, and transactions. 10 reference files based on
  official MongoDB documentation (mongodb.com/docs).
  Based on MongoDB official documentation (mongodb.com/docs).
version: 1.0.0
---

# MongoDB -- Document Database Operations and Scaling

## Scope

This skill covers MongoDB document database operations. It does NOT cover PostgreSQL (db-postgres), MySQL (db-mysql), Redis (db-redis), or database migrations (db-migrations).

## Routing Table

| Task | Read these references |
|------|----------------------|
| CRUD operations, query operators | `mongodb-crud-operations.md` |
| Aggregation pipelines | `mongodb-aggregation-pipeline.md` |
| Index strategy, query optimization | `mongodb-indexing.md` |
| Schema design, data modeling | `mongodb-data-modeling.md` |
| Replica sets, transactions | `mongodb-replication.md` |
| Sharding, horizontal scaling | `mongodb-sharding.md` |
| Authentication, encryption, RBAC | `mongodb-security.md` |
| Atlas, self-managed, Kubernetes | `mongodb-deployment.md` |
| Performance tuning, monitoring | `mongodb-performance.md` |
| Atlas Search, vector search, change streams | `mongodb-advanced.md` |

## Mandatory Rules

- Always use `w: "majority"` write concern for critical data in production.
- Always create indexes for fields used in queries, sorts, and joins.
- Embed for one-to-few relationships. Reference for one-to-many.
- Never use `$where` or `mapReduce` — use aggregation pipeline instead.
- Always use projection to return only needed fields.
- Use cursor-based pagination (`_id: { $gt: lastId }`) not skip/limit for large datasets.
- Shard key must have high cardinality, even distribution, and align with query patterns.
- Enable authentication and TLS in production. Never run without auth.
- Use `explain("executionStats")` to verify queries use indexes (IXSCAN not COLLSCAN).
- Schema validation with `$jsonSchema` for data integrity.

## Done Criteria

A task is complete when:
- Queries use indexes (verified with explain)
- Schema follows appropriate modeling pattern (embedded vs referenced)
- Write concern and read preference configured for the use case
- No COLLSCAN in production queries
- Security configured (auth, TLS, RBAC)
