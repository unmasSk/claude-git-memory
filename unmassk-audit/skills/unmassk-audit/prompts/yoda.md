# Prompt Template — Yoda (Audit)

> Template para el orquestador.

```markdown
## Tarea: Evaluacion senior final del modulo [MODULO]

### Contexto
- Modulo: `backend/src/[MODULO]/`
- Issue: #[N]
- Auditoria enterprise completa (pasos 1-10 ejecutados)

### Input de otros agentes

**Findings de auditoria (Cerberus):**
[PEGAR findings originales + cuales se cerraron]

**Reporte adversarial:**
[PEGAR resumen — fases ejecutadas, breaks, veredicto]

**Cobertura de tests:**
[PEGAR resultado de cobertura — % lineas, % branches]

### Referencia de modulo (opcional)
- Modulo aprobado previamente: `backend/src/api/[MODULO_REFERENCIA]/`
- Score previo: [XX/110]

### Verificacion
1. `cd backend && npx vitest run src/[MODULO]/__tests__/`
2. Ejecutar DOS VECES
```
