---
title: RAG Pipeline Design
description: End-to-end RAG pipeline architecture, retrieval strategies, and production patterns
tags: RAG, pipeline, hybrid-search, reranking, HyDE, production
---

# RAG Pipeline Design

## Pipeline Overview

A RAG pipeline has four stages:
1. **Document processing:** Chunk and embed documents into a vector store.
2. **Query transformation:** Optionally transform the query before retrieval.
3. **Retrieval:** Find the most relevant chunks using dense, sparse, or hybrid search.
4. **Generation:** Produce an answer conditioned on retrieved context.

## Retrieval Strategies

### Dense Retrieval (Default)
Semantic similarity using embedding cosine distance. Captures meaning and handles paraphrasing. May miss exact keyword matches.

### Sparse Retrieval (BM25)
Keyword-based. Exact keyword matching, interpretable results. Misses semantic similarity, vulnerable to vocabulary mismatch.

### Hybrid Retrieval (Recommended for Production)
Combine dense and sparse scores. Best of both worlds.

**Reciprocal Rank Fusion (RRF):**
```python
def reciprocal_rank_fusion(dense_results, sparse_results, k=60):
    scores = {}
    for rank, doc in enumerate(dense_results):
        scores[doc.id] = scores.get(doc.id, 0) + 1 / (k + rank + 1)
    for rank, doc in enumerate(sparse_results):
        scores[doc.id] = scores.get(doc.id, 0) + 1 / (k + rank + 1)
    return sorted(scores.items(), key=lambda x: x[1], reverse=True)
```

### Reranking (Two-Stage)
Initial retrieval with fast model (retrieve 50–200 candidates), then rerank with a cross-encoder for higher precision. Higher latency, but substantially better results.

```python
class TwoStageRetriever:
    def retrieve(self, query, top_k=10):
        candidates = self.fast_retriever.search(query, k=50)  # fast, low precision
        reranked = self.cross_encoder.rerank(query, candidates)  # slow, high precision
        return reranked[:top_k]
```

## Query Transformation Techniques

### HyDE (Hypothetical Document Embeddings)
Generate a hypothetical answer to the query, embed that instead of the query itself. Improves retrieval by matching document style.

```python
def hyde_retrieve(query, llm, retriever):
    hypothetical_doc = llm.generate(f"Write a passage that answers: {query}")
    return retriever.search(hypothetical_doc)  # embed the answer, not the query
```

### Multi-Query Generation
Generate 3–5 query variations, retrieve for each, merge and deduplicate. Increases recall, handles ambiguity. Higher cost and latency.

### Step-Back Prompting
Transform specific queries into broader, more general versions to retrieve supporting context.
- `"What is Python's GIL?"` → `"How does Python handle concurrency?"`

## Context Window Optimization

### Dynamic Context Assembly
- Order by relevance (most relevant first).
- Deduplicate redundant chunks before sending to generator.
- Manage token budget — fit within model context limits.

### Context Compression
- Summarize less-relevant chunks.
- Extract only relevant sentences rather than entire chunks.
- Use structured formats to reduce tokens.

## Vector Database Selection

| Database | Type | Best for |
|----------|------|---------|
| pgvector (PostgreSQL) | Extension | Existing Postgres, ACID compliance, relational joins |
| Pinecone | Managed | Fully managed, auto-scaling, no ops |
| Qdrant | Self-hosted | High performance, low memory, Rust-based |
| Weaviate | Self-hosted/cloud | GraphQL API, multi-modal search |
| Chroma | Embedded | Development and prototyping only |

For most production applications starting on PostgreSQL: use pgvector.

## Production Patterns

### Caching
```python
class SemanticCache:
    def get_or_retrieve(self, query, threshold=0.95):
        # Check if a semantically similar query was already answered
        query_embedding = self.embed(query)
        cached = self.cache.find_similar(query_embedding, threshold)
        if cached:
            return cached.result
        result = self.retrieve_and_generate(query)
        self.cache.store(query_embedding, result)
        return result
```

Levels:
- **Query-level:** Cache identical query results.
- **Semantic-level:** Cache semantically similar queries.
- **Embedding-level:** Cache embedding computations for documents.

### Fallback Mechanisms
```python
def retrieve_with_fallback(query):
    try:
        return primary_vector_db.search(query)
    except Exception:
        # Fall back to BM25 keyword search
        return bm25_index.search(query)
```

### Streaming Retrieval
Stream results progressively as they become available. Generate answer while still retrieving late-arriving context.

## Content Safety and Guardrails

- **Hallucination detection:** Verify each claim in generated answer against retrieved context.
- **Source attribution:** Always provide sources for factual claims.
- **PII detection:** Identify and redact PII in retrieved context before generation.
- **Query injection prevention:** Sanitize and validate user inputs before embedding.
- **Confidence scoring:** Provide confidence levels when retrieval quality is low.

## Cost Optimization

- **Batch embeddings:** Process documents in batches to reduce API call overhead.
- **Cache embeddings:** Avoid re-embedding unchanged documents.
- **Smart filtering:** Use metadata pre-filters to reduce search space before ANN.
- **Tiered storage:** Hot data (frequently accessed) in fast storage, cold data archived.
- **Query routing:** Route simple factual queries to cached results, complex ones to full pipeline.

## Development Workflow

1. Analyze document corpus characteristics (size, structure, domain).
2. Start with simple chunking (sentence or paragraph) + a quality embedding model.
3. Implement basic dense retrieval with pgvector HNSW.
4. Set up evaluation metrics (NDCG@10, MRR@10, faithfulness).
5. Iterate: tune chunking, add hybrid search, add reranking.
6. Deploy with monitoring, caching, and fallbacks.

## Common Pitfalls

| Problem | Cause | Fix |
|---------|-------|-----|
| Poor retrieval precision | Weak embedding model or chunking | Switch to bge-large, use semantic chunking |
| Low retrieval recall | ef_search too low or no hybrid | Increase ef_search, add BM25 hybrid |
| High latency | No caching, large HNSW index not in memory | Add semantic cache, use halfvec, partition |
| Hallucinations | Generated claims not grounded in context | Add faithfulness scoring, source attribution |
| Inconsistent quality | No evaluation framework | Implement offline eval before production |
