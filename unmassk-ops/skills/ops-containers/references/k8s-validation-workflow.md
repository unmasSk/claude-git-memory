# Kubernetes YAML Validation Workflow

Five-stage pipeline for validating Kubernetes manifests. Run stages in order; do not skip stages without documenting the reason.

Script paths: `${CLAUDE_PLUGIN_ROOT}/skills/ops-containers/scripts/`

---

## Stage 0: Count documents

Count non-empty YAML documents before running validators. Record the count to verify validators process every document.

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/ops-containers/scripts/count_yaml_documents.py <file.yaml>
```

Fallback when Python is unavailable:

```bash
awk 'BEGIN{d=0;seen=0} /^[[:space:]]*---[[:space:]]*$/ {if(seen){d++;seen=0}; next} /^[[:space:]]*#/ {next} NF{seen=1} END{if(seen)d++; print d}' <file.yaml>
```

---

## Stage 1: Tool check

Determine which validation stages are available in the current environment.

```bash
bash ${CLAUDE_PLUGIN_ROOT}/skills/ops-containers/scripts/setup_tools.sh
```

If required tools are missing, continue with available tools and mark skipped stages in the report.

---

## Stage 2: YAML syntax (yamllint)

Catch YAML syntax errors before Kubernetes-specific validation.

```bash
yamllint -c ${CLAUDE_PLUGIN_ROOT}/skills/ops-containers/assets/.yamllint <file.yaml>
```

Detects: indentation errors (tabs vs spaces), trailing spaces, duplicate keys, syntax errors, line length violations.

---

## Stage 3: CRD detection

Identify non-standard resource types so their schemas can be loaded for Stage 4.

```bash
bash ${CLAUDE_PLUGIN_ROOT}/skills/ops-containers/scripts/detect_crd_wrapper.sh <file.yaml>
```

Example output:

```json
{
  "resources": [
    {
      "kind": "Certificate",
      "apiVersion": "cert-manager.io/v1",
      "group": "cert-manager.io",
      "version": "v1",
      "isCRD": true,
      "name": "example-cert"
    }
  ],
  "summary": {
    "totalDocuments": 1,
    "crdsDetected": 1
  }
}
```

For each detected CRD, look up documentation:

1. **context7 MCP (preferred):** resolve library ID with the CRD group/project name, then fetch docs
2. **Fallback:** search `"<kind>" "<group>" kubernetes CRD "<version>" documentation`

Use the documentation to verify required spec fields, field types, and enum values before running schema validation.

---

## Stage 4: Schema validation (kubeconform)

Validate against Kubernetes schemas. Use CRD schemas if detected in Stage 3.

**Standard resources:**

```bash
kubeconform \
  -schema-location default \
  -strict \
  -summary \
  -verbose \
  <file.yaml>
```

**With CRD schemas:**

```bash
kubeconform \
  -schema-location default \
  -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
  -strict \
  -ignore-missing-schemas \
  -summary \
  -verbose \
  <file.yaml>
```

**Key flags:**

| Flag | Effect |
|---|---|
| `-strict` | Reject unknown fields — catches typos (recommended for production) |
| `-ignore-missing-schemas` | Skip CRDs without available schemas rather than failing |
| `-kubernetes-version 1.30.0` | Validate against specific K8s version |
| `-output json` | Machine-readable output |

Detects: invalid `apiVersion`, missing required fields, wrong field types, unknown fields (strict mode), invalid enum values.

---

## Stage 5: Cluster dry-run (kubectl)

Validate against the actual cluster configuration including admission controllers and policies.

**Server-side (preferred when cluster is available):**

```bash
kubectl apply --dry-run=server -f <file.yaml>
```

Catches: resource quota violations, admission webhook rejections, policy violations (OPA/Kyverno), namespace existence, ConfigMap/Secret references.

**Client-side (fallback when no cluster access):**

```bash
kubectl apply --dry-run=client --validate=false -f <file.yaml>
```

Does not catch admission controller issues. If client-side also fails due to API discovery errors, skip dry-run and document the gap.

**Diff mode (for updates to existing resources):**

```bash
kubectl diff -f <file.yaml>
```

---

## Decision flow

```
Stage 0: Count documents
         ↓
Stage 1: Tool check — note unavailable tools
         ↓
Stage 2: yamllint syntax check
         ↓
Stage 3: CRD detection
    ┌────┴────┐
  CRD?   Standard
    ↓         ↓
  Lookup    (skip)
  CRD docs
    └────┬────┘
         ↓
Stage 4: kubeconform schema validation
         ↓
Stage 5: kubectl dry-run (if cluster available)
         ↓
Stage 6: Generate validation report
```

---

## Error handling

| Condition | Action |
|---|---|
| Tool not found | Run `setup_tools.sh`, skip that stage, mark as skipped in report |
| No cluster access | Skip server-side dry-run, attempt client-side, document gap |
| CRD docs not found | Proceed with kubeconform CRD catalog; note unverified spec fields |
| Multiple resources in one file | Validate each resource separately; track file:line for each issue |

---

## Validation report format

Report all findings. Do not modify files — report only.

```
## Validation Report — N issues found (X errors, Y warnings)

File: deployment.yaml
Resources analyzed: 3 (Deployment, Service, Certificate)

| Stage           | Status | Issues |
|-----------------|--------|--------|
| YAML Syntax     | PASS   | 0      |
| CRD Detection   | PASS   | 1 CRD  |
| Schema          | FAIL   | 2      |
| Dry-Run         | SKIP   | no cluster access |

### Issue 1 — deployment.yaml:21 — Wrong field type (Error)

Current:
  containerPort: "80"

Fix:
  containerPort: 80

Why: containerPort must be an integer, not a string.

### Issue 2 — deployment.yaml:45 — Missing resource limits (Warning)

Current:
  containers:
  - name: my-app
    image: my-app:1.0.0

Fix: add resources.requests and resources.limits

Why: missing limits → BestEffort QoS → evicted first under node pressure.

## Next Steps
1. Fix 2 errors before deploying
2. Address 0 warnings
3. Re-run validation after fixes
```

**Report rules:**
- Every issue includes file:line, current code, suggested fix, and explanation
- Group by file when multiple files are validated
- Errors first, then warnings
- List skipped stages and reason
