---
title: Embedding Model Benchmarks
description: Model comparison for retrieval quality, speed, cost, and domain fit
tags: RAG, embeddings, benchmarks, model-selection
---

# Embedding Model Benchmarks

Benchmark data from evaluation across MS MARCO, Natural Questions, TREC-COVID, FiQA-2018, and ArguAna (2M+ documents, 50K queries).

## Retrieval Quality Rankings (NDCG@10)

| Rank | Model | NDCG@10 | Encoding (docs/sec) | Type |
|------|-------|---------|---------------------|------|
| 1 | text-embedding-3-large (3072 dim) | 0.594 | 1,200* | API |
| 2 | BAAI/bge-large-en-v1.5 (1024 dim) | 0.588 | 1,350 | Self-hosted |
| 3 | intfloat/e5-large-v2 (1024 dim) | 0.582 | 1,380 | Self-hosted |
| 4 | text-embedding-ada-002 (1536 dim) | 0.578 | 2,500* | API |
| 5 | thenlper/gte-large (1024 dim) | 0.571 | 1,420 | Self-hosted |
| 6 | all-mpnet-base-v2 (768 dim) | 0.543 | 2,840 | Self-hosted |
| 8 | text-embedding-3-small (1536 dim) | 0.535 | 8,500* | API |
| 10 | all-MiniLM-L12-v2 (384 dim) | 0.498 | 8,950 | Self-hosted |
| 11 | all-MiniLM-L6-v2 (384 dim) | 0.476 | 14,200 | Self-hosted |

*API-based: speeds include network latency.

## Cost Analysis (per 1M tokens)

| Model | Cost | Monthly (10M tokens) |
|-------|------|----------------------|
| text-embedding-3-small | $0.02 | $0.20 |
| text-embedding-ada-002 | $0.10 | $1.00 |
| text-embedding-3-large | $1.30 | $13.00 |
| all-MiniLM-L6-v2 (self-hosted) | ~$0.05 | ~$0.50 |
| BAAI/bge-large-en-v1.5 (self-hosted) | ~$0.25 | ~$2.50 |

*Self-hosted costs are compute estimates, excluding initial setup.*

## Recommendations by Use Case

### High-Volume Production (Self-Hosted)
**Primary:** `BAAI/bge-large-en-v1.5` — excellent quality (2nd overall), no API costs or rate limits.
**Secondary:** `intfloat/e5-large-v2` — nearly equivalent quality, active community.

### Cost-Sensitive
**Primary:** `all-MiniLM-L6-v2` — lowest cost, fastest processing, acceptable quality for many use cases.
**Secondary:** `text-embedding-3-small` — better quality than MiniLM, competitive API pricing.

### Maximum Quality
**Primary:** `text-embedding-3-large` — best overall quality.
**Secondary:** `BAAI/bge-large-en-v1.5` — nearly equivalent, no ongoing API costs.

### Real-Time (< 100ms latency)
**Primary:** `all-MiniLM-L6-v2` — sub-millisecond inference, small memory footprint.

### Domain-Specific
| Domain | Recommended |
|--------|------------|
| Scientific/research | `allenai/scibert_scivocab_uncased` (+15% vs general on TREC-COVID) |
| Code search | `microsoft/codebert-base` (+22% vs general on CodeSearchNet) |
| Multilingual | `paraphrase-multilingual-mpnet-base-v2` (3.7% English degradation) |
| Financial | `text-embedding-3-large` or `intfloat/e5-large-v2` |

## Memory Requirements (Self-Hosted)

| Model | Model Size | Peak RAM | GPU VRAM |
|-------|-----------|----------|----------|
| all-MiniLM-L6-v2 | 91 MB | 1.2 GB | 2.1 GB |
| all-MiniLM-L12-v2 | 134 MB | 1.8 GB | 3.2 GB |
| all-mpnet-base-v2 | 438 MB | 3.2 GB | 6.4 GB |
| BAAI/bge-large-en-v1.5 | 670 MB | 4.8 GB | 8.6 GB |
| intfloat/e5-large-v2 | 670 MB | 4.8 GB | 8.6 GB |

## Model Selection Framework

1. **Define quality floor:** Minimum acceptable NDCG@10.
2. **Assess throughput:** Required queries per second and document encoding rate.
3. **Evaluate constraints:** GPU memory, API budget, vendor lock-in tolerance.
4. **Consider domain:** Domain-specific models outperform general ones by 15–22% on specialized corpora.
5. **Default start:** `BAAI/bge-large-en-v1.5` for self-hosted; `text-embedding-3-small` for managed/API.

## Deployment Patterns

**Single model:** Simplest. One model for all use cases.
**Tiered:** Fast model (MiniLM) for initial candidate retrieval, high-quality model (bge-large) for reranking.
**Domain routing:** Route code queries to CodeBERT, scientific queries to SciBERT, general to a general model.

## Important Notes

- Benchmark data is from 2024. The open-source embedding landscape evolves rapidly — new SOTA models appear every 3–6 months.
- Always test candidate models on your specific document corpus and queries before selecting.
- Switching embedding models requires re-embedding all documents and rebuilding indexes.
