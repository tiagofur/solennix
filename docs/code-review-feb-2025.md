# Code Review — Febrero 2025

Revisión exhaustiva del repositorio Solennix (frontend React + backend Go).
Documento generado para dar continuidad al trabajo de corrección.

---

## Resumen ejecutivo

| Categoría | Encontrados | Corregidos | Pendientes |
|-----------|:-----------:|:----------:|:----------:|
| Bugs críticos | 7 | 7 | 0 |
| Seguridad | 3 | 3 | 0 |
| Dark mode / UI | 6 | 6 | 0 |
| Typos / i18n | 4 | 4 | 0 |
| Debug code en producción | 1 | 1 | 0 |
| Mejoras de arquitectura | 6 | 0 | 6 |

**Total: 27 issues encontrados, 21 corregidos, 6 pendientes para futuro.**

---

## CORREGIDOS (Commit 1: `ac5761d`)

### Frontend

#### 1. Typo en botón de Payments — `Payments.tsx:129`
- **Antes:** `Cambiar estado ag "Confirmado"`
- **Después:** `Cambiar estado a "Confirmado"`

#### 2. Error silencioso al crear pago — `Payments.tsx:88`
- **Problema:** Si la API fallaba al crear un pago, el error se tragaba con `logError()` sin feedback al usuario.
- **Fix:** Agregado `addToast("Error al registrar el pago.", "error")` en el catch.

#### 3. Null pointer en `client.total_spent` — `ClientDetails.tsx:133`
- **Problema:** `client.total_spent.toFixed(2)` crashea si el backend retorna `null`.
- **Fix:** `(client.total_spent ?? 0).toFixed(2)`. Mismo fix aplicado a `event.total_amount`.

#### 4. Error de carga sin feedback — `ClientDetails.tsx:31-44`
- **Problema:** Si la API falla al cargar un cliente, el usuario ve "Cliente no encontrado" en vez de un mensaje de error real.
- **Fix:** Agregado estado `error` con UI de feedback y botón para volver.

#### 5. Race condition con `setTimeout` — `EventForm.tsx:352`
- **Problema:** `setTimeout(() => setValue("client_id", ...), 100)` — el delay de 100ms es arbitrario y puede fallar en dispositivos lentos.
- **Fix:** Reemplazado con `queueMicrotask()` que ejecuta después del flush de React state.

#### 6. Descuento sin validación — `EventProducts.tsx:107`
- **Problema:** El campo de descuento permitía valores mayores al precio unitario, generando precios negativos.
- **Fix:** Agregado `max={item.price}` y validación `val <= item.price` en el onChange.

#### 7. Errores de punto flotante en cálculos financieros — `EventForm.tsx:245-250`
- **Problema:** Cálculos de descuento, IVA y total acumulaban errores de floating-point (ej: `$1000.0000000001`).
- **Fix:** Cada paso intermedio usa `Math.round(x * 100) / 100` para redondear a 2 decimales.

### Backend

#### 8. CORS: credentials enviado a orígenes no permitidos — `cors.go:25`
- **Problema:** `Access-Control-Allow-Credentials: true` se enviaba siempre, incluso para orígenes no whitelisteados. Viola la spec CORS y puede filtrar credenciales.
- **Fix:** Solo se envía `Allow-Credentials` dentro del `if originsSet[origin]`.

#### 9. Webhook RevenueCat sin validación — `subscription_handler.go:232`
- **Problema:** Si `REVENUECAT_WEBHOOK_SECRET` estaba vacío, el webhook aceptaba cualquier request sin verificar.
- **Fix:** Ahora retorna 500 si el secret no está configurado, rechazando todo.

#### 10. Error de JSON encoding ignorado — `helpers.go:12`
- **Problema:** `json.NewEncoder(w).Encode(data)` ignoraba errores de serialización.
- **Fix:** Agregado `if err := ...; err != nil { slog.Error(...) }`.

#### 11. Errores de `UpdateClientStats` ignorados — `crud_handler.go:260,296,321`
- **Problema:** `_ = h.eventRepo.UpdateClientStats(...)` descartaba errores silenciosamente, las estadísticas del cliente podían quedar desincronizadas.
- **Fix:** Reemplazado con `slog.Warn()` para loguear errores.

#### 12. Nil pointer en Login — `auth_handler.go:116`
- **Problema:** Si `GetByEmail` retornaba `nil` sin error, `user.PasswordHash` causaba panic.
- **Fix:** Agregado `|| user == nil` al check.

---

## CORREGIDOS (Commit 2: `3332799`)

#### 13. Hover color incorrecto en Register — `Register.tsx:195`
- **Problema:** Botón de registro usaba `hover:bg-brand-green` (verde) mientras el resto de la app usa naranja.
- **Fix:** Cambiado a `hover:bg-orange-600`.

#### 14. Error alert sin dark mode — `Register.tsx:95`
- **Problema:** Fondo blanco fijo (`bg-red-50`) y texto oscuro (`text-red-700`), ilegible en dark mode.
- **Fix:** Agregado `dark:bg-red-900/20`, `dark:border-red-800`, `dark:text-red-300`.

#### 15. `console.log` en producción — `Login.tsx:39`
- **Problema:** `console.log('Login response:', res)` dejado en producción, expone datos sensibles en la consola.
- **Fix:** Eliminado junto con el `console.error` redundante.

#### 16. Error alert sin dark mode — `Login.tsx:101`
- **Fix:** Mismo patrón que Register — agregadas clases dark mode.

#### 17. ForgotPassword sin dark mode — `ForgotPassword.tsx` (página completa)
- **Problema:** Toda la página usaba fondos blancos/grises sin variantes dark. También usaba un logo externo de Tailwind UI (`tailwindui.com`) y colores azules inconsistentes con el brand naranja.
- **Fix:** Dark mode completo, eliminado logo externo, colores alineados a `brand-orange`.

#### 18. Tildes faltantes — `Search.tsx:81,82,55,124`
- `operacion` → `operación`
- `termino` → `término`
- `busqueda` → `búsqueda` (en 2 lugares)

#### 19. Error silencioso en Dashboard — `Dashboard.tsx:126-128`
- **Problema:** Si la carga de eventos del mes fallaba, el error solo se logueaba, el usuario no veía nada.
- **Fix:** Agregado `setError("Error al cargar los datos del mes. Intenta recargar.")`.

---

## RESUELTOS — Commit 3 (Issues P1–P6)

### P1. Rate limiting en endpoints de auth — CORREGIDO
- **Archivos:** `backend/internal/middleware/ratelimit.go` (nuevo), `backend/internal/router/router.go`
- **Fix:** Creado middleware `RateLimit` basado en IP con ventana deslizante (10 req/min para auth). Limpieza automática de entradas stale cada 5 min. Aplicado al grupo `/api/auth`.

### P2. N+1 queries en ingredientes de productos — CORREGIDO
- **Archivos:** `backend/internal/handlers/crud_handler.go`, `backend/internal/router/router.go`, `web/src/services/productService.ts`, `web/src/services/productService.test.ts`
- **Fix:** Creado handler `GetBatchProductIngredients` y ruta `POST /api/products/ingredients/batch`. El frontend ahora hace 1 sola llamada en lugar de N. El repositorio ya tenía `GetIngredientsForProducts` con `ANY($1)`.

### P3. Casts `as any` en resolvers de formularios — CORREGIDO
- **Archivos:** `EventForm.tsx`, `ProductForm.tsx`, `InventoryForm.tsx`
- **Fix:** Reemplazado `as any` con `as Resolver<FormDataType>` — mantiene type safety real. El cast es necesario porque `z.coerce.number()` genera un tipo intermedio `unknown` incompatible con react-hook-form.

### P4. Composite indexes faltantes — CORREGIDO
- **Archivo:** `backend/internal/database/migrations/014_add_indexes_and_cascade.up.sql` (nuevo)
- **Fix:** Agregados indexes compuestos:
  - `events(user_id, event_date)` — queries de calendario
  - `events(user_id, status)` — filtros de dashboard
  - `payments(user_id, event_id)` — lookups de pagos
  - `product_ingredients(product_id, inventory_id)` — constraint UNIQUE para evitar duplicados

### P5. `ON DELETE CASCADE` faltante en payments — CORREGIDO
- **Archivo:** `backend/internal/database/migrations/014_add_indexes_and_cascade.up.sql`
- **Fix:** Migración altera FK `payments.user_id` para agregar `ON DELETE CASCADE`, consistente con el resto de tablas.

### P6. Carga de calendario sin paginación — CORREGIDO
- **Archivo:** `web/src/pages/Calendar/CalendarView.tsx`
- **Fix:** `fetchAllEvents()` reducida de 2 años a ±6 meses usando `subMonths`/`addMonths` de date-fns. El modo calendario ya cargaba solo el mes visible.

---

## Archivos modificados (referencia rápida)

### Commit 1 — `ac5761d` — Bugs críticos y seguridad
```
backend/internal/handlers/auth_handler.go
backend/internal/handlers/crud_handler.go
backend/internal/handlers/helpers.go
backend/internal/handlers/subscription_handler.go
backend/internal/middleware/cors.go
web/src/pages/Clients/ClientDetails.tsx
web/src/pages/Events/EventForm.tsx
web/src/pages/Events/components/EventProducts.tsx
web/src/pages/Events/components/Payments.tsx
```

### Commit 2 — `3332799` — Dark mode, UI, typos
```
web/src/pages/Dashboard.tsx
web/src/pages/ForgotPassword.tsx
web/src/pages/Login.tsx
web/src/pages/Register.tsx
web/src/pages/Search.tsx
```

### Commit 3 — Issues P1–P6
```
backend/internal/middleware/ratelimit.go (nuevo)
backend/internal/router/router.go
backend/internal/handlers/crud_handler.go
backend/internal/database/migrations/014_add_indexes_and_cascade.up.sql (nuevo)
backend/internal/database/migrations/014_add_indexes_and_cascade.down.sql (nuevo)
web/src/services/productService.ts
web/src/services/productService.test.ts
web/src/pages/Events/EventForm.tsx
web/src/pages/Products/ProductForm.tsx
web/src/pages/Inventory/InventoryForm.tsx
web/src/pages/Calendar/CalendarView.tsx
```

### Branch: `claude/code-review-improvements-aF2ks`
