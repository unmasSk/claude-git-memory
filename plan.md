# Plan: Git Memory System — Extensión de git-workflow skill

## Principio
Git = memoria. Trailers validados en commits. Cero docs extra. Boot automático.
**Claude se amolda al usuario, no al revés. Todo es automático.**

---

## Fase 1: Especificación de trailers + tipos de commit

### Archivos a modificar:

#### 1. `.claude/skills/git-workflow/WORKFLOW.md`
- **Sección "Commit Types"**: Añadir `context()` y `decision()` como tipos
- **Nueva sección "Trailer Spec"**: Formato exacto, keys permitidas, reglas de obligatoriedad
- **Sección "Checkpoint"**: Los `wip:` pueden llevar trailers parciales
- **Nueva sección "Squash Policy"**: Cómo re-empaquetar trailers al hacer squash

#### 2. `.claude/skills/git-workflow/SKILL.md`
- **Nuevo modo AUTO-BOOT**: Lee últimos 30 commits, extrae SOLO resumen compacto (no log crudo)
- **Nueva sección "Commit Memory Rules"**: Reglas duras para que Claude genere trailers automáticamente
- **Nueva sección "Auto-Git Behavior"**: Claude detecta cuándo commitear sin que el usuario lo pida
- **Actualizar "Sacred rules"**: Añadir reglas de trailers obligatorios
- **Actualizar "Mandatory output"**: Incluir trailers en el output de cada commit

#### 3. `.claude/skills/git-workflow/RELEASE.md`
- **Regla**: No `Next:` en main salvo follow-up explícito
- **Hotfix**: `Risk:` obligatorio siempre
- **PR body**: Auto-generado desde trailers de los commits incluidos

#### 4. `.claude/skills/git-workflow/CONFLICTS.md`
- **Nuevos trailers**: `Conflict:` + `Resolution:` obligatorios en commits de resolución
- **`Risk:`** obligatorio en resoluciones que impliquen force-push o reset

#### 5. `.claude/skills/git-workflow/UNDO.md`
- **Etiquetar operaciones** con nivel de Risk requerido
- **Commits de recovery**: deben llevar `Risk: high` + `Why:` explicando qué se recuperó

### Trailer Spec completa (validable por hook)

```
<conventional subject>

<body opcional>

Issue: CU-123 o #123
Why: razón del cambio (1 línea)
Touched: path1, path2 o glob/* (N files)
Decision: descripción de la decisión tomada (1 línea)
Next: qué queda pendiente (1 línea)
Blocker: qué bloquea el progreso (1 línea)
Risk: low|medium|high
Conflict: qué conflicto se resolvió (1 línea)
Resolution: cómo se resolvió (1 línea)
Refs: PR-456, link externo (puede ser lista separada por comas)
```

> `Refs:` es **siempre opcional** y nunca bloquea validación.

**Orden canónico recomendado** (la validación no depende del orden, pero para legibilidad en `git log`):
`Issue → Why → Touched → Decision → Next → Blocker → Risk → Conflict → Resolution → Refs`

**Reglas de formato (para que el hook valide sin ambigüedad):**
- Keys son **case-sensitive** (Why:, no why: ni WHY:)
- Cada key **máximo una vez** por commit (no repetir Why: dos veces)
- Valores **single-line** (sin saltos de línea dentro de un trailer)
- Trailers van al **final del body**, como bloque contiguo (sin líneas vacías entre ellos)
- `Touched:` formato: `path1, path2` o `glob/* (N files)` — si ≤10 archivos y se usa glob, el hook **avisa** (warning) pero NO bloquea
- `Issue:` formato regex: `CU-\d+` o `#\d+`
- `Risk:` valores exactos: `low`, `medium`, `high` (nada más)

**Obligatoriedad por tipo de commit:**

| Tipo | Why | Touched | Issue* | Next | Decision | Risk | Blocker |
|------|-----|---------|--------|------|----------|------|---------|
| `feat/fix/refactor/perf` | **SÍ** | **SÍ** | **SÍ** | si queda trabajo | no | si aplica | si aplica |
| `chore/ci/test/docs` | **SÍ** | **SÍ** | **SÍ** | si queda trabajo | no | no | si aplica |
| `context()` | **SÍ** | no (allow-empty) | si branch tiene issue | **SÍ** | no | no | si aplica |
| `decision()` | **SÍ** | no (allow-empty) | si branch tiene issue | no | **SÍ** | si aplica | no |
| `wip:` | opcional | opcional | opcional | opcional | no | no | no |

*Issue: obligatorio solo si el branch name contiene `CU-xxx`, `issue-xxx` o `#xxx`

### context() y decision(): reglas duras

- `context()` y `decision()` **SIEMPRE** usan `git commit --allow-empty`
- Claude **nunca** hace `context()` o `decision()` sin `--allow-empty`
- Si Claude detecta intención de pausar/cambiar máquina → `context()` automático
- Si el usuario dice "esto queda así" o toma una decisión de diseño → `decision()` automático

### Squash Policy (herencia de trailers)

Al hacer squash de WIPs antes de merge a dev:
- `Why:` → del commit final (no de los wip)
- `Touched:` → calculado desde `git diff --name-only dev...HEAD` (real, no heredado)
- `Issue:` → del branch name
- `Decision:` → del último `decision()` en la rama (si existe)
- `Next:` → **solo si queda trabajo post-merge**. Si el squash no tiene `Next:`, se entiende que no queda pendiente
- Los `Next:` de WIPs intermedios **se pierden** al squash (es correcto: eran checkpoints temporales)

---

## Fase 2: Hooks de validación (cinturón y tirantes)

### Archivo nuevo: `.claude/hooks/pre-validate-commit-trailers.py`

Hook **PreToolUse** para Bash (intercepta antes de ejecutar):
- Detecta comandos `git commit` en el input
- Parsea el mensaje buscando trailers obligatorios según tipo de commit
- Si puede parsear y faltan trailers → **BLOCK** (no se ejecuta el commit)
- Si no puede parsear (heredoc complejo, variable, sin -m) → **PASS** (deja al PostToolUse)

### Archivo nuevo: `.claude/hooks/post-validate-commit-trailers.py`

Hook **PostToolUse** para Bash (safety net después de ejecutar):
- Solo actúa si el comando fue `git commit` y tuvo éxito (exit 0)
- Lee el último commit con `git log -1 --pretty=format:"%s%n%b"`
- Valida trailers según tabla de obligatoriedad
- **Si falla, protocolo seguro (no reset ciego):**
  1. Comprobar si HEAD está publicado en remoto:
     - `git rev-parse --abbrev-ref --symbolic-full-name @{u}` → si falla, no hay upstream → reset seguro
     - Si hay upstream: `git merge-base --is-ancestor HEAD @{u}` → exit 0 = publicado (NO tocar), exit 1 = no publicado (reset seguro)
  2. Si **reset seguro** → `git reset --soft HEAD~1` + mostrar qué falta
  3. Si **NO seguro** (HEAD publicado) → NO tocar historia:
     - Mostrar error con trailers que faltan
     - Sugerir commit de corrección tipo `chore(memory): add missing trailers` (preferido sobre --amend + force-with-lease por menor riesgo)
     - El hook devuelve error (exit != 0) con instrucciones; Claude debe ejecutar automáticamente el commit de corrección propuesto o pedir confirmación si hay duda

### Archivo nuevo: `.claude/hooks/stop-dod-check.py`

Hook **Stop** (Definition of Done):
- Antes de que Claude termine sesión, valida:
  1. ¿Hay cambios sin commitear? (`git status --porcelain`)
  2. Si hay cambios → **bloquea Stop con mensaje estructurado (menú 1-4)**. Claude recibe el mensaje y pregunta en chat:
     - (1) `wip:` con trailers parciales (si hay código que vale la pena guardar)
     - (2) `context()` allow-empty (si los cambios no son commiteables aún)
     - (3) `git stash` (si son cambios experimentales)
     - (4) Descartar (si son basura — requiere confirmación)
     **El hook bloquea y devuelve el menú. Claude pregunta. El usuario elige.**
  3. ¿El último commit tiene `Next:` sin resolver? → avisar al usuario
- Si todo limpio → permite Stop

### Archivo nuevo: `.claude/hooks/precompact-snapshot.py`

Hook **PreCompact** (salvar memoria antes de comprimir contexto):
- Antes de que Claude comprima el contexto, extrae:
  1. `Next:` pendientes de los últimos commits
  2. `Decision:` recientes por scope
  3. `Blocker:` si existe
- Re-inyecta como resumen compacto para que sobreviva al compact

### Archivo a modificar: `.claude/settings.json`
- Registrar los 4 hooks nuevos:
  - PreToolUse Bash → `pre-validate-commit-trailers.py`
  - PostToolUse Bash → `post-validate-commit-trailers.py`
  - Stop → `stop-dod-check.py`
  - PreCompact → `precompact-snapshot.py`

---

## Fase 3: AUTO-BOOT en el router (optimizado para contexto)

### Lógica en SKILL.md (Claude la ejecuta, no es script):

Al activarse la skill por primera vez en sesión:
1. `git log -n 30 --pretty=format:"%h %s%n%b%n---"`
2. **NO volcar el log crudo** — Extraer SOLO:
   - Commits con `Next:` → lista de pendientes
   - Commits con `Blocker:` → bloqueos activos
   - Último `context()` → dónde se dejó la sesión anterior
   - Últimas `Decision:` por scope → decisiones vigentes (scope = el `(scope)` del subject conventional; si no existe, scope = `global`)
3. Mostrar resumen compacto (~10-15 líneas máx):
   ```
   🔄 BOOT — Retomando sesión
   Branch: feat/filtro-fechas
   Último context: "pause forms refactor" (hace 2h)
   Pendiente: rebase feat/forms on dev; run unit tests
   Decisiones activas: D-014 (section version lock)
   → Acción recomendada: git checkout feat/filtro-fechas && git merge dev
   ```
4. Si no hay nada pendiente: "Repo al día. ¿Qué hacemos?"

**Impacto en ventana de contexto: ~15 líneas** (no 30 commits × N líneas)

---

## Fase 4: Auto-Git Behavior (Claude decide cuándo commitear)

### Principio: Claude ejecuta git por defecto. Si el usuario ejecuta git manualmente, los hooks siguen aplicando.

### Triggers automáticos (definidos en SKILL.md):

| Situación detectada | Acción de Claude | Tipo |
|---------------------|------------------|------|
| Claude ha hecho cambios significativos en código | `wip:` con trailers parciales (commit sin preguntar, push con confirmación rápida tras pasar secrets-scan: `git diff --cached` + regex tokens `OPENAI\|ANTHROPIC\|AWS\|GCP\|SECRET\|PASSWORD\|TOKEN`) | checkpoint |
| Claude termina una tarea/feature completa | squash WIPs + commit final con trailers completos + merge a dev | commit final |
| Usuario dice "lo dejo" / "mañana" / "cambio de PC" | `context()` --allow-empty con Next: + Blocker: | bookmark |
| Usuario toma decisión de diseño/arquitectura | `decision()` --allow-empty con Decision: + Why: | decisión |
| Se resuelve un conflicto | commit con Conflict: + Resolution: + Risk: | resolución |
| Se detecta que dev avanzó y la rama está detrás | merge dev → rama actual | sync |
| Trabajo listo para staging | PR dev→staging con body auto-generado | promoción |

### Reglas:
- Claude **propone** el commit (muestra mensaje + trailers) y **espera confirmación** antes de ejecutar
- Para `wip:` checkpoints: Claude puede commitear sin preguntar (es reversible), pero **push requiere confirmación rápida** + pasar secrets-scan/file-guard
- Para commits finales, context(), decision(): Claude muestra y espera "ok" / corrección
- El usuario puede corregir trailers antes de confirmar
- Claude NUNCA hace push a staging o main sin confirmación explícita

---

## Orden de implementación

1. WORKFLOW.md → trailer spec completa + context()/decision() + squash policy
2. SKILL.md → AUTO-BOOT + commit memory rules + auto-git behavior + triggers
3. CONFLICTS.md → trailers de resolución (Conflict: + Resolution:)
4. RELEASE.md → reglas para main + Risk obligatorio en hotfix
5. UNDO.md → etiquetado de riesgo
6. pre-validate-commit-trailers.py → hook PreToolUse
7. post-validate-commit-trailers.py → hook PostToolUse (con merge-base check)
8. stop-dod-check.py → hook Stop (DoD con opciones)
9. precompact-snapshot.py → hook PreCompact (salvar memoria)
10. settings.json → registrar los 4 hooks

---

## Apéndice: Parsing Hardening (descubierto en tests)

### 1. Emoji strip en subjects
Los subjects llevan emoji obligatorio (`✨ feat(scope): ...`). Todo parsing de subject debe primero limpiar:
```python
cleaned = re.sub(r"^[^\w#]+", "", subject).strip()
```
- Conserva `#` (para refs tipo `#123` en subject)
- Aplica ANTES de: detectar context()/decision(), extraer scope, parsear commit type

### 2. Deduplicación obligatoria en snapshots
- **Blocker:** dedup por texto exacto (case-insensitive). Mismo blocker de distintos commits = 1 línea
- **Decision:** dedup por scope (se queda la más reciente por scope)
- **Pending (Next:):** el Next del último context() se marca `(current)` y va primero

### 3. Orden de pendientes en boot/snapshot
1. Next: del último `context()` → marcado `(current)`
2. Otros Next: recientes (dedup vs context Next)
3. Máximo 3 items + `"+ N older items"` si hay más

### 4. Budget de líneas para snapshot
Límites reales testeados (drift test 200 commits):
- Pending: máx 2 items + overflow
- Blockers: máx 2 items
- Decisions: máx 3 items (1 por scope)
- Memos: máx 2 items (1 por scope)
- **Worst case (todas las secciones): 3+4+3+4+3+1 = 18 líneas exactas**

### 5. Archivos afectados por estos fixes
- `pre-validate-commit-trailers.py` → emoji strip con `#` preservado
- `post-validate-commit-trailers.py` → emoji strip con `#` preservado
- `precompact-snapshot.py` → emoji strip + dedup + ordering + budget

---

## Lo que NO hacemos (decisiones explícitas)

- **No git notes** → frágiles, no portables
- **No docs nuevos** (DECISIONS.md, CONTEXT.md, etc.) → git es la memoria
- **No `Surface:`** → ruido, `Touched:` basta
- **No `prepare-commit-msg` git hook** → no es portable; Claude genera el mensaje directamente
- **No herramientas externas** (claude-mem, supermemory) → dependencias innecesarias
- **No reset automático ciego** → merge-base check antes de tocar historia
- **No trailers multiline** → single-line para parseo limpio
- **No keys repetidas** → cada key una sola vez por commit
- **No obligar al usuario a no usar git** → Claude ejecuta por defecto, si el usuario ejecuta manualmente los hooks siguen aplicando
- **No volcar log crudo en boot** → resumen compacto (~15 líneas máx)
