---
tags:
  - super-plan
  - backend
  - contract
  - readiness
aliases:
  - Backend Contract Readiness
status: active
created: 2026-04-10
updated: 2026-04-10
---

# 16 - Backend Contract Readiness Assessment

## Resumen Ejecutivo

El backend Go ya tiene **implementados todos los handlers core** (CRUD de eventos, clientes, productos, inventario, pagos). E2.B1 ya avanzó a un `openapi.yaml` expandido y E2.B2 ya tiene una primera suite de contract tests que falla si desaparecen endpoints, schemas o responses críticas. El cierre más reciente de E2.C1 detectó y cubrió rutas que la Web usa realmente: nested event items, equipment/supplies suggestions, Stripe event payments, product ingredients y respuestas paginadas.

## Estado Real al Cierre del Día

- `backend/docs/openapi.yaml` existe y ya cubre auth, subscriptions, CRUD core, dashboard, search, uploads, devices, live-activities, unavailable-dates y los endpoints web-reales de eventos/productos/pagos.
- `backend/internal/handlers/contract_test.go` valida contrato de auth, subscriptions, events, CRUD core y endpoints operativos, incluyendo nested event endpoints y envelopes paginados.
- `backend/internal/handlers/crud_handler_success_test.go` ya cubre `CreateEvent` con fecha inválida y overlap con unavailable dates.
- Siguiente foco real: endurecer E2.B2 con validaciones más finas de payloads reales y extender E2.C1 hacia iOS/Android usando este contrato ya expandido.

---

## Estado Actual del Backend

### Handlers Implementados ✅

| Endpoint                         | Método          | Handler                                       | Status | Pruebas                      |
| -------------------------------- | --------------- | --------------------------------------------- | ------ | ---------------------------- |
| `/api/events`                    | GET             | ListEvents                                    | ✅     | crud_handler_test.go         |
| `/api/events`                    | POST            | CreateEvent                                   | ✅     | crud_handler_success_test.go |
| `/api/events/{id}`               | GET             | GetEvent                                      | ✅     | crud_handler_test.go         |
| `/api/events/{id}`               | PUT             | UpdateEvent                                   | ✅     | crud_handler_success_test.go |
| `/api/events/{id}`               | DELETE          | DeleteEvent                                   | ✅     | crud_handler_test.go         |
| `/api/events/upcoming`           | GET             | GetUpcomingEvents                             | ✅     | —                            |
| `/api/events/{id}/items`         | GET/PUT         | GetEvent/UpdateEventItems                     | ✅     | crud_handler_test.go         |
| `/api/events/{id}/photos`        | GET/POST/DELETE | GetEventPhotos/AddEventPhoto/DeleteEventPhoto | ✅     | —                            |
| `/api/events/{id}/equipment`     | GET             | GetEventEquipment                             | ✅     | —                            |
| `/api/events/{id}/supplies`      | GET             | GetEventSupplies                              | ✅     | —                            |
| **Clientes**                     |                 |                                               |        |                              |
| `/api/clients`                   | GET/POST        | ListClients/CreateClient                      | ✅     | crud_handler_test.go         |
| `/api/clients/{id}`              | GET/PUT/DELETE  | GetClient/UpdateClient/DeleteClient           | ✅     | crud_handler_test.go         |
| **Productos**                    |                 |                                               |        |                              |
| `/api/products`                  | GET/POST        | ListProducts/CreateProduct                    | ✅     | crud_handler_test.go         |
| `/api/products/{id}`             | GET/PUT/DELETE  | GetProduct/UpdateProduct/DeleteProduct        | ✅     | crud_handler_test.go         |
| `/api/products/{id}/ingredients` | GET/PUT         | GetProductIngredients/UpdateIngredients       | ✅     | —                            |
| **Inventario**                   |                 |                                               |        |                              |
| `/api/inventory`                 | GET/POST        | ListInventory/CreateInventory                 | ✅     | crud_handler_test.go         |
| `/api/inventory/{id}`            | GET/PUT/DELETE  | GetInventory/UpdateInventory/DeleteInventory  | ✅     | crud_handler_test.go         |
| **Pagos**                        |                 |                                               |        |                              |
| `/api/payments`                  | GET/POST        | ListPayments/CreatePayment                    | ✅     | crud_payment_test.go         |
| `/api/payments/{id}`             | GET/PUT/DELETE  | GetPayment/UpdatePayment/DeletePayment        | ✅     | crud_payment_test.go         |
| **Auth**                         |                 |                                               |        |                              |
| `/api/auth/register`             | POST            | CreateUser                                    | ✅     | auth_handler_test.go         |
| `/api/auth/login`                | POST            | LoginUser                                     | ✅     | auth_handler_test.go         |
| `/api/auth/refresh`              | POST            | RefreshToken                                  | ✅     | auth_handler_test.go         |
| `/api/auth/logout`               | POST            | LogoutUser                                    | ✅     | —                            |
| `/api/auth/forgot-password`      | POST            | ForgotPassword                                | ✅     | auth_handler_test.go         |
| `/api/auth/reset-password`       | POST            | ResetPassword                                 | ✅     | auth_handler_test.go         |

### Estructura de Modelos ✅

```go
// backend/internal/models/event.go
type Event struct {
    ID           uuid.UUID  `json:"id"`
    UserID       uuid.UUID  `json:"user_id"`
    ClientID     uuid.UUID  `json:"client_id"`
    Name         string     `json:"name"`
    EventDate    string     `json:"event_date"` // YYYY-MM-DDTHH:MM:SS format
    Location     string     `json:"location"`
    Status       string     `json:"status"` // draft, confirmed, completed, cancelled
    TotalPrice   float64    `json:"total_price"`
    // ... más campos
    CreatedAt    time.Time  `json:"created_at"`
    UpdateatedAt time.Time  `json:"updated_at"`
}
```

### Validación ✅

Todos los handlers validan:

- ✅ UserID desde JWT (OAuth)
- ✅ Campos requeridos por modelo
- ✅ UUID parsing
- ✅ Business rules (plan limits, unavailable dates, etc.)

---

## Tarea E2.B1: OpenAPI 3.1 Specification

### Qué se Necesita

Crear archivo `backend/docs/openapi.yaml` con especificación de:

1. **Components/Schemas**
   - Event (con todos los campos)
   - Client
   - Product
   - InventoryItem
   - Payment
   - User
   - ErrorResponse

2. **Paths**
   - `/api/events` (GET, POST)
   - `/api/events/{id}` (GET, PUT, DELETE)
   - `/api/events/{id}/items` (GET, PUT)
   - `/api/clients` (GET, POST)
   - `/api/clients/{id}` (GET, PUT, DELETE)
   - ... y demás

3. **Security**
   - BearerAuth (JWT en Authorization header)
   - 401 para endpoints protegidos sin token

### Estructura Mínima OpenAPI

```yaml
openapi: 3.1.0
info:
  title: Solennix API
  version: 1.0.0
components:
  schemas:
    Event:
      type: object
      required: [name, event_date, client_id]
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        event_date:
          type: string
          format: date-time
        # ...
    ErrorResponse:
      type: object
      properties:
        error:
          type: string
        message:
          type: string
paths:
  /api/events:
    get:
      operationId: listEvents
      security:
        - bearerAuth: []
      responses:
        "200":
          description: List of events
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Event"
        "401":
          description: Unauthorized
    post:
      operationId: createEvent
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/Event"
      responses:
        "201":
          description: Event created
        "400":
          description: Validation error
        "401":
          description: Unauthorized
```

### Esfuerzo Estimado

- **4-6 horas**
- Herramientas: redocly, swagger-cli, o manual con YAML schema validator
- Output: `backend/docs/openapi.yaml`

### Entrega Esperada (E2.B1)

```
backend/
├── docs/
│   └── openapi.yaml ← especificación completa
├── go.mod
└── main.go
```

---

## Tarea E2.B2: Contract Breaking Change Detection

### Qué se Necesita

Tests que validen que no hay breaking changes en la API. Ejemplos:

```go
// backend/internal/handlers/contract_test.go
func TestContractEventCreate_FieldsRequired(t *testing.T) {
    // Verificar que campos requeridos en OpenAPI son obligatorios en handler
    // Si EventCreate requiere "name" y "client_id", el handler debe validarlos
}

func TestContractEventResponse_AllFieldsPresent(t *testing.T) {
    // Crear evento y verificar que la respuesta tiene todos los campos de OpenAPI
}

func TestContractNoBreakingChanges_EventEndpoints(t *testing.T) {
    // Comparar respuesta actual vs OpenAPI spec:
    // - Type changes? → FAIL
    // - Field removed? → FAIL
    // - Status code changed? → FAIL
}
```

### Librería Recomendada

`github.com/swaggo/swag` (Swagger/OpenAPI generator):

```bash
go get -u github.com/swaggo/swag/cmd/swag@latest
swag init -g cmd/server/main.go  # genera openapi.yaml desde handler comments
```

O manual con comparación JSON Schema.

### Herramientas CI

Agregar a GitHub Actions:

```yaml
- name: Validate OpenAPI Spec
  run: |
    npm install -g @redocly/cli
    redocly lint backend/docs/openapi.yaml

- name: Contract Tests
  run: go test ./internal/handlers -run Contract -v
```

### Esfuerzo Estimado

- **6-8 horas**
- Incluye setup de swag o manual schema comparison
- Output: tests que detectan breaking changes

### Entrega Esperada (E2.B2)

```
backend/
├── docs/
│   ├── openapi.yaml
│   └── CHANGELOG.md ← cambios en API
├── internal/handlers/
│   └── contract_test.go ← tests de validación
└── .github/workflows/
    └── contract-validation.yml ← CI job
```

---

## Checklist Pre-Ola1

### ✅ Ya Completado

- [x] Handlers core implementados y testeados
- [x] Models definidos en Go structs
- [x] Validación en handlers
- [x] Errores estructurados (writeError)
- [x] OpenAPI base documentado y expandido
- [x] Contract tests base para rutas y schemas críticas

### ⬜ Pendiente Wave 1

- [ ] Refinar OpenAPI con endpoints secundarios y ejemplos específicos si hace falta
- [ ] Endurecer contract tests con checks de payloads reales y status codes exactos
- [ ] CI validation job en GitHub Actions
- [ ] Changelog de endpoints
- [ ] Documentación de breaking changes (si hay)

---

## Bloqueo de E2.B1 → E2.C1

**Ni Web, iOS ni Android pueden validar su consumo hasta que E2.B1 (OpenAPI) esté done.**

Por eso E2.B1 es camino crítico.

---

## Roadmap E2 (Epic Backend Contract Freeze)

```
Week 1 (Apr 10-16):
  E2.B1 (4-6h) ← CRITICAL PATH
  E2.B2 comienza después de E2.B1

Week 2 (Apr 17-23):
  E2.B2 (6-8h)
  E2.C1 (Web/iOS/Android auditan contra spec)

Fin Wave 1 (Apr 24):
  ✅ E2.B1: OpenAPI green
  ✅ E2.B2: Contract tests green
  ✅ E2.C1: Cero divergencias P0
```

---

## Links y Recursos

- [[14_WAVE_1_BREAKDOWN]]
- [[15_QUICK_START_EXECUTION]]
- [[04_BACKEND_AS_PRODUCT_CONTRACT]]
- Backend Code: `backend/internal/handlers/*.go`
- Tests: `backend/internal/handlers/*_test.go`
- Models: `backend/internal/models/`

#super-plan #backend #contract #readiness
