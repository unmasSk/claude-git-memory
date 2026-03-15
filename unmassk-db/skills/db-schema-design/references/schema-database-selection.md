---
title: Database Selection Guide
description: Decision framework and category deep-dive for choosing the right database
tags: database-selection, SQL, NoSQL, PostgreSQL, MySQL, Redis, MongoDB
---

# Database Selection Guide

## Decision Tree

```
What is your primary use case?
│
├── OLTP (Transactional Applications)
│   ├── Strong ACID + vertical scale → PostgreSQL, MySQL, SQL Server
│   ├── Strong ACID + horizontal scale → CockroachDB, TiDB, Spanner
│   ├── Key-value access → Redis, DynamoDB, Cassandra
│   └── Document access → MongoDB, CouchDB
│
├── Analytics / OLAP
│   ├── <1TB → PostgreSQL with columnar extensions
│   ├── 1TB–100TB → Snowflake, BigQuery, Redshift, Synapse
│   └── >100TB → Databricks, Spark
│
├── Real-Time Analytics (sub-second queries)
│   → ClickHouse, Apache Druid, TimescaleDB
│
├── Search and Discovery
│   ├── Full-text search → Elasticsearch, OpenSearch
│   ├── Vector/semantic search → pgvector, Pinecone, Qdrant, Weaviate
│   └── Faceted search → Elasticsearch + SQL
│
├── Graph Relationships (complex traversals)
│   → Neo4j, Amazon Neptune, ArangoDB
│
└── Time-Series Data
    ├── High write volume → InfluxDB, TimescaleDB, Druid
    └── Medium volume → PostgreSQL with partitioning
```

## Category Deep Dive

### Traditional SQL

**PostgreSQL**
- Best for: complex queries, JSON data, extensions (pgvector, PostGIS, TimescaleDB), mixed workloads.
- Strengths: feature-rich, ACID, extensible, strong community.
- Scale: vertical + read replicas + partitioning.
- Choose when: need SQL features, complex queries, moderate scale, or any PostgreSQL extension.

**MySQL**
- Best for: web applications, read-heavy workloads, simple schemas.
- Strengths: performance, replication, large ecosystem.
- Scale: read replicas + sharding.
- Choose when: simple schema, performance priority, large team familiarity.

**SQL Server**
- Best for: Microsoft ecosystem, enterprise BI, .NET applications.
- Choose when: Microsoft stack, enterprise requirements, SSRS/SSAS integration.

### Distributed SQL (NewSQL)

**CockroachDB:** Global ACID + horizontal scaling. Multi-region apps, financial services.
**TiDB:** MySQL-compatible + HTAP. Existing MySQL expertise + scale.
**Spanner:** Google Cloud managed distributed SQL.

### NoSQL — Document Stores

**MongoDB:** Flexible schema, rapid development, document-centric data. Catalog, profiles, CMS.
**CouchDB:** Offline-first, bi-directional sync, HTTP API.

### Key-Value Stores

**Redis:** In-memory, <1ms latency, rich data structures. Caching, sessions, leaderboards, pub/sub.
**DynamoDB:** Serverless, AWS-native, predictable performance. Gaming, IoT, mobile backends.
**Cassandra:** Write-heavy, linear scalability, no single point of failure. Time-series, messaging, activity feeds.

### Graph Databases

**Neo4j:** Mature ecosystem, Cypher query language, graph algorithms. Social networks, fraud detection, recommendation engines.

### Time-Series

**InfluxDB:** Purpose-built, high write volume. IoT sensors, monitoring, DevOps metrics.
**TimescaleDB:** PostgreSQL extension, SQL compatibility. Financial data, IoT with complex queries.

### Search Engines

**Elasticsearch:** Full-text search, log analysis, faceted search. ELK stack. Resource intensive.

### Data Warehouses

**Snowflake:** Cloud-native, separated compute/storage, multi-cloud.
**BigQuery:** Serverless, petabyte scale, Google Cloud ML integration.

---

## Selection Criteria Matrix

| Criterion | SQL | NewSQL | Document | Key-Value | Column-Family | Graph | Time-Series |
|-----------|-----|--------|----------|-----------|---------------|-------|-------------|
| ACID | Strong | Strong | Eventual | Eventual | Tunable | Varies | Varies |
| Horizontal scale | Limited | Native | Native | Native | Native | Limited | Native |
| Query flexibility | High | High | Moderate | Low | Low | High | Specialized |
| Schema flexibility | Rigid | Rigid | High | High | Moderate | High | Structured |
| Operational complexity | Low | High | Moderate | Low | High | Moderate | Moderate |

---

## Requirements Checklist

Before selecting a database, document:

- [ ] Current and projected data volume.
- [ ] Read and write rates (requests per second).
- [ ] Consistency requirements (strong vs eventual).
- [ ] Query patterns (simple lookups vs complex analytics vs graph traversals).
- [ ] Schema change frequency.
- [ ] Geographic distribution (single region vs multi-region vs global).
- [ ] Availability SLA (what downtime is acceptable).
- [ ] Team expertise and learning curve tolerance.
- [ ] Compliance requirements (data residency, audit trails, encryption).
- [ ] Budget for licensing, infrastructure, and operations.

---

## Common Patterns

**E-commerce:** PostgreSQL or MySQL (primary data) + Redis (caching) + Elasticsearch (product search).

**IoT / Sensor data:** TimescaleDB or InfluxDB (time-series) + Kafka (ingestion) + PostgreSQL (metadata).

**Social media:** MongoDB (profiles) + Neo4j (relationships) + Cassandra (activity feeds) + Elasticsearch (search) + Redis (sessions).

**Analytics platform:** Snowflake or BigQuery + S3/GCS (data lake) for raw data.

**Global SaaS:** CockroachDB or DynamoDB (multi-region, strong consistency).

---

## Evolution Path

1. Start with PostgreSQL or MySQL — proven, flexible, good tooling.
2. Monitor bottlenecks with real production load before switching.
3. Move specific workloads to specialized databases when concrete evidence justifies it.
4. Polyglot persistence: use multiple databases, each suited for its access pattern.
5. Align database choice with service boundaries in microservice architectures.
