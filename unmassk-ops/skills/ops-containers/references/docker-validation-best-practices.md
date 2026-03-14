# Docker Best Practices Reference

Rules and patterns derived from official Docker documentation and industry standards.

---

## Foundational principles

- Containers should be stateless and ephemeral — stop, destroy, and recreate with minimal setup.
- Use `.dockerignore` to exclude unnecessary files from the build context.
- Multi-stage builds separate build dependencies from runtime.
- One concern per container — makes containers easier to scale and debug.

---

## Dockerfile instruction rules

### FROM

```dockerfile
# Pin to specific tag
FROM node:20-alpine

# Pin to digest for full reproducibility
FROM node:20-alpine@sha256:abc123...
```

Use official images or verified publishers. Alpine (~5 MB) is preferred over Ubuntu (~80 MB). Distroless has no shell or package manager — minimal attack surface.

### RUN

```dockerfile
# Bad: 4 layers, cache not cleaned
RUN apt-get update
RUN apt-get install -y curl vim
RUN curl -sL https://example.com/script.sh | bash

# Good: 1 layer, cache cleaned
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    vim \
    && rm -rf /var/lib/apt/lists/* \
    && curl -sL https://example.com/script.sh | bash
```

Always use `--no-install-recommends` with apt. Sort multi-line package lists alphabetically for easier review. Use `set -o pipefail` when piping:

```dockerfile
RUN set -o pipefail && wget -O - https://example.com | wc -l > /number
```

### COPY vs ADD

```dockerfile
# Use COPY for files and directories
COPY app.py /app/

# ADD only for auto-extraction or remote URLs
ADD https://example.com/file.tar.gz /tmp/
```

Prefer `COPY` — `ADD` has implicit extraction behavior that is easy to misuse.

### COPY --chown

```dockerfile
# Bad: creates an extra layer
COPY app.py /app/
RUN chown user:user /app/app.py

# Good: single layer
COPY --chown=user:user app.py /app/
```

### WORKDIR

```dockerfile
# Bad
WORKDIR app
RUN cd /app && npm install

# Good
WORKDIR /app
RUN npm install
```

Always use absolute paths. Never use `RUN cd` — use `WORKDIR` instead.

### USER

```dockerfile
# Debian/Ubuntu
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Alpine
RUN addgroup -g 1001 -S appuser && adduser -S appuser -u 1001

# High UID for better security
RUN useradd -u 10001 -m appuser

USER appuser
```

Set `USER` before `CMD` / `ENTRYPOINT`.

### CMD and ENTRYPOINT

```dockerfile
# Shell form: does not handle SIGTERM correctly
CMD python app.py

# Exec form: direct execution, proper signal handling
CMD ["python", "app.py"]

# Combined pattern: executable + default args
ENTRYPOINT ["python"]
CMD ["app.py"]
```

Always use exec form.

### EXPOSE

```dockerfile
EXPOSE 8080
EXPOSE 443
```

Documents which ports the container listens on. Does not publish the port — use `-p` or compose `ports:` for that.

### HEALTHCHECK

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1
```

Required for services. Orchestrators use this to detect and restart unhealthy containers.

### LABEL

```dockerfile
LABEL org.opencontainers.image.authors="team@example.com"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.description="Application description"
```

---

## Build optimization

### Layer cache: stable before volatile

```dockerfile
FROM node:20-alpine

# Rarely changes
RUN apk add --no-cache curl

# Changes occasionally
COPY package*.json ./
RUN npm ci

# Changes frequently
COPY . .
```

### Multi-stage builds

```dockerfile
FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
COPY --from=builder /app/dist /app
CMD ["node", "/app/index.js"]
```

### BuildKit features

```dockerfile
# syntax=docker/dockerfile:1

# Cache mount
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# Secret mount (never in image)
RUN --mount=type=secret,id=aws,target=/root/.aws/credentials \
    aws s3 cp s3://bucket/file .
```

---

## Security rules

- Scan images: `trivy image myimage:tag`
- Never store secrets in `ENV` or `ARG` — pass at runtime or use `--mount=type=secret`
- Run as non-root: `USER appuser`
- Read-only filesystem at runtime: `docker run --read-only myimage`
- Drop capabilities: `docker run --cap-drop=ALL --cap-add=NET_BIND_SERVICE myimage`

---

## Anti-patterns

| Anti-pattern | Why it is wrong |
|---|---|
| `FROM node:latest` | Unpredictable, not reproducible |
| `RUN apt-get install && RUN rm -rf /var/lib/apt/lists/*` | Cache not cleaned in same layer |
| Running as root | Violates least privilege |
| Installing unnecessary packages | Increases attack surface |
| `ADD` instead of `COPY` | Implicit behavior |
| `CMD node server.js` (shell form) | Does not handle SIGTERM |
