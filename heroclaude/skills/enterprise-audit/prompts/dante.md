# Prompt Templates — Dante (Audit)

> Templates para el orquestador. Rellenar los campos entre corchetes.

---

## Template 1: Golden Tests

```markdown
## Tarea: Golden tests para [ARCHIVO] — 97%+ cobertura

### Contexto
- Modulo: `backend/src/[MODULO]/`
- Issue: #[N]
- Archivo source: `backend/src/[MODULO]/[ARCHIVO].ts`
- Tests existentes: [ARCHIVO_TEST o "ninguno"]

### Exports a cubrir

[LISTA de exports publicos del archivo — extraida del escaneo del paso 1]

- `exportA()`
- `exportB()`

### Integraciones

[Con que otros modulos/archivos se integra — extraido del escaneo del paso 1]

- Importa de: `[modulo1]`, `[modulo2]`
- Consumido por: `[modulo3]`

### Referencia de tests enterprise

Tests aprobados por Yoda — usar como modelo de estilo y estructura:
- `backend/src/api/[MODULO_REFERENCIA]/__tests__/[test_referencia].ts`

### Verificacion
1. `cd backend && npx vitest run src/[MODULO]/__tests__/[TEST_FILE] --coverage`
2. Si < 97%: identificar branches no cubiertos
3. `cd backend && npx vitest run src/[MODULO]/__tests__/`
4. Ejecutar DOS VECES
```

---

## Template 2: Tests Adversariales

```markdown
## Tarea: Tests adversariales para [MODULO] basado en reporte de validacion adversarial

### Contexto
- Modulo: `backend/src/[MODULO]/`
- Issue: #[N]

### Reporte adversarial

[PEGAR RESUMEN del reporte — breaks confirmados y ataques que aguantaron]

| Fase | Ataque | Resultado | Archivo:linea |
|------|--------|-----------|---------------|
| BREAK | ... | ROTO | ... |
| ABUSE | ... | AGUANTO | ... |

### Archivo de salida
- `backend/src/[MODULO]/__tests__/[MODULO].adversarial.test.ts`

### Verificacion
1. `cd backend && npx vitest run src/[MODULO]/__tests__/[MODULO].adversarial.test.ts`
2. `cd backend && npx vitest run src/[MODULO]/__tests__/`
3. Ejecutar DOS VECES
```
