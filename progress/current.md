# Sesión Activa — Solennix Agent Progress

## Estado actual

### Overhaul documental completo (#1385, rama `docs/overhaul-2026-11`, 2026-11-10)

Auditoría de 520 archivos markdown (~69k líneas): solo ~60 frescos. Trabajo realizado:

1. **U1 — Capa normativa alineada a la realidad**: AGENTS.md (paridad web real `hooks/`+`contexts/`, Key Entities reales de `models.go`), CHECKPOINTS.md, ADR-0001/0002/0003 con notas "Solennix Instance", `docs/stack/` reescritos (go-backend, web-react-vite, mobile-native-vs-tauri; desktop-tauri marcado no-adoptado), `.atl/skill-registry.md` corregido, `docs/factory/human-start.md` desduplicado, eliminado `docs/agents/` (contenido absorbido).
2. **U2 — Contrato OpenAPI único**: `contracts/openapi.yaml` canónico; codegen web y CI migrados; `backend/docs/openapi.yaml` eliminado (las copias ya habían divergido 317 líneas — `web/src/types/api.ts` regenerado y `npm run check` verde).
3. **U3 — Canon PRD actualizado**: 11_CURRENT_STATUS (versiones reales: iOS 1.5.1 b10; épico staff #1364–#1374, asistencia, P&L, export CSV; gaps #1303, cron review-emails, Fases 2–3), 09_ROADMAP Now real, precios $149/$499 MXN en 01/03/04, 02_FEATURES seats Pro=5 + §4.11/4.12 nuevas, 21_STAFF_TEAM_REVIEW con estado de mejoras enviadas.
4. **U4 — Entrada del vault**: 00_DASHBOARD y docs/README (fuentes canónicas, `verified:` como regla), feature_list.json +5 capacidades (39–43), PRD MOC.
5. **U5 — Limpieza**: openspec completo → `docs/_archive/openspec/`; eliminados skills sdd-*/_shared/skill-registry, `docs/agents/`, `progress/sessions/`, `progress/history.md`, odd/tasks cerradas (#1347, #1343), `.zcode/plans/`, `docs/release-notes/next.md`, `.github/agents/`, plantillas de issue duplicadas, `Benchmark Baseline.md`.
6. **U6 — Barrido de hechos obsoletos** en todo el vault (precios viejos, `web/src/stores`, `apps/*`, versions) + sellos de frescura `verified:` en frontmatter.

### Verificación de la sesión

- `npm --prefix web run check` verde (codegen contra contracts/).
- `make preflight`, `make test`, `make contracts-lint`, barrido de enlaces: correr al cerrar el PR.

## Historial de sesiones

El historial largo (`progress/history.md`, `progress/sessions/`) fue retirado en #1385 — la trazabilidad vive en git log, CHANGELOG y PRs.
