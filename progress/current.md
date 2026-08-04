# Sesión Activa — Solennix Agent Progress

## Estado actual

### v2.0 remediation — hallazgos review perfil público + directorio (cerrados en código)

Branch de trabajo: `feat/v2-geo-search-web` (sobre main con S13 + #1127).

| Hallazgo review | Fix |
| --- | --- |
| Geo handler no parseaba lat/lng/radius | `SearchOrganizers` + tests |
| Geo web #1128 incompleto | Near me + sort + radius_km=50 + i18n |
| `client_token` con `json:"-"` | DTO create-only con token |
| Anti-spam incompleto | Honeypot `website` (fake 201) |
| Sitemap ≠ publicable | `ListEnabledSlugs` alineado a criterios de directorio |
| Cover OR logo vs PRD | Directorio exige `cover_url` |
| `service_radius_km` muerto | Upsert API + filtro geo + settings UI |
| Dual PublicLead | Deprecation headers + OpenAPI `deprecated` |
| Sin inbox web proveedor | `/requests` + service + nav |
| Funnel visitante ciego | `/solicitud/:id` + accept/decline |
| robots/sitemap proxy | `nginx.conf` + robots con URL API |
| progress/current stale | Este archivo |

### Backend tocado
- `handlers/public_profile_handler.go` — geo query params
- `handlers/public_request_handler.go` — token create DTO, honeypot, GetRequest full
- `handlers/public_profile_config_handler.go` — service_radius_km
- `handlers/public_lead_handler.go` — Deprecation
- `repository/public_profile_repo.go` — cover-only, sitemap publicable, radius filter
- `docs/openapi.yaml`, `models.go` comment
- tests handlers/repo

### Web tocado
- Proveedores geo finish
- publicRequestService + PublicLeadModal honeypot/token
- PublicRequestStatusPage `/solicitud/:id`
- RequestsInboxPage `/requests`
- PublicProfileSettings radius
- Layout nav, App routes, i18n, nginx, robots

### Tests
- Backend: handlers SearchOrganizers + CreatePublicRequest OK; repository search OK
- Web: 71 tests en paths tocados OK

### Gaps menores restantes
- Regenerar `web/src/types/api.ts` desde OpenAPI (`npm run openapi:types` si existe)
- Inbox sin paginación UI >50; sin badge de unread en nav
- Captcha real (Turnstile) no implementado — honeypot + rate-limit es el piso F1
- Mobile S14 intacto (fuera de scope)

## Siguiente tarea
- Review + commit(s) + PR(s)
- Regenerar OpenAPI types
- S14 mobile inbox cuando toque
