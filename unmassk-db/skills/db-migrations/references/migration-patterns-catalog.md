---
title: Migration Patterns Catalog
description: Decision guide for selecting migration patterns
tags: migrations, patterns, strangler-fig, parallel-run, blue-green, canary
---

# Migration Patterns Catalog

## Pattern Selection Matrix

| Migration Type | Complexity | Downtime Tolerance | Pattern |
|---------------|------------|-------------------|---------|
| Schema column rename/add | Low | Zero | Expand-Contract |
| Schema restructuring | High | Zero | Parallel Schema |
| Service replacement | Medium | Zero | Strangler Fig |
| Risk-averse cutover | Medium | Zero | Parallel Run |
| Service update | Low | Zero | Blue-Green |
| Large dataset with live writes | High | Zero | CDC + dual-write |

## Expand-Contract Pattern

**Use case:** Schema evolution with zero downtime.
**Risk:** Low-Medium.

See `migration-patterns.md` for full implementation.

Pros: Safe rollback at any point, gradual transition, no downtime.
Cons: Increased storage during transition, extended timeline, dual-write complexity.

## Parallel Schema Pattern

**Use case:** Major database restructuring where expand-contract is impractical.
**Risk:** Medium.

Run new schema in parallel. Use feature flags to gradually route traffic. Validate data consistency between schemas before cutover.

Best practices:
- Implement data consistency checks between schemas.
- Use circuit breakers for automatic failover.
- Monitor performance impact of dual writes.
- Plan for data reconciliation processes.

## Strangler Fig Pattern

**Use case:** Legacy service replacement.
**Risk:** Medium.

Gradually replace legacy functionality by intercepting calls at a gateway/proxy and routing them to the new service. Retire legacy as new service proves stable.

Steps:
1. Intercept requests via proxy/gateway.
2. Route traffic to new service with feature flags.
3. Expand percentage as confidence grows.
4. Retire legacy once fully replaced.

## Parallel Run Pattern

**Use case:** Risk mitigation for critical services.
**Risk:** Low-Medium.

Run both old and new services simultaneously. Compare outputs to validate correctness before switching traffic.

```python
class ParallelRunManager:
    async def parallel_execute(self, request):
        primary_task = asyncio.create_task(self.primary_service.process(request))
        candidate_task = asyncio.create_task(self.candidate_service.process(request))

        # Always return primary result
        primary_result = await primary_task

        try:
            candidate_result = await asyncio.wait_for(candidate_task, timeout=5.0)
            comparison = self.comparator.compare(primary_result, candidate_result)
            self.metrics.record_comparison(comparison)
        except asyncio.TimeoutError:
            self.metrics.record_timeout("candidate")
        except Exception as e:
            self.metrics.record_error("candidate", str(e))

        return primary_result
```

## Blue-Green Deployment

**Use case:** Zero-downtime service updates with instant rollback capability.
**Risk:** Low.

Maintain two identical production environments. Switch traffic between them. Keep previous environment running until new one is validated.

Rollback: switch traffic back to previous environment immediately.

## Canary Deployment

**Use case:** Progressive rollout with risk mitigation.
**Risk:** Low.

Deploy new version to a small percentage of users. Increase percentage as confidence in metrics grows.

```python
class CanaryController:
    async def deploy_canary(self, app_name, new_version):
        canary_weight = 5
        while canary_weight < 100:
            await asyncio.sleep(self.validation_window)  # 5 minutes
            if not await self.is_canary_healthy(app_name, new_version):
                await self.rollback_canary(app_name)
                raise Exception("Canary deployment failed health checks")
            canary_weight = min(canary_weight + 5, 100)
            await self.update_traffic_split(app_name, canary_weight)
```

## Progressive Feature Rollout

```python
class ProgressiveRollout:
    def is_enabled_for_user(self, user_id):
        # Consistent bucketing: same user always gets same bucket
        user_hash = hashlib.md5(f"{self.feature_name}:{user_id}".encode()).hexdigest()
        bucket = int(user_hash, 16) % 100
        return bucket < self.rollout_percentage
```

## Anti-Patterns

**Big Bang Migration:** All-or-nothing migration.
- High risk of complete failure.
- Difficult or impossible rollback.
- Extended downtime for large systems.
- Alternative: use Strangler Fig or Parallel Run.

**No Rollback Plan:**
- Cannot recover from failures.
- Increases business risk severely.
- Every migration phase must have a tested rollback procedure.

**Insufficient Testing:**
- Unknown compatibility issues surface in production.
- Data corruption or performance degradation not caught until too late.
- Run full migration in staging before production.

## Success Metrics

| Metric | Definition |
|--------|-----------|
| Migration completion rate | Percentage of data/services successfully migrated |
| Downtime duration | Total unavailability during migration |
| Data consistency score | Percentage of validation checks passing |
| Performance delta | Response time change vs baseline |
| Error rate | Percentage of failed operations during migration |
| Rollback execution time | Time to complete rollback if needed |
