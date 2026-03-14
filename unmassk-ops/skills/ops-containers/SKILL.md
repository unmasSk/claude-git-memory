---
name: ops-containers
description: >
  Use when the user asks to "generate Dockerfile", "validate Dockerfile",
  "create Helm chart", "validate Helm", "generate Kubernetes YAML",
  "validate K8s manifests", "debug pods", "troubleshoot cluster",
  "multi-stage Docker build", "container security scan",
  or mentions any of: Dockerfile, Docker, Helm, Kubernetes, K8s, kubectl,
  kubeconform, hadolint, container, pod, deployment, service, ingress,
  CRD, chart, values.yaml, YAML manifest, multi-stage build, distroless,
  alpine, non-root, HEALTHCHECK.
  Use this for generating production-ready Dockerfiles with multi-stage
  builds and security hardening, validating Dockerfiles with hadolint and
  Checkov, scaffolding Helm charts with CRD support, validating chart
  structure and templates, generating K8s YAML manifests, validating
  manifests with kubeconform and dry-run, debugging pod failures and
  cluster issues. Includes 22 scripts and 19 reference files.
  Based on cc-devops-skills by akin-ozer (Apache-2.0).
version: 1.0.0
---

# Containers -- Docker, Helm, and Kubernetes Toolkit

Generation, validation, and debugging for Docker, Helm, and Kubernetes.

## What this skill covers

- **Docker**: generate Dockerfiles, multi-stage builds, security hardening, validation
- **Helm**: scaffold charts, CRD patterns, template functions, validation
- **Kubernetes**: generate YAML manifests, resource patterns, security, validation
- **K8s Debug**: pod failures, networking issues, storage problems, rollout issues

## Routing Table

Read the reference(s) that match the task before doing anything else.

### Docker tasks

| Task | Read these references |
|------|----------------------|
| Generate Dockerfile | `docker-language-guides.md`, `docker-multistage-builds.md` |
| Optimize image size / build time | `docker-optimization-guide.md`, `docker-optimization-patterns.md` |
| Security hardening | `docker-security-best-practices.md`, `docker-security-checklist.md` |
| Validate or lint | `docker-validation-best-practices.md` |

### Helm tasks

| Task | Read these references |
|------|----------------------|
| Scaffold new chart | `helm-best-practices.md`, `helm-resource-templates.md` |
| Add CRD resources | `helm-crd-patterns.md` |
| Template functions reference | `helm-template-functions.md`, `helm-validator-template-functions.md` |
| K8s resource patterns in charts | `helm-k8s-best-practices.md` |

### Kubernetes tasks

| Task | Read these references |
|------|----------------------|
| Generate YAML manifests | `k8s-resource-patterns.md`, `k8s-validation-best-practices.md` |
| Security hardening | `k8s-security-patterns.md` |
| Validate manifests | `k8s-validation-workflow.md` |
| Debug pod / cluster issues | `k8s-debug-common-issues.md`, `k8s-debug-troubleshooting.md` |

---

## Workflows

### Docker: generate → validate → report

1. **Generate** — Read `docker-language-guides.md` and `docker-multistage-builds.md`. Write Dockerfile.
2. **Setup tools** — Run:
   ```bash
   bash ${CLAUDE_PLUGIN_ROOT}/skills/ops-containers/scripts/dockerfile-test-validate.sh --check-tools
   ```
3. **Lint** — Run:
   ```bash
   bash ${CLAUDE_PLUGIN_ROOT}/skills/ops-containers/scripts/dockerfile-validate.sh <Dockerfile>
   ```
4. **Generate .dockerignore** (if missing) — Run:
   ```bash
   bash ${CLAUDE_PLUGIN_ROOT}/skills/ops-containers/scripts/generate_dockerignore.sh <dir>
   ```
5. Fix all findings. Report: tool used, findings count, severity, actions taken.

### Docker: language-specific generation

Generate Dockerfile for specific language runtime:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/skills/ops-containers/scripts/generate_nodejs.sh <dir>
bash ${CLAUDE_PLUGIN_ROOT}/skills/ops-containers/scripts/generate_python.sh <dir>
bash ${CLAUDE_PLUGIN_ROOT}/skills/ops-containers/scripts/generate_golang.sh <dir>
bash ${CLAUDE_PLUGIN_ROOT}/skills/ops-containers/scripts/generate_java.sh <dir>
```

### Helm: scaffold → generate helpers → validate → report

1. **Scaffold chart structure** — Run:
   ```bash
   bash ${CLAUDE_PLUGIN_ROOT}/skills/ops-containers/scripts/generate_chart_structure.sh <chart-name> <dir>
   ```
2. **Generate standard helpers** — Run:
   ```bash
   bash ${CLAUDE_PLUGIN_ROOT}/skills/ops-containers/scripts/generate_standard_helpers.sh <chart-dir>
   ```
3. **Generate Helm helpers** — Run:
   ```bash
   bash ${CLAUDE_PLUGIN_ROOT}/skills/ops-containers/scripts/helm-generate-helpers.sh <chart-dir>
   ```
4. **Validate chart structure** — Run:
   ```bash
   bash ${CLAUDE_PLUGIN_ROOT}/skills/ops-containers/scripts/validate_chart_structure.sh <chart-dir>
   ```
5. **Detect CRDs** (if chart uses CRDs) — Run:
   ```bash
   bash ${CLAUDE_PLUGIN_ROOT}/skills/ops-containers/scripts/helm-detect-crd-wrapper.sh <chart-dir>
   ```
6. **Setup Helm tools** — Run:
   ```bash
   bash ${CLAUDE_PLUGIN_ROOT}/skills/ops-containers/scripts/helm-setup-tools.sh
   ```
7. Fix all findings. Report: issues found, actions taken.

### Kubernetes: generate → validate → report

1. **Generate** — Read `k8s-resource-patterns.md` and `k8s-security-patterns.md`. Write YAML.
2. **Count documents** — Run:
   ```bash
   python3 ${CLAUDE_PLUGIN_ROOT}/skills/ops-containers/scripts/count_yaml_documents.py <file.yaml>
   ```
3. **Setup tools** — Run:
   ```bash
   bash ${CLAUDE_PLUGIN_ROOT}/skills/ops-containers/scripts/k8s-setup-tools.sh
   ```
4. **Detect CRDs** — Run:
   ```bash
   bash ${CLAUDE_PLUGIN_ROOT}/skills/ops-containers/scripts/k8s-detect-crd-wrapper.sh <file.yaml>
   ```
5. **Validate with kubeconform** — Run as documented in `k8s-validation-workflow.md`.
6. **Dry-run** (if cluster available):
   ```bash
   kubectl apply --dry-run=server -f <file.yaml>
   ```
7. Fix all findings. Report: stages run, findings count, severity, actions taken.

### Kubernetes: debug pod or cluster issue

1. Read `k8s-debug-troubleshooting.md` to select the matching workflow.
2. Collect diagnostics — Run:
   ```bash
   python3 ${CLAUDE_PLUGIN_ROOT}/skills/ops-containers/scripts/pod_diagnostics.py <namespace> <pod-name>
   ```
3. For network issues — Run:
   ```bash
   bash ${CLAUDE_PLUGIN_ROOT}/skills/ops-containers/scripts/network_debug.sh <namespace>
   ```
4. For cluster health — Run:
   ```bash
   bash ${CLAUDE_PLUGIN_ROOT}/skills/ops-containers/scripts/cluster_health.sh
   ```
5. Apply fix and verify. Report: root cause, fix applied, verification result.

---

## Script reference

All scripts are in `${CLAUDE_PLUGIN_ROOT}/skills/ops-containers/scripts/`. Use them — do not skip them to report a result manually.

| Script | Purpose |
|--------|---------|
| `dockerfile-validate.sh` | Lint Dockerfile with hadolint |
| `dockerfile-test-validate.sh` | Full Dockerfile test and validate pipeline |
| `dockerfile-test-generator.sh` | Generate test cases for a Dockerfile |
| `generate_dockerignore.sh` | Generate .dockerignore for a project |
| `generate_nodejs.sh` | Generate production Node.js Dockerfile |
| `generate_python.sh` | Generate production Python Dockerfile |
| `generate_golang.sh` | Generate production Go Dockerfile |
| `generate_java.sh` | Generate production Java Dockerfile |
| `generate_chart_structure.sh` | Scaffold Helm chart directory structure |
| `generate_standard_helpers.sh` | Generate standard _helpers.tpl for a chart |
| `helm-generate-helpers.sh` | Generate Helm-specific helper templates |
| `helm-setup-tools.sh` | Install helm, kubeconform, and related tools |
| `helm-detect-crd-wrapper.sh` | Detect CRD resources in Helm chart templates |
| `helm-detect-crd.py` | Python implementation of Helm CRD detection |
| `validate_chart_structure.sh` | Validate Helm chart structure and lint |
| `k8s-setup-tools.sh` | Install kubeconform, kubectl, yamllint |
| `k8s-detect-crd-wrapper.sh` | Detect CRD resources in K8s YAML files |
| `k8s-detect-crd.py` | Python implementation of K8s CRD detection |
| `count_yaml_documents.py` | Count non-empty YAML documents in a file |
| `pod_diagnostics.py` | Collect pod state, events, and logs |
| `network_debug.sh` | Debug service connectivity and DNS |
| `cluster_health.sh` | Check node status and cluster component health |

---

## Mandatory rules

- Always run the scripts. Never skip validation to save time.
- Always read the routing table reference before generating code.
- Never run as root: every Dockerfile must create and use a non-root user.
- Never hardcode secrets in Dockerfiles, Helm values, or K8s manifests.
- Always pin base image tags — never use `:latest` in production.
- Always use multi-stage builds for compiled languages (Go, Java, Rust).
- Always set resource requests and limits on every Kubernetes container.
- Always drop ALL Linux capabilities in container securityContext.
- Scope stays within containers: no Terraform, Ansible, or CI/CD pipeline code (see ops-iac).

---

## Done criteria

A task is complete when:
- All scripts ran with no unresolved findings
- No hardcoded secrets or `:latest` tags in output
- Non-root user set in every Dockerfile
- Resource limits set on every K8s container
- Security context applied (allowPrivilegeEscalation: false, capabilities drop ALL)
- Report delivered: tool used, findings count, severity, actions taken
