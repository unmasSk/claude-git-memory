# Prompt Templates — Cerberus (Audit)

> Templates para el orquestador. Rellenar los campos entre corchetes.

---

## Template 1: Auditoria Enterprise (Paso 4)

> Scope: modulo COMPLETO, no diff. Cerberus normalmente trabaja con diff —
> este prompt cambia su scope a lectura completa del modulo.

```markdown
## Tarea: Auditar modulo [MODULO] contra enterprise standards

### Contexto
- Modulo: `backend/src/[MODULO]/`
- Issue: #[N]
- Scope: lectura COMPLETA del modulo (no diff)

### Archivos a auditar

[LISTA EXACTA — solo los que correspondan a este agente]

- `backend/src/[MODULO]/[archivo1].ts` ([LOC] LOC)
- `backend/src/[MODULO]/[archivo2].ts` ([LOC] LOC)

### Problemas ya detectados en escaneo

[PEGAR observaciones del paso 1 relevantes a estos archivos]

### Referencia de estandares

Evaluar contra `docs/ENTERPRISE-STANDARDS.md`:
- Seguridad: §4.5 (SQL), §7 (auth), §1 (tiers)
- Error handling: §4.3
- Estructura: §3 (LOC), §6 (splits)
- Testing: §6
- Mantenibilidad: §5 (JSDoc), §11 (anti-patrones)

### Score ponderado

| Dimension | Peso |
|-----------|------|
| Seguridad | x3 |
| Error handling | x3 |
| Estructura | x2 |
| Testing | x2 |
| Mantenibilidad | x1 |
| **Total** | **/110** |

NO inventar criterios fuera de ENTERPRISE-STANDARDS.md.
NO arreglar nada — solo reportar.

### Regla critica: verificar contexto externo antes de reportar auth/routing

Antes de reportar findings de auth bypass, missing middleware, o rutas sin proteccion:
1. Verificar si el middleware se aplica globalmente en el punto de montaje del router (leer `config/routes/`)
2. Verificar `config/routes/auth.ts` y `config/routes/protected.ts` para entender que middlewares se aplican antes de que el request llegue al modulo
3. Si el middleware ya se aplica upstream, NO reportar como finding del modulo — es contexto externo valido
```

---

## Template 2: Re-Auditoria (Paso 10)

> Scope: modulo COMPLETO post-fixes. Comparar score antes/despues.

```markdown
## Tarea: Re-auditar modulo [MODULO] post-fixes

### Contexto
- Modulo: `backend/src/[MODULO]/`
- Issue: #[N]
- Scope: lectura COMPLETA del modulo (no diff)

### Findings anteriores

[PEGAR TABLA de findings del paso 4 — para verificar cuales se cerraron]

| ID | Tier | Descripcion | Estado esperado |
|----|------|-------------|-----------------|
| F1 | T1   | ...         | Cerrado         |

### Score anterior: [XX/110]

### Verificacion
1. `cd backend && npx vitest run src/[MODULO]/__tests__/`
2. Ejecutar DOS VECES
3. `cd backend && npx prettier --check "src/[MODULO]/**/*.ts"`
4. `cd backend && npx eslint src/[MODULO]/`

### Regla critica: verificar contexto externo antes de reportar auth/routing

Antes de reportar findings de auth bypass, missing middleware, o rutas sin proteccion:
1. Verificar si el middleware se aplica globalmente en el punto de montaje del router (leer `config/routes/`)
2. Verificar `config/routes/auth.ts` y `config/routes/protected.ts` para entender que middlewares se aplican antes de que el request llegue al modulo
3. Si el middleware ya se aplica upstream, NO reportar como finding del modulo — es contexto externo valido

### Output esperado
- Findings cerrados: X/Y
- Findings nuevos (si los hay, con tier)
- Score: antes ([XX]/110) → despues ([YY]/110)
- Valoracion en lenguaje natural por dimension (2-3 frases cada una)
```
