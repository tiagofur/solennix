# Auditoría de Backend — Solennix

**Fecha:** 2026-06-09
**Alcance:** `backend/` — 169 archivos Go · auth · endpoints · repository · pagos/negocio
**Método:** revisión estática multi-frente (4 auditores) + verificación manual de hallazgos críticos
**Estado:** reporte. No se aplicaron cambios.

## Leyenda

- ✅ **verificado** — confirmado leyendo el código exacto
- ⚠️ **por verificar** — reportado por auditor, requiere confirmar antes de actuar
- ❌ **falso positivo** — descartado tras verificación

## Resumen ejecutivo

| Severidad | Confirmados | Por verificar |
|-----------|-------------|---------------|
| CRÍTICO   | 5           | 0             |
| ALTO      | 10          | 0             |
| MEDIO     | 15          | —             |
| BAJO      | 6           | —             |

> Verificación 2026-06-09: C5, A1 confirmados; A2 degradado a MEDIO (M15); falso positivo `UpdatePayment` IDOR descartado.

Focos reales: bug funcional en disponibilidad de equipo · webhooks de pago sin idempotencia ni sincronización completa de plan · IDOR en portal público de pagos · dinero en `float64` · totales y montos controlados por el cliente.

---

## 🔴 CRÍTICO

### C1. `GetEquipmentAvailability` falla siempre que no se excluye evento ✅ RESUELTO (2026-06-09)
**`internal/repository/event_repo.go:914`**
Eran **dos** bugs: (1) `$4` sin bindear con `excludeEventID == nil` → crash; (2) el `LEFT JOIN events e` no restringía el `SUM(ee.quantity)`, así que se restaba equipo reservado de eventos de cualquier fecha/estado. Reescrito con subquery correlacionada: `$4::uuid` siempre bindeado (nil → NULL) y filtros de fecha/estado/exclusión dentro de la subquery. Test de integración nuevo cubre ambos: `TestEventRepoGetEquipmentAvailabilityIntegration`.

### C2. Webhooks de pago sin idempotencia ✅
**`internal/handlers/subscription_handler.go:237+`**
No se persiste ni valida `event.ID` (Stripe) ni equivalente RevenueCat. Reintentos de Stripe (timeout, replay) re-ejecutan grants de entitlement y correos. Doble-grant posible.

### C3. `customer.subscription.updated` no actualiza `users.plan` ✅
**`internal/handlers/subscription_handler.go:348-398`**
Solo toca la tabla `subscriptions`; nunca llama `UpdatePlanByStripeCustomerID`. Un usuario que regulariza pago (`past_due → active`) queda en `basic` y pierde features Pro.

### C4. Downgrade Business→Pro nunca se procesa ✅
**`internal/handlers/subscription_handler.go:400-426`**
`Metadata["plan"]` solo se lee en `checkout.session.completed`. Un cambio de tier mid-cycle en el portal de Stripe deja `plan="business"` indefinidamente → acceso gratis a features Business.

### C5. OAuth (Google/Apple) bypassea `account_status` ✅
**`internal/handlers/auth_handler.go:1126-1141, 1510-1526`**
Confirmado: el path de login OAuth (y el de auto-link por email) genera tokens sin chequear `AccountStatus`. Un usuario `blocked`/`deleted` con Google/Apple vinculado entra igual. `Login()` (línea 435) sí lo verifica. Fix: aplicar el mismo gate de `AccountStatus` en ambos paths OAuth.

---

## 🟠 ALTO

### A1. File server de uploads sin auth ✅ (por diseño)
**`internal/router/router.go:130-161`**
Confirmado e intencional (comentario `// Serve uploaded files (public — images are accessible by URL)`). Solo bloquea `/receipts/`, sirve logos/fotos con `Access-Control-Allow-Origin: *`. No es bug accidental: requiere decisión de producto sobre si logos/fotos deben ser públicos. Si se acepta, documentar el riesgo; si no, mover tras auth con URLs firmadas.

### A3. `token_repo.IsRevoked` falla abierto ✅
**`internal/repository/token_repo.go:33-36`**
Ante error de DB retorna `false` → token revocado pasa como válido. Durante degradación de DB, tokens post-logout reviven. Debe fallar cerrado.

### A4. `refresh_token_repo.Consume` no atómico ✅
**`internal/repository/refresh_token_repo.go:31-47`**
`SELECT used` y `UPDATE` separados. Dos requests concurrentes bypasean la detección de reuse. Fix: `UPDATE ... WHERE used=FALSE RETURNING ...`.

### A5. TOCTOU en límites de plan ✅
**`internal/handlers/crud_handler.go:164-178, 606-620, 1551-1564`**
`COUNT(*)` + `INSERT` sin transacción. Requests concurrentes superan el límite (21 clientes en plan de 20). Afecta eventos, clientes, productos, staff, teams.

### A6. Dinero en `float64` ✅
**`internal/models/models.go:214,472` + `internal/handlers/payment_status_autoconfirm.go`**
Todos los montos en `float64`, con tolerancia hardcodeada `0.1`. Acumulación de error en MXN. Debe ser `int` (centavos) o decimal.

### A7. `total_amount` del evento controlado por el cliente ✅
**`internal/handlers/crud_handler.go:570-635` + `internal/handlers/validation.go:129`**
Solo valida `>= 0`, nunca recalcula contra productos/extras. Cliente envía `total_amount:1` → auto-confirma con $1 de depósito.

### A8. Monto de submission sin tope superior ✅
**`internal/handlers/payment_submission_handler.go:288-293`**
Acepta cualquier `amount > 0`, sin comparar contra saldo pendiente. "Pago" de $999,999 en evento de $10,000 corrompe dashboard y PDFs.

### A9. `skip_trial` expuesto en API pública ✅
**`internal/handlers/subscription_handler.go:73`**
`skip_trial:true` en body de checkout sin rol admin. Cualquier usuario omite el trial de 14 días.

### A10. Race en `autoConfirm` fuera de transacción ✅
**`internal/handlers/crud_handler.go:2021-2029`**
`CreatePayment` corre `autoConfirmQuotedEventIfDepositCovered` sin tx (a diferencia de `ReviewSubmission` que usa `SELECT FOR UPDATE`). Snapshot stale → evento cubierto que no se confirma o doble-confirma.

### A11. JWT secret reusado para firmar URLs de upload ✅
**`cmd/server/main.go:159`**
`SetPresignSigningKey(cfg.JWTSecret)`. Mismo material cripto para dos dominios; rotarlo invalida todas las sesiones. Usar clave independiente.

---

## 🟡 MEDIO

| # | Hallazgo | Ubicación |
|---|----------|-----------|
| M1 | SQL injection (degradado a defensa en profundidad): repos sin allowlist propia. HTTP ya sanitiza en `pagination.go:52,58` | `inventory_repo.go:58`, `product_repo.go:58` |
| M2 | `event_review_repo` UPDATE sin `AND user_id` | `event_review_repo.go:296,313,237` |
| M3 | RevenueCat webhook: secreto en header plano, no HMAC | `subscription_handler.go:483` |
| M4 | `CSRF isAuthPath` por substring `Contains("/auth/")` | `csrf.go:41` |
| M5 | bcrypt cost 10 (recomendado 12+) | `auth_service.go:39` |
| M6 | CORS sin `Vary: Origin` | `cors.go:19` |
| M7 | Apple `AppleCallback` sin validar `state` (OAuth CSRF) | `auth_handler.go:1651` |
| M8 | `UpdateStatusByUserID` cancela todos los providers | `subscription_repo.go:86` |
| M9 | `normalizePlan` duplicada con lógica divergente | `plan_utils.go:20` vs `user_repo.go:32` |
| M10 | `stripeSubCache` global sin GC (memory leak) | `subscription_handler.go:634` |
| M11 | N+1 en `StaffTeamRepo.GetAll` y `upsertTeamMembers` | `staff_team_repo.go:38,170` |
| M12 | `AddEventPhoto` acepta URL sin validar esquema/dominio | `crud_handler.go:1384` |
| M13 | `/refresh` y `/logout` sin rate limit | `router.go:95-96` |
| M14 | Edición de pago no recalcula estado del evento | `crud_handler.go:2065` |
| M15 | `client_id` del form no validado contra el evento del token (integridad; fuga cross-cliente solo si el evento tiene varios clientes) | `payment_submission_handler.go:282,360,436` |

---

## 🟢 BAJO

- `PaymentDate` con timezone del servidor — `payment_submission_handler.go:617`
- `PRODUCT_CHANGE` RevenueCat sin acción de plan — `subscription_handler.go:566`
- `stripe_customer_id` / `apple_user_id` expuestos en `PUT /users/me` — `models.go:45`
- `Retry-After` en formato Go no-HTTP — `ratelimit.go:96`
- `rows.Err()` no chequeado en 3 funciones — `payment_submission_repo.go:111,140,195`
- `dashboard_repo.GetKPIs` 8 queries sin tx — `dashboard_repo.go:79-203`

---

## ❌ Falsos positivos descartados

- **`UpdatePayment` IDOR** — el repo sí filtra: `WHERE id=$1 AND user_id=$6` (`payment_repo.go:139`). El handler no hace pre-check pero el repo enforce ownership.
- **SQL injection inventory/product como CRÍTICO** — el `sort`/`order` se allowlistean en `pagination.go:52,58` antes de llegar al repo. No explotable vía HTTP; queda como M1 (defensa en profundidad).

---

## Bien implementado (notable)

Rotación de refresh tokens con detección de reuse + revocación de familia · segregación de tipo de JWT (access/refresh/reset) · enforcement de `SigningMethodHMAC` (rechaza `alg=none`) · timing normalization en login · `JWT_SECRET` ≥32 bytes validado al arranque · `PasswordHash` con `json:"-"` · `ReviewSubmission` con `SELECT FOR UPDATE`.

---

## Plan de remediación (slices SDD)

Agrupado por cohesión técnica y orden de prioridad. Cada slice = un cambio SDD → uno o más PRs encadenados.

| Slice | Contenido | Severidad | Riesgo |
|-------|-----------|-----------|--------|
| **S1 — Bug funcional** | C1 (`$4` equipo) | CRÍTICO | Bajo, aislado |
| **S2 — Webhooks de pago** | C2, C3, C4, M3, M8, M10, BAJO PRODUCT_CHANGE | CRÍTICO | Alto, lógica de plan |
| **S3 — Integridad de dinero** | A6 (`float64`), A7 (total), A8 (monto submission), A10 (race), M14 | ALTO | Alto, toca modelos + migración |
| **S4 — Control de acceso** | C5, A1, A2, M2, A11 | CRÍTICO/ALTO | Medio, requiere verificar C5/A1/A2 |
| **S5 — Concurrencia auth** | A3, A4, A5 (TOCTOU/atomicidad) | ALTO | Medio, SQL atómico |
| **S6 — Hardening menor** | A9, M1, M4, M5, M6, M7, M11, M12, M13 + BAJOS | MEDIO/BAJO | Bajo |

**Nota:** C5, A1, A2 ya verificados (2026-06-09). A1 es decisión de producto (uploads públicos intencionales). A2 reclasificado a M15.
