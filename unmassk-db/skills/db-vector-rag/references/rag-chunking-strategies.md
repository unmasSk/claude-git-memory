---
title: Chunking Strategies
description: Comparison of document chunking approaches for RAG systems
tags: RAG, chunking, embeddings, semantic-search
---

# Chunking Strategies

Chunking is the foundation of effective RAG. The right strategy depends on document type, quality requirements, and processing constraints.

## Strategy Comparison

| Strategy | Processing Speed | Boundary Quality | Semantic Coherence | Implementation |
|----------|-----------------|------------------|--------------------|---------------|
| Fixed-size | Fastest | Poor | Low | Simplest |
| Sentence-based | Fast | Good | Medium | Moderate |
| Paragraph-based | Fast | Excellent | Good | Moderate |
| Semantic (heading-aware) | Slow | Excellent | Excellent | Complex |
| Recursive | Slow | Good | Good | Complex |

**Quality metrics (boundary quality, semantic coherence, context preservation) from benchmark measurements.**

## Fixed-Size Chunking

Split at a fixed character or token count with optional overlap.

- **Use when:** Speed is critical, uniform document types, predictable storage.
- **Avoid when:** Context preservation matters, narrative or technical content.
- **Typical sizes:** 512–2048 characters or 128–512 tokens.
- **Overlap:** 10–20% for context continuity.

## Sentence-Based Chunking

Group complete sentences until size threshold is reached.

- **Use when:** Narrative text (articles, blogs), general-purpose processing.
- **Avoid when:** Documents have complex technical structures (code, formulas).
- **Typical sizes:** 500–1500 characters with 1–2 sentence overlap.

## Paragraph-Based Chunking

Use paragraph boundaries as primary split points.

- **Use when:** Well-structured documents, articles, reports with clear paragraphs.
- **Avoid when:** Documents have inconsistent paragraph structure.
- **Typical sizes:** 1000–3000 characters.

## Semantic Chunking (Heading-Aware)

Use document structure (headings, sections) and topic modeling for boundaries.

- **Use when:** Technical documentation, academic papers, structured reports.
- **Avoid when:** Documents lack clear structure, processing speed is critical.
- **Trade-off:** 3–5× slower than fixed-size, but 10–30% better retrieval accuracy.

## Recursive Chunking

Hierarchical splitting: try larger units first, recursively split if too large.

- **Use when:** Mixed document types, complex structures, optimizing chunk count.
- **Avoid when:** Simple uniform documents, real-time processing.
- **Fallback hierarchy:** document → section → paragraph → sentence → character.

## Domain Recommendations

| Document Type | Primary | Secondary |
|---------------|---------|-----------|
| Technical documentation | Semantic | Recursive |
| Scientific papers | Semantic | Paragraph |
| News articles | Paragraph | Sentence |
| Legal documents | Paragraph | Semantic |
| Code documentation | Semantic (code-aware) | Recursive |
| General web content | Sentence | Paragraph |

## Chunk Size Guidelines

- **500–800 chars:** Better for precise retrieval of specific facts.
- **1000–2000 chars:** Better for comprehensive answers requiring more context.
- Match chunk size to embedding model's context window.
- Specific queries benefit from smaller chunks; broad queries from larger.

## Overlap Configuration

| Overlap | Use case |
|---------|---------|
| 0% | Context bleeding is problematic |
| 5–10% | General-purpose continuity |
| 15–20% | Context preservation critical |
| 25%+ | Rarely beneficial; significant storage cost |

## Metadata to Preserve

Always: document source/path, chunk position/sequence, creation timestamp.
Conditionally: page numbers (PDFs), section titles, author, document type.

## Evaluation

Validate chunking strategy with:
1. **Boundary quality score:** Fraction of chunks ending with complete sentences.
2. **Topic coherence:** Average cosine similarity between consecutive chunks.
3. **Retrieval accuracy:** NDCG@10 on representative query set.
4. **Processing speed:** Documents processed per second.

A/B test strategies with at least 1000 representative queries for statistical significance.
