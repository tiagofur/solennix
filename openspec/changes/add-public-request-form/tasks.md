# Tasks: Add Public Request Form

> Branch: `feat/v2-public-request-form`. Refs: proposal.md, design.md, specs/public-request-form/spec.md, Issue #1118.

## Phase 1: Service

- [x] 1.1 Crear `publicRequestService.ts`: tipo `CreatePublicRequestRequest` (de api.ts) + `PublicRequestError` (status + code) + `submit(slug, payload, signal)` con POST sin auth, parseo de body de error estructurado (`{error, message}`), unwrap de `{ data }`.
- [x] 1.2 Tests service (8, MSW): happy 201 (wrapped + bare), header content-type + body, 429 inbox_full (code), 400 invalid_services (code), 404, 500 body no-JSON (fallback message), slug encoding.

## Phase 2: Modal evolución

- [x] 2.1 Strings i18n `profile.request.*` añadidos al namespace `public` (ES+EN): labels email/location/budget/services, placeholders, errores (email_invalid, date_past, budget_invalid, inbox_full, not_found, generic), disclaimer legal.
- [x] 2.2 Modificar `PublicLeadModal.tsx`: prop `services` (D4), submit vía `publicRequestService.submit` (D2), campos nuevos (contact_email obligatorio type=text+inputMode=email + regex validate, location, budget, services checkboxes D5), disclaimer visible (ToS #1112), validación client-side (D6 regex, fecha futura, budget≥0), mapeo errores por code/status (D7: inbox_full/not_found/generic).
- [x] 2.3 Tests modal (12): null cerrado, dialog+campos nuevos, disclaimer, sin servicios oculta sección, submit estructurado a /requests, validación email, validación fecha pasada, 429 inbox_full, 404 not_found, 500 generic, toggle services, submit disabled mientras submitting.

## Phase 3: Wiring + cleanup + verify

- [ ] 3.1 Modificar `PublicProfilePage.tsx`: pasar `services={profile.services ?? []}` al modal.
- [ ] 3.2 `tsc --noEmit` limpio; ESLint pasa; `vitest run` verde.
- [ ] 3.3 verify-report.md + abrir PR linkeando #1118.

## Implementation Order

Lineal: 1 (service) → 2 (modal) → 3 (wiring+verify). Frontend, sin migración, sin backend. Modal evolutivo (no nuevo).
