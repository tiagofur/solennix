# Design: Add Public Request Form in /u/:slug (Web)

> Refs: proposal.md · specs/public-request-form/spec.md · Issue [#1118](https://github.com/tiagofur/solennix/issues/1118) · PRD `docs/PRD/15_MARKETPLACE_V2.md` §3

## Architecture

Frontend puro, **evolutivo** del `PublicLeadModal` existente. Patrón de la web: service layer (fetch sin auth) + componente React con estado local (no React Query — es mutation, no query).

```
PublicProfilePage
    └── PublicLeadModal (modificado)
            ├── props nuevas: services: PublicProfileService[]
            ├── form state (useState por campo)
            ├── validate() → errors
            └── submit() → publicRequestService.submit(slug, payload)
                    ↓ fetch POST
                /api/public/organizers/{slug}/requests
```

## Decisions

### D1 — Evolucionar el modal existente (no crear nuevo)

**Decisión:** modificar `PublicLeadModal.tsx` en sitio (añadir campos + cambiar submit). No crear `PublicRequestModal` nuevo.

**Razón:** el modal ya tiene toda la UX base (overlay, escape, brandColor, states success/error, scroll). Crear uno nuevo duplica trabajo y rompe el caller en `PublicProfilePage`. El nombre del archivo queda (`PublicLeadModal`) para minimizar diff — conceptualmente pasa a ser "solicitud" pero el archivo es interno.

### D2 — Service nuevo `publicRequestService` (separado de `publicProfileService`)

**Decisión:** nuevo service `web/src/services/publicRequestService.ts` con `submit(slug, payload)`.

**Razón:** `publicProfileService` ya tiene `submitLead` (legacy). Mezclar submit estructurado ahí ensucia. Service separado = Single Responsibility + facilita tests (mock MSW propio). El `submitLead` legacy queda para referencia/removal futuro.

### D3 — Estado local con useState (no React Hook Form)

**Decisión:** `useState` por campo, validación manual en `validate()` antes de submit.

**Razón:** el modal existente ya usa `useState` (estilo consistente). React Hook Form sería overkill para un modal de 8 campos sin validación compleja. Mantengo el patrón del archivo.

### D4 — Servicios via props (no fetch en el modal)

**Decisión:** `PublicProfilePage` pasa `services: PublicProfileService[]` al modal. El modal no hace fetch.

**Razón:** el profile ya carga los servicios (`profile.services`). Re-fetchear en el modal duplica request y estado. Props mantienen el modal presentacional + testeable.

### D5 — Multi-select como checkboxes (no dropdown)

**Decición:** los servicios se muestran como checkboxes en una grid (chips seleccionables), no un dropdown multi.

**Razón:** con pocos servicios (1-5 típicamente), checkboxes son más claros y scaneables que un dropdown colapsado. Responsive natural. Si hay muchos (>8) en S15 se reconsidera.

### D6 — Validación de email con regex simple

**Decisión:** validar email con ` /^[^\s@]+@[^\s@]+\.[^\s@]+$/` (simple, no RFC exhaustivo).

**Razón:** validación exhaustiva es overkill client-side; el backend (#1115) valida de forma robusta. La regex simple atrapa errores obvios (sin @, sin dominio).

### D7 — Error mapping por status code

**Decisión:** el service lanza `PublicRequestError` con `status`. El modal mapea: 429 + `inbox_full` → mensaje bandeja llena; 429 genérico → rate limit; 400 → datos inválidos; 404 → perfil no encontrado; otros → error genérico.

**Razón:** el backend (#1115) devuelve bodies estructurados (`{error: "inbox_full"}`). El service parsea el body y adjunta `code` para que el modal muestre el mensaje correcto sin re-lógica.

## Components

| Componente | Archivo | Responsabilidad |
|---|---|---|
| `publicRequestService` | `web/src/services/publicRequestService.ts` | `submit(slug, payload)` + `PublicRequestError` |
| `PublicLeadModal` (modificado) | `web/src/pages/PublicProfile/PublicLeadModal.tsx` | Form estructurado + states |
| `PublicProfilePage` (modificado) | `web/src/pages/PublicProfile/PublicProfilePage.tsx` | Pasa `services` prop |
| i18n | `web/src/i18n/locales/{es,en}/public.json` | Strings `directory.request.*` |

## Testing Strategy

- **Service:** MSW, happy path + 429 inbox_full + 400 + 404 + network error.
- **Modal:** render con servicios, submit exitoso, validación (email/fecha/budget), 429 mensaje, multi-select, sin servicios (oculto), disclaimer presente.
- Cobertura target: 85%.

## Out of Scope (recíproco)

- Acción del visitante (`/action` con token) → futuro.
- Captcha → hardening futuro.
- Remover `submitLead` legacy → cleanup futuro.
