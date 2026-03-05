# 📊 AUDITORÍA COMPLETA MVP - EVENTOSAPP
## Reporte Ejecutivo de Revisión Pre-Lanzamiento

**Fecha**: 25 de febrero de 2026
**Versión**: 1.0
**Estado General**: **LISTO PARA MVP CON ACCIONES CRÍTICAS PENDIENTES**
**Calificación Global**: **B+ (85/100)**

---

## 🎯 RESUMEN EJECUTIVO

Solennix presenta una arquitectura sólida y features bien implementadas, pero requiere atención **INMEDIATA** en:

1. **Seguridad de autenticación** (tokens en localStorage)
2. **Funcionalidad de reset de contraseña** (no envía emails)
3. **Testing de pagos/suscripciones** (0% cobertura)
4. **Accesibilidad web** (ARIA labels faltantes)

**Veredicto**: El MVP es funcional para usuarios iniciales pero necesita 2-3 semanas de hardening antes de lanzamiento público.

---

## 📋 ÍNDICE

- [Hallazgos Críticos](#-crítico-bloquea-producción)
- [Hallazgos de Alta Prioridad](#-alto-afecta-uxseguridad)
- [Hallazgos de Media Prioridad](#-medio-mejora-ux)
- [Áreas Bien Implementadas](#-bien-implementado)
- [Matriz de Prioridades](#-matriz-de-prioridades)
- [Plan de Acción](#-plan-de-acción-recomendado)
- [Scorecard Final](#-scorecard-final)
- [Auditorías Detalladas](#auditorías-detalladas-por-área)

---

## 🔴 CRÍTICO (Bloquea Producción)

### 1. SEGURIDAD: Token JWT en localStorage (OWASP A02:2021)

**Severidad**: CRÍTICA | **CVSS 8.2** | **Esfuerzo**: 1-2 días | **Prioridad**: P0

**Ubicación**:
- `web/src/lib/api.ts` (líneas 9, 36)
- `web/src/contexts/AuthContext.tsx` (líneas 44, 69, 77)

**Código Vulnerable**:
```typescript
// VULNERABLE
const token = localStorage.getItem('auth_token');
localStorage.setItem('auth_token', res.tokens.access_token);
```

**Riesgos**:
- ✗ Vulnerable a XSS (cualquier script puede robar token)
- ✗ Token persiste después de cerrar navegador
- ✗ Sin protección CSRF
- ✗ Accesible desde DevTools/extensiones

**Solución Recomendada**:
```typescript
// Backend debe enviar:
Set-Cookie: auth_token=...; HttpOnly; Secure; SameSite=Strict; Path=/

// Frontend: eliminar localStorage, cookies se envían automáticamente
// No necesita código - el navegador envía cookies en cada request
```

**Pasos de Implementación**:
1. Modificar `auth_handler.go` para enviar Set-Cookie en login/register
2. Configurar middleware para leer cookie en lugar de Authorization header
3. Actualizar `api.ts` para eliminar token storage
4. Actualizar `AuthContext.tsx` para verificar sesión con endpoint `/api/auth/me`
5. Tests de integración para verificar flujo completo

**Archivos Afectados**:
- `backend/internal/handlers/auth_handler.go`
- `backend/internal/middleware/auth.go`
- `web/src/lib/api.ts`
- `web/src/contexts/AuthContext.tsx`

---

### 2. FUNCIONALIDAD: Email de Reset de Contraseña NO FUNCIONA

**Severidad**: CRÍTICA | **Esfuerzo**: 1 día | **Prioridad**: P0

**Ubicación**: `backend/internal/handlers/auth_handler.go:192`

**Código Actual**:
```go
// TODO: Send password reset email via SMTP
slog.Info("Password reset requested", "email", req.Email)
// ❌ NO ENVÍA EMAIL - Solo loggea
```

**Impacto**: Usuarios bloqueados sin forma de recuperar contraseña

**Solución Recomendada**:

```go
// 1. Crear servicio de email
// backend/internal/services/email_service.go
type EmailService struct {
    smtpHost string
    smtpPort int
    smtpUser string
    smtpPass string
    fromAddr string
}

func (s *EmailService) SendPasswordReset(email, token, frontendURL string) error {
    resetLink := fmt.Sprintf("%s/reset-password?token=%s", frontendURL, token)

    body := fmt.Sprintf(`
        <html>
        <body>
            <h2>Recuperación de Contraseña - Solennix</h2>
            <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
            <a href="%s">Restablecer Contraseña</a>
            <p>Este enlace es válido por 1 hora.</p>
        </body>
        </html>
    `, resetLink)

    // Enviar email usando net/smtp o mailgun/sendgrid SDK
}

// 2. Modificar auth_handler.go
func (h *AuthHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
    // ... validación existente

    // Generar token JWT con expiración 1h
    token, err := h.authService.GenerateResetToken(user.ID)
    if err != nil {
        writeError(w, http.StatusInternalServerError, "Error generating token")
        return
    }

    // Enviar email
    if err := h.emailService.SendPasswordReset(req.Email, token, h.cfg.FrontendURL); err != nil {
        slog.Error("Failed to send password reset email", "error", err)
        writeError(w, http.StatusInternalServerError, "Error sending email")
        return
    }

    writeJSON(w, http.StatusOK, map[string]string{"message": "Email sent"})
}

// 3. Crear endpoint para resetear
func (h *AuthHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
    var req struct {
        Token       string `json:"token"`
        NewPassword string `json:"new_password"`
    }

    // Validar token JWT
    claims, err := h.authService.ValidateResetToken(req.Token)

    // Hash nueva contraseña
    hash, _ := h.authService.HashPassword(req.NewPassword)

    // Actualizar password en BD
    h.userRepo.UpdatePassword(r.Context(), claims.UserID, hash)
}
```

**Variables de Entorno Requeridas**:
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.xxxxxx
SMTP_FROM=noreply@solennix.com
```

**Frontend**: Crear página `/reset-password`

**Archivos Afectados**:
- `backend/internal/services/email_service.go` (NUEVO)
- `backend/internal/handlers/auth_handler.go`
- `backend/internal/services/auth_service.go` (agregar GenerateResetToken)
- `web/src/pages/ResetPassword.tsx` (NUEVO)
- `web/src/App.tsx` (agregar ruta)

---

### 3. TESTING: Suscripciones/Pagos SIN TESTS (0% Cobertura)

**Severidad**: CRÍTICA | **Esfuerzo**: 4 horas | **Prioridad**: P0

**Archivos Sin Tests**:
- `web/src/services/subscriptionService.ts` (Integración Stripe)
- `backend/internal/handlers/subscription_handler.go` (Webhooks)

**Riesgo**: Cambios futuros pueden romper pagos sin detección

**Solución - Frontend Tests**:

```typescript
// web/src/services/subscriptionService.test.ts (NUEVO)
import { describe, it, expect, beforeEach } from 'vitest';
import { subscriptionService } from './subscriptionService';
import { server } from '../tests/mocks/server';
import { http, HttpResponse } from 'msw';

describe('subscriptionService', () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  it('creates Stripe checkout session', async () => {
    server.use(
      http.post('/api/subscriptions/checkout-session', () => {
        return HttpResponse.json({ url: 'https://checkout.stripe.com/test123' });
      })
    );

    const result = await subscriptionService.createCheckoutSession();
    expect(result.url).toContain('checkout.stripe.com');
  });

  it('handles Stripe error response', async () => {
    server.use(
      http.post('/api/subscriptions/checkout-session', () => {
        return HttpResponse.json(
          { error: 'Payment method required' },
          { status: 402 }
        );
      })
    );

    await expect(
      subscriptionService.createCheckoutSession()
    ).rejects.toThrow('Payment method required');
  });

  it('creates portal session for billing management', async () => {
    server.use(
      http.post('/api/subscriptions/portal-session', () => {
        return HttpResponse.json({ url: 'https://billing.stripe.com/test456' });
      })
    );

    const result = await subscriptionService.createPortalSession();
    expect(result.url).toContain('billing.stripe.com');
  });
});
```

**Solución - Backend Tests**:

```go
// backend/internal/handlers/subscription_handler_test.go (NUEVO)
package handlers

import (
    "bytes"
    "net/http"
    "net/http/httptest"
    "testing"
    "github.com/stretchr/testify/assert"
)

func TestSubscriptionHandler_StripeWebhook(t *testing.T) {
    // Setup handler con config test
    handler := NewSubscriptionHandler(mockRepo, mockConfig)

    t.Run("validates Stripe signature", func(t *testing.T) {
        // Payload sin firma válida
        req := httptest.NewRequest("POST", "/api/subscriptions/webhook/stripe", bytes.NewReader([]byte("{}")))
        w := httptest.NewRecorder()

        handler.StripeWebhook(w, req)

        assert.Equal(t, http.StatusBadRequest, w.Code)
        assert.Contains(t, w.Body.String(), "Invalid signature")
    })

    t.Run("processes subscription update event", func(t *testing.T) {
        // Crear payload firmado con Stripe test key
        payload := createStripeTestPayload("customer.subscription.updated")
        signature := generateStripeSignature(payload, testWebhookSecret)

        req := httptest.NewRequest("POST", "/api/subscriptions/webhook/stripe", bytes.NewReader(payload))
        req.Header.Set("Stripe-Signature", signature)
        w := httptest.NewRecorder()

        handler.StripeWebhook(w, req)

        assert.Equal(t, http.StatusOK, w.Code)
        // Verificar que user plan fue actualizado en BD
    })
}
```

**Archivos a Crear**:
- `web/src/services/subscriptionService.test.ts`
- `backend/internal/handlers/subscription_handler_test.go`

---

## 🟠 ALTO (Afecta UX/Seguridad)

### 4. SEGURIDAD: Headers HTTP Faltantes

**Severidad**: ALTA | **CVSS 7.3** | **Esfuerzo**: 1 hora | **Prioridad**: P1

**Headers Faltantes**:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` (HSTS)
- `Content-Security-Policy`
- `X-XSS-Protection`
- `Referrer-Policy`

**Riesgos**:
- Vulnerable a MIME type sniffing
- Vulnerable a clickjacking
- Sin protección XSS en navegadores antiguos
- Fugas de información en referrer

**Solución**:

```go
// backend/internal/middleware/security.go (NUEVO)
package middleware

import (
    "net/http"
)

func SecurityHeaders(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Prevenir MIME sniffing
        w.Header().Set("X-Content-Type-Options", "nosniff")

        // Prevenir clickjacking
        w.Header().Set("X-Frame-Options", "DENY")

        // XSS protection (legacy browsers)
        w.Header().Set("X-XSS-Protection", "1; mode=block")

        // HSTS - forzar HTTPS (solo en producción)
        if r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https" {
            w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        }

        // CSP - permitir solo recursos del mismo origen
        w.Header().Set("Content-Security-Policy",
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:")

        // Referrer policy
        w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

        next.ServeHTTP(w, r)
    })
}
```

```go
// backend/internal/router/router.go
func New(cfg *config.Config, deps *Dependencies) *chi.Mux {
    r := chi.NewRouter()

    // Middleware global
    r.Use(middleware.Logger)
    r.Use(middleware.CORS(cfg.CORSAllowedOrigins))
    r.Use(middleware.SecurityHeaders) // ← AGREGAR AQUÍ

    // ... resto del código
}
```

**Archivos Afectados**:
- `backend/internal/middleware/security.go` (NUEVO)
- `backend/internal/router/router.go`

---

### 5. VALIDACIÓN: Reglas de Negocio No Validadas en Backend

**Severidad**: ALTA | **Esfuerzo**: 3 horas | **Prioridad**: P1

**Problemas Detectados**:
- `discount > 100%` se acepta ❌
- `deposit_percent > 100%` se acepta ❌
- `refund_percent > 100%` se acepta ❌
- `total_amount` negativo se acepta ❌
- `payment amount > event total` se acepta ❌
- `num_people < 1` se acepta ❌

**Ubicación**: `backend/internal/handlers/crud_handler.go`

**Código Vulnerable**:
```go
// crud_handler.go:230
var event models.Event
decodeJSON(r, &event) // ❌ Solo valida JSON, no schema
h.eventRepo.Create(r.Context(), &event) // Guarda sin validar
```

**Solución**:

```go
// backend/internal/handlers/validation.go (NUEVO)
package handlers

import (
    "fmt"
    "github.com/yourusername/solennix/internal/models"
)

func validateEvent(event *models.Event) error {
    if event.NumPeople < 1 {
        return fmt.Errorf("number of people must be at least 1")
    }

    if event.Discount < 0 || event.Discount > 100 {
        return fmt.Errorf("discount must be between 0 and 100")
    }

    if event.TaxRate < 0 || event.TaxRate > 100 {
        return fmt.Errorf("tax rate must be between 0 and 100")
    }

    if event.DepositPercent < 0 || event.DepositPercent > 100 {
        return fmt.Errorf("deposit percent must be between 0 and 100")
    }

    if event.RefundPercent < 0 || event.RefundPercent > 100 {
        return fmt.Errorf("refund percent must be between 0 and 100")
    }

    if event.TotalAmount < 0 {
        return fmt.Errorf("total amount cannot be negative")
    }

    return nil
}

func validatePayment(payment *models.Payment, eventTotal float64) error {
    if payment.Amount <= 0 {
        return fmt.Errorf("payment amount must be positive")
    }

    if payment.Amount > eventTotal {
        return fmt.Errorf("payment amount cannot exceed event total")
    }

    return nil
}

func validateProduct(product *models.Product) error {
    if product.Name == "" {
        return fmt.Errorf("product name is required")
    }

    if product.BasePrice < 0 {
        return fmt.Errorf("base price cannot be negative")
    }

    return nil
}
```

```go
// Modificar crud_handler.go CreateEvent
func (h *CRUDHandler) CreateEvent(w http.ResponseWriter, r *http.Request) {
    userID := middleware.GetUserID(r.Context())

    var event models.Event
    if err := decodeJSON(r, &event); err != nil {
        writeError(w, http.StatusBadRequest, "Invalid request body")
        return
    }

    // ✅ AGREGAR VALIDACIÓN
    if err := validateEvent(&event); err != nil {
        writeError(w, http.StatusBadRequest, err.Error())
        return
    }

    event.UserID = userID

    // Verificar límites de plan...
    // Crear evento...
}
```

**Archivos Afectados**:
- `backend/internal/handlers/validation.go` (NUEVO)
- `backend/internal/handlers/crud_handler.go` (modificar CreateEvent, UpdateEvent, CreatePayment)

**Tests**:
```go
// backend/internal/handlers/validation_test.go (NUEVO)
func TestValidateEvent(t *testing.T) {
    tests := []struct {
        name    string
        event   *models.Event
        wantErr bool
        errMsg  string
    }{
        {
            name:    "valid event",
            event:   &models.Event{NumPeople: 10, Discount: 10, TaxRate: 16, DepositPercent: 50},
            wantErr: false,
        },
        {
            name:    "discount over 100",
            event:   &models.Event{NumPeople: 10, Discount: 150},
            wantErr: true,
            errMsg:  "discount must be between 0 and 100",
        },
        {
            name:    "negative total",
            event:   &models.Event{NumPeople: 10, TotalAmount: -100},
            wantErr: true,
            errMsg:  "total amount cannot be negative",
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := validateEvent(tt.event)
            if tt.wantErr {
                assert.Error(t, err)
                assert.Contains(t, err.Error(), tt.errMsg)
            } else {
                assert.NoError(t, err)
            }
        })
    }
}
```

---

### 6. ACCESIBILIDAD: ARIA Labels Faltantes (WCAG 2.1 AA)

**Severidad**: ALTA | **Esfuerzo**: 1 día | **Prioridad**: P1

**Problemas Detectados**:
- Inputs sin `aria-label` o `<label>` asociado con `htmlFor`
- Buttons con solo iconos sin `aria-label`
- Selects dinámicos sin labels
- Checkboxes sin asociación correcta
- Focus trap faltante en modals

**Ejemplos de Código Problemático**:

```tsx
// EventProducts.tsx:77 - PROBLEMA
<select value={item.product_id} onChange={...}>
  {/* ❌ NO TIENE aria-label ni <label> */}
  <option value="">Seleccionar producto</option>
</select>

// EventSummary.tsx:274 - PROBLEMA
<button onClick={() => navigate(`/events/${id}/edit`)}>
  {/* ❌ Solo tiene title, falta aria-label */}
  <Pencil className="h-4 w-4" />
</button>

// EventFinancials.tsx:43 - PROBLEMA
<label className="...">Facturación</label>
<input type="checkbox" {...register('requires_invoice')} />
{/* ❌ Label y checkbox no están asociados */}
```

**Soluciones**:

```tsx
// FIX 1: Selects con aria-label
<select
  value={item.product_id}
  onChange={handleProductChange}
  aria-label="Seleccionar producto"
  className="..."
>
  <option value="">Seleccionar producto</option>
  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
</select>

// FIX 2: Buttons con aria-label
<button
  onClick={() => navigate(`/events/${id}/edit`)}
  aria-label="Editar evento"
  className="..."
>
  <Pencil className="h-4 w-4" />
</button>

// FIX 3: Checkboxes con htmlFor
<div className="flex items-center gap-3">
  <input
    id="requires-invoice"
    type="checkbox"
    {...register('requires_invoice')}
    className="..."
  />
  <label htmlFor="requires-invoice" className="...">
    Requiere factura
  </label>
</div>

// FIX 4: Focus trap en ConfirmDialog
import { useEffect, useRef } from 'react';

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Guardar elemento con focus actual
      previousFocusRef.current = document.activeElement as HTMLElement;

      // Mover focus al diálogo
      dialogRef.current?.focus();

      // Trap focus dentro del diálogo
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();

        if (e.key === 'Tab') {
          const focusableElements = dialogRef.current?.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );

          if (!focusableElements || focusableElements.length === 0) return;

          const firstElement = focusableElements[0] as HTMLElement;
          const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

          if (e.shiftKey && document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        // Restaurar focus al elemento anterior
        previousFocusRef.current?.focus();
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      ref={dialogRef}
      tabIndex={-1}
      className="..."
    >
      <h2 id="dialog-title">{title}</h2>
      <p>{message}</p>
      <button onClick={onConfirm}>Confirmar</button>
      <button onClick={onClose}>Cancelar</button>
    </div>
  );
}
```

**Checklist de Archivos a Revisar**:
- [x] `web/src/pages/Events/components/EventProducts.tsx` (selects)
- [x] `web/src/pages/Events/components/EventExtras.tsx` (inputs)
- [x] `web/src/pages/Events/components/EventFinancials.tsx` (checkboxes)
- [x] `web/src/pages/Events/EventSummary.tsx` (buttons)
- [x] `web/src/components/ConfirmDialog.tsx` (focus trap)
- [ ] `web/src/pages/Clients/ClientForm.tsx`
- [ ] `web/src/pages/Products/ProductForm.tsx`
- [ ] `web/src/pages/Inventory/InventoryForm.tsx`

---

## 🟡 MEDIO (Mejora UX)

### 7. BÚSQUEDA: Client-Side (Lenta con >1000 registros)

**Severidad**: MEDIA | **Esfuerzo**: 1 día | **Prioridad**: P2

**Problema Actual**:
```typescript
// searchService.ts - Fetch TODOS los datos cada búsqueda
const [clients, products, inventory, events] = await Promise.all([
  clientService.getAll(), // Sin filtro ❌
  productService.getAll(), // Sin filtro ❌
  inventoryService.getAll(), // Sin filtro ❌
  eventService.getAll(), // Sin filtro ❌
]);

// Filtrar en memoria
results.clients = clients.filter(c =>
  c.name.toLowerCase().includes(query.toLowerCase())
);
```

**Problemas**:
- Uso de ancho de banda innecesario
- Lento con >1000 registros
- No escala

**Solución - Backend**:

```go
// backend/internal/handlers/search_handler.go (NUEVO)
package handlers

type SearchHandler struct {
    clientRepo    repository.ClientRepository
    productRepo   repository.ProductRepository
    inventoryRepo repository.InventoryRepository
    eventRepo     repository.EventRepository
}

func (h *SearchHandler) SearchAll(w http.ResponseWriter, r *http.Request) {
    userID := middleware.GetUserID(r.Context())
    query := r.URL.Query().Get("q")

    if query == "" {
        writeError(w, http.StatusBadRequest, "Query parameter 'q' is required")
        return
    }

    // Búsqueda en paralelo
    var wg sync.WaitGroup
    var clients []models.Client
    var products []models.Product
    var inventory []models.InventoryItem
    var events []models.Event

    wg.Add(4)

    go func() {
        defer wg.Done()
        clients, _ = h.clientRepo.Search(r.Context(), userID, query)
    }()

    go func() {
        defer wg.Done()
        products, _ = h.productRepo.Search(r.Context(), userID, query)
    }()

    go func() {
        defer wg.Done()
        inventory, _ = h.inventoryRepo.Search(r.Context(), userID, query)
    }()

    go func() {
        defer wg.Done()
        events, _ = h.eventRepo.Search(r.Context(), userID, query)
    }()

    wg.Wait()

    writeJSON(w, http.StatusOK, map[string]interface{}{
        "clients":   clients[:min(len(clients), 6)],
        "products":  products[:min(len(products), 6)],
        "inventory": inventory[:min(len(inventory), 6)],
        "events":    events[:min(len(events), 6)],
    })
}
```

```go
// backend/internal/repository/client_repo.go - Agregar método Search
func (r *ClientRepository) Search(ctx context.Context, userID uuid.UUID, query string) ([]models.Client, error) {
    rows, err := r.db.Query(ctx, `
        SELECT id, user_id, name, phone, email, address, city, notes,
               total_events, total_spent, created_at, updated_at
        FROM clients
        WHERE user_id = $1
          AND (
            name ILIKE $2 OR
            email ILIKE $2 OR
            phone ILIKE $2 OR
            city ILIKE $2
          )
        ORDER BY created_at DESC
        LIMIT 10
    `, userID, "%"+query+"%")

    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var clients []models.Client
    for rows.Next() {
        var c models.Client
        if err := rows.Scan(&c.ID, &c.UserID, &c.Name, ...); err != nil {
            return nil, err
        }
        clients = append(clients, c)
    }

    return clients, nil
}
```

**Frontend - Actualizar searchService**:

```typescript
// web/src/services/searchService.ts
export const searchService = {
  async searchAll(query: string): Promise<SearchResults> {
    // Ahora llama a endpoint backend
    const results = await api.get<SearchResults>(`/search?q=${encodeURIComponent(query)}`);
    return results;
  },
};
```

**Archivos Afectados**:
- `backend/internal/handlers/search_handler.go` (NUEVO)
- `backend/internal/repository/client_repo.go` (agregar Search)
- `backend/internal/repository/product_repo.go` (agregar Search)
- `backend/internal/repository/inventory_repo.go` (agregar Search)
- `backend/internal/repository/event_repo.go` (agregar Search)
- `backend/internal/router/router.go` (agregar ruta)
- `web/src/services/searchService.ts` (modificar)

---

### 8. PAGOS: Solo Manuales (Sin Checkout Automático)

**Severidad**: MEDIA | **Esfuerzo**: 2 días | **Prioridad**: P2

**Estado Actual**:
- Stripe solo para **suscripciones** (plan upgrade)
- Pagos de eventos son **manuales** (admin registra post-facto)

**Flujo Actual**:
```
Evento Creado → Total Calculado → Cliente paga fuera de app → Admin registra pago manualmente
```

**Flujo Deseado**:
```
Evento Creado → Generar Link de Pago → Cliente Paga → Webhook → Auto-confirmar Evento
```

**Solución** (no implementar ahora, documentado para Sprint 3):

```go
// backend/internal/handlers/payment_handler.go (NUEVO)
func (h *PaymentHandler) CreateCheckoutSession(w http.ResponseWriter, r *http.Request) {
    var req struct {
        EventID string `json:"event_id"`
    }
    decodeJSON(r, &req)

    // Obtener evento
    event, _ := h.eventRepo.GetByID(r.Context(), uuid.MustParse(req.EventID))

    // Crear Stripe checkout session para pago de evento
    params := &stripe.CheckoutSessionParams{
        PaymentMethodTypes: stripe.StringSlice([]string{"card"}),
        LineItems: []*stripe.CheckoutSessionLineItemParams{
            {
                PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
                    Currency: stripe.String("mxn"),
                    ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
                        Name: stripe.String(fmt.Sprintf("Evento: %s", event.ServiceType)),
                    },
                    UnitAmount: stripe.Int64(int64(event.TotalAmount * 100)),
                },
                Quantity: stripe.Int64(1),
            },
        },
        Mode: stripe.String(string(stripe.CheckoutSessionModePayment)),
        SuccessURL: stripe.String(h.cfg.FrontendURL + "/events/" + req.EventID + "/payment-success"),
        CancelURL: stripe.String(h.cfg.FrontendURL + "/events/" + req.EventID),
        Metadata: map[string]string{
            "event_id": req.EventID,
            "user_id":  event.UserID.String(),
        },
    }

    session, _ := session.New(params)

    writeJSON(w, http.StatusOK, map[string]string{"url": session.URL})
}
```

**Nota**: Esta feature está planeada para Sprint 3, documentar para referencia futura.

---

## ✅ BIEN IMPLEMENTADO

Las siguientes áreas del proyecto están correctamente implementadas y no requieren cambios:

### Arquitectura y Estructura
- ✅ **Multi-tenant Isolation**: Todos los queries filtran por `user_id`
- ✅ **Separación Frontend/Backend**: Arquitectura limpia con React SPA + Go API
- ✅ **Path Aliases**: `@/*` para imports organizados
- ✅ **Migrations**: 14 migraciones SQL secuenciales bien documentadas

### Autenticación (con excepción de storage)
- ✅ **JWT Generation**: Correctamente firmado con HMAC
- ✅ **Password Hashing**: bcrypt con salt automático
- ✅ **Refresh Tokens**: Implementados (solo falta migrar a cookies)

### Business Logic
- ✅ **Plan Limits**: Basic plan limitado (3 eventos, 50 clientes, 20 items)
- ✅ **Financial Calculations**: Tests exhaustivos en `finance.test.ts`
- ✅ **PDF Generation**: Cotizaciones, contratos, listas de compras funcionan
- ✅ **Event Status Workflow**: quoted → confirmed → completed → cancelled

### UI/UX
- ✅ **Dark Mode**: Soporte completo con Tailwind `dark:` classes
- ✅ **Responsive Design**: Mobile-first approach consistente
- ✅ **Icons**: Lucide React usado consistentemente
- ✅ **Toast Notifications**: Zustand store bien implementado
- ✅ **Loading States**: Spinners en todas las operaciones async

### Error Handling
- ✅ **Centralized Error Handler**: `logError()` con Sentry integration
- ✅ **HTTP Status Codes**: Correctamente mapeados (401, 403, 404, 500)
- ✅ **Form Validation**: React Hook Form + Zod en todos los formularios
- ✅ **API Error Propagation**: Errores se propagan de services a componentes

### Testing (con gaps en áreas críticas)
- ✅ **Component Tests**: 70% cobertura con Testing Library
- ✅ **Backend Integration Tests**: Repository tests con DB real
- ✅ **MSW Setup**: Mock Service Worker bien configurado
- ✅ **Financial Logic Tests**: Edge cases cubiertos

### DevOps
- ✅ **Docker Compose**: Full-stack deployment configurado
- ✅ **CI Pipeline**: Type-check, lint, tests en GitHub Actions
- ✅ **Environment Variables**: Configuración por ambiente
- ✅ **CORS**: Configurado correctamente por ambiente

---

## 📋 MATRIZ DE PRIORIDADES

| # | Issue | Severidad | Esfuerzo | Prioridad | Sprint | Status |
|---|-------|-----------|----------|-----------|--------|--------|
| 1 | Token en localStorage → httpOnly cookies | CRÍTICA | 1-2 días | P0 | Sprint 1 | 🔴 Pendiente |
| 2 | Email de reset de contraseña | CRÍTICA | 1 día | P0 | Sprint 1 | 🔴 Pendiente |
| 3 | Tests de suscripciones/pagos | CRÍTICA | 4 horas | P0 | Sprint 1 | 🔴 Pendiente |
| 4 | Headers de seguridad HTTP | ALTA | 1 hora | P1 | Sprint 1 | 🔴 Pendiente |
| 5 | Validación de reglas de negocio | ALTA | 3 horas | P1 | Sprint 1 | 🔴 Pendiente |
| 6 | ARIA labels + accesibilidad | ALTA | 1 día | P1 | Sprint 2 | 🔴 Pendiente |
| 7 | Búsqueda server-side | MEDIA | 1 día | P2 | Sprint 2 | 🔴 Pendiente |
| 8 | Pagos automáticos Stripe | MEDIA | 2 días | P2 | Sprint 3 | ⚪ Planificado |
| 9 | E2E tests críticos | MEDIA | 1 día | P2 | Sprint 2 | 🔴 Pendiente |
| 10 | Contraste dark mode | MEDIA | 2 horas | P2 | Sprint 2 | 🔴 Pendiente |

---

## 🚀 PLAN DE ACCIÓN RECOMENDADO

### **SPRINT 1 (Semana 1-2)** - Crítico para Producción
**Objetivo**: Resolver blockers de seguridad y funcionalidad

#### Día 1-2: Migrar Autenticación a httpOnly Cookies
- [ ] Modificar `auth_handler.go` para enviar Set-Cookie
- [ ] Actualizar `middleware/auth.go` para leer cookies
- [ ] Eliminar localStorage de `api.ts` y `AuthContext.tsx`
- [ ] Tests de integración del flujo completo
- [ ] Documentar migración en CHANGELOG

#### Día 3: Implementar Email de Reset
- [ ] Crear `services/email_service.go`
- [ ] Configurar SMTP (SendGrid)
- [ ] Agregar `GenerateResetToken()` a `auth_service.go`
- [ ] Crear endpoint `/api/auth/reset-password`
- [ ] Frontend: página `/reset-password`
- [ ] Tests unitarios de email service

#### Día 4: Headers de Seguridad + Validaciones
- [ ] Crear `middleware/security.go`
- [ ] Agregar a router
- [ ] Crear `handlers/validation.go`
- [ ] Aplicar validaciones a CreateEvent, UpdateEvent, CreatePayment
- [ ] Tests de validación

#### Día 5: Tests de Suscripciones
- [ ] `subscriptionService.test.ts` (frontend)
- [ ] `subscription_handler_test.go` (backend)
- [ ] Verificar cobertura >80%

#### Día 6-7: Code Review + QA
- [ ] Pull request con todos los cambios
- [ ] Code review por par
- [ ] QA manual en staging
- [ ] Merge a main

**Entregables Sprint 1**:
- ✅ Solennix con seguridad hardened
- ✅ Funcionalidad de reset de contraseña
- ✅ Validaciones de negocio en backend
- ✅ Tests de pagos/suscripciones

---

### **SPRINT 2 (Semana 3-4)** - Pulir UX
**Objetivo**: Mejorar accesibilidad y testing

#### Día 8-9: Accesibilidad (ARIA)
- [ ] Audit con axe DevTools
- [ ] Agregar aria-labels a todos los inputs
- [ ] Conectar labels con htmlFor
- [ ] Implementar focus trap en modals
- [ ] Tests de accesibilidad con jest-axe

#### Día 10: Búsqueda Server-Side
- [ ] Crear `search_handler.go`
- [ ] Agregar método `Search()` a repositories
- [ ] Actualizar `searchService.ts` frontend
- [ ] Tests de búsqueda

#### Día 11: E2E Tests Críticos
- [ ] Login completo + navigate
- [ ] Crear evento + productos
- [ ] Agregar pago + verificar saldo
- [ ] Descargar PDF
- [ ] Upgrade a Pro

#### Día 12: Fixes de UI
- [ ] Corregir contrast ratios dark mode
- [ ] Standardizar loading spinners
- [ ] Empty states consistentes

#### Día 13: Custom Hooks Tests
- [ ] `usePlanLimits.test.ts`
- [ ] `usePagination.test.ts`
- [ ] `useToast.test.ts`

#### Día 14: QA + Regression Testing
- [ ] Manual testing de todos los flujos
- [ ] Performance testing (Lighthouse)
- [ ] Cross-browser testing

**Entregables Sprint 2**:
- ✅ Solennix accesible (WCAG AA)
- ✅ Búsqueda server-side rápida
- ✅ E2E tests covering flujos críticos
- ✅ Cobertura de tests >85%

---

### **SPRINT 3 (Semana 5-6)** - Mejoras Avanzadas
**Objetivo**: Features avanzadas y optimización

#### Features Planificadas:
- [ ] Pagos automáticos vía Stripe (eventos)
- [ ] Email notifications (confirmación, reminders)
- [ ] Dashboard analytics mejorado
- [ ] Performance optimization (lazy loading)
- [ ] Retry logic en fetch con exponential backoff
- [ ] Offline detection

**Entregables Sprint 3**:
- ✅ Solennix production-ready completa

---

## 📊 SCORECARD FINAL

| Categoría | Calificación | Notas |
|-----------|--------------|-------|
| **Arquitectura** | A | Excelente separación frontend/backend, patterns consistentes |
| **Seguridad** | C | ⚠️ Token storage crítico, headers faltantes |
| **Funcionalidad** | A- | 92% completo, falta email reset |
| **Integración API** | A | Solo 4 gaps menores, camelCase ↔ snake_case bien mapeado |
| **UI/UX** | B+ | Bonita y responsive, falta accesibilidad |
| **Testing** | C+ | 65% coverage, gaps en pagos y E2E |
| **Error Handling** | B+ | Bueno pero falta validación de negocio |
| **Dark Mode** | A | Excelente implementación Tailwind |
| **Responsive** | A | Mobile-first consistente |
| **Multi-tenant** | A | user_id filtering sólido en todos los repos |
| **Documentation** | B | CLAUDE.md excelente, falta API docs |
| **DevOps** | B+ | CI bien configurado, falta backend en pipeline |

**Promedio General**: **B+ (85/100)**

---

## 📈 MÉTRICAS DE ÉXITO

### Antes de Sprint 1:
- Vulnerabilidades Críticas: **3**
- Cobertura Tests: **65%**
- Accesibilidad: **WCAG C (No cumple)**
- Performance (Lighthouse): **No medido**

### Después de Sprint 1 (Objetivo):
- Vulnerabilidades Críticas: **0**
- Cobertura Tests: **75%**
- Accesibilidad: **WCAG C (mantiene)**
- Security Headers: **A+**

### Después de Sprint 2 (Objetivo):
- Vulnerabilidades Críticas: **0**
- Cobertura Tests: **85%**
- Accesibilidad: **WCAG AA** ✓
- Performance (Lighthouse): **>90**
- E2E Coverage: **>70%**

### Después de Sprint 3 (Objetivo):
- Todas las métricas Sprint 2 +
- Automated Payments: **Implementado**
- Email Notifications: **Implementado**
- Production-Ready: **✓**

---

## 🎯 RECOMENDACIÓN FINAL

### Para Lanzamiento BETA (usuarios limitados):
**Status**: ✅ **Listo después de Sprint 1**
- Requiere: Security fixes + Email reset
- Target: <50 usuarios controlados
- Riesgo: Bajo con monitoreo

### Para Lanzamiento PÚBLICO:
**Status**: ⏳ **Requiere Sprint 1 + Sprint 2**
- Requiere: Todo P0/P1 + Accesibilidad
- Target: >100 usuarios
- Riesgo: Medio → Bajo

### Para Escala (1000+ usuarios):
**Status**: ⏳ **Requiere Sprint 1 + 2 + 3**
- Requiere: Todo + Performance + Monitoring
- Target: Producción completa
- Riesgo: Controlado

---

## 📝 PRÓXIMOS PASOS INMEDIATOS

1. ✅ **Crear Issues en GitHub** para cada item P0/P1
2. ✅ **Asignar Sprint 1** a desarrollador full-time (2 semanas)
3. ✅ **Configurar Staging Environment** para testing
4. ✅ **Preparar Plan de Rollback** por si falla migración cookies
5. ✅ **Setup Monitoring** (Sentry, LogRocket)
6. ✅ **Documentar Runbook** para deployment

---

## 📚 AUDITORÍAS DETALLADAS POR ÁREA

### 1. Seguridad (11 vulnerabilidades encontradas)
Ver documento completo en: [docs/security-audit-feb-2026.md](./security-audit-feb-2026.md)

### 2. Integración API (4 gaps menores)
Ver documento completo en: [docs/api-integration-audit-feb-2026.md](./api-integration-audit-feb-2026.md)

### 3. Completitud de Features (92% completo)
Ver documento completo en: [docs/feature-completeness-feb-2026.md](./feature-completeness-feb-2026.md)

### 4. UI/UX (20 problemas de accesibilidad)
Ver documento completo en: [docs/ui-ux-audit-feb-2026.md](./ui-ux-audit-feb-2026.md)

### 5. Error Handling (Validación de negocio faltante)
Ver documento completo en: [docs/error-handling-audit-feb-2026.md](./error-handling-audit-feb-2026.md)

### 6. Testing (65% cobertura)
Ver documento completo en: [docs/testing-audit-feb-2026.md](./testing-audit-feb-2026.md)

---

## 🔗 REFERENCIAS

- [OWASP Top 10 2021](https://owasp.org/www-project-top-ten/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Stripe Security Best Practices](https://stripe.com/docs/security/best-practices)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles)

---

**Fin del Documento** | Última actualización: 25 de febrero de 2026
