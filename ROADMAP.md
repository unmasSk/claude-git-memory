# claude-git-memory — ROADMAP v2

> Auditado por Gemini (VP Infraestructura) y ChatGPT (VP Producto/DX).
> Reescrito desde cero incorporando ambas simulaciones de ciclo de vida completo.

---

## La tesis

claude-git-memory no es un CLI ni un conjunto de hooks.
Es un **sistema operativo en miniatura para la memoria de Claude** dentro de un repositorio git.

El producto real es:

- **La conducta de Claude** — cuándo calla, cuándo pregunta, cuándo escribe
- **La capacidad de recuperarse** — ante rebase, reset, corrupción, instalación parcial
- **La claridad psicológica** — el usuario entiende qué pasa sin leer trailers ni commits

Si eso falla, da igual lo elegante que sea git por debajo.

---

## 5 principios de diseño

| # | Principio | Qué significa en la práctica |
|---|-----------|------------------------------|
| 1 | **Conservador al escribir** | La memoria se gana el derecho a existir. No todo merece un commit |
| 2 | **Agresivo al diagnosticar** | Los fallos se detectan pronto y se explican bien |
| 3 | **Ligero al arrancar** | Nunca cargar más de lo necesario. Snapshot corto, no volcado |
| 4 | **Honesto al dudar** | Hechos, hipótesis y decisiones no se mezclan |
| 5 | **Reversible siempre** | Install, repair, uninstall y recovery son producto, no extras |

---

## Política de memoria

> "Escribir poco, leer mucho, confirmar cuando duele equivocarse."

### Cuándo crear memoria

Solo si se cumple **al menos una**:

- El usuario lo pidió explícitamente
- Afectará probablemente a sesiones futuras
- Sin eso habrá repetición o pérdida real
- Es una decisión confirmada
- Es un blocker/next con vida útil clara

### Cuándo NO crear memoria

- Es provisional o reversible
- Es una observación local de esta sesión
- Solo importa en esta conversación
- Es una inferencia débil

### Niveles de confianza (bootstrap)

| Nivel | Qué es | Ejemplo | Se guarda como |
|-------|--------|---------|----------------|
| **Fact** | Detectado directamente del código | "Usa TypeScript 5.3" | `memo(stack)` |
| **Hypothesis** | Inferido con señal media | "Parece un monorepo" | No se guarda sin confirmación |
| **Decision** | Solo si está explícita | "Decidimos usar dayjs" | `decision()` solo si el usuario confirma |
| **Preference** | Dicha por el usuario o clarísima | "Siempre async/await" | `memo(preference)` |

---

## Jerarquía de autoridad

Cuando hay conflicto entre fuentes, esta es la precedencia:

```
1. Instrucción explícita del usuario en conversación  (máxima)
2. Memoria viva confirmada (decisions/memos con commit)
3. CLAUDE.md del proyecto
4. Otros archivos de contexto (.cursorrules, docs)
5. Inferencias del código                             (mínima)
```

Claude debe reconocer conflictos abiertamente:
> "Veo una preferencia distinta en CLAUDE.md y en la memoria git. Tomaré como prioritaria la más reciente confirmada por ti."

---

## Arquitectura de Skills (el cerebro de Claude)

Skills = instrucciones que Claude lee para saber cómo actuar. No son docs para humanos.
Cortos, directos, solo lo imprescindible. Sin ceremonia.

**4 skills. Los 5 de v1 se fusionan en estos.**

| Skill | Qué absorbe de v1 | Qué añade v2 | Se carga |
|-------|-------------------|-------------|----------|
| `SKILL.md` | SKILL + WORKFLOW (boot, trailers, triggers, branches, commits) | Política de memoria, cuándo escribir/callar | **Siempre** (~60 líneas) |
| `PROTOCOL.md` | RELEASE + CONFLICTS + UNDO (procedimientos especiales) | Autoridad, ruido, confianza, conducta | Bajo demanda (~40 líneas) |
| `LIFECYCLE.md` | — | Install, doctor, repair, uninstall | Bajo demanda (~50 líneas) |
| `RECOVERY.md` | — | Reset, rebase, force push, CI estricto, self-healing | Bajo demanda (~40 líneas) |

En uso diario normal, solo SKILL.md está en contexto. Impacto mínimo en ventana.

---

## Reglas de los hooks (cambio crítico en v2)

### Los hooks NO bloquean a humanos

v1 bloqueaba todo commit sin trailers. Eso mata la adopción.

**v2:**

| Autor del commit | Comportamiento |
|-----------------|----------------|
| **Claude** (detectado por env/author) | Enforce estricto: bloquear si faltan trailers |
| **Humano** | Solo advertir: "Commit sin trailers. No pasa nada." |

### Detección de autor

```python
# En el hook, detectar si Claude es el autor
is_claude = os.environ.get("CLAUDE_CODE") or "Claude" in author
if is_claude:
    enforce()  # bloquear si falta
else:
    warn()     # solo avisar
```

---

## CLAUDE.md: puntero, no contenedor

El CLAUDE.md del proyecto NO contiene la memoria. Contiene:

```markdown
<!-- BEGIN claude-git-memory (managed block — do not edit) -->
## Git Memory Active

Este proyecto usa claude-git-memory v2.
Antes de trabajar, lee `SKILL.md` para arrancar con memoria.

Comandos conversacionales:
- "instala/repara/desinstala memoria" → LIFECYCLE.md
- "estado de memoria" / "¿va todo bien?" → LIFECYCLE.md (doctor)
- "qué recuerdas" → boot con resumen extendido
<!-- END claude-git-memory -->
```

Todo lo que esté fuera del bloque gestionado es del usuario y NO se toca.

---

## Tres niveles de memoria

| Nivel | Qué contiene | Entra en boot | Ejemplo |
|-------|-------------|---------------|---------|
| **Viva** | Lo que influye hoy | Siempre | Decisions activas, memos, pending, blockers |
| **Histórica** | Navegable bajo demanda | Solo si se pide | Decisions revertidas, next resueltos |
| **Cementerio** | Tombstones del GC | Nunca | Items resueltos, obsoletos, limpiados |

Regla: el boot nunca recorre toda la historia. Snapshot actual + elementos vivos + índices mínimos.

---

## Mantenimiento: oportunista, no calendarizado

> El calendario de mantenimiento como concepto queda **eliminado** del roadmap.

En su lugar: **mantenimiento oportunista**.

| Cuándo | Qué hace | Cómo |
|--------|---------|------|
| Al arrancar sesión | Health check rápido y silencioso | Verificar hooks + skills presentes |
| Al hacer PR/merge | De paso, limpiar trailers stale si los ve | "He limpiado 2 items obsoletos de paso" |
| Al detectar síntomas | GC bajo demanda | "Hay acumulación. ¿Limpio?" |
| Cuando el usuario pide | `git memory gc` o "limpia la memoria" | GC completo con confirmación |

Nunca interrumpir al usuario con tareas administrativas no solicitadas.

Claude debe sonar así:
> "He limpiado información caducada para que el arranque siga siendo rápido."

Nunca así:
> "He consolidado 43 memorias en tu repositorio. Aquí tienes el informe detallado..."

---

## Modos de operación

No todos los repos permiten runtime completo. Definido desde el inicio, no improvisado.

| Modo | Cuándo | Qué hace | Qué NO hace |
|------|--------|---------|-------------|
| **Normal** | Repo git estándar, sin restricciones | Commits con trailers + runtime completo (hooks, skills, CLI) | — |
| **Compatible** | CI estricto, commitlint que rechaza trailers | Store local o git notes en vez de trailers en commits | No toca mensajes de commit |
| **Solo lectura** | Sin permisos de escritura, repo ajeno, o usuario lo pide | Lee contexto/memoria existente, no escribe | No crea commits ni modifica archivos |
| **Abortar** | Sin git, sin forma segura de operar | Explica por qué y no instala | No fuerza nada |

Claude detecta el modo en la inspección y lo fija en el manifest. Si duda, pregunta.

---

## Instalación: transaccional, no mágica

### Flujo real

```
1. INSPECCIÓN
   - ¿Es un repo git? (sin git → abortar con explicación)
   - ¿Existe .claude/? ¿settings.json? ¿hooks previos?
   - ¿Existe CLAUDE.md? ¿Con contenido propio?
   - ¿CI/commitlint activo? → modo compatible
   - Decidir modo de operación (normal / compatible / solo lectura)

2. PLAN
   - "Voy a añadir estas 4 piezas: [hooks, skills, CLI, bloque en CLAUDE.md]"
   - "No voy a tocar tus instrucciones fuera del bloque gestionado"
   - "Tus hooks existentes se mantienen"

3. APLICAR
   - Copiar hooks, skills, bin
   - Merge settings.json (namespace identificable, nunca pisar)
   - Añadir bloque gestionado en CLAUDE.md
   - Crear manifest.json local (versión, archivos gestionados, fecha)

4. VERIFICAR
   - Ejecutar doctor.md automático
   - Mostrar resultado: "4/4 componentes instalados correctamente"

5. PRUEBA DE SALUD
   - "Si algo falla, puedo repararlo o quitarlo."
```

### Lo que NO se hace

- No `git clone` dinámico desde prompt
- No merge de JSON a la aventura
- No "copiar cosas y rezar"
- No instalar sin mostrar el plan primero

### Manifest (columna vertebral de install/repair/uninstall/upgrade)

```json
{
  "version": "2.0.0",
  "installed_at": "2026-03-06T10:30:00Z",
  "runtime_mode": "normal",
  "managed_files": [
    ".claude/hooks/pre-validate-commit-trailers.py",
    ".claude/hooks/post-validate-commit-trailers.py",
    ".claude/hooks/precompact-snapshot.py",
    ".claude/hooks/stop-dod-check.py",
    ".claude/skills/git-memory/SKILL.md",
    ".claude/skills/git-memory/PROTOCOL.md",
    ".claude/skills/git-memory/LIFECYCLE.md",
    ".claude/skills/git-memory/RECOVERY.md",
    "bin/git-memory",
    "bin/git-memory-gc.py",
    "bin/git-memory-dashboard.py"
  ],
  "managed_blocks": [
    { "file": "CLAUDE.md", "begin": "BEGIN claude-git-memory", "end": "END claude-git-memory" }
  ],
  "hook_registrations": ["PreToolUse", "PostToolUse", "Stop", "PreCompact"],
  "last_healthcheck_at": "2026-03-06T10:30:00Z",
  "install_fingerprint": "sha256:abc123..."
}
```

Ubicación: `.claude/git-memory-manifest.json`
Repair y uninstall leen esto para saber qué existe y qué limpiar.

### Distribución: Plugin de Claude Code

El repo es un plugin oficial de Claude Code. Instalación:

```
/plugin marketplace add unmasSk/claude-git-memory
/plugin install claude-git-memory
```

Estructura del plugin:

```
claude-git-memory/
  .claude-plugin/
    plugin.json              # Manifest (nombre, versión, autor)
    marketplace.json         # El propio repo es un marketplace
  skills/
    git-memory/
      SKILL.md               # Core: boot, trailers, triggers, workflow, policy
      PROTOCOL.md            # Autoridad, conducta, releases, conflicts, undo
      LIFECYCLE.md           # Install, doctor, repair, uninstall
      RECOVERY.md            # Desastres git, CI, self-healing
  hooks/
    pre-validate-commit-trailers.py
    post-validate-commit-trailers.py
    precompact-snapshot.py
    stop-dod-check.py
  bin/
    git-memory
    git-memory-gc.py
    git-memory-dashboard.py
```

Futuro: publicar en marketplace oficial de Anthropic (`/plugin install claude-git-memory@claude-plugins-official`).

---

## Bootstrap: scout conservador

### Qué analiza

```
1. Árbol de directorios a 2 niveles (estructura general)
2. Archivos de alta señal:
   - package.json / requirements.txt / Cargo.toml / go.mod
   - .eslintrc / prettier / tsconfig
   - README.md
   - .github/workflows/
3. Últimos 20 commits recientes (no arqueología)
4. CLAUDE.md preexistente (respetar, no pisar)
```

### Qué NO analiza

- Historia completa del repo
- Contenido de node_modules / vendor / generated
- Archivos binarios o assets

### Flujo

```
1. Scout rápido → recopilar hallazgos
2. Clasificar por nivel de confianza (Fact / Hypothesis / Decision / Preference)
3. Mostrar resumen al usuario:
   "He detectado: Next.js 14, TypeScript, pnpm.
    Sospecho que es un monorepo pero no estoy seguro.
    No guardaré eso como decisión sin tu confirmación."
4. Usuario confirma o ajusta
5. UN solo commit de bootstrap (o snapshot no invasiva)
6. "Tu proyecto ya tiene memoria."
```

### Monorepos

Preguntar antes de asumir:
> "Veo un monorepo con 3 apps. ¿Quieres memoria global o solo para un subproyecto?"

### Proyecto vacío

No hay nada que inferir. Claude dice honestamente:
> "Proyecto sin código aún. Crearé memoria a medida que trabajemos."

---

## Doctor / Repair / Uninstall

### Doctor (diagnóstico)

```
Memory System Status
─────────────────────────
✅ Hooks: 4/4 registrados
✅ Skills: 4/4 presentes
✅ CLI: bin/git-memory accesible
⚠️  Hook pre-commit: no se ejecutó en los últimos 3 commits
✅ GC: último hace 4 días
❌ Blocker stale: 2 items >30 días
✅ Versión: v2.0 (actual)
─────────────────────────
Recomendación: revisar blocker stale
```

### Niveles de ruido (operativos, no decorativos)

| Nivel | Cuándo | Qué hace Claude |
|-------|--------|----------------|
| **silent** | Todo OK o warning irrelevante | Nada. Cero output |
| **inline** | Warning útil pero no bloqueante | Solo lo menciona si el usuario pregunta por estado o si afecta a la tarea actual |
| **interrupt** | Pérdida de capacidad real (hooks rotos, runtime ausente) | Avisa antes de trabajar |

Esto va en PROTOCOL.md como regla operativa, no solo como intención del roadmap.

### Repair

| Situación | Acción |
|-----------|--------|
| .claude/ borrado accidentalmente | Reinstalar runtime desde manifest |
| settings.json corrupto | Reconstruir bloque de hooks |
| Hooks no se ejecutan | Verificar registro, re-registrar |
| Snapshot desincronizado | Regenerar desde memoria viva |
| Instalación parcial | Completar lo que falta |

### Uninstall

Dos modos:

| Modo | Qué hace | Qué NO hace |
|------|---------|-------------|
| **safe** (default) | Quita hooks, skills, CLI, bloque CLAUDE.md, manifest | No toca historia git |
| **full-local** | Todo lo anterior + archivos generados (.claude/dashboard.html, etc.) | No reescribe historia |

Historia git (commits con trailers) **nunca se borra automáticamente**.

> "Puedo quitar el sistema sin tocar el historial pasado. Recomiendo quitar solo el runtime."

---

## Self-healing (recuperación ante desastres)

### git reset --hard / rebase interactivo

Commits de memoria pueden desaparecer.

```
Al arrancar → comparar hashes conocidos con árbol actual
Si detecta amnesia:
  "Parece que hubo un rebase. He reconstruido mi memoria
   leyendo el estado actual, pero puede faltar contexto
   de diseño previo."
```

No dramatizar. No fingir normalidad. Reconstruir y ser honesto.

### Force push

```
Detectar reescritura de historia.
No asumir que "más reciente" = "mejor".
Resolución conservadora, nunca inventada.
```

### Ramas con decisiones contradictorias

Esto no es bug. Es git siendo git.

```
Las decisiones tienen ámbito: repo / rama / path / entorno.
No intentar deduplicar entre ramas.
"En esta rama veo una decisión distinta a main.
 Lo trataré como contexto específico de rama."
```

### CI rechaza trailers

```
Comprobar compatibilidad antes de activar escritura.
Si commitlint activo → modo compatible o namespace permitido.
Alternativa: git notes para memoria local.
"Este repo tiene restricciones sobre commits.
 No voy a forzarlo; usaré un modo compatible."
```

---

## Fases de ejecución (orden definitivo)

```
═══════════════════════════════════════════════════════════
  FASE 0 — DOGFOODING                              AHORA
═══════════════════════════════════════════════════════════
  Instalar v1 en un proyecto real.
  Usarlo una semana entera.
  Descubrir qué explota antes de automatizar nada.

  Criterios de éxito:
  - ¿Reduce prompts repetidos entre sesiones?
  - ¿Recupera contexto correctamente tras cerrar/abrir?
  - ¿El usuario mantiene el sistema activado tras 7 días?
  - ¿Los hooks molestan o ayudan?
  - ¿Cuántas veces quieres desinstalarlo mentalmente?

═══════════════════════════════════════════════════════════
  FASE 1 — SKILLS v2 + ESTRUCTURA PLUGIN          DESPUÉS
═══════════════════════════════════════════════════════════
  Reescribir los 4 skills (fusionando v1).
  Reestructurar el repo como plugin de Claude Code.
  Esto ES el producto v2.

  Skills (orden de escritura):
  1. SKILL.md (core: boot + workflow + trailers + policy)
  2. PROTOCOL.md (autoridad + conducta + releases + conflicts + undo)
  3. LIFECYCLE.md (install + doctor + repair + uninstall)
  4. RECOVERY.md (desastres git + CI + edge cases)

  Plugin:
  - Crear .claude-plugin/plugin.json (manifest del plugin)
  - Crear .claude-plugin/marketplace.json (repo = marketplace)
  - Reorganizar estructura para que sea instalable con:
    /plugin marketplace add unmasSk/claude-git-memory
    /plugin install claude-git-memory

═══════════════════════════════════════════════════════════
  FASE 2 — BOOTSTRAP CONSERVADOR               SIGUIENTE
═══════════════════════════════════════════════════════════
  Scout pattern + niveles de confianza.
  1 snapshot con confirmación del usuario.
  Monorepo-aware. Proyecto vacío-safe.

═══════════════════════════════════════════════════════════
  FASE 3 — DOCTOR / REPAIR / UNINSTALL          SIGUIENTE
═══════════════════════════════════════════════════════════
  Health checks con severidad real.
  Repair que reconstruya runtime.
  Uninstall que respete al usuario.
  Esto compra confianza como nada más.

═══════════════════════════════════════════════════════════
  FASE 4 — TEST REAL PROFUNDO                   VALIDAR
═══════════════════════════════════════════════════════════
  Todo el sistema integrado en proyecto real.
  Matriz de tests completa.
  Criterios de éxito de producto, no solo técnicos.

  Matriz:
  - Instalación limpia en proyecto nuevo
  - Instalación sobre .claude/ existente (merge sin pisar)
  - Bootstrap en proyecto grande (500+ commits)
  - Sesión completa: trabajar, commits, hooks en acción
  - Supervivencia entre sesiones (cerrar → reabrir → boot)
  - Compresión de contexto (PreCompact → snapshot)
  - GC real (acumular stale → limpiar → tombstones)
  - Commits manuales del humano (hooks no bloquean)
  - Merge con conflictos (registrar resolución)
  - Reset hard → self-healing → reconstrucción
  - Cambio de rama → contexto branch-aware
  - Uninstall → limpieza completa → repo intacto

═══════════════════════════════════════════════════════════
  FASE 5 — INSTALACIÓN ROBUSTA                  ENDURECER
═══════════════════════════════════════════════════════════
  Solo DESPUÉS del test real. Endurecer con lo aprendido.
  Transaccional: inspeccionar → planificar → aplicar → verificar.
  Manifest local. Bloque gestionado en CLAUDE.md.
  Hooks que no bloquean humanos.
  Modos de operación (normal/compatible/solo lectura).

═══════════════════════════════════════════════════════════
  FASE 6 — UPGRADE Y VERSIONADO                 ESCALAR
═══════════════════════════════════════════════════════════
  VERSION + manifest + changelog.
  Diff de instalación antes de actualizar.
  Migraciones explícitas si hay breaking changes.
  Backup antes de upgrade.
  No auto-detectar versiones. Solo cuando el usuario pida.

═══════════════════════════════════════════════════════════
  FASE 7 — FUTURO                           SOLO CON PMF
═══════════════════════════════════════════════════════════
  Solo si hay valor demostrado en uso real:

  - npm/pip package (distribución real)
  - GitHub Action (CI compliance)
  - Memos globales (~/.claude/)
  - Git Notes como alternativa para CI estricto

  MATADO del roadmap:
  - Multi-LLM (acoplado a Claude Code, no tiene sentido ahora)
  - Comunidad de templates (no hay usuarios aún)
  - Onboarding tutorial conversacional (no antes de PMF)
  - Stats/analytics (vanity metrics)
```

---

## Lo que puede explotar si no se ataca

| # | Riesgo | Por qué es letal | Mitigación |
|---|--------|------------------|------------|
| 1 | **Decisión falsa persistente** | Un caso de "Claude recordó algo que nunca decidimos" mata la credibilidad entera | Valla alta: evidencia explícita o confirmación del usuario. Nunca inferir decisions |
| 2 | **Instalación parcial invisible** | El usuario cree que "tiene memoria" con runtime roto. Veneno lento | Doctor al inicio de sesión. Manifest de instalación verificable |
| 3 | **Ausencia de autoridad clara** | CLAUDE.md dice una cosa, memoria git dice otra, Claude elige lo que le conviene | PROTOCOL.md con precedencias explícitas |
| 4 | **Tentación de sobreautomatizar** | "Funciona → añadamos más captura, más inteligencia, más mantenimiento" | PROTOCOL.md como freno. Default conservador |
| 5 | **Tratar git como DB lineal** | Branches, rebases y force-push rompen la ilusión de historia monotónica | RECOVERY.md + self-healing + branch-awareness |

---

## En una frase

> El éxito de claude-git-memory no depende de guardar más cosas.
> Depende de que Claude sepa perfectamente cuándo callarse, cuándo preguntar,
> y cómo recuperarse sin asustar al usuario.
