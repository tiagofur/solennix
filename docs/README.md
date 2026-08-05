---
tags:
  - solennix
  - docs
  - obsidian
aliases:
  - Solennix Docs
  - Solennix Vault
status: active
updated: 2026-08-05
---

# Solennix — Documentación

> [!abstract] Resumen
> Documentación operativa por plataforma y por función. **Una fuente canónica por tema** — ver tabla abajo.

---

## Punto de entrada

- [[00_DASHBOARD|Dashboard Ejecutivo]] — vista de 30 segundos
- [`AGENTS.md`](../AGENTS.md) — reglas para agentes de IA (router)

---

## Navegación por área

| Área | Entry |
| :--- | :--- |
| iOS | [[iOS/iOS MOC]] |
| Android | [[Android/Android MOC]] |
| Web | [[Web/Web MOC]] |
| Backend | [[Backend/Backend MOC]] |
| Producto (PRD) | [[PRD/PRD MOC]] |
| Marketing | [[Marketing/MOC]] |
| Agentes (estándares cortos) | `agents/architecture.md` · `conventions.md` · `verification.md` |
| Runbooks | [[Runbooks/README]] |
| Templates | [[_templates/README]] |

---

## Fuentes canónicas (quién gana)

| Tema | Canónico |
| :--- | :--- |
| Estado del producto | [[PRD/11_CURRENT_STATUS]] |
| Roadmap forward | [[PRD/09_ROADMAP]] |
| Features / paridad | [[PRD/02_FEATURES]] |
| v2 inbound | [[PRD/15_MARKETPLACE_V2]] |
| Intención de diseño | [`PRODUCT.md`](../PRODUCT.md) |
| Tokens UI | `docs/{iOS,Android,Web}/Design System.md` |
| Arquitectura de capas | `docs/{plataforma}/Arquitectura General.md` + `agents/architecture.md` |
| API | `backend/docs/openapi.yaml` |
| Versiones | `versioning/releases.json` + `CHANGELOG.md` |
| Specs de cambios grandes | `openspec/` |
| Sesión de agente | `progress/current.md` |
| Histórico | [[_archive/README\|docs/_archive/]] |

---

## Reglas de mantenimiento

1. **No uses el PRD como changelog.** Releases → `versioning` / `CHANGELOG`. Diario → `progress/`.
2. **PRD 05–08 son índices** → detalle en docs de plataforma.
3. **Cambios grandes** → OpenSpec / SDD, no un tracker suelto en PRD.
4. **Planes cerrados** → `_archive/` (no borrar sin necesidad).
5. **Nueva feature de dominio** → módulo en la plataforma + fila en `02_FEATURES` + status en `11` si cambia el snapshot.
6. **Templates** → [[_templates/Template - Modulo]], [[_templates/Template - ADR]], [[_templates/Template - Runbook]].

---

*Reglas normativas para agentes: [`AGENTS.md`](../AGENTS.md).*
