# Multi-Stage Docker Builds

Multi-stage builds use multiple `FROM` instructions in one Dockerfile. Each stage begins fresh; artifacts are selectively copied between stages. Build tools stay out of the final image.

**Benefits:** 50-85% image size reduction, no build tools in production, no manual cleanup scripts.

---

## Basic syntax

```dockerfile
# syntax=docker/dockerfile:1

FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -o myapp

FROM alpine:3.21
COPY --from=builder /app/myapp /usr/local/bin/
CMD ["myapp"]
```

Always name stages. Numeric references (`--from=0`) are harder to maintain.

---

## Common patterns

### Pattern 1: Build and runtime separation

Used for compiled languages (Go, Rust, Java).

```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -ldflags="-s -w" -o main .

FROM scratch
COPY --from=builder /app/main /main
ENTRYPOINT ["/main"]
```

Builder: ~300 MB. Final image: ~8 MB. Reduction: 97%.

### Pattern 2: Dependency caching

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
```

The `deps` layer only rebuilds when `package.json` changes.

### Pattern 3: Test stage

```dockerfile
FROM python:3.12-slim AS deps
WORKDIR /app
COPY requirements.txt requirements-dev.txt ./
RUN pip install --user -r requirements.txt

FROM deps AS test
RUN pip install --user -r requirements-dev.txt
COPY . .
RUN pytest tests/

FROM python:3.12-slim AS production
WORKDIR /app
COPY --from=deps /root/.local /root/.local
COPY . .
ENV PATH=/root/.local/bin:$PATH
CMD ["python", "app.py"]
```

```bash
docker build --target test -t myapp:test .
docker build -t myapp:latest .        # Runs test stage automatically
```

### Pattern 4: Multi-architecture

```dockerfile
FROM --platform=$BUILDPLATFORM golang:1.21-alpine AS builder
ARG TARGETARCH
ARG TARGETOS
WORKDIR /app
COPY . .
RUN GOOS=$TARGETOS GOARCH=$TARGETARCH go build -o app

FROM alpine:3.21
COPY --from=builder /app/app /app
ENTRYPOINT ["/app"]
```

```bash
docker buildx build --platform linux/amd64,linux/arm64 -t myapp:latest .
```

### Pattern 5: Dev vs production

```dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS development
ENV NODE_ENV=development
COPY . .
CMD ["npm", "run", "dev"]

FROM base AS builder
COPY . .
RUN npm run build

FROM node:20-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/server.js"]
```

---

## Advanced techniques

### BuildKit cache mounts

```dockerfile
# syntax=docker/dockerfile:1

FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download
COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go build -o app

FROM alpine:3.21
COPY --from=builder /app/app /app
CMD ["/app"]
```

### Copying from external images

```dockerfile
FROM alpine:3.21 AS production
COPY --from=nginx:alpine /usr/share/nginx/html /usr/share/nginx/html
```

### Parallel stage execution

Independent stages run in parallel automatically with BuildKit.

```dockerfile
# syntax=docker/dockerfile:1

FROM alpine AS fetch-config
RUN wget https://example.com/config.json -O /config.json

FROM alpine AS fetch-data
RUN wget https://example.com/data.csv -O /data.csv

FROM alpine AS final
COPY --from=fetch-config /config.json /app/
COPY --from=fetch-data /data.csv /app/
```

---

## Build commands

```bash
# Build to a specific stage
docker build --target builder -t myapp:builder .

# Debug an intermediate stage
docker run -it myapp:builder /bin/sh

# Show all stages and timing
DOCKER_BUILDKIT=1 docker build --progress=plain .
```

---

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Copying entire stage (`COPY --from=builder /app /app`) | Copy only artifacts: `COPY --from=builder /app/binary /binary` |
| Not using stage names | Name every stage with `AS <name>` |
| Copying code before dependencies | Install dependencies first; copy code after |
| Using numeric stage references | Use named references for maintainability |
