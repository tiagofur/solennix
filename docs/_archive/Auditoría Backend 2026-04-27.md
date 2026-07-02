---
tags:
  - backend
  - auditoria
  - reporte
  - solennix
date: 2026-04-27
status: active
related:
  - "[[Backend MOC]]"
  - "[[Arquitectura General]]"
  - "[[Testing]]"
  - "[[Roadmap Backend]]"
---

# Auditoría Backend — 2026-04-27

> [!abstract] Resultado
> La API backend quedó **estable y ejecutable** sobre la base auditada. `go test ./...` pasó completo después de corregir un drift puntual en `repository_integration_test.go` y ordenar dependencias directas en `go.mod`. La deuda principal hoy no es de compilación: está en **contrato OpenAPI**, **cobertura focalizada de handlers públicos** y **comportamientos/documentación desalineados**.

---

## 1. Alcance

La auditoría contrastó estas superficies contra el código real:

- Router y contratos HTTP (`internal/router/router.go`)
- Wiring de infraestructura y jobs (`cmd/server/main.go`)
- Configuración y variables de entorno (`internal/config/config.go`)
- Handlers públicos y dominios nuevos (`event_form_handler.go`, `event_public_link_handler.go`, `staff_handler.go`, `staff_team_handler.go`)
- Búsqueda global, storage y push (`search_handler.go`, `internal/storage/*`, `push_service.go`, `notification_service.go`)
- Documentación en `docs/Backend/` y PRD backend/status

---

## 2. Métricas verificadas

| Métrica | Valor auditado | Fuente |
| --- | --- | --- |
| Funciones no-test | **527** | `rg '^func ' internal cmd --glob '!**/*_test.go'` |
| Métodos de handler HTTP | **124** | `rg '^func \(h \*[^)]*Handler\)' internal/handlers` |
| Registros de ruta | **112** | `rg '\.(Get|Post|Put|Delete|Patch|Method|Options)\(' internal/router/router.go` |
| Migraciones `.up.sql` | **47** | `rg --files internal/database/migrations | rg '\.up\.sql$'` |
| Jobs de mantenimiento | **6** | Comentarios `// Background job:` en `cmd/server/main.go` |

---

## 3. Lo que sí hace hoy el backend

### Núcleo estable

- Autenticación multi-proveedor con JWT, rotation de refresh tokens, blacklist persistente y OAuth Google/Apple.
- CRUD completo de clientes, eventos, productos, inventario y pagos.
- Dashboard server-side (`/dashboard/kpis`, `/revenue-chart`, `/events-by-status`, `/activity`).
- Staff completo: catálogo, asignaciones por evento, disponibilidad y equipos.
- Portal Cliente público por token (`/api/public/events/{token}`) con agregados de pago.
- Formularios públicos para leads (`/api/public/event-forms/{token}`) con creación transaccional de cliente + evento borrador.
- Push real vía FCM + APNs y Live Activities iOS.
- Storage desacoplado con `StorageProvider` local o S3-compatible.

### Validación ejecutable

- `go test ./...` pasa completo en `backend/`.
- No quedaron errores de compilación backend abiertos después del fix puntual de test.

---

## 4. Hallazgos confirmados

### H1 — Drift contractual en OpenAPI

**Severidad:** Alta

El router expone dominios que no están declarados hoy en `backend/docs/openapi.yaml`:

- `/api/event-forms`
- `/api/public/event-forms/{token}`
- `/api/events/{id}/public-link`
- `/api/public/events/{token}`
- `/api/staff/teams`

**Impacto:** Web/mobile pueden seguir funcionando si usan servicios tipados a mano, pero el spec dejó de ser una fuente de verdad completa. Cualquier regeneración de tipos o validación de contrato puede ocultar rutas reales del backend.

### H2 — Cobertura faltante en handlers públicos nuevos

**Severidad:** Media

No existen archivos de tests dedicados para:

- `internal/handlers/event_form_handler.go`
- `internal/handlers/event_public_link_handler.go`
- `internal/handlers/staff_team_handler.go`

La suite general pasa, pero estos dominios dependen hoy más de cobertura indirecta que de casos explícitos por handler.

### H3 — Storage S3 todavía es parcial

**Severidad:** Media

La abstracción `StorageProvider` ya existe y `main.go` puede arrancar con `STORAGE_PROVIDER=s3`, pero el provider S3 todavía tiene dos huecos reales:

- No genera thumbnails reales; devuelve la misma URL en `thumbnail_url` como placeholder.
- No existen presigned uploads ni pipeline CDN/document processing.

### H4 — Semántica inconsistente en formularios públicos

**Severidad:** Media

`GetFormData` devuelve `404` para token inexistente **y también** para usado/expirado, mientras que `SubmitForm` responde `410 Gone` para el mismo estado inválido. Eso complica a los clientes que quieran diferenciar “link incorrecto” de “link vencido/usado”.

### H5 — La búsqueda real es híbrida, no puramente FTS

**Severidad:** Baja

Las búsquedas listadas en documentación no son solo `ILIKE`, pero tampoco todo el flujo descansa en FTS puro. Hoy el comportamiento auditado es:

- Búsqueda paralela por entidad en `SearchHandler`
- `ILIKE` + `pg_trgm similarity()` en repositorios
- Límite duro de **6 resultados por categoría** en la respuesta pública del search global

La documentación anterior estaba atrasada en ambos sentidos: subestimaba `pg_trgm` y sobrevendía FTS para todo el módulo.

---

## 5. Correcciones aplicadas durante la auditoría

### Fixes de base

- `backend/internal/repository/repository_integration_test.go`
  - Se corrigió el drift de firma en `repo.Update(...)` agregando el argumento faltante para que la suite compile de nuevo.
- `backend/go.mod`
  - `github.com/getsentry/sentry-go` y `github.com/go-pdf/fpdf` quedaron marcadas como dependencias directas, coherentes con el uso real del módulo.

---

## 6. Prioridades recomendadas

1. Sincronizar `backend/docs/openapi.yaml` con las rutas reales del router.
2. Agregar tests dedicados para `event_form_handler`, `event_public_link_handler` y `staff_team_handler`.
3. Completar el pipeline S3: thumbnail real, borrado consistente y presigned uploads.
4. Unificar la semántica HTTP de links públicos/formularios para distinguir `404` vs `410` de forma consistente.

---

## 7. Fuentes de verdad auditadas

- `backend/internal/router/router.go`
- `backend/cmd/server/main.go`
- `backend/internal/config/config.go`
- `backend/internal/handlers/event_form_handler.go`
- `backend/internal/handlers/event_public_link_handler.go`
- `backend/internal/handlers/search_handler.go`
- `backend/internal/storage/local.go`
- `backend/internal/storage/s3.go`
- `backend/internal/services/push_service.go`
- `backend/internal/services/notification_service.go`
