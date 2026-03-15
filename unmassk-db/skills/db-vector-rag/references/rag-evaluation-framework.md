---
title: RAG Evaluation Framework
description: Metrics and methodologies for evaluating retrieval and generation quality
tags: RAG, evaluation, NDCG, MRR, faithfulness, recall
---

# RAG Evaluation Framework

## Retrieval Metrics

### Precision@K
Fraction of retrieved documents that are relevant at cutoff K.
- Formula: `Precision@K = Relevant Retrieved@K / K`
- Target: >0.7 for K=1, >0.5 for K=5, >0.3 for K=10.

### Recall@K
Fraction of all relevant documents that appear in top K results.
- Formula: `Recall@K = Relevant Retrieved@K / Total Relevant`
- Target: >0.8 for K=10, >0.9 for K=20.

### Mean Reciprocal Rank (MRR)
Average reciprocal rank of the first relevant result.
- Formula: `MRR = (1/Q) × Σ(1/rank_i)`
- Target: >0.6 good, >0.8 excellent.

### NDCG@K (Normalized Discounted Cumulative Gain)
Position-aware relevance metric that penalizes relevant documents appearing lower in rankings.
- Formula: `NDCG@K = DCG@K / IDCG@K`
- Target: >0.7 for K=5, >0.6 for K=10.

## Generation Quality Metrics

### Faithfulness
How well the generated answer is grounded in retrieved context.
- Measurement: check if each claim in the answer is supported by context (NLI-based).
- Target: >0.95 for factual systems, >0.85 for general applications.

### Answer Relevance
How well the generated answer addresses the original question.
- Measurement: embedding similarity between question and answer.
- Target: >0.8 for focused answers.

### Context Relevance
How relevant the retrieved context is to the question.
- Measurement: relevance scoring of each retrieved chunk.
- Target: >0.7 average relevance for top-5 chunks.

### Context Precision
Fraction of relevant sentences in retrieved context.
- Target: >0.6 for efficient context usage.

### Context Recall
Coverage of necessary information for answering the question.
- Target: >0.8 for comprehensive coverage.

## Evaluation Methods

### Offline Evaluation (Primary)

Requirements:
- 100+ queries minimum (1000+ for robust analysis).
- Ground truth relevance judgments per query.
- Reference answers for generation evaluation.
- Representative document corpus.

Pipeline:
1. Run retrieval with consistent parameters.
2. Generate answers using retrieved context.
3. Compute all metrics.
4. Statistical significance testing with confidence intervals.

Best practices:
- Stratify queries by type (factual, analytical, conversational).
- Include edge cases (ambiguous queries, no-answer situations).
- Use multiple annotators — measure inter-rater agreement.
- Re-evaluate regularly as system evolves.

### Online Evaluation (A/B Testing)

Metrics to track:
- User engagement: click-through rates, time-on-page.
- User satisfaction: explicit ratings, thumbs up/down.
- Task completion: success rates for specific user goals.
- System performance: latency, error rates.

Statistical requirements: 1000+ users per group, 1–4 weeks runtime.

### Human Evaluation (Spot Checks)

Sample 1–5% of production queries regularly. Evaluate:
- Factual accuracy: is the information correct?
- Relevance: does the answer address the question?
- Completeness: are all aspects covered?
- Clarity: is the answer easy to understand?

## Automated Metric Implementation

```python
class RAGEvaluator:
    def evaluate_query(self, query, ground_truth):
        retrieved_docs = self.retriever.search(query)
        retrieval_metrics = self.evaluate_retrieval(retrieved_docs, ground_truth['relevant_docs'])

        generated_answer = self.generator.generate(query, retrieved_docs)
        generation_metrics = self.evaluate_generation(
            query, generated_answer, retrieved_docs, ground_truth['answer']
        )
        return {**retrieval_metrics, **generation_metrics}

def calculate_faithfulness(answer, context):
    claims = extract_claims(answer)
    faithful = sum(1 for c in claims if is_supported_by_context(c, context))
    return faithful / len(claims) if claims else 0

def calculate_context_relevance(query, contexts):
    scores = [embedding_similarity(query, ctx) for ctx in contexts]
    return {'average': mean(scores), 'distribution': scores}
```

## Open-Source Evaluation Tools

| Tool | Capabilities |
|------|-------------|
| RAGAS | Comprehensive RAG metrics, easy integration, synthetic evaluation |
| TruLens | Real-time monitoring, metric tracking, vector DB integrations |
| LangSmith | End-to-end pipeline evaluation, human feedback integration |

## Continuous Monitoring

Real-time signals:
- System latency (p50, p95, p99).
- Error rates and failure modes.
- User satisfaction proxy signals.

Batch evaluation:
- Weekly NDCG/MRR on held-out test set.
- Performance trend analysis.
- Regression detection after system changes.

## Common Pitfalls

| Problem | Solution |
|---------|---------|
| Test set not representative of production | Continuously update from production query logs |
| Optimizing metrics rather than user value | Use multiple complementary metrics |
| Overfitting to evaluation set | Maintain separate held-out sets |
| Human evaluation bottlenecks | Use LLM-as-judge for initial screening, humans for calibration |
| Single metric focus | Always measure retrieval AND generation together |

## Minimum Viable Evaluation Setup

1. Collect 100 representative queries with relevance judgments.
2. Measure NDCG@10 and MRR@10 as primary retrieval metrics.
3. Measure faithfulness for generation.
4. Track p95 latency and error rate as operational metrics.
5. Sample 1% of production queries weekly for human review.
