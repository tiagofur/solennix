# Tasks: Add Public Request Form

> Branch: `feat/v2-public-request-form`. Refs: proposal.md, design.md, specs/public-request-form/spec.md, Issue #1118.

## Phase 1: Service

- [x] 1.1 Crear `publicRequestService.ts`: tipo `CreatePublicRequestRequest` (de api.ts) + `PublicRequestError` (status + code) + `submit(slug, payload, signal)` con POST sin auth, parseo de body de error estructurado (`{error, message}`), unwrap de `{ data }`.
- [x] 1.2 Tests service (8, MSW): happy 201 (wrapped + bare), header content-type + body, 429 inbox_full (code), 400 invalid_services (code), 404, 500 body no-JSON (fallback message), slug encoding.

## Phase 2: Modal evolución

- [ ] 2.1 Añadir strings i18n `request.*` al namespace `public` (ES+EN): labels, placeholders, errores, disclaimer, success.
- [ ] 2.2 Modificar `PublicLeadModal.tsx`: nueva prop `services: PublicProfileService[]`. Cambiar submit a `publicRequestService.submit`. Añadir campos: contact_email (obligatorio), location, budget, services[] (checkboxes). Mantener event_type/event_date/guest_count/message. Añadir disclaimer visible. Validación client-side (email regex, fecha futura, budget ≥ 0). Mapeo de errores (429 inbox_full → mensaje específico).
- [ ] 2.3 Tests modal: render con servicios, submit exitoso (mock service), validación email/fecha/budget, 429 inbox_full mensaje, multi-select toggle, sin servicios (oculto), disclaimer presente, success view.

## Phase 3: Wiring + cleanup + verify

- [ ] 3.1 Modificar `PublicProfilePage.tsx`: pasar `services={profile.services ?? []}` al modal.
- [ ] 3.2 `tsc --noEmit` limpio; ESLint pasa; `vitest run` verde.
- [ ] 3.3 verify-report.md + abrir PR linkeando #1118.

## Implementation Order

Lineal: 1 (service) → 2 (modal) → 3 (wiring+verify). Frontend, sin migración, sin backend. Modal evolutivo (no nuevo).
