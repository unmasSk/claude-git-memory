# git-memory VS Code Extension — Ideas & Research

> **STATUS: PARKED (2026-03-12).** Extensión aparcada para trabajar en otras prioridades. Todo el research y decisiones están capturados aquí y en el README (sección Roadmap v5.0). Retomar cuando sea el momento.

## Concepto

Extensión de VS Code que muestra un panel lateral (Activity Bar) con una línea de tiempo en tiempo real de toda la actividad de git-memory: wips, memos, decisiones, context commits, squashes, commits de código.

El usuario ve que Claude está trabajando, qué va guardando, y se queda tranquilo.

## Funcionalidades principales

### Timeline (MVP)
- Panel lateral tipo Source Control con icono propio (🧠)
- Línea de tiempo vertical con dots de colores por tipo de commit
- Wips: discretos, puntos pequeños, texto en itálica
- Decisions: destacadas, amarillo, expandibles
- Memos: azul, con categoría (preference/requirement/antipattern)
- Context: marcadores de sesión verdes con Next/Blocker
- Code commits: feat/fix/refactor con trailers (Why, Touched)
- Squash groups: indicador visual cuando wips se comprimen en commit real
- Items expandibles al clic (muestran trailers completos)
- Separadores de tiempo ("Now", "15 min ago")
- Sesiones anteriores en opacidad reducida

### Búsqueda
- Barra de búsqueda con filtro por texto
- Botón "Gitto" / "AI" para búsqueda semántica via el agente Gitto
- Futuro: búsqueda AST (por estructura de código)
- Futuro: búsqueda RAG (embeddings sobre el historial de git)

### Interacción con Claude
- Botón "Ask Claude" en cada item del timeline
- Al clicar: abre el terminal de Claude Code con contexto del item seleccionado
- Permite al usuario preguntar sobre una decisión, memo, o commit específico

### Info de sesión
- Branch actual
- Contadores: N decisions, N memos, tiempo de sesión
- Estado: uncommitted changes, ahead/behind de remote

## Research técnica (2026-03-11)

### Fuente de datos
- **Git IS the bridge** — no hace falta bridge custom entre Claude Code y VS Code
- La extensión usa la API de git nativa de VS Code: `onDidCommit`, `onDidChangeState`
- Parsea trailers (Decision, Memo, Next, Blocker) directamente del commit message
- Refs: git.d.ts en github.com/microsoft/vscode/blob/main/extensions/git/src/api/git.d.ts

### Panel lateral
- WebviewView registrado en Activity Bar (no TreeView — demasiado limitado)
- Necesita `viewsContainers` + `views` con `type: "webview"` en package.json
- Implementar `WebviewViewProvider` con `resolveWebviewView()`
- Comunicación via `postMessage()` / `onDidReceiveMessage()`
- Refs: github.com/microsoft/vscode-extension-samples/tree/main/webview-view-sample

### Tech stack
- TypeScript + esbuild (recomendado en 2026)
- Scaffold: `npx yo code` (TypeScript + esbuild)
- Para webview rico: segundo esbuild config con `platform: "browser"`, `format: "iife"`
- Publicación: `vsce package` → `vsce publish`

### Extensiones similares (competencia)
- GitLens: TreeView + WebviewView, full git supercharger
- Git History: WebviewPanel para grafos
- GitDoc: auto-commits on save
- **Ninguna muestra actividad de AI o timeline de memoria** — hueco claro

### Integración Claude Code ↔ VS Code
- No hay API pública entre Claude Code CLI y extensiones de VS Code
- Opciones de bridge si se necesita más que git:
  - File-based events (hooks escriben a JSONL, extension lo vigila)
  - Unix domain socket (real-time, bidireccional)
  - Shared git state (recomendado — zero coupling)

## Mockups

3 estilos visuales disponibles en `mockups/`:
- **Style A** (`style-A-vscode-native.html`): Estilo VS Code nativo, austero, mimetizado
- **Style B** (`style-B-github-primer.html`): GitHub Primer dark, con search bar + Ask Claude + Gitto badge
- **Style C** (`style-C-modern-glass.html`): Moderno/glassmorphism, gradientes sutiles, glows en dots, botón Gitto destacado

## Decisiones tomadas

- [x] Repo aparte: `claude-git-memory-vscode`
- [x] Estilo visual: Style C (moderno/glassmorphism)
- [x] Iconos: SVG propios, NO emojis
- [x] Ask Claude: copia referencia formateada al clipboard (`@git-memory decision <sha> — <text>`)
- [x] MVP incluye: timeline + búsqueda texto + Ask Claude

## Decisiones pendientes

- [ ] Estilo de iconos (outline vs filled vs mono-glyph)
- [ ] ¿Publicar en marketplace o solo distribución local al principio?
- [ ] Diseño final mockup con Style C + iconos propios
