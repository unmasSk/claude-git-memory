---
name: db-vector-rag
description: >
  Use when the user asks to "set up pgvector", "semantic search",
  "RAG pipeline", "embedding strategy", "chunking strategy",
  "vector database", "similarity search", "HNSW index",
  or mentions any of: pgvector, vector search, embeddings, RAG,
  retrieval augmented generation, chunking, HNSW, IVF, halfvec,
  semantic search, cosine similarity, embedding model, reranking,
  cross-encoder, BM25, hybrid search, recall@K, MRR, NDCG.
  Use this for implementing semantic search with pgvector (HNSW,
  IVF-PQ, halfvec), designing RAG pipelines with optimal chunking
  strategies, selecting embedding models, building hybrid search
  (vector + BM25), and evaluating retrieval quality with standard
  metrics. 5 reference files from pg-aiguide by Timescale (MIT)
  and claude-skills by alirezarezvani (MIT).
  Based on pg-aiguide by Timescale (MIT) and claude-skills by alirezarezvani (MIT).
version: 1.0.0
---

# Vector and RAG -- Semantic Search and Retrieval Pipelines

## References

| File | Topic |
|------|-------|
| `references/pgvector-semantic-search.md` | pgvector setup, HNSW/IVFFlat indexes, halfvec, binary quantization, filtered search |
| `references/rag-chunking-strategies.md` | Fixed-size, sentence, paragraph, semantic, and recursive chunking |
| `references/rag-embedding-benchmarks.md` | Model comparison: quality, speed, cost, domain-specific selection |
| `references/rag-evaluation-framework.md` | Retrieval metrics (NDCG, MRR, Recall@K), faithfulness, context relevance |
| `references/rag-pipeline-design.md` | End-to-end RAG architecture, retrieval strategies, query transformation, production patterns |

## Routing

| User asks about | Load these references |
|-----------------|----------------------|
| pgvector setup, HNSW, indexes | pgvector-semantic-search |
| Chunking documents, chunk size | rag-chunking-strategies |
| Which embedding model to use | rag-embedding-benchmarks |
| Evaluating retrieval quality | rag-evaluation-framework |
| Full RAG pipeline design | rag-pipeline-design |
| Hybrid search (vector + BM25) | rag-pipeline-design, pgvector-semantic-search |
| Reranking | rag-pipeline-design |
| Filtered vector search | pgvector-semantic-search |

## Decision Flow

1. **Storage:** Use `halfvec(N)` + HNSW (`m=16, ef_construction=64`) for most workloads.
2. **Chunking:** Start with semantic (heading-aware) for structured docs, sentence-based for general text.
3. **Embedding model:** `BAAI/bge-large-en-v1.5` for self-hosted quality; `text-embedding-3-large` for managed.
4. **Retrieval:** Dense search with `ef_search=100` as baseline. Add BM25 hybrid if keyword precision matters.
5. **Evaluate:** Measure NDCG@10 and MRR@10 on a representative query set before going to production.

## Key Rules

- Always use the same embedding model for indexing and querying.
- Cast query vectors explicitly: `$1::halfvec(N)` — implicit casts fail in prepared statements.
- Build HNSW indexes after bulk loading initial data for best build performance.
- For filtered queries with selective filters, enable `SET hnsw.iterative_scan = relaxed_order`.

## Scope Boundaries

- **db-postgres**: PostgreSQL-specific operations beyond pgvector (MVCC, VACUUM, partitioning)
- **db-schema-design**: Relational schema design for the tables storing embeddings
- **db-mysql**: MySQL — pgvector is PostgreSQL-only
