# 08 — Arquitectura Técnica Backend

> **Fecha de auditoría:** 2026-04-16
> **Fuente de verdad para versiones:** `backend/go.mod`
> **Fuente de verdad para endpoints:** `backend/internal/router/router.go` + `backend/docs/openapi.yaml`

---

## 1. Stack

| Capa | Tecnología | Versión / Valor |
|---|---|---|
| Lenguaje | Go | 1.25 |
| HTTP router | `chi/v5` | v5.x |
| Driver PostgreSQL | `pgx/v5` + `pgxpool` | v5.x |
| ORM | **Ninguno** — queries SQL embebidas | — |
| Migraciones | SQL versionado `backend/migrations/NNN_*.sql` | — |
| Logging | `log/slog` (stdlib) | — |
| JWT | `jwt/v5` HMAC-SHA256 | — |
| Validación | Custom + `google/uuid` | — |
| Pago | Stripe (webhooks + checkout sessions) | — |
| IAP Mobile | RevenueCat (webhook de validación cross-platform) | — |
| Push iOS | APNs token-based (Live Activities + push notifications) | — |
| Push Android | FCM (Firebase Cloud Messaging) | — |
| Email | SMTP genérico (configurable) | — |
| Auth social | Google OAuth2 + Apple Sign-In (ID token validation) | — |
| Observabilidad | slog structured logs + request IDs | — |
| Base URL producción | `https://api.solennix.com/api` | — |

---

## 2. Estructura del repositorio

```
backend/
├── Dockerfile                       # Multi-stage, minimal alpine runtime
├── go.mod / go.sum
├── cmd/
│   ├── server/                      # Entrypoint principal (func main)
│   │   └── main.go                  # Carga config, crea pool, registra handlers, start ListenAndServe
│   └── seed/                        # Seeding de datos locales (tools profile docker-compose)
├── docs/
│   └── openapi.yaml                 # Spec canónica de la API (generador de types en web/)
├── migrations/                      # SQL versionado (NNN_description.sql)
└── internal/
    ├── config/                      # Carga de env vars, validación
    ├── router/
    │   └── router.go                # THE route table — fuente de verdad del API surface
    ├── handlers/                    # HTTP handlers (capa de presentación)
    │   ├── auth_handler.go          # login/register/oauth/refresh/password flows
    │   ├── crud_handler.go          # CRUD de clients/events/products/inventory/payments
    │   ├── subscription_handler.go  # Stripe + RevenueCat webhooks + checkout sessions
    │   ├── event_payment_handler.go # Link de pago Stripe por evento (cliente-facing)
    │   ├── upload_handler.go        # Multipart image upload
    │   ├── admin_handler.go         # /admin — solo usuarios con role=admin
    │   ├── dashboard_handler.go     # KPIs agregados (user-scoped)
    │   ├── audit_handler.go         # Audit log querying
    │   ├── search_handler.go        # Search global
    │   ├── event_form_handler.go    # Formulario público de captura de leads
    │   ├── unavailable_date_handler.go  # Bloqueo de fechas
    │   ├── device_handler.go        # Registro de push tokens
    │   ├── live_activity_handler.go # Tokens APNs para Live Activities iOS
    │   ├── helpers.go               # writeJSON, writeError, decodeJSON
    │   ├── pagination.go            # parsePaginationParams + PaginatedResponse
    │   └── *_test.go + mocks_test.go
    ├── services/                    # Lógica de negocio (entre handler y repository)
    │   ├── auth_service.go          # Token generation, password hashing, refresh rotation
    │   ├── notification_service.go  # Email + push dispatch
    │   ├── milestone_service.go     # Hooks de etapas de evento
    │   └── ...
    ├── repository/                  # Data access layer (solo SQL, sin reglas de negocio)
    │   ├── user_repo.go
    │   ├── client_repo.go
    │   ├── event_repo.go
    │   ├── product_repo.go
    │   ├── inventory_repo.go
    │   ├── payment_repo.go
    │   ├── dashboard_repo.go
    │   ├── admin_repo.go
    │   ├── refresh_token_repo.go
    │   ├── event_form_link_repo.go
    │   ├── unavailable_date_repo.go
    │   ├── audit_repo.go
    │   └── limits.go                # GetAllSafetyLimit, safeSortColumn, safeSortOrder
    ├── model/                       # Entidades con JSON tags — (Event, Client, Payment, User, ...)
    ├── middleware/                  # Capa transversal de request
    │   ├── auth.go                  # JWT validation, userID en context
    │   ├── cors.go
    │   ├── csrf.go
    │   ├── logger.go                # slog request logger + request_id
    │   ├── recovery.go              # Panic recovery
    │   ├── ratelimit.go             # IP-based rate limit con cleanup goroutine
    │   ├── user_ratelimit.go        # Plan-aware user-scoped rate limit
    │   ├── plan_resolver.go         # Cache de planes por usuario
    │   ├── timeout.go               # Context timeout
    │   ├── api_version.go           # X-API-Version header
    │   ├── security_headers.go      # CSP, HSTS, X-Frame-Options, etc.
    │   ├── validate_uuid.go         # Guard para path params que deben ser UUID
    │   ├── admin_only.go            # Requiere user.role == 'admin'
    │   ├── request_id.go
    │   └── audit.go                 # Captura cambios para audit log
    └── storage/                     # Provider abstracto para uploads (local / S3)
```

---

## 3. Capas y responsabilidades

```
┌──────────────────────────────────────────────────────────┐
│  Router  (internal/router/router.go)                     │
│  Chi tree, middleware stack, rate limit groups           │
├──────────────────────────────────────────────────────────┤
│  Middleware                                              │
│  Recovery → RequestID → CORS → SecurityHeaders → Logger  │
│  → APIVersion → Timeout → CSRF → Auth → RateLimit → ...  │
├──────────────────────────────────────────────────────────┤
│  Handler                                                 │
│  Parse request, validate, call service, write response.  │
│  NUNCA toca pgxpool directo.                             │
├──────────────────────────────────────────────────────────┤
│  Service                                                 │
│  Lógica de negocio (token rotation, hash password,       │
│  notification dispatch, milestone resolution).           │
│  Puede orquestar varios repos en transacción.            │
├──────────────────────────────────────────────────────────┤
│  Repository                                              │
│  Un tipo por tabla. Queries SQL inline, sin ORM.         │
│  Todos los métodos reciben ctx + userID (multi-tenant).  │
├──────────────────────────────────────────────────────────┤
│  pgx Pool                                                │
│  Conexión compartida, prepared statements, transactions  │
└──────────────────────────────────────────────────────────┘
```

**Flujo típico de request:**

```
POST /api/events
├─ Recovery catches panics
├─ RequestID agrega X-Request-ID
├─ CORS valida Origin
├─ Logger registra entrada
├─ APIVersion agrega X-API-Version: v1
├─ Timeout wraps ctx con deadline 30s
├─ CSRF valida header X-CSRF-Token (rutas mutantes)
├─ Auth extrae JWT → userID en context
├─ UserRateLimit valida cupo por plan
├─ ValidateUUID confirma path params sanos
├─ Audit captura intención pre-handler
├─ Handler: CRUDHandler.CreateEvent
│   ├─ decodeJSON(r, &event)
│   ├─ guard plan limit (via planLimitsService)
│   ├─ event.UserID = middleware.GetUserID(ctx)
│   ├─ repo.Create(ctx, &event)
│   └─ writeJSON(w, 201, { "data": event })
└─ Response stream
```

**Response envelope canónico:**

```json
{
  "data": { ... },
  "error": "error code opcional",
  "message": "mensaje human-readable opcional"
}
```

Implementado en `handlers/helpers.go::writeJSON` y `writeError`.

---

## 4. Configuración y entorno

Config se carga via env vars (12-factor). Archivo de referencia: `backend/.env.example`.

| Env var | Obligatoria | Descripción |
|---|---|---|
| `DATABASE_URL` | Sí | PostgreSQL connection string |
| `PORT` | No | Default 8080 |
| `JWT_SECRET` | Sí | 32+ bytes para HMAC-SHA256 |
| `ACCESS_TOKEN_TTL_HOURS` | No | Default 1 hora |
| `REFRESH_TOKEN_TTL_DAYS` | No | Default 30 días |
| `FRONTEND_URL` | Sí | Usado en redirect post-OAuth |
| `CORS_ORIGINS` | Sí | Lista separada por comas |
| `UPLOAD_DIR` | No | Default `./uploads` |
| `GOOGLE_CLIENT_IDS` | Sí | Lista de client IDs aceptados (iOS, Android, Web) |
| `APPLE_CLIENT_IDS` | Sí | Bundle IDs iOS + `.web` suffix |
| `APPLE_TEAM_ID` / `APPLE_KEY_ID` / `APPLE_PRIVATE_KEY` | Sí | Para REST callback Apple Sign-In |
| `APPLE_REDIRECT_URI` | Sí | URL de callback post-Apple |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Sí | Pagos web |
| `STRIPE_PRICE_ID_PRO` / `STRIPE_PRICE_ID_BUSINESS` | Sí | Precios Pro/Business |
| `REVENUECAT_WEBHOOK_SECRET` | Sí | Validación webhook RC |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | Sí | Email transaccional |
| `APNS_*` | Sí | APNs auth para Live Activities iOS |
| `FCM_SERVICE_ACCOUNT_JSON` | Sí | FCM credentials para push Android |
| `SENTRY_DSN` | No | Opcional pero recomendado |
| `ENVIRONMENT` | Sí | `development` / `staging` / `production` |

**Secrets NEVER committeados.** Servidor de producción usa `.env` local no versionado + docker-compose monta como `env_file`.

---

## 5. Router y middlewares

### Stack global (aplicado a TODO request)

1. `Recovery` — recupera panics, responde 500.
2. `RequestID` — inyecta `X-Request-ID` y lo propaga a logs.
3. `CORS(corsOrigins)` — controla orígenes permitidos.
4. `SecurityHeaders` — CSP, HSTS, X-Frame-Options: DENY, Referrer-Policy, etc.
5. `Logger` — structured slog con latency, status, user_id si hay.

### Stack del subrouter `/api/v1` y `/api`

6. `APIVersion("v1")` — header `X-API-Version: v1`.
7. `Timeout(30s)` — binds downstream SQL queries.
8. `CSRF` — valida header `X-CSRF-Token` en métodos mutantes; exento en webhooks y OAuth callbacks.

### Stack de rutas autenticadas

9. `Auth(authService)` — valida JWT (header `Authorization: Bearer` o cookie `auth_token`).
10. `ValidateUUID("id", "photoId")` — path params que deben ser UUID se parsean temprano.
11. `UserRateLimit(planResolver)` — cupo por usuario, ajustado al plan (Gratis/Pro/Business).
12. `Audit(auditRepo)` — captura acciones para el audit log.

### Rate limiting (tiered)

| Grupo | Límite | Ventana |
|---|---|---|
| `/auth/login`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/google`, `/auth/apple` | 5 | 1 min |
| `/auth/register` | 3 | 15 min (anti-abuso de registro) |
| `/public/event-forms/{token}` | 10 | 1 min |
| `/uploads/image` (autenticado) | 5 | 1 min |
| `/search` (autenticado) | 30 | 1 min |
| `/admin/*` | 30 | 1 min |
| `UserRateLimit` global (todo lo autenticado) | dinámico por plan | 1 min |

### Versionado dual

El router monta el mismo subrouter en **dos prefijos** (`/api/v1` + `/api`) para compatibilidad. Clientes mobile históricamente apuntan a `/api`; OpenAPI + web nuevos apuntan a `/api/v1`. Futuro: deprecar `/api` cuando todos los clientes migren.

---

## 6. Autenticación

### JWT

- Algoritmo: HMAC-SHA256.
- Secret: `JWT_SECRET` env var (32+ bytes).
- Access token TTL: 1h (configurable).
- Refresh token TTL: 30 días (configurable).

### Doble transporte

Clients pueden enviar el token como:
1. `Authorization: Bearer <access_token>` — clientes nativos (iOS, Android).
2. Cookie httpOnly `auth_token` — web (anti-XSS).

`middleware.Auth` acepta cualquiera.

### Refresh flow

- `POST /auth/refresh` — body vacío, lee refresh token de cookie o body.
- Rotation: cada refresh emite nuevo access + nuevo refresh, invalida el viejo.
- Refresh token family tracking (migración 035) — detecta reuso y revoca toda la familia.
- DB-backed blacklist (migración 032) — logout inmediato invalida el token actual.

### OAuth social

- **Google Sign-In:** `POST /auth/google` con `id_token` → valida contra `googleapis.com/oauth2/v3/certs` → upsert user vía `userRepo.CreateWithOAuth` (sin password_hash requirement) → emite tokens.
- **Apple Sign-In:** `POST /auth/apple` con `identity_token` → valida contra `appleid.apple.com/auth/keys` (JWKS cached) → `CreateWithOAuth` → tokens.
- **Apple OAuth REST (web):** `GET /auth/apple/init` (redirect a Apple) + `POST /auth/apple/callback` (form POST con code) → intercambia code por identity token → misma lógica.

### Password

- Hashing: `bcrypt` con cost factor 10.
- Reset: `POST /auth/forgot-password` → envía link con token → `POST /auth/reset-password` con token + nuevo password.

---

## 7. Persistencia

### pgx Pool

- Un `*pgxpool.Pool` compartido, inicializado en `cmd/server/main.go`.
- Max conns: configurable via `DATABASE_URL` (`pool_max_conns=N`).
- Health check: `GET /health` hace `pool.Ping(ctx, 2s)` y devuelve 503 si falla.

### Patrón Repository

Un tipo por tabla: `UserRepo`, `ClientRepo`, `EventRepo`, etc.

```go
type ClientRepo struct { pool *pgxpool.Pool }

func NewClientRepo(pool *pgxpool.Pool) *ClientRepo {
    return &ClientRepo{pool: pool}
}

func (r *ClientRepo) GetAll(ctx context.Context, userID uuid.UUID) ([]models.Client, error) {
    query := fmt.Sprintf(`SELECT ... WHERE user_id = $1 ORDER BY name LIMIT %d`, GetAllSafetyLimit)
    rows, err := r.pool.Query(ctx, query, userID)
    // ...
}
```

### Transacciones

Operaciones multi-write usan `pool.BeginTx(ctx, ...)`. Ejemplo: refresh token rotation invalida viejo + inserta nuevo en la misma tx.

### Safety caps

`repository/limits.go`:
- `GetAllSafetyLimit = 1000` — hard cap en `GetAll` no paginado (Sprint 2).
- `safeSortColumn(sortCol, allowed, fallback)` — defense-in-depth contra SQL injection en ORDER BY (Sprint 3).
- `safeSortOrder(order)` — normaliza a "ASC" | "DESC".

### Migraciones

SQL versionado bajo `backend/migrations/NNN_description.sql`. Se aplican in-order al arrancar el server (o via tool externo). Convención:
- Archivos `.up.sql` y `.down.sql` si se permite rollback.
- Idempotentes donde sea posible (`IF NOT EXISTS`).
- No destructivas en migración forward (drops solo en down).

### Índices críticos

- `users(email)` UNIQUE.
- `users(google_user_id)` UNIQUE WHERE NOT NULL.
- `users(apple_user_id)` UNIQUE WHERE NOT NULL.
- `events(user_id, event_date)` compound para el dashboard.
- `clients(user_id, name)` compound para ordenamiento.
- `payments(event_id)` para reportes.

---

## 8. Multi-tenant (invariante de seguridad)

**Regla no negociable:** toda query que lee/escribe datos del usuario **DEBE** filtrar por `user_id = $1` o `WHERE event_id IN (SELECT id FROM events WHERE user_id = $N)`.

Patrón:
- `middleware.Auth` deposita `userID uuid.UUID` en `context.Context`.
- `middleware.GetUserID(ctx)` lo recupera en el handler.
- El handler pasa `userID` al repo como primer parámetro (después de ctx).
- Tests de repositorio (`repository_integration_test.go`) validan aislamiento entre users.

Violación = bug P0. Ver `PRD/11` y Sprint 1 audit Android Phase 1 que resolvió un leak similar en mobile cache.

---

## 9. Notificaciones

### Email

- Provider: SMTP genérico (configurable). Plausibles: Postmark, Resend, Mailgun, Amazon SES.
- 4 tipos cableados (implementados Sprint anterior):
  - Recibo de pago (`email_payment_receipt`).
  - Recordatorio de evento (`email_event_reminder`).
  - Resumen semanal (`email_weekly_summary`).
  - Marketing / anuncios (`email_marketing`).
- Preferencias en `users.email_*` bool columns — respeta opt-out.

### Push — iOS

- APNs token-based (no legacy .p12 certs).
- Token de device registrado vía `POST /api/devices/register`.
- `POST /api/live-activities/register` para Dynamic Island / Live Activities remote updates.

### Push — Android

- FCM via `FCM_SERVICE_ACCOUNT_JSON`.
- Token de device registrado vía `POST /api/devices/register`.

### Milestone hooks

Eventos internos del backend disparan notificaciones según preferencias del organizador:
- Pago registrado → email al cliente + push al organizador.
- Evento mañana → push al organizador.
- Resumen semanal cron → email opt-in.

---

## 10. Almacenamiento (uploads)

### Provider abstracto

`internal/storage/Provider` interface con implementaciones:
- **Local disk** (default para dev / VPS single-node) — files escritos a `UPLOAD_DIR`.
- **S3 / MinIO** (opcional) — para escalar a multi-node / CDN delante.

Factory: `storage.New(cfg)` devuelve el provider correcto según env.

### Upload flow

- `POST /api/uploads/image` — multipart form con campo `file`.
- Rate limit: 5 / min por usuario.
- Max size: 10 MB (configurable).
- Mime type whitelist: `image/jpeg`, `image/png`.
- Thumbnails generados para imágenes (provider local).
- Retorna URL pública: `/api/v1/uploads/<hash>.jpg`.

### Archivos públicos

Se sirven desde `/api/v1/uploads/*` (y legacy `/api/uploads/*`) con `Cache-Control: public, max-age=31536000`. No requieren auth — son URLs sin listar (unlisted) con hashes difíciles de enumerar.

---

## 11. Integraciones externas

| Integración | Rol | Archivo |
|---|---|---|
| Stripe | Checkout web, portal de suscripción | `handlers/subscription_handler.go` + `handlers/event_payment_handler.go` |
| RevenueCat | IAP mobile, webhook cross-platform | `handlers/subscription_handler.go::RevenueCatWebhook` |
| Google OAuth | Sign-In | `handlers/auth_handler.go::GoogleSignIn` |
| Apple OAuth | Sign-In native + REST callback | `handlers/auth_handler.go::AppleSignIn/AppleInit/AppleCallback` |
| APNs | Push iOS + Live Activities | `services/notification_service.go` |
| FCM | Push Android + Web | `services/notification_service.go` |
| SMTP | Email transaccional | `services/notification_service.go` |
| Sentry | APM | inicializado en `cmd/server/main.go` |

---

## 12. Convenciones

### Naming Go

| Artefacto | Convención | Ejemplo |
|---|---|---|
| Exportado (públicos fuera del package) | `PascalCase` | `func Login`, `type EventRepo` |
| No exportado | `camelCase` | `func writeError`, `var allStopFuncs` |
| Const | `PascalCase` o `SCREAMING_SNAKE` según scope | `GetAllSafetyLimit`, `DEFAULT_PORT` |

### JSON / DB

- JSON tags: `snake_case` — `EventDate *time.Time \`json:"event_date"\``.
- Columnas DB: `snake_case` — `event_date timestamptz`.
- Go identifiers: `PascalCase` / `camelCase`.

### Errores

- **Wrapping siempre:** `fmt.Errorf("failed to create user: %w", err)` para preservar chain.
- **Nunca panic en request handling** — `middleware.Recovery` atrapa pero es last resort.
- **No leak de errores internos al cliente** — mensajes externos son genéricos; el detalle va a log estructurado.

### Response envelope

Usar `writeJSON` / `writeError` / `writePlanLimitError` — no construir payloads ad-hoc. Audit Sprint 3 corrigió admin handlers que violaban esto.

### Logging

- `slog.Info` para eventos normales (auth.event, plan_change, etc.).
- `slog.Error` con `"error", err` cuando falla algo.
- Request ID automático vía `middleware.RequestID`.
- Usuario enriquecido automáticamente si hay auth.

---

## 13. Testing

### Layout

```
internal/
├── handlers/
│   ├── *_test.go              # tests de handlers con mocks
│   └── mocks_test.go          # MockFullUserRepo, MockClientRepo, etc. (testify/mock)
├── repository/
│   ├── repository_error_test.go       # Error paths con pool cerrado
│   └── repository_integration_test.go # Tests contra Postgres real
└── services/
    └── *_test.go
```

### Mocks

`testify/mock`. Un mock por repo. Tests de handler construyen `AuthHandler{ userRepo: mockRepo, ... }` sin arrancar HTTP server — usan `httptest.NewRecorder`.

### Integration tests

Usan Postgres real (via `TEST_DATABASE_URL` o docker-compose). Cubren:
- Multi-tenant isolation.
- Migraciones up/down.
- Transacciones atómicas.

### CI

`.github/workflows/ci.yml`:
- `go test -v -coverprofile=coverage.out ./...`
- OpenAPI lint via `@redocly/cli`.
- Codecov upload.

### Gaps

- Apple Sign-In happy path NO tiene test unitario (requiere mock de JWT signing).
- Stripe webhook handlers sin test E2E (dependen de Stripe CLI `stripe trigger`).
- Push dispatch (APNs/FCM) mockeado en services pero sin test de integración.

---

## 14. Inventario de API

Endpoints agrupados por recurso. **Leyenda:**
- 🔓 = público (sin auth)
- 🔒 = auth requerida (Bearer o cookie)
- 👑 = admin only (`role == 'admin'`)
- ⚡ = webhook (sin auth; validado por firma)

Todos montados bajo `/api/v1/*` y `/api/*` (legacy).

### Health

| Método | Path | Auth | Descripción |
|---|---|---|---|
| GET | `/health` | 🔓 | Liveness + DB connectivity |

### Auth

| Método | Path | Auth | Descripción |
|---|---|---|---|
| POST | `/auth/login` | 🔓 (5/min) | Login con email + password |
| POST | `/auth/register` | 🔓 (3/15min) | Alta de cuenta |
| POST | `/auth/forgot-password` | 🔓 (5/min) | Envía email con token de reset |
| POST | `/auth/reset-password` | 🔓 (5/min) | Resetea password con token |
| POST | `/auth/google` | 🔓 (5/min) | OAuth Google (id_token) |
| POST | `/auth/apple` | 🔓 (5/min) | OAuth Apple (identity_token) |
| GET | `/auth/apple/init` | 🔓 (5/min) | Redirect a Apple (web flow) |
| POST | `/auth/apple/callback` | 🔓 (5/min) | Form POST callback de Apple |
| POST | `/auth/logout` | 🔓 | Invalida refresh token |
| POST | `/auth/refresh` | 🔓 (usa cookie/body) | Rota access + refresh token |
| GET | `/auth/me` | 🔒 | User actual (session check) |
| POST | `/auth/change-password` | 🔒 | Cambiar password |

### Users

| Método | Path | Auth | Descripción |
|---|---|---|---|
| PUT | `/users/me` | 🔒 | Actualizar perfil propio |

### Clients

| Método | Path | Auth | Descripción |
|---|---|---|---|
| GET | `/clients` | 🔒 | Lista (paginada si `?page=`) |
| POST | `/clients` | 🔒 | Crear cliente |
| GET | `/clients/{id}` | 🔒 | Detalle |
| PUT | `/clients/{id}` | 🔒 | Actualizar |
| DELETE | `/clients/{id}` | 🔒 | Eliminar |

### Events

| Método | Path | Auth | Descripción |
|---|---|---|---|
| GET | `/events` | 🔒 | Lista (paginada opcional; filtros `?status=`, `?start=`, `?end=`, `?client_id=`) |
| GET | `/events/upcoming` | 🔒 | Próximos eventos (default limit 5) |
| GET | `/events/search` | 🔒 | Búsqueda avanzada |
| POST | `/events` | 🔒 | Crear evento |
| GET | `/events/{id}` | 🔒 | Detalle |
| PUT | `/events/{id}` | 🔒 | Actualizar |
| DELETE | `/events/{id}` | 🔒 | Eliminar |
| GET | `/events/{id}/products` | 🔒 | Productos del evento |
| GET | `/events/{id}/extras` | 🔒 | Extras del evento |
| PUT | `/events/{id}/items` | 🔒 | Actualizar items (products + extras + equipment + supplies atómicamente) |
| GET | `/events/{id}/equipment` | 🔒 | Equipamiento del evento |
| GET | `/events/{id}/supplies` | 🔒 | Insumos del evento |
| GET | `/events/{id}/photos` | 🔒 | Fotos del evento |
| POST | `/events/{id}/photos` | 🔒 | Agregar foto |
| DELETE | `/events/{id}/photos/{photoId}` | 🔒 | Eliminar foto |
| GET | `/events/equipment/conflicts` | 🔒 | Conflictos por query params |
| POST | `/events/equipment/conflicts` | 🔒 | Conflictos por JSON body |
| GET | `/events/equipment/suggestions` | 🔒 | Sugerencias de equipamiento |
| POST | `/events/equipment/suggestions` | 🔒 | Sugerencias de equipamiento (body) |
| GET | `/events/supplies/suggestions` | 🔒 | Sugerencias de insumos |
| POST | `/events/supplies/suggestions` | 🔒 | Sugerencias de insumos (body) |
| POST | `/events/{id}/checkout-session` | 🔒 | Crear Stripe checkout para pago del cliente |
| GET | `/events/{id}/payment-session` | 🔒 | Consultar session post-Stripe |

### Products

| Método | Path | Auth | Descripción |
|---|---|---|---|
| GET | `/products` | 🔒 | Lista |
| POST | `/products` | 🔒 | Crear |
| POST | `/products/ingredients/batch` | 🔒 | Fetch batch de ingredientes (para N+1 mitigation) |
| GET | `/products/{id}` | 🔒 | Detalle |
| PUT | `/products/{id}` | 🔒 | Actualizar |
| DELETE | `/products/{id}` | 🔒 | Eliminar |
| GET | `/products/{id}/ingredients` | 🔒 | Ingredientes del producto |
| PUT | `/products/{id}/ingredients` | 🔒 | Actualizar ingredientes |

### Inventory

| Método | Path | Auth | Descripción |
|---|---|---|---|
| GET | `/inventory` | 🔒 | Lista |
| POST | `/inventory` | 🔒 | Crear item |
| GET | `/inventory/{id}` | 🔒 | Detalle |
| PUT | `/inventory/{id}` | 🔒 | Actualizar |
| DELETE | `/inventory/{id}` | 🔒 | Eliminar |

### Payments

| Método | Path | Auth | Descripción |
|---|---|---|---|
| GET | `/payments` | 🔒 | Lista (filtros `?event_id=`, `?start=`, `?end=`) |
| POST | `/payments` | 🔒 | Registrar pago |
| GET | `/payments/{id}` | 🔒 | Detalle |
| PUT | `/payments/{id}` | 🔒 | Actualizar |
| DELETE | `/payments/{id}` | 🔒 | Eliminar |

### Unavailable Dates

| Método | Path | Auth | Descripción |
|---|---|---|---|
| GET | `/unavailable-dates` | 🔒 | Listar fechas bloqueadas |
| POST | `/unavailable-dates` | 🔒 | Bloquear fecha / rango |
| DELETE | `/unavailable-dates/{id}` | 🔒 | Desbloquear |

### Subscriptions

| Método | Path | Auth | Descripción |
|---|---|---|---|
| POST | `/subscriptions/webhook/stripe` | ⚡ | Webhook Stripe (signature-verified) |
| POST | `/subscriptions/webhook/revenuecat` | ⚡ | Webhook RevenueCat |
| GET | `/subscriptions/status` | 🔒 | Estado de la suscripción del usuario |
| POST | `/subscriptions/checkout-session` | 🔒 | Crear Stripe Checkout para upgrade |
| POST | `/subscriptions/portal-session` | 🔒 | Crear Stripe Customer Portal |
| POST | `/subscriptions/debug-upgrade` | 👑 | Debug — upgrade manual (dev/staging) |
| POST | `/subscriptions/debug-downgrade` | 👑 | Debug — downgrade manual |

### Uploads

| Método | Path | Auth | Descripción |
|---|---|---|---|
| POST | `/uploads/image` | 🔒 (5/min) | Subir imagen (multipart) |
| GET | `/api/v1/uploads/*` | 🔓 | Servir archivos estáticos con cache 1 año |
| GET | `/api/uploads/*` | 🔓 | Servir archivos estáticos (legacy) |

### Search

| Método | Path | Auth | Descripción |
|---|---|---|---|
| GET | `/search` | 🔒 (30/min) | Búsqueda global (eventos, clientes, productos, inventario) |

### Dashboard

| Método | Path | Auth | Descripción |
|---|---|---|---|
| GET | `/dashboard/kpis` | 🔒 | KPIs agregados (revenue, counts, low stock) |
| GET | `/dashboard/revenue-chart` | 🔒 | Serie temporal de ingresos |
| GET | `/dashboard/events-by-status` | 🔒 | Distribución por status |
| GET | `/dashboard/top-clients` | 🔒 | Top N clientes por gasto |
| GET | `/dashboard/product-demand` | 🔒 | Productos más usados |
| GET | `/dashboard/forecast` | 🔒 | Forecast de ingresos futuros (eventos confirmados) |
| GET | `/dashboard/activity` | 🔒 | Audit log del usuario |

### Devices / Push

| Método | Path | Auth | Descripción |
|---|---|---|---|
| POST | `/devices/register` | 🔒 | Registrar push token (iOS + Android + Web) |
| POST | `/devices/unregister` | 🔒 | Desregistrar token |
| POST | `/live-activities/register` | 🔒 | APNs token de Live Activity iOS |
| DELETE | `/live-activities/by-event/{eventId}` | 🔒 | Eliminar Live Activity de un evento |

### Event Forms (portal público de captura)

| Método | Path | Auth | Descripción |
|---|---|---|---|
| GET | `/public/event-forms/{token}` | 🔓 (10/min) | Esquema público del formulario (para clientes sin auth) |
| POST | `/public/event-forms/{token}` | 🔓 (10/min) | Submit del formulario público |
| GET | `/event-forms` | 🔒 | Lista de links generados |
| POST | `/event-forms` | 🔒 | Generar link nuevo |
| DELETE | `/event-forms/{id}` | 🔒 | Revocar link |

### Admin

| Método | Path | Auth | Descripción |
|---|---|---|---|
| GET | `/admin/stats` | 👑 (30/min) | Stats de plataforma |
| GET | `/admin/users` | 👑 | Lista de usuarios |
| GET | `/admin/users/{id}` | 👑 | Detalle de usuario |
| PUT | `/admin/users/{id}/upgrade` | 👑 | Cambiar plan manualmente |
| GET | `/admin/subscriptions` | 👑 | Overview de suscripciones |
| GET | `/admin/audit-logs` | 👑 | Audit log global |

**Total: 39+ endpoints agrupados en 14 recursos.**

---

## 15. Debt conocido

Referencia completa en `PRD/11_CURRENT_STATUS.md`. Items backend tras Sprints 1–3 (2026-04-16):

### Resueltos

- **P0-BE-1** (`auth_handler.go`): AppleSignIn + AppleCallback ahora usan `CreateWithOAuth` (antes `Create`, que requería `password_hash NOT NULL` — cada alta Apple devolvía 500).
- **P0-BE-2** (`auth_handler.go`): Apple new user seteado con `Plan: "basic"` (antes quedaba vacío → plan limits bypasseados).
- **P0-BE-3** (`auth_handler.go`): 3 ignoreds `_, err :=` en `AppleCallback` convertidos a checks explícitos con writeError.
- **P1-BE-1** (`*_repo.go`): `GetAllSafetyLimit = 1000` aplicado a los 5 `GetAll` no paginados (client, event, product, inventory, payment).
- **P1-BE-2** (`auth_handler.go`): `http.PostForm` al Apple token endpoint ahora usa `http.Client{Timeout: 10s}`.
- **P2-BE-2** (`repository/limits.go`): defense-in-depth — `safeSortColumn` + `safeSortOrder` en `client_repo`, `event_repo`, `payment_repo` `GetAllPaginated`.
- **P3-BE-1** (`middleware/ratelimit.go`): `RateLimitStopFunc` ahora es singleton con `sync.Mutex` en `allStopFuncs` (antes reassigned on every RateLimit call, race condition).
- **P3-BE-2** (`admin_handler.go`): todos los `writeJSON(map[string]string{"error":...})` reemplazados por `writeError(w, status, msg)` — consistencia con el envelope canónico.

### Pendiente

- **P2-BE-1** (`handlers/helpers.go`): `http.MaxBytesReader(nil, r.Body, maxBodySize)` con ResponseWriter nil. Go 1.25 stdlib usa type-assertion seguro (`.requestTooLarger`), no panic. Skipeado con justificación: 40 call-sites a cambiar para cero beneficio behavioral. Revisitar si Go 1.26+ cambia el contrato.

### Mejoras potenciales (no audit)

- `POST /products/ingredients/batch` existe — iOS/Android aún hacen calls per-product en algunos flujos (ver `P1-AND-3` en `PRD/11`, parcialmente mitigado con cache + semaforo).
- Endpoint agregado `/dashboard/kpis` no explotado completamente por iOS (`P2-iOS-3` pendiente).
- Tests E2E de Stripe webhooks.
- Tests de Apple Sign-In happy path (requiere mock de JWT signing).
