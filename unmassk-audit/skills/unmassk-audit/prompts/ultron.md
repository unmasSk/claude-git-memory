# Prompt Template — Ultron (Audit Fix)

> Template para el orquestador. Rellenar los campos entre corchetes.

```
## Tarea: Corregir findings en modulo [MODULO]

### Contexto
- Modulo: `backend/src/[MODULO]/`
- Issue: #[N]
- Branch: `chore/audit-[MODULO]-[N]`

### Findings a corregir

[PEGAR TABLA DE FINDINGS — ordenados T1 primero, T2 despues, T3 ultimo]

| ID | Tier | Archivo:linea | Descripcion | Fix recomendado |
|----|------|---------------|-------------|-----------------|
| F1 | T1   | file.ts:45    | ...         | ...             |

### Archivos en scope

[LISTA EXACTA de archivos que este agente puede tocar]

- `backend/src/[MODULO]/[archivo1].ts`
- `backend/src/[MODULO]/[archivo2].ts`

### Referencia 10/10

Codigo enterprise aprobado por Yoda — usar como modelo:
- `backend/src/api/[MODULO_REFERENCIA]/[archivo_referencia].ts`

### Verificacion
1. `cd backend && npx vitest run src/[MODULO]/__tests__/`
2. Ejecutar DOS VECES
3. `cd backend && npx prettier --check "src/[MODULO]/**/*.ts"`
4. `cd backend && npx eslint src/[MODULO]/`

### Output esperado
Por cada finding corregido:
- ID del finding
- Causa raiz
- Fix aplicado
- Archivos modificados con LOC antes/despues

Resultados de verificacion (copiar output real, no resumir).
```
