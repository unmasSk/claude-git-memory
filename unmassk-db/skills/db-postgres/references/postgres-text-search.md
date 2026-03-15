# Hybrid Text Search

Hybrid search combines keyword search (BM25) with semantic search (vector embeddings). Use Reciprocal Rank Fusion (RRF) to merge results from both methods into a single ranked list.

This covers combining pg_textsearch (BM25) with pgvector. Both extensions must be installed. For high-volume setups, filtering, or advanced pgvector tuning (binary quantization, HNSW parameters), see the db-vector-rag skill.

pg_textsearch is a BM25 text search extension for PostgreSQL. It provides true BM25 ranking, which often improves relevance compared to PostgreSQL's built-in ts_rank. Note: pg_textsearch is currently in prerelease and not recommended for production use. It supports PostgreSQL 17 and 18.

## When to Use Hybrid Search

- Use hybrid when queries mix specific terms (product names, codes, proper nouns) with conceptual intent
- Use semantic only when meaning matters more than exact wording
- Use keyword only when exact matches are critical (error codes, SKUs, legal citations)

## Data Preparation

Chunk documents into smaller pieces (typically 500-1000 tokens) and store each chunk with its embedding. Both BM25 and semantic search operate on the same chunks.

## Setup

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_textsearch;

CREATE TABLE documents (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  content TEXT NOT NULL,
  embedding halfvec(1536) NOT NULL
);

-- BM25 index for keyword search
CREATE INDEX ON documents USING bm25 (content) WITH (text_config = 'english');

-- HNSW index for semantic search
CREATE INDEX ON documents USING hnsw (embedding halfvec_cosine_ops);
```

### BM25 Notes

- The `<@>` operator returns negative values where lower = better match. RRF uses rank position, so this does not affect fusion.
- Change `text_config` to match your content language (e.g., `'french'`, `'german'`).
- BM25 has `k1` (term frequency saturation, default 1.2) and `b` (length normalization, default 0.75) parameters. Defaults work well; only tune if relevance is poor.
- Partitioned tables: each partition maintains local statistics. Scores are not directly comparable across partitions.

## RRF Query Pattern

Reciprocal Rank Fusion combines rankings from multiple searches. Each result's score is `1 / (k + rank)` where `k` is a constant (typically 60). Run both queries in parallel from the client for lower latency, then fuse client-side.

```sql
-- Query 1: Keyword search (BM25)
SELECT id, content FROM documents ORDER BY content <@> $1 LIMIT 50;

-- Query 2: Semantic search (run in parallel)
SELECT id, content FROM documents ORDER BY embedding <=> $1::halfvec(1536) LIMIT 50;
```

```python
def rrf_fusion(keyword_results, semantic_results, k=60, limit=10):
    scores = {}
    content_map = {}

    for rank, row in enumerate(keyword_results, start=1):
        scores[row['id']] = scores.get(row['id'], 0) + 1 / (k + rank)
        content_map[row['id']] = row['content']

    for rank, row in enumerate(semantic_results, start=1):
        scores[row['id']] = scores.get(row['id'], 0) + 1 / (k + rank)
        content_map[row['id']] = row['content']

    sorted_ids = sorted(scores, key=scores.get, reverse=True)[:limit]
    return [{'id': id, 'content': content_map[id], 'score': scores[id]} for id in sorted_ids]
```

```typescript
type Row = { id: number; content: string };
type Result = Row & { score: number };

function rrfFusion(keywordResults: Row[], semanticResults: Row[], k = 60, limit = 10): Result[] {
  const scores = new Map<number, number>();
  const contentMap = new Map<number, string>();

  keywordResults.forEach((row, i) => {
    scores.set(row.id, (scores.get(row.id) ?? 0) + 1 / (k + i + 1));
    contentMap.set(row.id, row.content);
  });

  semanticResults.forEach((row, i) => {
    scores.set(row.id, (scores.get(row.id) ?? 0) + 1 / (k + i + 1));
    contentMap.set(row.id, row.content);
  });

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, score]) => ({ id, content: contentMap.get(id)!, score }));
}
```

### RRF Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `k` | 60 | Smoothing constant. Higher values reduce rank differences; 60 is standard |
| Candidates per search | 50 | Higher = better recall, more work |
| Final limit | 10 | Results returned after fusion |

## Weighting Keyword vs Semantic

To favor one method over another, multiply its RRF contribution:

```python
keyword_weight = 1.0
semantic_weight = 2.0

for rank, row in enumerate(keyword_results, start=1):
    scores[row['id']] = scores.get(row['id'], 0) + keyword_weight / (k + rank)

for rank, row in enumerate(semantic_results, start=1):
    scores[row['id']] = scores.get(row['id'], 0) + semantic_weight / (k + rank)
```

Start with equal weights (1.0 each) and adjust based on measured relevance.

## Reranking with ML Models

For highest quality, add a reranking step using a cross-encoder model after initial fusion:

```python
# 1. Fuse results with RRF (more candidates for reranking)
candidates = rrf_fusion(keyword_results, semantic_results, limit=100)

# 2. Rerank with cross-encoder
from sentence_transformers import CrossEncoder
reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')

pairs = [(query_text, doc['content']) for doc in candidates]
scores = reranker.predict(pairs)

# 3. Return top 10 by reranker score
reranked = sorted(zip(candidates, scores), key=lambda x: x[1], reverse=True)[:10]
```

Reranking is optional -- hybrid RRF alone significantly improves over single-method search.

## Scaling with pgvectorscale

For large datasets (10M+ vectors) or workloads with selective metadata filters, consider pgvectorscale's StreamingDiskANN index instead of HNSW for the semantic search component.

```sql
CREATE EXTENSION IF NOT EXISTS vectorscale;

CREATE TABLE documents (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  content TEXT NOT NULL,
  embedding halfvec(1536) NOT NULL,
  labels smallint[] NOT NULL
);

CREATE INDEX ON documents USING diskann (embedding vector_cosine_ops, labels);
CREATE INDEX ON documents USING bm25 (content) WITH (text_config = 'english');

-- Filtered semantic search
SELECT id, content FROM documents
WHERE labels && ARRAY[1, 3]::smallint[]
ORDER BY embedding <=> $1::halfvec(1536) LIMIT 50;
```

## Monitoring

```sql
-- Force index usage for verification (planner may prefer seqscan on small tables)
SET enable_seqscan = off;

EXPLAIN SELECT id, content FROM documents ORDER BY content <@> 'search text' LIMIT 10;
EXPLAIN SELECT id, content FROM documents ORDER BY embedding <=> '[0.1, 0.2, ...]'::halfvec(1536) LIMIT 10;

SET enable_seqscan = on;

-- Check index sizes
SELECT indexname, pg_size_pretty(pg_relation_size(indexname::regclass)) AS size
FROM pg_indexes WHERE tablename = 'documents';
```

## Common Issues

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Missing exact matches | BM25 index not returning them | Check BM25 index exists; verify text_config matches content language |
| Poor semantic results | Embedding model mismatch | Ensure query embedding uses same model as stored embeddings |
| Slow queries | Large candidate pools or missing indexes | Reduce inner LIMIT; verify both indexes exist and are used (EXPLAIN) |
| Skewed results | One method dominating | Adjust RRF weights; verify both searches return reasonable candidates |
