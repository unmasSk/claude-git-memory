# Helm Template Functions Reference

Essential Helm and Sprig functions with practical examples.

---

## Core Helm functions

### required — enforce mandatory values

```yaml
image: {{ required "image.repository is required!" .Values.image.repository }}
data:
  password: {{ required "database.password must be set" .Values.database.password | b64enc }}
```

Fails template rendering with the given error message if the value is empty or nil.

### include — include template with pipeline support

```yaml
metadata:
  labels:
    {{- include "mychart.labels" . | nindent 4 }}

# With custom context
{{- include "mychart.container" (dict "root" . "container" .Values.mainContainer) }}
```

Prefer `include` over `template` — `include` allows piping the output to other functions.

### tpl — render string as template

```yaml
# values.yaml
config:
  message: "Release: {{ .Release.Name }}"

# template
data:
  message: {{ tpl .Values.config.message . }}
```

Use when users provide template strings in values.

### lookup — query cluster resources

```yaml
{{- $secret := lookup "v1" "Secret" .Release.Namespace "my-secret" }}
{{- if $secret }}
  password: {{ $secret.data.password }}
{{- else }}
  password: {{ randAlphaNum 16 | b64enc }}
{{- end }}
```

`lookup` queries the live cluster — only works during `helm install`/`upgrade`, not `helm template`. Use sparingly.

---

## String functions

```yaml
# quote / squote
value: {{ .Values.host | quote }}       # "localhost"
value: {{ .Values.name | squote }}      # 'myapp'

# default — fallback value
replicas: {{ .Values.replicaCount | default 1 }}
tag: {{ .Values.image.tag | default .Chart.AppVersion | quote }}

# trim / trimSuffix / trimPrefix / trunc
name: {{ .Release.Name | trimSuffix "-dev" }}
name: {{ .Values.name | trunc 63 | trimSuffix "-" }}

# upper / lower
env: {{ .Values.environment | upper }}  # PRODUCTION
name: {{ .Values.name | lower }}

# replace
chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" }}

# contains / hasPrefix / hasSuffix
{{- if contains "prod" .Values.environment }}
{{- if hasPrefix "app-" .Values.name }}
```

---

## Type conversion

```yaml
# toYaml — render complex object as YAML
{{- with .Values.resources }}
resources:
  {{- toYaml . | nindent 2 }}
{{- end }}

# toJson / fromJson
data:
  config.json: |
    {{- .Values.config | toJson | nindent 4 }}

# toString
port: {{ .Values.port | toString | quote }}
```

---

## Indentation

```yaml
# nindent — newline + indent (preferred for YAML blocks)
metadata:
  labels:
    {{- include "mychart.labels" . | nindent 4 }}

# indent — indent without newline
data:
  config: |
    {{ .Values.config | indent 4 }}
```

Use `nindent` for most cases. Use `indent` inside multi-line string blocks.

---

## Logic and flow

```yaml
# if / else if / else
{{- if eq .Values.service.type "LoadBalancer" }}
{{- else if eq .Values.service.type "NodePort" }}
{{- else }}
{{- end }}

# and / or / not
{{- if and .Values.enabled (not .Values.debug) }}
{{- if or .Values.useSSL .Values.production }}

# with — scope to value (. becomes the value inside)
{{- with .Values.nodeSelector }}
nodeSelector:
  {{- toYaml . | nindent 2 }}
{{- end }}

# range — iterate list
{{- range .Values.items }}
- {{ . }}
{{- end }}

# range — iterate map
{{- range $key, $value := .Values.config }}
{{ $key }}: {{ $value }}
{{- end }}
```

Inside `with` and `range`, use `$` to access the root context.

---

## Comparisons

```yaml
{{- if eq .Values.env "production" }}
{{- if ne .Values.replicas 1 }}
{{- if gt .Values.replicaCount 1 }}
{{- if le .Values.maxConnections 100 }}
```

Functions: `eq`, `ne`, `lt`, `le`, `gt`, `ge`

---

## Collections

```yaml
# list
{{- $myList := list "a" "b" "c" }}

# append / prepend
{{- $list = append $list "d" }}

# has — check membership
{{- if has "production" .Values.environments }}

# compact — remove empty elements
{{- $clean := compact (list "a" "" "b" nil "c") }}  # ["a", "b", "c"]

# uniq — deduplicate
{{- $unique := uniq $list }}
```

---

## Dictionaries

```yaml
# dict — create dictionary
{{- $ctx := dict "root" . "container" .Values.mainContainer }}
{{- include "mychart.container" $ctx }}

# merge — merge dicts (left wins)
{{- $merged := merge .Values.override .Values.defaults }}

# hasKey
{{- if hasKey .Values "database" }}

# pick / omit
{{- $subset := pick .Values.config "host" "port" }}
{{- $filtered := omit .Values.config "password" }}

# keys
{{- range $key := keys .Values.labels | sortAlpha }}
  {{ $key }}: {{ index $.Values.labels $key }}
{{- end }}
```

---

## Crypto and encoding

```yaml
# b64enc / b64dec
data:
  password: {{ .Values.password | b64enc }}

# sha256sum — trigger rolling update on config change
annotations:
  checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
```

---

## Math functions

```yaml
replicas: {{ add .Values.baseReplicas 2 }}
replicas: {{ max 1 .Values.replicaCount }}
replicas: {{ min 10 .Values.replicaCount }}
```

---

## Semantic versions

```yaml
{{- if semverCompare ">=1.20.0" .Capabilities.KubeVersion.Version }}
# Kubernetes 1.20 or higher
{{- end }}
```

---

## Coalesce and ternary

```yaml
# coalesce — first non-empty value
name: {{ coalesce .Values.nameOverride .Values.name .Chart.Name }}

# ternary — inline if-then-else
type: {{ ternary "LoadBalancer" "ClusterIP" .Values.production }}
```

---

## Common patterns

### Resource name helper

```yaml
{{- define "mychart.fullname" -}}
{{- $name := include "mychart.name" . -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
```

### ConfigMap checksum (rolling update on change)

```yaml
annotations:
  checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
```

### Cache template result in variable

```yaml
{{- $fullname := include "mychart.fullname" . }}
name: {{ $fullname }}
matchLabels:
  app: {{ $fullname }}
```

### Common gotchas

| Gotcha | Fix |
|--------|-----|
| `{{- if .Values.optional }}` fails if nil | Use `{{- if .Values.optional \| default "" }}` |
| Integer field needs string comparison | `{{- if eq (.Values.port \| toString) "80" }}` |
| Extra whitespace in output | Use `{{-` and `-}}` to chomp whitespace |
