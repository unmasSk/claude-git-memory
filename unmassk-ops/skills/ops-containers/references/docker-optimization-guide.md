# Dockerfile Optimization Guide

Techniques for reducing image size, improving build time, and optimizing runtime performance.

---

## Image size optimization

### Minimal base images

| Image | Size | Use when |
|-------|------|----------|
| `ubuntu:22.04` | ~80 MB | Many system tools required |
| `alpine:3.21` | ~5 MB | Interpreted languages, general use |
| `python:3.12-slim` | ~50 MB | Python, balance of size and compatibility |
| `gcr.io/distroless/base` | ~20 MB | Highest security, no shell |
| `scratch` | 0 MB | Static binaries only (Go, Rust) |

Alpine uses musl libc — may cause compatibility issues with some C libraries. Distroless has no shell, which prevents exec-based debugging.

### Multi-stage builds

The most impactful optimization for compiled languages.

```dockerfile
# Single-stage (800 MB for Go)
FROM golang:1.21
WORKDIR /app
COPY . .
RUN go build -o server
CMD ["./server"]

# Multi-stage (8 MB — 99% reduction)
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o app

FROM scratch
COPY --from=builder /app/app /app
ENTRYPOINT ["/app"]
```

### Layer optimization

Combine `RUN` commands to reduce layer count and clean caches in the same step:

```dockerfile
# 4 layers, cache not cleaned
RUN apt-get update
RUN apt-get install -y curl
RUN curl -O https://example.com/file
RUN rm -f file

# 1 layer, cache cleaned
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && curl -O https://example.com/file \
    && rm -rf /var/lib/apt/lists/*
```

Cache cleanup must be in the same `RUN` command. A separate `RUN rm -rf ...` does not reduce the layer size.

### Package manager cache cleanup

**APT (Debian/Ubuntu):**
```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    package1 \
    package2 \
    && rm -rf /var/lib/apt/lists/*
```

**APK (Alpine):**
```dockerfile
RUN apk add --no-cache package1 package2
```

**Pip:**
```dockerfile
RUN pip install --no-cache-dir -r requirements.txt
```

**NPM:**
```dockerfile
RUN npm ci --only=production
```

### .dockerignore

Prevents unnecessary files from entering the build context:

```
.git/
node_modules/
*.log
.env
tests/
docs/
README.md
dist/
build/
target/
.vscode/
.idea/
```

Impact: faster builds (smaller context), smaller images, no accidental secret leaks.

---

## Build time optimization

### Layer cache ordering

Order instructions from least to most frequently changing:

```dockerfile
# 1. Base image (rarely changes)
FROM node:20-alpine

# 2. System dependencies (rarely change)
RUN apk add --no-cache curl

# 3. Application dependencies (change occasionally)
COPY package*.json ./
RUN npm ci

# 4. Application code (changes frequently)
COPY . .
RUN npm run build
```

When a file changes, all subsequent layers are invalidated. Putting frequently-changing files last preserves cache for the expensive steps above.

### BuildKit cache mounts

Persist package manager caches across builds without including them in the image:

```dockerfile
# syntax=docker/dockerfile:1

# Python
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# Node.js
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Go
RUN --mount=type=cache,target=/go/pkg/mod \
    go build -o app
```

Enable BuildKit: `export DOCKER_BUILDKIT=1`

---

## Runtime performance

### Exec form for CMD / ENTRYPOINT

```dockerfile
# Shell form — spawns an extra sh process, does not forward signals correctly
CMD python app.py

# Exec form — direct process execution, proper SIGTERM handling
CMD ["python", "app.py"]
```

### Health checks

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1
```

Without HEALTHCHECK, orchestrators cannot detect an unresponsive container.

### Build secrets (never in image layers)

```dockerfile
# syntax=docker/dockerfile:1
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm ci
```

```bash
docker build --secret id=npmrc,src=$HOME/.npmrc .
```

---

## Optimization checklist

- [ ] Minimal base image selected (Alpine, distroless, or scratch)
- [ ] Multi-stage build separates build tools from runtime
- [ ] `RUN` commands combined where logical
- [ ] Package manager cache cleaned in same `RUN` layer
- [ ] `.dockerignore` present and comprehensive
- [ ] Layers ordered by change frequency (stable first)
- [ ] BuildKit cache mounts used for dependency installation
- [ ] Exec form used for `CMD` / `ENTRYPOINT`
- [ ] `HEALTHCHECK` defined for service containers
- [ ] Build secrets use `--mount=type=secret` (not `ENV` or `ARG`)

---

## Analysis tools

```bash
# Layer-by-layer size analysis
docker history myapp:latest
docker history --no-trunc --format "table {{.Size}}\t{{.CreatedBy}}" myapp:latest | sort -hr | head -10

# Interactive layer explorer
dive myapp:latest

# Vulnerability scan
docker scout cves myapp:latest
trivy image myapp:latest
```
