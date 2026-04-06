# Roadmap Backend — Alineado con Frontend

#backend #roadmap #mejoras

> [!tip] Filosofía
> Priorizado por **impacto en usuario** × **esfuerzo técnico**. Alineado con [[Roadmap Web]], [[Roadmap Android]] y [[Roadmap iOS]]. Cada fase deja la API en un estado shippable mejor que el anterior.

---

## Estado Actual del Backend vs Frontend

| Capacidad | Backend | Web | iOS | Android | Gap |
|-----------|---------|-----|-----|---------|-----|
| CRUD básico (6 dominios) | ✅ | ✅ | ✅ | ✅ | — |
| Auth multi-provider | ✅ | ✅ | ✅ | ✅ | — |
| Event photos | ✅ | ✅ | ✅ | ✅ | — |
| Equipment conflicts | ✅ | ✅ | ✅ | ✅ | — |
| Equipment/supply suggestions | ✅ | ✅ | ✅ | ✅ | — |
| Stripe subscriptions (web) | ✅ | ✅ | — | — | — |
| RevenueCat (mobile) | ✅ | — | ✅ | ✅ | — |
| Push notifications | ✅ FCM+APNs | ✅ FCM | ✅ APNs | ✅ FCM | — |
| Paginación | ✅ Server | ✅ Server | ✅ Server | ✅ Server | — |
| Email transaccional | ⚠️ Solo reset | ✅ | ✅ | ✅ | **P1** |
| File storage | ⚠️ Local | ✅ | ✅ | ✅ | **P1** |
| Dashboard analytics | ⚠️ Básico | ✅ KPIs | ✅ KPIs | ✅ KPIs | **P1** |
| API versioning | ❌ | — | — | — | **P2** |
| Audit logging | ❌ | — | — | — | **P2** |
| Background jobs | ⚠️ 1 job | — | — | — | **P2** |

---

## Fase 0: Blockers Críticos (Pre-Release)

> [!success] Impacto: Crítico | Esfuerzo: Medio
> Sin esto, la plataforma NO está lista para usuarios en producción.

### 0.1 Push Notifications (Envío Activo) ✅

- [x] Integrar FCM (Firebase Cloud Messaging) para Android + Web
- [x] Integrar APNs (Apple Push Notification service) para iOS
- [x] Crear `services/push_service.go` con envío por plataforma
- [x] Crear `services/notification_service.go` con templates de notificación
- [x] Notificaciones de evento próximo (24h, 1h antes)
- [x] Notificaciones de pago pendiente
- [ ] Notificaciones de cotización sin confirmar
- [x] Batch sending (no una por una)
- [x] Manejo de tokens inválidos (limpieza automática)

**Por qué**: Device tokens se registran pero NADA se envía. El frontend iOS/Android/Web tienen stubs esperando esto. Es la brecha P1 más crítica. Ver [[Roadmap iOS]] Fase 2.1 y [[Roadmap Android]] Fase 2.1.

### 0.2 Paginación Server-Side ✅

- [x] Agregar `?page=1&limit=20&sort=created_at&order=desc` a todos los list endpoints
- [x] `GET /api/events?page=1&limit=20`
- [x] `GET /api/clients?page=1&limit=20`
- [x] `GET /api/products?page=1&limit=20`
- [x] `GET /api/inventory?page=1&limit=20`
- [x] `GET /api/payments?page=1&limit=20`
- [x] Response: `{ data: [], total: N, page: 1, limit: 20, total_pages: N }`
- [ ] Cursor-based pagination como alternativa para eventos (por fecha)

**Por qué**: Sin paginación, `GET /api/events` retorna TODOS los eventos. Con cientos de eventos, las respuestas serán enormes. El frontend ya maneja paginación client-side, pero la carga inicial crece con el tiempo.

### 0.3 Password Validation en Backend ✅ (ya existía)

- [x] Validar mínimo 8 caracteres en registro
- [x] Validar complejidad (al menos 1 mayúscula, 1 número)
- [x] Retornar error descriptivo

**Por qué**: Seguridad básica. Actualmente solo el frontend valida. Un API client directo puede registrar passwords de 1 carácter.

---

## Fase 1: Foundation (Estabilidad y Robustez)

> [!success] Impacto: Alto | Esfuerzo: Medio
> Base sólida para crecimiento.

### 1.1 Email Transaccional Completo ✅

- [x] Welcome email al registrarse (onboarding)
- [x] Event reminder (24h antes)
- [x] Payment receipt email
- [ ] Quotation received notification
- [x] Subscription confirmation/renewal
- [x] Template system con variables (reemplazar hardcoded HTML)

**Por qué**: Solo existe reset de password. El organizador necesita comunicación automatizada con clientes. Ver [[Roadmap Web]] Fase 5.4 (Portal de Cliente).

### 1.2 File Storage Migration (S3/Cloud Storage) ✅

- [x] Abstraer storage interface (`StorageProvider`)
- [x] Implementar `LocalStorage` (actual) y `S3Storage`
- [x] Configurar via `STORAGE_PROVIDER=local|s3`
- [ ] Presigned URLs para uploads directos
- [ ] CDN para serving de imágenes
- [x] Image resize en upload (thumbnails como ahora, pero en S3)

**Por qué**: El storage local no funciona con múltiples instancias. Para producción escalable, S3/Cloud Storage es esencial. Ver nota en `upload_handler.go`.

### 1.3 Token Blacklist Persistente ✅

- [x] Crear tabla `revoked_tokens(id, token_hash, expires_at, revoked_at)`
- [x] Reemplazar `sync.Map` con query a DB
- [x] Cleanup automático de tokens expirados
- [ ] Alternativa: Redis con TTL automático

**Por qué**: Blacklist en memoria se pierde al reiniciar. Tokens revocados por logout funcionan nuevamente post-restart.

### 1.4 Test Coverage Mínimo

- [ ] Target: 60% coverage en handlers
- [ ] Tests para todos los CRUD flows (happy + error paths)
- [ ] Integration tests con testcontainers (PostgreSQL real en CI)
- [ ] Benchmark tests para endpoints críticos
- [ ] Tests para concurrent access scenarios

**Por qué**: Sin tests, cada cambio es un riesgo. La base de tests actual es buena pero no cubre todos los edge cases.

---

## Fase 2: API Modernization

> [!success] Impacto: Alto | Esfuerzo: Medio-Alto
> Modernizar la API para soportar features del frontend.

### 2.1 Dashboard Analytics Endpoints

- [ ] `GET /api/dashboard/kpis` — KPIs calculados server-side (revenue, eventos mes, stock bajo, cotizaciones pendientes)
- [ ] `GET /api/dashboard/revenue-chart?period=month` — Revenue por mes
- [ ] `GET /api/dashboard/events-by-status` — Distribución de estados
- [ ] `GET /api/dashboard/top-clients?limit=10` — Top clientes por gasto
- [ ] `GET /api/dashboard/product-demand` — Productos más vendidos
- [ ] `GET /api/dashboard/forecast` — Forecast basado en eventos confirmados

**Por qué**: Alineado con [[Roadmap Web]] Fase 5.1 y [[Roadmap Android]] Fase 5.1. El dashboard actual calcula todo client-side con datos raw. Con más datos, necesita server-side aggregation.

### 2.2 Advanced Search

- [ ] Full-text search con PostgreSQL GIN indexes + `pg_trgm`
- [ ] Filtros combinables: `GET /api/events?status=confirmed&from=2026-01-01&to=2026-12-31&client_id=xxx`
- [ ] Fuzzy matching para nombres
- [ ] Search highlighting en resultados

**Por qué**: Alineado con [[Roadmap Web]] Fase 2.3. ILIKE no escala. Full-text search es nativo en PostgreSQL.

### 2.3 API Versioning

- [ ] Prefix rutas con `/api/v1/...`
- [ ] Mantener `/api/...` como alias (backward compatible)
- [ ] Header `Accept: application/vnd.solennix.v1+json`
- [ ] Documentación de breaking changes entre versiones

**Por qué**: Sin versioning, cualquier cambio breaking afecta todos los clientes (Web, iOS, Android) simultáneamente.

### 2.4 Audit Logging

- [ ] Crear tabla `audit_logs(id, user_id, action, resource_type, resource_id, details JSONB, ip, created_at)`
- [ ] Middleware que registra creates, updates, deletes
- [ ] Endpoint `GET /api/admin/audit-logs` para admin
- [ ] Exportar logs para compliance

**Por qué**: Alineado con [[Roadmap Web]] Fase 5.3 (Colaboración). Sin audit log, no hay manera de saber quién hizo qué.

---

## Fase 3: Security Hardening

> [!success] Impacto: Medio-Alto | Esfuerzo: Medio
> Endurecer seguridad para producción.

### 3.1 CSRF Protection

- [ ] Double-submit cookie pattern para web
- [ ] CSRF token en endpoints state-changing (POST, PUT, DELETE)
- [ ] Excluir API clients (Bearer header) de CSRF

**Por qué**: Cookie-based auth es vulnerable a CSRF sin protección.

### 3.2 Rate Limiting por Usuario

- [ ] Rate limit por `userID` autenticado (no solo IP)
- [ ] Diferentes límites por plan (basic vs pro)
- [ ] Redis-backed para multi-instancia

### 3.3 Input Validation Mejorado

- [ ] Validar UUIDs en path params
- [ ] Validar enums (status, type, method, plan)
- [ ] Limitar tamaño de strings (nombre, descripción, notas)
- [ ] Sanitizar HTML en campos de texto (notes, contract_template)
- [ ] File type verification (magic bytes, no solo extensión)

### 3.4 Refresh Token Rotation

- [ ] Al hacer refresh, invalidar refresh token anterior
- [ ] Detectar reuso de refresh token (posible compromiso) → revocar toda la sesión
- [ ] `refresh_tokens` table con `family` para tracking

---

## Fase 4: Features Avanzadas (Alineado con Frontend)

> [!success] Impacto: Alto | Esfuerzo: Alto
> Features que el frontend ya planea o tiene parcialmente.

### 4.1 Event Templates (Plantillas)

- [ ] `POST /api/events/{id}/save-as-template` — Guardar evento como plantilla
- [ ] `GET /api/templates` — Listar plantillas del usuario
- [ ] `POST /api/events/from-template/{templateId}` — Crear evento desde plantilla
- [ ] Tabla `event_templates` con productos, extras, equipo, insumos pre-configurados

**Por qué**: Alineado con [[Roadmap Web]] Fase 5.5, [[Roadmap Android]] Fase 5.2, [[Roadmap iOS]] Fase 5.2. Reduce trabajo repetitivo enormemente.

### 4.2 Client Portal API

- [ ] `GET /api/public/events/{token}` — Vista pública del evento (sin auth)
- [ ] `POST /api/public/events/{token}/approve` — Cliente aprueba cotización
- [ ] `POST /api/public/events/{token}/sign-contract` — Firma digital
- [ ] `POST /api/public/events/{token}/pay` — Pago directo del cliente
- [ ] Tokens de acceso único con expiración

**Por qué**: Alineado con [[Roadmap Web]] Fase 5.4. El frontend necesita endpoints públicos para el portal de cliente.

### 4.3 Collaboration / Team

- [ ] Tabla `team_members(id, user_id, invited_email, role, status)`
- [ ] `POST /api/team/invite` — Invitar miembro
- [ ] `PUT /api/team/{id}/role` — Cambiar rol
- [ ] Multi-tenant por equipo (no solo por usuario individual)
- [ ] Row-level security por team

**Por qué**: Alineado con [[Roadmap Web]] Fase 5.3, [[Roadmap Android]] Fase 5.4, [[Roadmap iOS]] Fase 5.4.

### 4.4 Calendar Sync API

- [ ] `GET /api/calendar/ical` — Exportar eventos como iCal feed
- [ ] `GET /api/calendar/google-auth` — OAuth para Google Calendar
- [ ] `POST /api/calendar/sync` — Sincronizar eventos con Google Calendar
- [ ] Webhook para recibir updates de Google Calendar

**Por qué**: Alineado con [[Roadmap Android]] Fase 5.6 y [[Roadmap iOS]] Fase 5.5.

---

## Prioridad Visual

```mermaid
gantt
    title Roadmap Backend — Alineado con Frontend
    dateFormat YYYY-MM-DD
    axisFormat %b %Y

    section Fase 0: Blockers
    Push Notifications         :f0a, 2026-04-07, 5d
    Paginación Server-Side     :f0b, after f0a, 3d
    Password Validation        :f0c, after f0b, 1d

    section Fase 1: Foundation
    Email Transaccional        :f1a, after f0c, 4d
    File Storage (S3)          :f1b, after f1a, 4d
    Token Blacklist Persist.   :f1c, after f1b, 2d
    Test Coverage 60%          :f1d, after f1c, 5d

    section Fase 2: Modernization
    Dashboard Analytics        :f2a, after f1d, 4d
    Advanced Search (FTS)      :f2b, after f2a, 3d
    API Versioning             :f2c, after f2b, 2d
    Audit Logging              :f2d, after f2c, 3d

    section Fase 3: Security
    CSRF Protection            :f3a, after f2d, 2d
    Rate Limit por Usuario     :f3b, after f3a, 2d
    Input Validation           :f3c, after f3b, 3d
    Refresh Token Rotation     :f3d, after f3c, 2d

    section Fase 4: Features
    Event Templates            :f4a, after f3d, 4d
    Client Portal API          :f4b, after f4a, 6d
    Collaboration / Team       :f4c, after f4b, 5d
    Calendar Sync              :f4d, after f4c, 4d
```

---

## Quick Wins (< 1 día cada uno)

> [!tip] Victorias rápidas para hacer ya

- [x] Agregar `?page=1&limit=20` básico en `GET /api/events`
- [x] Validar password length >= 8 en `POST /api/auth/register`
- [x] Agregar índice `idx_events_user_date` en events
- [x] Agregar `GET /api/health` que verifique DB connection (no solo HTTP)
- [x] Agregar `X-Request-ID` header para tracing
- [ ] Rate limiting en `POST /api/auth/register` separado de login
- [ ] Agregar `Content-Type` validation en upload handler
- [ ] Log user_id en todas las requests autenticadas (ya está en context)
- [ ] Timeout en queries SQL via context (`context.WithTimeout`)

---

## Cross-Platform Requirements (Lo que el frontend NECESITA del backend)

> [!danger] Requirements del frontend que el backend NO provee aún

| Feature | Frontend necesita | Backend estado | Esfuerzo |
|---------|-------------------|----------------|----------|
| **Paginación** | `?page&limit` en todos los list | ✅ Implementado | — |
| **Push notifications** | Envío real de notificaciones | ✅ FCM + APNs | — |
| **Dashboard KPIs** | Server-side aggregation | ❌ Solo datos raw | 3-4 días |
| **Plantillas de evento** | CRUD de templates | ❌ No existe | 3-4 días |
| **Portal de cliente** | Endpoints públicos con token | ❌ No existe | 5-6 días |
| **Email transaccional** | Welcome, reminder, receipt | ⚠️ Solo reset | 3-4 días |
| **File storage escalable** | S3/CDN para imágenes | ⚠️ Local disk | 2-3 días |
| **Advanced search** | FTS con filtros combinables | ⚠️ ILIKE básico | 2-3 días |
| **Audit log** | Activity tracking | ❌ No existe | 3-4 días |
| **iCal feed** | Calendar export URL | ❌ No existe | 1-2 días |
| **Webhooks outgoing** | Notificar a servicios externos | ❌ No existe | 2-3 días |
| **Bulk operations** | Delete múltiple, status change batch | ❌ No existe | 2-3 días |

---

## Relaciones

- [[Backend MOC]] — Hub principal
- [[Seguridad]] — Mejoras de seguridad detalladas
- [[Performance]] — Áreas de mejora de rendimiento
- [[Testing]] — Estado actual de tests
