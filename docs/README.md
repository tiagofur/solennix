---
tags:
  - solennix
  - docs
  - obsidian
aliases:
  - Solennix Docs
  - Solennix Vault
status: active
date: 2026-04-29
updated: 2026-04-29
---

# 📚 Solennix - Documentación Operativa

> [!abstract] Resumen
> Esta carpeta contiene toda la documentación operativa de Solennix, organizada por plataforma (iOS, Android, Web, Backend) y función (Producto, Arquitectura, Marketing). El objetivo es tener una fuente única de verdad para decisiones técnicas, roadmap y procedimientos operativos.

---

## 🎯 Punto de entrada

- [[00_DASHBOARD|Dashboard Ejecutivo]] — 30 segundos overview del proyecto

---

## 📁 Navegación por área

- **[[iOS/iOS MOC|iOS]]** — App nativa para iPhone/iPad
- **[[Android/Android MOC|Android]]** — App nativa para Android
- **[[Web/Web MOC|Web]]** — Aplicación web React
- **[[Backend/Backend MOC|Backend]]** — API, base de datos, servicios
- **[[PRD/PRD MOC|Producto (PRD)]]** — Visión, features, roadmap
- **[[Marketing/MOC|Marketing]]** — Branding, campañas, assets
- **[[SUPER_PLAN/SUPER PLAN MOC|Super Plan]]** — Visión a largo plazo

---

## 🗂️ Templates disponibles

Usá estos al crear nueva documentación:
- [[_templates/Template - Modulo|Módulo]]
- [[_templates/Template - ADR|ADR (decisión arquitectónica)]]
- [[_templates/Template - Runbook|Runbook (procedimiento operativo)]]

Ver [[_templates/README|todos los templates]].

---

## 📋 Fuentes canónicas de estado

- [[iOS/Estado Plataforma|Estado iOS]]
- [[Android/Estado Plataforma|Estado Android]]
- [[Web/Estado Plataforma|Estado Web]]
- [[Backend/Estado Plataforma|Estado Backend]]

---

## 🏗️ Estructura de mantenimiento

1. **Cambios en arquitectura** → Crear/actualizar ADR en la plataforma afectada
2. **Nueva feature** → Crear módulo en carpeta correspondiente + actualizar PRD
3. **Procedimiento repetible** → Crear Runbook en `Runbooks/`
4. **Estado del sistema** → Actualizar `Estado Plataforma` en cada plataforma
5. **Dashboard desactualizado** → Actualizar `00_DASHBOARD.md`

---

## 🔗 Referencias externas

- [Solennix repo](https://github.com/tuorg/solennix)
- [[../DASHBOARD|← Volver al Dashboard]]

---

## ✅ Reglas de mantenimiento

- **Actualizaciones diarias:** Dashboard si hay cambios críticos
- **Actualizaciones semanales:** "Estado Plataforma" en cada área
- **Actualizaciones mensuales:** PRD roadmap y audit findings
- **Ningún ADR sin linkearse:** Siempre update el MOC correspondiente
- **Documentación antes de code:** PRD + ADR antes de implementar features grandes

---

*Última revisión: 2026-04-29*
