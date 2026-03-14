# Dockerfile Security Best Practices

Security rules for writing production Dockerfiles.

---

## Base image security

### Pin specific tags

```dockerfile
# Unpredictable — may pull a vulnerable version
FROM node:latest

# Specific version
FROM node:20-alpine

# Digest-pinned — fully reproducible
FROM node:20-alpine@sha256:2c6c59cf4d34d4f937ddfcf33bab9d8bbad8658d1b9de7b97622566a52167f5b
```

### Choose minimal base images

Fewer packages = fewer vulnerabilities.

| Base | Size | Attack surface |
|------|------|----------------|
| `ubuntu:22.04` | ~80 MB | Large |
| `node:20-alpine` | ~50 MB | Small |
| `gcr.io/distroless/static-debian12` | ~2 MB | Minimal |
| `scratch` | 0 MB | Zero (static binaries only) |

### Scan base images

```bash
trivy image node:20-alpine
docker scout cves node:20-alpine
snyk container test node:20-alpine
```

---

## User management

Never run containers as root.

### Create non-root user

**Alpine:**
```dockerfile
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup
USER appuser
```

**Debian/Ubuntu:**
```dockerfile
RUN useradd -m -u 1001 appuser
USER appuser
```

**Distroless (built-in user):**
```dockerfile
FROM gcr.io/distroless/static-debian12
USER nonroot:nonroot
```

### Set file ownership

```dockerfile
# Copy with ownership in one step (no extra layer)
COPY --chown=appuser:appuser . /app
```

---

## Secrets management

### Never hardcode secrets

```dockerfile
# Never do this
ENV API_KEY=sk_live_abc123
ENV DATABASE_PASSWORD=password123
```

Set secrets at runtime via environment variables or a secrets manager. Declare placeholders with empty defaults only if needed for documentation:
```dockerfile
ENV API_KEY=""
```

### Build secrets (BuildKit)

Secrets are mounted at build time and never written to any layer.

```dockerfile
# syntax=docker/dockerfile:1
FROM alpine
RUN --mount=type=secret,id=api_key \
    API_KEY=$(cat /run/secrets/api_key) && \
    configure-app --api-key "$API_KEY"
```

```bash
docker build --secret id=api_key,src=.env .
```

### Why multi-stage prevents secret leakage

Even if a secret is written in an intermediate stage, it is never copied to the final stage and is not present in the final image layers.

---

## Dependency management

### Pin versions for reproducible builds

```dockerfile
# Apt: pin exact version
RUN apt-get install -y curl=7.81.0-1ubuntu1.16

# Node.js: use lock file
COPY package*.json ./
RUN npm ci

# Python: pin in requirements.txt (==1.2.3)
RUN pip install --no-cache-dir -r requirements.txt

# Go: go.sum ensures reproducibility
COPY go.mod go.sum ./
RUN go mod download
```

### Clean caches in same layer

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN apk add --no-cache curl

RUN npm ci && npm cache clean --force

RUN pip install --no-cache-dir -r requirements.txt
```

---

## Attack surface reduction

### Minimize installed packages

```dockerfile
# Only essential packages
RUN apt-get install -y --no-install-recommends \
    curl \
    ca-certificates
```

Never install: `vim`, `wget`, `sudo`, `ssh`, `telnet`, or any debugging tool in production images.

### Use virtual package groups (Alpine)

Install, use, and remove build dependencies in one layer:

```dockerfile
RUN apk add --no-cache --virtual .build-deps \
    gcc musl-dev \
    && pip install --no-cache-dir -r requirements.txt \
    && apk del .build-deps
```

### Expose only necessary ports

```dockerfile
EXPOSE 8080

# Never expose: 22 (SSH), 3306 (MySQL), 5432 (Postgres)
```

Use ports above 1024 — ports below 1024 require root privileges.

---

## Scanning in CI/CD

```yaml
# GitHub Actions
- name: Scan Docker image
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: myapp:latest
    format: sarif
    output: trivy-results.sarif
```

---

## Security checklist

- [ ] Specific base image tag (no `:latest`)
- [ ] Minimal base image (Alpine, distroless, or scratch)
- [ ] Non-root user created and set with `USER`
- [ ] No hardcoded secrets anywhere in Dockerfile
- [ ] Build secrets use `--mount=type=secret` (not `ARG` or `ENV`)
- [ ] Dependency versions pinned
- [ ] Package manager caches cleaned in same `RUN` layer
- [ ] Only necessary packages installed (`--no-install-recommends`)
- [ ] Multi-stage build — build tools absent from final image
- [ ] Only necessary ports exposed
- [ ] Image scanned with Trivy or Docker Scout
- [ ] `HEALTHCHECK` defined
- [ ] Validated with hadolint and Checkov

---

## Tools

| Tool | Purpose |
|------|---------|
| `hadolint` | Dockerfile linting with security rules |
| `Checkov` | Policy-as-code security scanning |
| `Trivy` | Vulnerability scanner |
| `Docker Scout` | Official Docker vulnerability tool |
| `Snyk` | Dependency vulnerability scanner |
| `Falco` | Runtime threat detection |
