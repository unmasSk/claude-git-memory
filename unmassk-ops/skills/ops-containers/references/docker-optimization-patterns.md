# Dockerfile Optimization Patterns

Concrete before/after patterns for image size, build time, and layer structure.

---

## Image size

### Multi-stage build

```dockerfile
# Before: 996 MB (node:20 with dev deps)
FROM node:20
WORKDIR /app
COPY . .
RUN npm install
CMD ["node", "server.js"]

# After: ~50 MB (95% reduction)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server.js ./
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs
CMD ["node", "server.js"]
```

### Base image selection

```
node:20               → 996 MB
node:20-slim          → 239 MB
node:20-alpine        → 132 MB
distroless/static     → 2 MB
scratch               → 0 MB
```

For Go and Rust, use scratch or distroless. For Python, use `python:3.12-slim`. For Node.js, use `node:20-alpine`.

### File cleanup in same layer

```dockerfile
# Bad: intermediate layer still contains the files
RUN apt-get install -y build-essential
RUN apt-get remove -y build-essential   # Does not reduce size

# Good: remove in same RUN
RUN apk add --no-cache --virtual .build-deps \
    gcc musl-dev \
    && pip install --no-cache-dir -r requirements.txt \
    && apk del .build-deps
```

---

## Build time

### Layer cache ordering

```dockerfile
# Bad: any source change invalidates npm install
COPY . /app
RUN npm install

# Good: dependency layer cached independently
COPY package*.json /app/
RUN npm install
COPY . /app
```

Optimal order:
1. `FROM` (base image)
2. `RUN` system packages
3. `COPY` dependency manifest (package.json, requirements.txt)
4. `RUN` install dependencies
5. `COPY` application code
6. `RUN` build
7. `CMD` / `ENTRYPOINT`

### BuildKit cache mounts

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

FROM golang:1.21-alpine
WORKDIR /app
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt
```

Enable: `export DOCKER_BUILDKIT=1`

### Parallel stage execution

BuildKit executes independent stages in parallel automatically.

```dockerfile
# syntax=docker/dockerfile:1

FROM alpine AS fetch-1
RUN wget https://example.com/file1

FROM alpine AS fetch-2
RUN wget https://example.com/file2

FROM alpine AS final
COPY --from=fetch-1 /file1 .
COPY --from=fetch-2 /file2 .
```

---

## Layer structure

### Combining RUN commands

```dockerfile
# Bad: 5 layers
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get install -y git
RUN apt-get install -y vim
RUN rm -rf /var/lib/apt/lists/*

# Good: 1 layer
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl \
        git \
        vim && \
    rm -rf /var/lib/apt/lists/*
```

`FROM`, `RUN`, `COPY`, and `ADD` create new layers. `ENV`, `WORKDIR`, `EXPOSE`, and `USER` do not add significant size.

### .dockerignore

```
# Version control
.git
.gitignore

# Dependencies (reinstalled during build)
node_modules
vendor
__pycache__

# IDE files
.vscode
.idea
*.swp

# Build artifacts
dist
build
target

# Documentation
*.md
docs/

# CI/CD
.github
.gitlab-ci.yml

# Environment files
.env
.env.*

# Logs and test coverage
*.log
logs/
tests/
coverage/
```

---

## Runtime

### CMD / ENTRYPOINT exec form

```dockerfile
# Shell form: spawns sh, does not forward SIGTERM correctly
CMD node server.js

# Exec form: direct process, proper signal handling
CMD ["node", "server.js"]
```

### Production environment variables

```dockerfile
ENV NODE_ENV=production
ENV PYTHONOPTIMIZE=1
ENV JAVA_OPTS="-Xms512m -Xmx2048m"
```

### Efficient health check

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1
```

---

## Build optimization checklist

- [ ] Multi-stage build separates build from runtime
- [ ] Minimal base image for the language (Alpine, slim, distroless)
- [ ] Layers ordered stable-to-volatile
- [ ] `RUN` commands combined where logical
- [ ] BuildKit cache mounts in use
- [ ] `.dockerignore` present and comprehensive
- [ ] Production-only dependencies installed
- [ ] Package manager caches cleaned in same `RUN` layer
- [ ] Exec form for `CMD` / `ENTRYPOINT`
- [ ] `HEALTHCHECK` defined for services

---

## Measuring impact

```bash
# Compare sizes
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | grep myapp

# Build time with and without cache
time docker build --no-cache -t myapp:no-cache .
time docker build -t myapp:cached .

# Layer analysis
dive myapp:latest
```
