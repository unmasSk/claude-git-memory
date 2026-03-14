# Container Security Checklist

Security checklist for Dockerfiles and container images at build time and runtime.

---

## Build-time security

### Base image

- [ ] Official or verified publisher image
- [ ] Pinned to specific tag (not `:latest`)
- [ ] Digest-pinned for critical applications
- [ ] Minimal base image (Alpine, distroless, or scratch)
- [ ] Scanned for known vulnerabilities
- [ ] Updated regularly to receive security patches

### Secrets

- [ ] No secrets hardcoded in Dockerfile
- [ ] `ENV` and `ARG` not used for sensitive data
- [ ] Secrets use `--mount=type=secret` (BuildKit)
- [ ] Runtime configuration used for sensitive values
- [ ] Committed secrets scanned (gitleaks, trufflehog)
- [ ] `.dockerignore` excludes `.env` and secret files

### Package management

- [ ] Package versions pinned for reproducibility
- [ ] Only necessary packages installed (`--no-install-recommends`)
- [ ] Package manager cache cleaned in same `RUN` layer
- [ ] Official package repositories used

### Users and permissions

- [ ] Non-root user created and set with `USER`
- [ ] `USER` appears before `CMD` / `ENTRYPOINT`
- [ ] High UID (>10000) for better isolation
- [ ] `COPY --chown` used instead of separate `RUN chown`
- [ ] No `sudo` in containers
- [ ] No privileged operations in entrypoint

### Layers and files

- [ ] `.dockerignore` excludes sensitive files
- [ ] `COPY` targets specific files, not entire directories
- [ ] Multi-stage build: build secrets never reach final stage
- [ ] No logs or debug output containing sensitive data

---

## Network exposure

- [ ] Only necessary ports in `EXPOSE`
- [ ] Port 22 (SSH) not exposed
- [ ] No telnet, FTP, or other insecure protocols installed
- [ ] TLS used for network communications

---

## Runtime security

### Container configuration

- [ ] `--read-only` flag where possible
- [ ] `--cap-drop ALL` — drop all Linux capabilities
- [ ] Add back only capabilities actually required (`--cap-add`)
- [ ] Resource limits set (CPU, memory)
- [ ] User namespaces enabled

### Health and monitoring

- [ ] `HEALTHCHECK` defined in Dockerfile
- [ ] Security scanning integrated in CI/CD
- [ ] Logs do not contain secrets or PII

---

## Registry security

- [ ] Private registry for internal images
- [ ] Image scanning enabled in registry
- [ ] Role-based access control on registry
- [ ] Image signing (Docker Content Trust)
- [ ] TLS for registry communication

---

## Security scanning tools

| Category | Tool |
|----------|------|
| Dockerfile lint | `hadolint` |
| Policy-as-code | `Checkov` |
| Vulnerability scan | `Trivy`, `Snyk`, `Clair`, `Anchore` |
| Runtime detection | `Falco`, `Aqua Security`, `Sysdig` |
| Secret scan | `gitleaks`, `trufflehog` |

---

## Priority summary

| Category | Critical | High | Medium |
|----------|----------|------|--------|
| Base image | Official, pin version | Scan for CVEs | Update regularly |
| Secrets | Never in code | Use secrets mgmt | Scan commits |
| Users | Run as non-root | High UID | Proper permissions |
| Network | TLS only | Minimal exposure | Firewall rules |
| Runtime | Drop capabilities | Read-only FS | Resource limits |

---

## Quick wins

```dockerfile
# 1. Pin base image tag
FROM alpine:3.21

# 2. Run as non-root
USER appuser

# 3. Clean package cache
RUN apk add --no-cache package

# 4. Expose only what is needed
EXPOSE 8080

# 5. Add health check
HEALTHCHECK CMD curl -f http://localhost/ || exit 1
```
