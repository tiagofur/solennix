---
tags:
  - solennix
  - docs
  - obsidian
aliases:
  - Solennix Docs
  - Solennix Vault
status: active
---

# 📚 Solennix — Documentación

> [!abstract] Resumen
> Documentación operativa de Solennix por plataforma (iOS, Android, Web, Backend) y función (Producto, Arquitectura, Marketing). El estado del producto es **vivo** — ver las fuentes canónicas abajo.

---

## 🎯 Punto de entrada

- [[00_DASHBOARD|Dashboard Ejecutivo]] — vista de 30 segundos

---

## 📁 Navegación por área

- **[[iOS/iOS MOC|iOS]]** — App nativa para iPhone/iPad
- **[[Android/Android MOC|Android]]** — App nativa para Android
- **[[Web/Web MOC|Web]]** — Aplicación web React
- **[[Backend/Backend MOC|Backend]]** — API, base de datos, servicios
- **[[PRD/PRD MOC|Producto (PRD)]]** — Visión, features, roadmap
- **[[Marketing/videos/MOC|Marketing / Videos]]** — Branding, campañas, assets de video

---

## 📋 Fuentes canónicas de estado

- 📊 **[[PRD/11_CURRENT_STATUS|Estado Actual del producto]]** — fuente viva
- 📅 **[[PRD/09_ROADMAP|Roadmap maestro]]**
- 🏗️ **[[../AGENTS|AGENTS.md]]** — reglas normativas para agentes de IA (router)

> [!note] Estado por plataforma
> Para estado operativo de cada plataforma, ver el MOC correspondiente. El de Android incluye una baseline de calidad (2026-05-13); las demás plataformas se reflejan en PRD/11.

---

## 🗂️ Templates disponibles

Usá estos al crear nueva documentación:
- [[_templates/Template - Modulo|Módulo]]
- [[_templates/Template - ADR|ADR (decisión arquitectónica)]]
- [[_templates/Template - Runbook|Runbook (procedimiento operativo)]]

Ver [[_templates/README|todos los templates]].

---

## 🏗️ Estructura de mantenimiento

1. **Cambios en arquitectura** → Crear/actualizar ADR en la plataforma afectada
2. **Nueva feature** → Crear módulo en la carpeta correspondiente + actualizar PRD
3. **Procedimiento repetible** → Crear Runbook en `Runbooks/`
4. **Estado del sistema** → Actualizar `PRD/11_CURRENT_STATUS.md`
5. **Cambios cerrados/históricos** → Mover a `[[_archive|docs/_archive/]]`

---

## ✅ Reglas de mantenimiento

- **Estado del producto:** `PRD/11_CURRENT_STATUS.md` es la fuente viva — mantenerla actualizada.
- **Ningún ADR sin linkearse:** Siempre actualizar el MOC correspondiente.
- **Documentación antes de code:** PRD + ADR antes de implementar features grandes.
- **Planos cerrados:** archivar en `_archive/` (historia preservada, no activos).

---

*Reglas normativas para agentes de IA en [`AGENTS.md`](../AGENTS.md) (raíz del repo).*
