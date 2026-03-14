---
name: ops-observability
description: >
  Use when the user asks to "generate PromQL query", "validate PromQL",
  "create alerting rules", "generate LogQL query", "configure Loki",
  "generate Fluent Bit config", "validate Fluent Bit",
  "create recording rules", "check query performance",
  "debug slow queries", "monitor metrics",
  or mentions any of: PromQL, LogQL, Prometheus, Loki, Fluent Bit,
  Grafana, alerting, recording rules, metric types, counter, gauge,
  histogram, summary, rate(), increase(), histogram_quantile(),
  cardinality, scrape interval, log pipeline, INPUT, FILTER, OUTPUT,
  observability, monitoring, logging, metrics.
  Use this for generating and validating PromQL queries with anti-pattern
  detection and optimization suggestions, building LogQL queries and
  alert expressions for Loki, generating Fluent Bit pipeline configs
  (INPUT/FILTER/OUTPUT) with validation, configuring Loki server
  deployments, and creating Prometheus recording rules and alerts.
  Includes 10 scripts (bash and Python) for syntax validation, best
  practice checking, config generation, and regression testing.
  9 reference files cover PromQL functions and patterns, metric types,
  anti-patterns, LogQL best practices, Loki configuration, and
  Fluent Bit pipeline design.
  Based on cc-devops-skills by akin-ozer (Apache-2.0).
version: 1.0.0
---

# Observability -- PromQL, LogQL, Loki, and Fluent Bit Toolkit

## Routing Table

| Task | Primary Reference | Script to Run |
|------|-------------------|---------------|
| Generate PromQL query | `references/promql-patterns.md` | `promql-validate-syntax.py` |
| Validate PromQL syntax | `references/promql-functions.md` | `promql-validate-syntax.py` |
| Check PromQL best practices | `references/promql-best-practices.md` | `promql-check-best-practices.py` |
| Detect PromQL anti-patterns | `references/promql-anti-patterns.md` | `promql-check-best-practices.py` |
| Test PromQL validators | `references/promql-validator-best-practices.md` | `promql-test-validators.py` |
| Generate LogQL query | `references/logql-best-practices.md` | _(no dedicated validator)_ |
| Configure Loki server | `references/loki-config-reference.md` | `loki-generate-config.py` |
| Deploy Loki best practices | `references/loki-best-practices.md` | `loki-test-config.py` |
| Generate Fluent Bit config | `references/` (see Fluent Bit section) | `fluentbit-generate-config.py` |
| Validate Fluent Bit config | _(config structure)_ | `fluentbit-validate-config.py` |
| Run Fluent Bit tests | _(config structure)_ | `fluentbit-test-config.py` |
| Validate Fluent Bit syntax | _(config structure)_ | `fluentbit-validate.sh` |
| Run LogQL regression checks | `references/logql-best-practices.md` | `logql-regression-checks.sh` |

## Scripts

All scripts are in `${CLAUDE_PLUGIN_ROOT}/skills/ops-observability/scripts/`.

**Run scripts using the absolute path above. Do not use relative paths.**

### Script Reference Table

| Script | Type | Purpose |
|--------|------|---------|
| `promql-validate-syntax.py` | Python | Validate PromQL syntax before using in alerts/dashboards |
| `promql-check-best-practices.py` | Python | Detect anti-patterns and best-practice violations |
| `promql-test-validators.py` | Python | Run test suite for PromQL validators |
| `loki-generate-config.py` | Python | Generate Loki config from parameters |
| `loki-test-config.py` | Python | Test Loki configuration validity |
| `fluentbit-generate-config.py` | Python | Generate Fluent Bit pipeline config |
| `fluentbit-validate-config.py` | Python | Validate Fluent Bit config structure |
| `fluentbit-test-config.py` | Python | Test Fluent Bit config end-to-end |
| `fluentbit-validate.sh` | Bash | Shell-level Fluent Bit syntax validation |
| `logql-regression-checks.sh` | Bash | Run regression checks on LogQL queries |

### Mandatory Script Commands

Before delivering any generated query or config, run the relevant validator:

```bash
# Validate PromQL syntax
python3 ${CLAUDE_PLUGIN_ROOT}/skills/ops-observability/scripts/promql-validate-syntax.py "<query>"

# Check PromQL best practices
python3 ${CLAUDE_PLUGIN_ROOT}/skills/ops-observability/scripts/promql-check-best-practices.py "<query>"

# Generate Loki config
python3 ${CLAUDE_PLUGIN_ROOT}/skills/ops-observability/scripts/loki-generate-config.py

# Validate Fluent Bit config
python3 ${CLAUDE_PLUGIN_ROOT}/skills/ops-observability/scripts/fluentbit-validate-config.py "<config_path>"

# Run LogQL regression checks
bash ${CLAUDE_PLUGIN_ROOT}/skills/ops-observability/scripts/logql-regression-checks.sh
```

## Mandatory Rules

### PromQL

1. **Always validate syntax** before presenting any query. Run `promql-validate-syntax.py`.
2. **Always run best-practice check** on generated queries. Run `promql-check-best-practices.py`.
3. **Counters require rate/increase**: Never return raw counter values. Always wrap in `rate()` or `increase()`.
4. **Gauges never use rate**: Use gauge values directly or with `*_over_time()` functions.
5. **histogram_quantile requires**: `rate()` on buckets + `sum by (le)` aggregation. Both are mandatory.
6. **Never average quantiles**: `avg(metric{quantile="0.95"})` is mathematically invalid.
7. **Filter before aggregation**: Apply label filters inside the metric selector, not after.
8. **Minimum rate range**: `4 × scrape_interval`. Default scrape is 15s → minimum `[1m]`, prefer `[5m]`.
9. **Label filters required**: Every query must include at least `job` label filter.
10. **Recording rules**: Recommend them for any query that is expensive or used in multiple dashboards.

### LogQL

1. **Stream selector first**: Always start with the most specific `{label="value"}` selectors.
2. **Line filter before parser**: `|= "string"` before `| json` — cheap operations first.
3. **Exact match over regex**: Use `|= "string"` not `|~ "string"` when exact match suffices.
4. **No high-cardinality labels**: `user_id`, `trace_id`, `request_id` belong in line filters or structured metadata, not stream selectors.
5. **Metric queries for alerts**: Alerts require numeric values — use `rate()`, `count_over_time()`.
6. **`| __error__=""` in production**: Filter parse errors in dashboards and alerts.
7. **`vector(0)` fallback**: Add `or vector(0)` to alerting rules to handle no-data states.
8. **Structured metadata (Loki 3.x)**: Use `| key="value"` syntax, not `{key="value"}`.
9. **Bloom filter ordering (Loki 3.3+)**: Structured metadata filters BEFORE parsers to enable acceleration.

### Loki Configuration

1. **Schema**: Always use `store: tsdb` + `schema: v13` for new deployments. Cannot be changed post-deploy.
2. **Replication**: Always `replication_factor: 3` in production.
3. **Storage**: Object storage (S3/GCS/Azure) for production. Filesystem is dev/test only.
4. **Auth**: `auth_enabled: true` in multi-tenant environments.
5. **Cardinality**: Enforce `max_streams_per_user` and `max_global_streams_per_user` limits.
6. **Retention**: Enable via `compactor.retention_enabled: true` + `limits_config.retention_period`.
7. **Deprecated tools**: Promtail deprecated in Loki 3.4 (support ends 2026-02-28). Use Grafana Alloy.
8. **Thanos storage (Loki 3.4+)**: `use_thanos_objstore` is mutually exclusive with legacy config.

### Fluent Bit

1. **Always validate** generated configs with `fluentbit-validate-config.py` before delivering.
2. **INPUT → FILTER → OUTPUT** order is mandatory in all pipelines.
3. **Run `fluentbit-validate.sh`** on any hand-edited config.

## Done Criteria

A task is complete when:

- [ ] Relevant reference files consulted
- [ ] Query or config generated
- [ ] Validation script run and output shown to user
- [ ] Best-practice check run for PromQL/LogQL
- [ ] Anti-patterns explicitly listed and corrected
- [ ] Recording rules suggested if query is expensive or repeated
- [ ] For Loki configs: schema, replication, and storage settings verified
- [ ] No deprecated tools (Promtail, Grafana Agent, lokiexporter) recommended without warning
