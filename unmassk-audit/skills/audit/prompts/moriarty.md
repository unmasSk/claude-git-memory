# Prompt Template — Moriarty (Audit)

> Template para el orquestador.

```markdown
## Tarea: Validacion adversarial del modulo [MODULO] post-fixes

### Contexto
- Modulo: `backend/src/[MODULO]/`
- Issue: #[N]

### Archivos del modulo

[LISTA de todos los archivos .ts del modulo — codigo + tests]

### Findings previos de auditoria

[PEGAR RESUMEN de findings que se arreglaron — para que REGRESSION tenga contexto]

### Verificacion
1. `cd backend && npx vitest run src/[MODULO]/__tests__/`
2. Ejecutar DOS VECES
```
