---
name: db-redis
description: >
  Use when the user asks to "configure Redis", "Redis caching strategy",
  "Redis data structures", "Redis pub/sub", "Redis streams",
  "Redis vector search", "Redis semantic cache", "rate limiting Redis",
  "Redis session management", "Redis cluster", "Redis security",
  or mentions any of: Redis, redis-py, Jedis, ioredis, RedisJSON,
  RediSearch, RedisVL, HNSW, vector set, sorted set, stream,
  consumer group, pub/sub, pipelining, connection pooling,
  TTL, key expiration, hash field expiry, ACL, sentinel,
  cluster hash tags, read replicas, semantic caching, LangCache,
  rate limiting, session store, cache invalidation.
  Use this for selecting the right Redis data structures for each
  use case, implementing caching strategies with TTL and eviction,
  configuring connection pooling and pipelining for performance,
  building event-driven architectures with streams and pub/sub,
  implementing vector search and semantic caching with RedisVL,
  setting up Redis cluster with hash tags and read replicas,
  and hardening Redis security with ACLs and network policies.
  35 reference files covering data structures, connections,
  caching, vector search, streams, security, observability,
  and cluster configuration. Official Redis best practices.
  Based on agent-skills by Redis (MIT).
version: 1.0.0
---

# Redis -- Data Structures, Caching, and Vector Search

## Routing Table

### Overview

| Reference | When to use |
|-----------|-------------|
| `references/redis-overview.md` | General Redis capabilities, skill summary, rule categories |

### Data Structures

| Reference | When to use |
|-----------|-------------|
| `references/redis-data-choose-structure.md` | Choosing between String, Hash, List, Set, Sorted Set, JSON, Stream, Vector Set |
| `references/redis-data-key-naming.md` | Key naming conventions and prefixes |
| `references/redis-data-incr.md` | Atomic counters with INCR/INCRBY |
| `references/redis-data-transactions.md` | Atomic multi-command operations with MULTI/EXEC |
| `references/redis-data-hash-field-expiry.md` | Per-field TTL on hashes with HEXPIRE (Redis 7.4+) |

### Connections

| Reference | When to use |
|-----------|-------------|
| `references/redis-conn-pooling.md` | Connection pooling (redis-py, Jedis) or multiplexing (Lettuce) |
| `references/redis-conn-pipelining.md` | Batching multiple commands to reduce round trips |
| `references/redis-conn-blocking.md` | Avoiding KEYS, SMEMBERS, HGETALL on large datasets |
| `references/redis-conn-timeouts.md` | Tuning socket_timeout and socket_connect_timeout |
| `references/redis-conn-client-cache.md` | Client-side caching with RESP3 for read-heavy data |

### Caching and Sessions

| Reference | When to use |
|-----------|-------------|
| `references/redis-ram-ttl.md` | Setting TTL on cache keys to prevent unbounded memory growth |
| `references/redis-ram-limits.md` | Configuring maxmemory and eviction policies |
| `references/redis-json-vs-hash.md` | Choosing between JSON, Hash, and String for structured data |
| `references/redis-json-partial-updates.md` | Updating nested JSON fields without fetching entire documents |

### Vector Search and RAG

| Reference | When to use |
|-----------|-------------|
| `references/redis-vector-index-creation.md` | Creating vector indexes via CLI, redis-py, or RedisVL |
| `references/redis-vector-algorithm-choice.md` | Choosing HNSW vs FLAT based on dataset size and accuracy needs |
| `references/redis-vector-hybrid-search.md` | Combining vector similarity with attribute filters |
| `references/redis-vector-rag-pattern.md` | Full RAG pipeline with RedisVL |
| `references/redis-semantic-cache-best-practices.md` | Tuning LangCache similarity threshold and cache separation |
| `references/redis-semantic-cache-langcache-usage.md` | LangCache SDK usage and REST API for LLM response caching |

### Redis Query Engine (RQE)

| Reference | When to use |
|-----------|-------------|
| `references/redis-rqe-index-creation.md` | Creating indexes with FT.CREATE, choosing prefixes and fields |
| `references/redis-rqe-field-types.md` | TEXT vs TAG vs NUMERIC vs GEO vs GEOSHAPE vs VECTOR |
| `references/redis-rqe-query-optimization.md` | Writing efficient FT.SEARCH queries with filters and LIMIT |
| `references/redis-rqe-dialect.md` | Using DIALECT 2 for consistent query behavior |
| `references/redis-rqe-index-management.md` | Aliases for zero-downtime index updates |
| `references/redis-rqe-skip-initial-scan.md` | SKIPINITIALSCAN for new-data-only indexes |

### Streams and Pub/Sub

| Reference | When to use |
|-----------|-------------|
| `references/redis-stream-choosing-pattern.md` | Streams vs Pub/Sub — durability, consumer groups, replayability |

### Security

| Reference | When to use |
|-----------|-------------|
| `references/redis-security-auth.md` | Authentication with password and TLS in production |
| `references/redis-security-acls.md` | Fine-grained access control with ACL SETUSER |
| `references/redis-security-network.md` | Binding to specific interfaces, firewall rules, disabling dangerous commands |

### Observability

| Reference | When to use |
|-----------|-------------|
| `references/redis-observe-commands.md` | SLOWLOG, INFO, MEMORY DOCTOR, FT.PROFILE for debugging |
| `references/redis-observe-metrics.md` | Key metrics to monitor: memory, hit ratio, connections, ops/sec |

### Cluster

| Reference | When to use |
|-----------|-------------|
| `references/redis-cluster-hash-tags.md` | Hash tags for co-locating keys in cluster multi-key operations |
| `references/redis-cluster-read-replicas.md` | Read replicas for scaling read-heavy workloads |
