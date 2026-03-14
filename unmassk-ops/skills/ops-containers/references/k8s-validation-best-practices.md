# Kubernetes YAML Best Practices

Rules and patterns for generating valid, production-ready Kubernetes manifests.

---

## YAML formatting rules

- 2-space indentation — never tabs
- Quote string values containing special characters (`:`  `{`  `}` `[` `]` `#` `&` `*`)
- Separate multi-document files with `---`
- One resource per file unless resources are logically coupled (e.g., Deployment + Service)
- File naming: `<resource-type>-<name>.yaml` (e.g., `deployment-my-app.yaml`)

---

## Required fields

Every resource requires `apiVersion`, `kind`, and `metadata.name`.

| Resource | Additional required fields |
|---|---|
| Deployment | `spec.selector`, `spec.template.spec.containers` |
| StatefulSet | `spec.selector`, `spec.serviceName`, `spec.template.spec.containers` |
| Service | `spec.ports` |
| Job | `spec.template.spec.containers`, `spec.template.spec.restartPolicy` (`Never` or `OnFailure`) |

---

## Metadata and labels

Use `app.kubernetes.io/` recommended labels:

```yaml
metadata:
  name: my-app
  namespace: production
  labels:
    app.kubernetes.io/name: my-app
    app.kubernetes.io/version: "1.0.0"
    app.kubernetes.io/component: backend
    app.kubernetes.io/managed-by: kubectl
```

- `selector.matchLabels` in Deployment/StatefulSet must be a subset of `template.metadata.labels`
- `selector` is immutable after creation — changing it requires delete + recreate
- Service `selector` targets pod labels, not Deployment labels

---

## Resource limits

Always specify both requests and limits:

```yaml
resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "256Mi"
    cpu: "500m"
```

- CPU: millicore notation (`500m`) or fractional (`0.5`)
- Memory: binary SI notation (`128Mi`, `1Gi`)
- Missing limits → BestEffort QoS → evicted first under node pressure

---

## Probes

Define liveness and readiness probes on every long-running container:

```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: http
  initialDelaySeconds: 10
  periodSeconds: 15
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /readyz
    port: http
  initialDelaySeconds: 5
  periodSeconds: 10
  failureThreshold: 3
```

- Use named ports (`port: http`) rather than numbers — stays correct if the port changes
- Set `initialDelaySeconds` generously for slow-starting apps; aggressive liveness probes cause CrashLoopBackOff
- Add `startupProbe` for apps with variable startup time

---

## Security

Minimum security context for every container (see `k8s-security-patterns.md` for full patterns):

```yaml
securityContext:
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop:
    - ALL
```

Pod-level addition:

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  seccompProfile:
    type: RuntimeDefault
```

---

## Image management

```yaml
image: registry.example.com/my-app:v1.2.3   # Always use specific tags
imagePullPolicy: IfNotPresent                 # Use Always only with :latest (avoid :latest)
```

- Never use `:latest` in production — makes rollbacks impossible and breaks reproducibility
- Pin to digest (`image@sha256:...`) for immutable deployments

---

## Common validation issues

| Issue | Symptom | Fix |
|---|---|---|
| `selector.matchLabels` ≠ pod labels | `Invalid value` on apply | Align selector and template labels exactly |
| `restartPolicy: Always` in Job | Validation error | Use `Never` or `OnFailure` |
| `targetPort` mismatch | Service has no endpoints | Match container port name or number |
| String where integer expected | Schema error | `containerPort: 80` not `"80"` |
| Non-namespaced resource with namespace | Warning or error | ClusterRole, PV, StorageClass are cluster-scoped |

---

## Deprecated API versions

| Old | Current | Removed in |
|---|---|---|
| `extensions/v1beta1` Deployment | `apps/v1` | K8s 1.16 |
| `networking.k8s.io/v1beta1` Ingress | `networking.k8s.io/v1` | K8s 1.22 |
| `policy/v1beta1` PodDisruptionBudget | `policy/v1` | K8s 1.25 |
| `autoscaling/v2beta2` HPA | `autoscaling/v2` | K8s 1.26 |

---

## CRD considerations

- Verify the CRD is installed before applying resources that use it
- CRD `apiVersion` must match the version served by the cluster
- Required spec fields vary by CRD — check with `kubectl explain <kind>` or the operator docs
- kubeconform skips unknown CRDs by default; use `-ignore-missing-schemas` and supply CRD schemas for full validation
