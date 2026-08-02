# Proposal: Add Public Request Form in /u/:slug (Web)

> Refs: Issue [#1118](https://github.com/tiagofur/solennix/issues/1118) · PRD `docs/PRD/15_MARKETPLACE_V2.md` §3 · Milestone Solennix v2.0 (Sprint 13 / Fase 1)

## Intent

El modal de cotización en `/u/:slug` (`PublicLeadModal`) envía hoy un **lead libre** (`POST /leads`) con solo nombre + contacto + mensaje. El backend de #1115 (ya mergeeado) expone `POST /api/public/organizers/{slug}/requests` que acepta una solicitud **estructurada** (email, fecha, ubicación, presupuesto, servicios, mensaje). Sin este form, el inbound del proveedor se queda en mensajes libres sin trazabilidad ni conversión a evento.

## Scope (MVP)

### In Scope
- Nuevo service `publicRequestService.submit(slug, payload)` consumiendo `POST /api/public/organizers/{slug}/requests`.
- **Evolución del `PublicLeadModal`** existente (no modal nuevo): añadir campos estructurados (contact_email obligatorio, location, budget, services multi-select desde el catálogo público del organizador) + mantener los existentes (event_type, event_date, guest_count, message).
- Multi-select de servicios del organizador (los `services[]` con `show_on_public_profile=true` que ya vienen en el profile).
- Validación client-side: contact_email válido, event_date futura, budget ≥ 0.
- Disclaimer visible: "El acuerdo es directo con el proveedor" (cláusula ToS #1112, ya mergeeado).
- Estados: submitting / error (mapea 429 inbox_full, 400, 404) / success (confirmación).
- i18n ES/EN (regla AGENTS.md).

### Out of Scope
- El endpoint `/leads` queda funcionando (soft-deprecated, no se toca otros callers).
- Acción del visitante sobre su solicitud (`POST /requests/{id}/action` con X-Request-Token) → futuro (#1125 móvil o enhancement).
- UI móvil dedicada → el modal es responsive mobile-first ya.
- Captcha → el backend ya tiene rate-limit (5/min); captcha es hardening futuro.

## Approach

**Frontend puro, evolutivo.** Reemplazo el `submitLead` dentro del `PublicLeadModal` existente por `submitRequest`, añado los campos nuevos al form, y paso el catálogo de servicios del organizador via props (ya disponible en el profile). Mismo componente, misma UX base (modal, states, brandColor), evolución del payload.

El modal recibirá una prop nueva `services: PublicProfileService[]` (los servicios públicos del organizador) para el multi-select.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `web/src/services/publicRequestService.ts` | New | `submit(slug, payload)` con fetch POST sin auth |
| `web/src/pages/PublicProfile/PublicLeadModal.tsx` | Modified | Añade campos (email, location, budget, services[]) + cambia a `submitRequest`. Renombrado conceptual a "solicitud" pero mantengo el nombre del archivo para minimizar diff. |
| `web/src/pages/PublicProfile/PublicLeadModal.test.tsx` | New/Modified | Tests del form estructurado |
| `web/src/pages/PublicProfile/PublicProfilePage.tsx` | Modified | Pasa `services` prop al modal |
| `web/src/i18n/locales/{es,en}/public.json` | Modified | Strings nuevos del form de solicitud |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Modal muy largo en móvil con nuevos campos | Medium | Layout responsive (grid cols adaptable), scroll interno |
| Servicios del organizador vacíos → multi-select vacío | Low | Si no hay servicios, oculto ese campo (graceful) |
| 429 inbox_full del backend | Low | Mensaje claro "bandeja llena, probá más tarde" |
| Romper el modal existente (que ya funciona) | Medium | Evolución incremental, tests del flujo existente primero |

## Rollback Plan

- Revertir el modal a `submitLead` (commit anterior).
- El service nuevo queda sin callers (inofensivo).
- El endpoint `/requests` del backend sigue disponible (no se toca).

## Dependencies

- Issue #1118 (approved). Milestone v2.0.
- Consume `POST /api/public/organizers/{slug}/requests` (#1115, mergeeado).
- Reutiliza `PublicLeadModal` + `PublicProfilePage` existentes.

## Success Criteria

- [ ] El modal envía una solicitud estructurada a `/requests` (no a `/leads`).
- [ ] contact_email es obligatorio y validado.
- [ ] Multi-select de servicios del organizador funciona.
- [ ] Disclaimer "acuerdo directo con el proveedor" visible.
- [ ] Estados submitting/error/success correctos (incluye 429 inbox_full).
- [ ] i18n ES/EN completo.
- [ ] `vitest` verde; `tsc --noEmit` limpio.
- [ ] No rompe `/u/:slug` ni el modal existente.
