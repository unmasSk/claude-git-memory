# Prompt Template — Alexandria (Audit)

> Template para el orquestador.

```markdown
## Tarea: Documentacion post-auditoria del modulo [MODULO]

### Contexto
- Modulo: `backend/src/[MODULO]/`
- Issue: #[N]
- Branch: `chore/audit-[MODULO]-[N]`
- Auditoria completada — Yoda aprobo con [XX/110]

### Cambios realizados durante la auditoria

[PEGAR RESUMEN de todos los WIPs y cambios acumulados — Alexandria necesita esto
para saber que documentar]

- Paso 2: [que arreglo Ultron]
- Paso 3: [que golden tests creo Dante]
- Paso 5: [que findings arreglo Ultron, splits si hubo]
- Paso 9: [que tests adversariales creo Dante]

### Archivos nuevos o renombrados

[LISTA de archivos que se crearon, renombraron o eliminaron durante la auditoria]

### Score final
- Yoda: [XX/110] — [APPROVED / APPROVED WITH RESERVATIONS]
- Tests: [N] pasando
- Cobertura: [X]%
```
