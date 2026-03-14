# Helm Validator and Advanced Template Functions

Advanced Helm functions for validation, file handling, and complex template patterns.

---

## Validation functions

### required

```yaml
# Fail immediately with a helpful message if value is missing
name: {{ required "service.name must be set" .Values.service.name }}
password: {{ required "database.password must be set" .Values.database.password | b64enc }}

# Validate multiple values
env:
  - name: API_KEY
    value: {{ required "apiKey must be provided" .Values.apiKey | quote }}
```

### fail

```yaml
# Fail with custom validation logic
{{- if not .Values.required }}
  {{- fail "required value is not set" }}
{{- end }}

{{- if lt .Values.replicas 1 }}
  {{- fail "replicas must be at least 1" }}
{{- end }}
```

---

## File functions

### Files.Get

```yaml
# Read a file from the chart
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "mychart.fullname" . }}
data:
  config.yaml: |
    {{- .Files.Get "config/app.yaml" | nindent 4 }}
```

### Files.Glob

```yaml
# Include all files matching a pattern
data:
  {{- range $path, $content := .Files.Glob "config/*.yaml" }}
  {{ base $path }}: |
    {{- $content | nindent 4 }}
  {{- end }}
```

### Files.AsConfig / Files.AsSecrets

```yaml
# ConfigMap from all files in directory
data:
  {{- (.Files.Glob "config/*").AsConfig | nindent 2 }}

# Secret from all files in directory
data:
  {{- (.Files.Glob "secrets/*").AsSecrets | nindent 2 }}
```

### Files.Lines

```yaml
# Process a file line by line
{{- range .Files.Lines "config/servers.txt" }}
  - {{ . }}
{{- end }}
```

---

## Random generation

```yaml
# Random alphanumeric string (for passwords)
{{- $password := randAlphaNum 16 }}

# Random UUID
id: {{ uuidv4 }}

# Random alpha or numeric
code: {{ randAlpha 8 }}
id: {{ randNumeric 6 }}
```

---

## Regex functions

```yaml
# regexMatch — test pattern
{{- if regexMatch "^[0-9]+$" .Values.port }}
  # port is numeric
{{- end }}

# regexFind
{{- $version := .Values.image.tag | regexFind "[0-9]+" }}

# regexReplaceAll
clean: {{ regexReplaceAll "[^a-z0-9-]" .Values.name "" }}

# regexSplit
{{- $parts := regexSplit ":" .Values.imageTag -1 }}
```

---

## Date functions

```yaml
# Current timestamp annotation
annotations:
  timestamp: {{ now | date "2006-01-02T15:04:05Z" }}

# Date formats
date: {{ now | date "2006-01-02" }}             # 2024-01-15
timestamp: {{ now | date "2006-01-02T15:04:05Z07:00" }}

# Date arithmetic
tomorrow: {{ now | dateModify "24h" }}
lastWeek: {{ now | dateModify "-168h" }}
```

Go's reference time is `2006-01-02T15:04:05Z07:00` — use these exact values as format placeholders.

---

## Math functions

```yaml
# Arithmetic
replicas: {{ add .Values.baseReplicas 2 }}
port: {{ sub .Values.maxPort 100 }}
memory: {{ mul .Values.memoryPerPod .Values.replicas }}
cpuPerPod: {{ div .Values.totalCpu .Values.replicas }}

# Bounds
replicas: {{ max 1 .Values.replicaCount }}
replicas: {{ min 10 .Values.replicaCount }}

# Rounding
value: {{ floor 3.7 }}   # 3
value: {{ ceil 3.2 }}    # 4
value: {{ round 3.5 }}   # 4
```

---

## Path functions

```yaml
{{- $filename := base "/path/to/file.yaml" }}    # file.yaml
{{- $dir := dir "/path/to/file.yaml" }}           # /path/to
{{- $ext := ext "file.yaml" }}                    # .yaml
{{- $clean := clean "/path//to/../file" }}         # /path/file
```

---

## Advanced patterns

### Custom context passing

```yaml
{{- define "mychart.container" -}}
{{- $root := .root }}
{{- $container := .container }}
{{- $port := .port }}
name: {{ $container.name }}
image: {{ $container.image }}
ports:
  - containerPort: {{ $port }}
{{- end }}

# Usage
{{- include "mychart.container" (dict "root" . "container" .Values.mainContainer "port" 8080) }}
```

### Multi-stage value processing

```yaml
{{- $config := .Values.configYaml | fromYaml }}
{{- $merged := merge .Values.overrides $config }}
{{- $filtered := omit $merged "internalKey" }}
config: |
  {{- $filtered | toYaml | nindent 2 }}
```

### Safe value extraction

```yaml
{{- $password := "" }}
{{- if and .Values.database (hasKey .Values.database "password") }}
{{- $password = .Values.database.password }}
{{- else }}
{{- $password = randAlphaNum 16 }}
{{- end }}
```

### Configuration merging from file

```yaml
{{- $defaults := .Files.Get "config/defaults.yaml" | fromYaml }}
{{- $overrides := .Values.config | default (dict) }}
{{- $final := merge $overrides $defaults }}
config: |
  {{- $final | toYaml | nindent 2 }}
```

### Pipeline composition

```yaml
# Chain multiple string functions
value: {{ .Values.name | trim | lower | replace " " "-" | trunc 63 | trimSuffix "-" | quote }}
```

---

## Performance tips

Cache template results to avoid recalculation:

```yaml
{{- $fullname := include "mychart.fullname" . }}
name: {{ $fullname }}
matchLabels:
  app: {{ $fullname }}
```

Minimize `lookup` calls — they query the cluster and are expensive. Store the result in a variable if reused:

```yaml
{{- $secret := lookup "v1" "Secret" .Release.Namespace "my-secret" }}
{{- if $secret }}
  {{- $secret.data.password }}
{{- end }}
```

---

## Debugging

```yaml
# Print values for inspection (causes rendering to fail — use in development only)
{{- toYaml .Values | fail }}

# Debug specific value
{{- printf "Debug: name=%s" .Values.name | fail }}
```
