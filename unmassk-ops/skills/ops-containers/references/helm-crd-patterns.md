# CRD Patterns for Helm Charts

Helm template patterns for common Custom Resource Definitions. Use the corresponding values structure with each template.

---

## cert-manager

### Certificate

```yaml
{{- if .Values.certificate.enabled }}
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: {{ include "mychart.fullname" . }}-tls
  labels:
    {{- include "mychart.labels" . | nindent 4 }}
spec:
  secretName: {{ include "mychart.fullname" . }}-tls
  issuerRef:
    name: {{ .Values.certificate.issuer.name }}
    kind: {{ .Values.certificate.issuer.kind | default "ClusterIssuer" }}
    {{- with .Values.certificate.issuer.group }}
    group: {{ . }}
    {{- end }}
  commonName: {{ .Values.certificate.commonName | default (first .Values.certificate.dnsNames) }}
  dnsNames:
    {{- range .Values.certificate.dnsNames }}
    - {{ . | quote }}
    {{- end }}
  {{- with .Values.certificate.duration }}
  duration: {{ . }}
  {{- end }}
  {{- with .Values.certificate.renewBefore }}
  renewBefore: {{ . }}
  {{- end }}
{{- end }}
```

```yaml
# values.yaml
certificate:
  enabled: false
  issuer:
    name: letsencrypt-prod
    kind: ClusterIssuer
    group: cert-manager.io
  dnsNames:
    - example.com
  duration: 2160h
  renewBefore: 360h
```

### ClusterIssuer

```yaml
{{- if .Values.clusterIssuer.enabled }}
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: {{ .Values.clusterIssuer.name }}
spec:
  acme:
    server: {{ .Values.clusterIssuer.acme.server }}
    email: {{ .Values.clusterIssuer.acme.email | quote }}
    privateKeySecretRef:
      name: {{ .Values.clusterIssuer.name }}-account-key
    solvers:
      {{- toYaml .Values.clusterIssuer.acme.solvers | nindent 6 }}
{{- end }}
```

---

## Prometheus Operator

### ServiceMonitor

```yaml
{{- if .Values.serviceMonitor.enabled }}
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: {{ include "mychart.fullname" . }}
  labels:
    {{- include "mychart.labels" . | nindent 4 }}
    {{- with .Values.serviceMonitor.labels }}
    {{- toYaml . | nindent 4 }}
    {{- end }}
spec:
  selector:
    matchLabels:
      {{- include "mychart.selectorLabels" . | nindent 6 }}
  endpoints:
    - port: {{ .Values.serviceMonitor.port | default "metrics" }}
      path: {{ .Values.serviceMonitor.path | default "/metrics" }}
      interval: {{ .Values.serviceMonitor.interval | default "30s" }}
      {{- with .Values.serviceMonitor.scrapeTimeout }}
      scrapeTimeout: {{ . }}
      {{- end }}
{{- end }}
```

```yaml
serviceMonitor:
  enabled: false
  port: metrics
  path: /metrics
  interval: 30s
  labels: {}
```

### PrometheusRule

```yaml
{{- if .Values.prometheusRule.enabled }}
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: {{ include "mychart.fullname" . }}
  labels:
    {{- include "mychart.labels" . | nindent 4 }}
spec:
  groups:
    {{- toYaml .Values.prometheusRule.groups | nindent 4 }}
{{- end }}
```

---

## Istio

### VirtualService

```yaml
{{- if .Values.virtualService.enabled }}
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: {{ include "mychart.fullname" . }}
  labels:
    {{- include "mychart.labels" . | nindent 4 }}
spec:
  hosts:
    {{- range .Values.virtualService.hosts }}
    - {{ . | quote }}
    {{- end }}
  {{- with .Values.virtualService.gateways }}
  gateways:
    {{- toYaml . | nindent 4 }}
  {{- end }}
  http:
    - route:
        - destination:
            host: {{ include "mychart.fullname" . }}
            port:
              number: {{ .Values.service.port }}
          weight: 100
{{- end }}
```

### PeerAuthentication

```yaml
{{- if .Values.peerAuthentication.enabled }}
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: {{ include "mychart.fullname" . }}
spec:
  selector:
    matchLabels:
      {{- include "mychart.selectorLabels" . | nindent 6 }}
  mtls:
    mode: {{ .Values.peerAuthentication.mtls.mode | default "STRICT" }}
{{- end }}
```

---

## ArgoCD

### Application

```yaml
{{- if .Values.argocd.application.enabled }}
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: {{ include "mychart.fullname" . }}
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: {{ .Values.argocd.application.project | default "default" }}
  source:
    repoURL: {{ .Values.argocd.application.source.repoURL | quote }}
    targetRevision: {{ .Values.argocd.application.source.targetRevision | default "HEAD" | quote }}
    path: {{ .Values.argocd.application.source.path | quote }}
    helm:
      valueFiles:
        {{- range .Values.argocd.application.source.helm.valueFiles }}
        - {{ . | quote }}
        {{- end }}
  destination:
    server: {{ .Values.argocd.application.destination.server | default "https://kubernetes.default.svc" | quote }}
    namespace: {{ .Values.argocd.application.destination.namespace | quote }}
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
{{- end }}
```

---

## External Secrets Operator

### ExternalSecret

```yaml
{{- if .Values.externalSecret.enabled }}
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: {{ include "mychart.fullname" . }}
  labels:
    {{- include "mychart.labels" . | nindent 4 }}
spec:
  refreshInterval: {{ .Values.externalSecret.refreshInterval | default "1h" }}
  secretStoreRef:
    name: {{ .Values.externalSecret.secretStoreRef.name }}
    kind: {{ .Values.externalSecret.secretStoreRef.kind | default "ClusterSecretStore" }}
  target:
    name: {{ include "mychart.fullname" . }}
    creationPolicy: Owner
  data:
    {{- range .Values.externalSecret.data }}
    - secretKey: {{ .secretKey }}
      remoteRef:
        key: {{ .remoteRef.key }}
        {{- with .remoteRef.property }}
        property: {{ . }}
        {{- end }}
    {{- end }}
{{- end }}
```

```yaml
externalSecret:
  enabled: false
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  data:
    - secretKey: api-key
      remoteRef:
        key: myapp/secrets
        property: api-key
```

---

## KEDA

### ScaledObject

```yaml
{{- if .Values.keda.enabled }}
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: {{ include "mychart.fullname" . }}
  labels:
    {{- include "mychart.labels" . | nindent 4 }}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ include "mychart.fullname" . }}
  minReplicaCount: {{ .Values.keda.minReplicaCount | default 0 }}
  maxReplicaCount: {{ .Values.keda.maxReplicaCount | default 10 }}
  cooldownPeriod: {{ .Values.keda.cooldownPeriod | default 300 }}
  triggers:
    {{- toYaml .Values.keda.triggers | nindent 4 }}
{{- end }}
```

---

## Usage notes

- Replace `mychart` with your actual chart name in all `include` calls.
- Always guard CRD resources with an `enabled` flag in values.
- Check the CRD version installed in the target cluster before generating manifests.
- Use `kubectl explain <kind>.<field>` to inspect CRD field requirements.
