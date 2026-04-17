---
tags:
  - next-session
  - plan
  - 2026-04-17
aliases:
  - Plan Mañana
  - Next Session
date: 2026-04-17
updated: 2026-04-16
status: queued
---

# 🌅 Plan Mañana — 2026-04-17

> [!tip] Leé esto primero cuando arranques
> Ayer cerramos la jornada 2026-04-16 con 5 commits de Personal Phase 1 pusheados. Esto es el punto de entrada de mañana — Claude ya tiene contexto en engram bajo `features/personal-colaboradores` y `features/personal-colaboradores-impl`.

---

## 🎯 Objetivo de mañana

**Llevar Personal Phase 1 de "código commiteado" a "vivo en producción y verificado manualmente"**, y decidir qué sigue: Phase 2 (notifs Pro+), Sprint 9 (pagos transferencia), o Sprint 8 (Portal Cliente mobile).

---

## 📋 Orden recomendado de la mañana

### 1. Deploy + migration (15 min · **tu tarea**)

> [!warning] Solo vos podés hacerlo
> Deploy manual + DB migration no es código — es infra.

- [ ] Pull del repo en el VPS: `git pull origin main`
- [ ] Rebuild del backend: `docker-compose up -d --build` (o el comando que uses)
- [ ] Verificar que corrió la migration 042 (aparece en logs del startup)
- [ ] Smoke check: `curl https://api.solennix.com/health` → 200 ok

### 2. Smoke test manual cross-platform (30 min · **juntos**)

- [ ] **Web** (`solennix.com` después de deploy del static):
    - `/staff/new` → crear "Test Photographer"
    - Editar un evento existente → Step 4 → asignar al test photographer → guardar
    - Abrir EventSummary → confirmar que aparece asignado
    - `/staff` → eliminar → confirmar CASCADE (no aparece más en el evento)
- [ ] **iOS** (device o simulator):
    - Sidebar iPad "Personal" visible · iPhone "Más" → Personal visible
    - CRUD funciona · EventForm Step 4 muestra panel · EventDetail tiene card "Personal"
- [ ] **Android** (device o emulator):
    - Bottom nav "Más" → Personal visible
    - CRUD funciona · EventForm panel en page Equipment
    - EventDetail tiene shortcut "Personal"

### 3. Elegir próximo sprint (5 min · **decisión tuya**)

Presentame estas 3 opciones y eligen una:

#### Opción A — Phase 2 (notifs email al colaborador · Pro+)
- **Esfuerzo:** 1-2 h · scaffolding ya está, es hook puro en `CRUDHandler.UpdateEventItems`.
- **Valor:** activa el "wow" real del feature — el colaborador recibe email automático cuando lo asignás.
- **Requiere:** nada externo. Resend ya está configurado.

#### Opción B — Sprint 9 feature B (pagos transferencia del cliente)
- **Esfuerzo:** 2-3 sesiones · es grande (backend + 3 clientes).
- **Valor:** alto — reemplazamos el botón "Pagar con Stripe" que vos querés quitar.
- **Requiere:** nada externo.

#### Opción C — Sprint 8 (Portal Cliente en iOS + Android)
- **Esfuerzo:** 1 sesión corta · solo las share sheets.
- **Valor:** cierra la paridad cross-platform que quedó pendiente ayer.
- **Requiere:** nada externo.

> [!info] Recomendación mía
> **Opción A primero** (Phase 2) porque cierra un loop mental — el feature queda "completo para Pro" y te da confianza para venderlo. Después Opción C para cerrar el portal mobile. Opción B la hacemos cuando quieras meter un sprint largo.

---

## 🚧 Pendientes técnicos menores de ayer (cuando haya hueco)

- [ ] **Openapi spec**: agregar schemas `Staff` + `EventStaff` + 6 paths. Después de eso, borrar las interfaces locales en `web/src/types/entities.ts` y tirar de `components['schemas']`.
- [ ] **Tests de integración backend**: multi-tenant isolation para `staff` repo. El patrón está en `repository_integration_test.go`.
- [ ] **Tests web**: `StaffList.test.tsx`, `StaffForm.test.tsx`, `useStaffQueries.test.tsx`.
- [ ] **Typecheck de Settings.tsx**: errores pre-existentes de `SubscriptionInfo` que aparecieron en el tsc de ayer (no son de Personal, vienen de antes).

---

## 🔗 Dónde está todo lo de ayer

- Plan original aprobado: `~/.claude/plans/perfecto-ya-que-estamos-bright-pascal.md`
- Tracker visual: [[17_PERSONAL_TRACKER|Personal / Colaboradores — Tracker]]
- Sprint log: [[16_SPRINT_LOG_2026_04_16|Jornada 2026-04-16]] — sección "Personal / Colaboradores — Phase 1"
- Commits remotos (pusheados a `main`):
  - `4ae1df1` feat(backend): staff catalog + event_staff
  - `a51c7b2` feat(web): Staff pages + event form integration
  - `b87ca83` docs(prd): Personal Phase 1 across PRD + Obsidian
  - `1e98cfb` feat(ios): Staff module + event form integration
  - `60154a4` feat(android): feature:staff module + event form integration

---

## 🧠 Contexto en Engram (para que Claude recupere rápido)

Cuando abras la próxima sesión, la primera acción de Claude debería ser:

```
mem_context(project: "eventosapp")
mem_search(query: "personal colaboradores", project: "eventosapp")
```

Topics clave:
- `features/personal-colaboradores` — decisiones arquitectónicas originales
- `features/personal-colaboradores-impl` — estado de implementación de ayer

---

> [!success] Que descanses, papá
> Mañana seguimos. El producto avanzó mucho hoy — 5 commits cross-platform más de un feature completamente nuevo. Respirá y volvé mañana fresco. Buenísimo, hermano.
