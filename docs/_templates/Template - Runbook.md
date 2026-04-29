---
tags:
  - runbook
  - operativo
  - solennix
aliases:
  - "{{titulo-corto}}"
type: runbook
status: active
severity: "{{low|medium|critical}}"
owner: "{{owner}}"
date: "{{date}}"
updated: "{{date}}"
---

# 🛠️ Runbook: {{titulo}}

**Propósito:** Describir el procedimiento paso a paso para {{actividad}}.
**Tiempo estimado:** {{X}} minutos
**Requisitos previos:**
- Requisito 1
- Requisito 2

---

## Precondiciones

Verificá que estos items están listos antes de empezar:
- [ ] Precondición 1
- [ ] Precondición 2

---

## Pasos

### Paso 1: {{Titulo paso}}

```
$ comando-a-ejecutar
```

**Resultado esperado:** Descripción de qué debería pasar.

### Paso 2: {{Titulo paso}}

Instrucciones en prosa...

---

## Verificación

Cómo confirmar que el runbook se ejecutó correctamente:

```
$ comando-para-verificar
# Debería output: ...
```

---

## Rollback (si aplica)

Si algo sale mal, cómo revertir los cambios:

### Opción 1: Rollback automático

```
$ comando-rollback
```

### Opción 2: Rollback manual

1. Paso 1
2. Paso 2

---

## Troubleshooting

| Problema | Causa probable | Solución |
|---|---|---|
| Error X | Causa A | Solución A |
| Error Y | Causa B | Solución B |

---

## Referencias
- Link a ADR relevante
- Link a documentación relacionada
