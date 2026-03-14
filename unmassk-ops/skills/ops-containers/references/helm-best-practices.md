# Helm Chart Best Practices

Rules and patterns for creating, testing, and maintaining Helm charts.

---

## Chart structure

```
mychart/
  Chart.yaml        # Required: chart metadata
  values.yaml       # Required: default configuration
  templates/        # Required: Kubernetes resource templates
  templates/_helpers.tpl
  templates/NOTES.txt
  .helmignore
```

### Chart.yaml

```yaml
apiVersion: v2           # Helm 3+ — always use v2
name: mychart
description: A Helm chart for Kubernetes
type: application        # or 'library' for helper charts
version: 0.1.0           # Chart version (SemVer)
appVersion: "1.16.0"     # App version being packaged

kubeVersion: ">=1.21.0-0"

dependencies:
  - name: postgresql
    version: "~11.6.0"
    repository: "https://charts.bitnami.com/bitnami"
    condition: postgresql.enabled
```

---

## Template rules

### Use `include` instead of `template`

```yaml
# Good: output can be piped to nindent, quote, etc.
metadata:
  labels:
    {{- include "mychart.labels" . | nindent 4 }}

# Bad: cannot pipe output
metadata:
  labels:
    {{- template "mychart.labels" . }}
```

### Always quote string values

```yaml
# Good
env:
  - name: DATABASE_HOST
    value: {{ .Values.database.host | quote }}

# Bad: fails with special characters
env:
  - name: DATABASE_HOST
    value: {{ .Values.database.host }}
```

### Use `required` for critical values

```yaml
data:
  password: {{ required "A valid .Values.password is required!" .Values.password | b64enc }}
```

Fails at render time with a helpful error if the value is missing.

### Use `default` for optional values

```yaml
replicas: {{ .Values.replicaCount | default 1 }}
image:
  tag: {{ .Values.image.tag | default .Chart.AppVersion }}
```

### Use `nindent` for block indentation

```yaml
# Good: adds newline before indenting
spec:
  template:
    metadata:
      labels:
        {{- include "mychart.labels" . | nindent 8 }}

# Bad: missing newline
spec:
  template:
    metadata:
      labels:
{{ include "mychart.labels" . | indent 8 }}
```

### Use `toYaml` for complex structures

```yaml
{{- with .Values.resources }}
resources:
  {{- toYaml . | nindent 2 }}
{{- end }}
```

Allows users to set complex YAML structures in values without additional templating.

### Use template comments

```yaml
{{- /*
This helper creates the fullname for resources.
It supports nameOverride and fullnameOverride.
*/ -}}
{{- define "mychart.fullname" -}}
```

Template comments (`{{- /* */ -}}`) are stripped from output. YAML comments (`#`) remain.

### Truncate resource names

Kubernetes resource names must be <= 63 characters:

```yaml
name: {{ include "mychart.fullname" . | trunc 63 | trimSuffix "-" }}
```

### Whitespace control

```yaml
# Good: no extra blank lines
{{- if .Values.enabled }}
  key: value
{{- end }}
```

---

## values.yaml rules

### Document all values

```yaml
# replicaCount is the number of pod replicas
replicaCount: 1

image:
  # image.repository is the container image name
  repository: nginx
  # image.tag overrides the chart appVersion
  tag: ""
  pullPolicy: IfNotPresent
```

### Sensible defaults

```yaml
replicaCount: 1

service:
  type: ClusterIP
  port: 80

resources:
  limits:
    cpu: 100m
    memory: 128Mi
  requests:
    cpu: 100m
    memory: 128Mi
```

### Feature toggles

```yaml
ingress:
  enabled: false
  className: ""
  annotations: {}
  hosts:
    - host: chart-example.local
      paths:
        - path: /
          pathType: Prefix
  tls: []
```

### Empty structures for optional config

```yaml
nodeSelector: {}
tolerations: []
affinity: {}
```

---

## Kubernetes resource rules

### Recommended labels

```yaml
metadata:
  labels:
    app.kubernetes.io/name: {{ include "mychart.name" . }}
    app.kubernetes.io/instance: {{ .Release.Name }}
    app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
    app.kubernetes.io/managed-by: {{ .Release.Service }}
    helm.sh/chart: {{ include "mychart.chart" . }}
```

### Resource limits required

```yaml
resources:
  limits:
    cpu: 100m
    memory: 128Mi
  requests:
    cpu: 100m
    memory: 128Mi
```

### SecurityContext

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  fsGroup: 2000
  capabilities:
    drop:
      - ALL
  readOnlyRootFilesystem: true
```

### Probes

```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: http
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: http
  initialDelaySeconds: 5
  periodSeconds: 5
```

---

## Testing

```bash
# Lint
helm lint ./mychart

# Render templates
helm template my-release ./mychart

# Dry-run install
helm install my-release ./mychart --dry-run --debug

# Diff on upgrade
helm diff upgrade my-release ./mychart
```

---

## Helm hooks

```yaml
metadata:
  annotations:
    "helm.sh/hook": pre-upgrade
    "helm.sh/hook-weight": "1"
    "helm.sh/hook-delete-policy": hook-succeeded
```

Available hooks: `pre-install`, `post-install`, `pre-upgrade`, `post-upgrade`, `pre-delete`, `post-delete`, `pre-rollback`, `post-rollback`, `test`

---

## Release checklist

- [ ] `Chart.yaml` has correct `apiVersion: v2`, version, and appVersion
- [ ] All values documented in `values.yaml`
- [ ] Sensible defaults — chart works out of the box
- [ ] Helpers used for repeated logic (`_helpers.tpl`)
- [ ] Resource names truncated to 63 chars
- [ ] Kubernetes recommended labels applied
- [ ] Resources have limits and requests
- [ ] SecurityContext defined
- [ ] Probes configured
- [ ] Secrets parameterized (not hardcoded)
- [ ] `helm lint` passes
- [ ] `helm template` renders without error
- [ ] `.helmignore` excludes unnecessary files
