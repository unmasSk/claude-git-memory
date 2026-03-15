---
name: ops-deploy
description: >
  Use when the user asks to "deploy to Vercel", "deploy to Railway",
  "deploy preview", "production deploy", "create preview deployment",
  "push to Vercel", "push to Railway", "desplegar en Vercel",
  "desplegar en Railway", "deploy my app", "deploy and give me the link",
  "push this live", "railway up", "vercel deploy", "link Railway project",
  "set up Railway service", "configure Railway environment",
  "check Railway logs", "Railway metrics", "Railway redeploy",
  "Railway domain", "Railway variables", "Railway GraphQL API",
  or any deployment, release, or hosting operation targeting Vercel or Railway.
version: 1.0.0
---

# ops-deploy — Deployment Toolkit

Vercel and Railway deployments under one skill.

## Routing Table

Read the reference(s) that match the task before doing anything else.

### Vercel tasks

| Task | Read this reference |
|------|---------------------|
| Any Vercel deploy (preview or production) | `references/vercel/deploy-vercel.md` |
| Vercel no-auth fallback (sandbox/Codex) | `references/vercel/deploy-vercel.md` — No-Auth Fallback section |
| Vercel team selection | `references/vercel/deploy-vercel.md` — Team selection section |

### Railway tasks

| Task | Read these references |
|------|-----------------------|
| Create project, link project, add service, create database, add bucket | `references/railway/setup.md` |
| Manage environments, variables, domains, service config, networking | `references/railway/configure.md` |
| Deploy code, manage releases, build config, monorepo patterns | `references/railway/deploy.md` |
| Check health, read logs, query metrics, triage failures | `references/railway/operate.md` |
| GraphQL API, official docs, community threads, template search | `references/railway/request.md` |

---

## Workflow

### Vercel: detect state → choose method → deploy → report URL

1. **Detect state** — Run the four checks in `deploy-vercel.md` Step 1 (git remote, `.vercel/` link, CLI auth, team list).
2. **Choose method** — Follow the decision tree in `deploy-vercel.md` Step 2. Never skip it.
3. **Deploy** — Execute the chosen method. Use `--no-wait` for CLI deploys.
4. **Report** — Always show the deployment URL. For no-auth fallback, show both preview URL and claim URL.

### Railway: link → configure → deploy → verify

1. **Link** — Read `setup.md`. Confirm project and service context with `railway status --json` before any mutation.
2. **Configure** — Read `configure.md`. Inspect current config with `railway environment config --json` before patching.
3. **Deploy** — Read `deploy.md`. Use `railway up --detach -m "<summary>"` for standard deploys.
4. **Verify** — Always run `railway service status --all --json` after deploy. Check logs on failure.

---

## Script reference

All scripts are in `${CLAUDE_PLUGIN_ROOT}/skills/ops-deploy/scripts/`. Use them — do not skip them.

| Script | Purpose |
|--------|---------|
| `vercel-deploy.sh` | No-auth Vercel deploy via claimable endpoint. Auto-detects framework from `package.json`, packages project, polls until build completes. Returns JSON with `previewUrl` and `claimUrl`. |
| `railway-api.sh` | Railway GraphQL API helper. Reads token from `~/.railway/config.json`. Usage: `railway-api.sh '<query>' '<variables-json>'` |

**vercel-deploy.sh usage:**

```bash
# Deploy current directory
bash ${CLAUDE_PLUGIN_ROOT}/skills/ops-deploy/scripts/vercel-deploy.sh

# Deploy specific path
bash ${CLAUDE_PLUGIN_ROOT}/skills/ops-deploy/scripts/vercel-deploy.sh /path/to/project

# Deploy existing tarball
bash ${CLAUDE_PLUGIN_ROOT}/skills/ops-deploy/scripts/vercel-deploy.sh /path/to/project.tgz
```

**railway-api.sh usage:**

```bash
bash ${CLAUDE_PLUGIN_ROOT}/skills/ops-deploy/scripts/railway-api.sh \
  'query { me { name } }' \
  '{}'
```

---

## Mandatory rules

- **Always preview first.** Default to preview/non-production deploys unless the user explicitly asks for production.
- **Never auto-approve production deploys.** For Vercel git-push method, ask before pushing. For Railway, confirm target environment before `railway up`.
- **Always run the routing table references before acting.** Never reconstruct CLI flags from memory.
- **Railway: always inspect before patching.** Run `railway environment config --json` or `railway status --json` before any config mutation — patches merge and can overwrite fields unintentionally.
- **Railway logs must be bounded.** Always pass `--lines`, `--since`, or `--until`. Unbounded `railway logs` streams forever and blocks execution.
- **Vercel: check both `.vercel/project.json` and `.vercel/repo.json`.** Either means the project is linked.
- **Railway: service names in variable references are case-sensitive.** Verify the exact name from `railway status --json` before writing `${{ServiceName.VAR}}`.

---

## Done criteria

A Vercel task is complete when:
- Deployment URL is shown to the user
- For no-auth fallback: both preview URL and claim URL are shown

A Railway task is complete when:
- `railway service status --all --json` shows `SUCCESS` for the target service
- The deployment URL or relevant output is reported to the user
- For config changes: `railway environment config --json` confirms the change took effect
