# Kubernetes YAML Best Practices for Helm

Best practices for Kubernetes resources inside Helm charts.

---

## Metadata

### Standard labels

Always include these labels on every resource:

```yaml
metadata:
  labels:
    app.kubernetes.io/name: {{ include "mychart.name" . }}
    app.kubernetes.io/instance: {{ .Release.Name }}
    app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
    app.kubernetes.io/component: backend
    app.kubernetes.io/part-of: my-system
    app.kubernetes.io/managed-by: {{ .Release.Service }}
    helm.sh/chart: {{ include "mychart.chart" . }}
```

| Label | Purpose |
|-------|---------|
| `app.kubernetes.io/name` | Application name |
| `app.kubernetes.io/instance` | Unique release identifier |
| `app.kubernetes.io/version` | Application version |
| `app.kubernetes.io/managed-by` | Helm tooling integration |

### Selector labels

Selectors must be a subset of pod template labels. Selectors are immutable after creation.

```yaml
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: my-app
      app.kubernetes.io/instance: my-app-prod
  template:
    metadata:
      labels:
        app.kubernetes.io/name: my-app
        app.kubernetes.io/instance: my-app-prod
        app.kubernetes.io/version: "1.0.0"   # Additional label OK — not in selector
```

Never include version in selector labels — it prevents rolling updates.

---

## Resource limits

Required on every container. Without them, pods are scheduled with BestEffort QoS and can be evicted first.

```yaml
resources:
  requests:
    memory: "64Mi"
    cpu: "100m"
  limits:
    memory: "128Mi"
    cpu: "500m"
```

| QoS class | When | Behavior |
|-----------|------|----------|
| Guaranteed | requests == limits | Never evicted under memory pressure |
| Burstable | requests < limits | Evicted after BestEffort |
| BestEffort | no requests or limits | Evicted first |

CPU is compressible (throttled when exceeding limit). Memory is not (pod killed when exceeding limit).

---

## Probes

### Liveness probe

Determines if the container should be restarted. Check only that the app is running, not dependencies.

```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

### Readiness probe

Determines if the container can receive traffic. Check application and its dependencies.

```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
```

### Startup probe

For slow-starting containers (Kubernetes 1.18+). Disables liveness/readiness until startup succeeds.

```yaml
startupProbe:
  httpGet:
    path: /healthz
    port: 8080
  periodSeconds: 10
  failureThreshold: 30   # 30 * 10s = 300s max startup time
```

| Probe type | Use for |
|------------|---------|
| `httpGet` | HTTP APIs, web apps |
| `tcpSocket` | Databases, message queues |
| `exec` | Custom scripts |
| `grpc` | gRPC health protocol |

---

## Security context

### Pod-level

```yaml
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    runAsGroup: 3000
    fsGroup: 2000
    fsGroupChangePolicy: "OnRootMismatch"
    seccompProfile:
      type: RuntimeDefault
```

### Container-level

```yaml
containers:
  - name: app
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      runAsNonRoot: true
      runAsUser: 1000
      capabilities:
        drop:
          - ALL
        add:
          - NET_BIND_SERVICE   # Only if binding port < 1024
```

---

## Image management

```yaml
containers:
  - name: app
    image: registry.example.com/my-app:v1.2.3
    imagePullPolicy: IfNotPresent
```

| Pull policy | Use when |
|-------------|----------|
| `IfNotPresent` | Immutable tags (recommended) |
| `Always` | Mutable tags (`:latest`) |
| `Never` | Pre-loaded images (rare) |

Never use `:latest` in production.

---

## Pod Disruption Budgets

Ensure minimum availability during voluntary disruptions (node drains, cluster upgrades).

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: {{ include "mychart.fullname" . }}-pdb
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      {{- include "mychart.selectorLabels" . | nindent 6 }}
```

Do not set `minAvailable` equal to `replicas` — it blocks all voluntary disruptions.

---

## Horizontal Pod Autoscaler

```yaml
{{- if .Values.autoscaling.enabled }}
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ include "mychart.fullname" . }}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ include "mychart.fullname" . }}
  minReplicas: {{ .Values.autoscaling.minReplicas }}
  maxReplicas: {{ .Values.autoscaling.maxReplicas }}
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: {{ .Values.autoscaling.targetCPUUtilizationPercentage }}
{{- end }}
```

HPA requires `resources.requests` to be set — without requests, CPU utilization cannot be calculated. When HPA is enabled, remove the static `replicas` field from the Deployment.

---

## Network Policies

Start with default-deny, then add allow rules:

```yaml
# Default deny all
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
---
# Allow specific ingress
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 8080
```

Always allow DNS egress (UDP+TCP port 53) or pod DNS lookups fail.

---

## ConfigMaps and Secrets

```yaml
# ConfigMap for non-sensitive config
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "mychart.fullname" . }}-config
data:
  LOG_LEVEL: "info"
  config.yaml: |
    server:
      port: 8080
---
# Secret for sensitive data
apiVersion: v1
kind: Secret
metadata:
  name: {{ include "mychart.fullname" . }}-secret
type: Opaque
data:
  password: {{ .Values.password | b64enc | quote }}
```

Mount as environment variables:
```yaml
env:
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: my-secret
        key: password
```

Mount as files:
```yaml
volumes:
  - name: secrets
    secret:
      secretName: my-secret
      defaultMode: 0400
volumeMounts:
  - name: secrets
    mountPath: /etc/secrets
    readOnly: true
```

---

## Deprecated API versions

| Old API | New API | Removed in |
|---------|---------|-----------|
| `extensions/v1beta1` Deployment | `apps/v1` | K8s 1.16 |
| `extensions/v1beta1` Ingress | `networking.k8s.io/v1` | K8s 1.22 |
| `policy/v1beta1` PodDisruptionBudget | `policy/v1` | K8s 1.25 |
| `autoscaling/v2beta1` HPA | `autoscaling/v2` | K8s 1.26 |
| `batch/v1beta1` CronJob | `batch/v1` | K8s 1.25 |

Always use the current stable API version.
