---
tags:
  - prd
  - arquitectura
  - pdf
  - backend
  - contrato
  - paridad
aliases:
  - PDF Server-Side
  - Generación PDF Backend
  - Contract Template Parity
date: 2026-04-26
status: proposed
priority: high
---

# Server-Side PDF Generation + Contract Template Parity

**Propuesta**: Mover TODA la generación de PDFs al backend (Go) y unificar la edición de plantillas de contrato en las 3 plataformas.

**Motivación**: 5800 líneas duplicadas, paridad rota, logo solo en Web, `show_business_name_in_pdf` ignorado en móviles, contrato con bugs de tokens por platform drift.

---

## 1. Estado Actual — El Problema

### 1.1 PDFs Duplicados × 3

| PDF | Web (jsPDF) | iOS (PDFRenderer) | Android (Canvas) | Paridad |
|-----|-------------|-------------------|------------------|---------|
| Presupuesto | `generateBudgetPDF` | `BudgetPDFGenerator` | `BudgetPdfGenerator` | ⚠️ Parcial |
| Contrato | `generateContractPDF` | `ContractPDFGenerator` | `ContractPdfGenerator` | ⚠️ Tokens distintos |
| Lista de Insumos | `generateShoppingListPDF` | `ShoppingListPDFGenerator` | `ShoppingListPdfGenerator` | ⚠️ Datos distintos |
| Reporte de Pagos | `generatePaymentReportPDF` | `PaymentReportPDFGenerator` | `PaymentReportPdfGenerator` | ⚠️ Parcial |
| Factura | `generateInvoicePDF` | `InvoicePDFGenerator` | `InvoicePdfGenerator` | ⚠️ Android tiene payment history |
| Checklist | `generateChecklistPDF` | `ChecklistPDFGenerator` | `ChecklistPdfGenerator` | ⚠️ Android usa InventoryItem[] |
| Lista de Equipo | **NO EXISTE** | `EquipmentListPDFGenerator` | `EquipmentListPdfGenerator` | ❌ Falta en Web |

**Total**: ~5800 líneas duplicadas con bugs distintos por plataforma.

### 1.2 Brechas Críticas

| Problema | Detalle |
|----------|---------|
| Logo en PDF | Solo Web renderiza `logo_url`. iOS y Android solo muestran texto |
| `show_business_name_in_pdf` | Solo Web lo respeta. iOS/Android siempre muestran el nombre |
| `brand_color` | Web lo usa. iOS usa hardcoded `#C4A265`. Android también |
| Token drift | Los 3 frontends tienen maps de tokens distintos → contratos con literales |
| Equipment List | No existe en Web |
| Legacy code | Android tiene `PdfGenerator.kt` obsoleto |
| Datos inyectados | Android Checklist usa `InventoryItem[]` vs iOS `EventEquipment[]` + `Ingredient[]` |

### 1.3 Contract Template Editor — Brechas

| Feature | Web | iOS | Android |
|---------|-----|-----|---------|
| Editor rich text con chips | ✅ contentEditable + chip spans | ⚠️ UITextView nativo (texto plano) | ❌ OutlinedTextField básico |
| Chips inline no-editables | ✅ `<span data-variable>` | ❌ Solo texto `[Nombre del...]` | ❌ Solo texto `[Nombre del...]` |
| Inserción por cursor position | ✅ Selection API + restore | ⚠️ Coordinator pattern | ⚠️ TextFieldValue.selection |
| Bold / Italic / Underline | ✅ `**` `*` `__` markdown | ❌ No soporta | ❌ No soporta |
| Vista previa renderizada | ✅ Edit/Preview toggle con mock data | ⚠️ Preview de términos (no template) | ⚠️ Dialog con texto plano |
| Categorías de variables | ❌ Panel flat | ✅ Sheet agrupado (5 categorías) | ❌ Horizontal scroll chips |
| Restablecer default | ✅ | ❌ | ✅ |
| Plan gating (Basic → lock) | ✅ `isBasicPlan` | ❌ | ❌ |
| Validación de tokens | ✅ `validateContractTemplate` | ❌ | ❌ |
| 24 tokens soportados | ✅ 24/24 | ✅ 24/24 | ✅ 24/24 |

---

## 2. Solución: Server-Side PDF Generation

### 2.1 Arquitectura

```
┌───────────┐   GET /api/events/:id/pdf/:type   ┌──────────────────┐
│  Frontend  │ ────────────────────────────────► │    Backend Go    │
│ (cualq.)   │ ◄─── application/pdf binary ───── │                  │
└───────────┘                                    │ 1. Auth JWT      │
                                                 │ 2. Load data     │
                                                 │ 3. Fetch logo S3 │
                                                 │ 4. Resolve tokens│
                                                 │ 5. Generate PDF  │
                                                 │ 6. Stream binary │
                                                 └──────────────────┘
```

### 2.2 Estructura de Archivos

```
backend/internal/
├── pdf/
│   ├── builder.go              # Header/footer/logo compartidos
│   ├── fonts.go                # TTF font loading + Unicode
│   ├── budget.go               # Presupuesto
│   ├── contract.go             # Contrato (template tokens)
│   ├── shopping_list.go        # Lista de Insumos
│   ├── payment_report.go       # Reporte de Pagos
│   ├── invoice.go              # Factura
│   ├── checklist.go            # Checklist de Carga
│   ├── equipment_list.go       # Lista de Equipo (NUEVO)
│   └── template_tokens.go      # Token resolution (24 tokens)
├── service/
│   └── pdf_service.go          # Orquesta: datos + logo + generación
├── handler/
│   └── pdf_handler.go          # HTTP handlers
└── router/
    └── router.go               # Nuevas rutas
```

### 2.3 Endpoints

```
GET /api/events/:id/pdf/budget          → Presupuesto
GET /api/events/:id/pdf/contract        → Contrato
GET /api/events/:id/pdf/shopping-list   → Lista de Insumos
GET /api/events/:id/pdf/payment-report  → Reporte de Pagos
GET /api/events/:id/pdf/invoice         → Factura
GET /api/events/:id/pdf/checklist       → Checklist de Carga
GET /api/events/:id/pdf/equipment-list  → Lista de Equipo
```

**Response**: `Content-Type: application/pdf`
**Header**: `Content-Disposition: inline; filename="Presupuesto_María_García.pdf"`
**Auth**: JWT Bearer (user_id del token → multi-tenant filter en todas las queries)

### 2.4 Librería Go

**Elección**: `github.com/go-pdf/fpdf` (fork activo de `gofpdf`)

| Criterio | gofpdf | chromedp | wkhtmltopdf |
|----------|--------|----------|-------------|
| Sin CGo | ✅ | ❌ | ❌ |
| Sin dependencia externa | ✅ | ❌ (Chrome) | ❌ (binario) |
| Imágenes + logo | ✅ | ✅ | ✅ |
| Tablas | ✅ | ✅ (HTML) | ✅ (HTML) |
| Unicode/acentos | ✅ (TTF embebido) | ✅ | ✅ |
| Performance | <500ms | 2-5s | 1-3s |
| Tamaño binario | +300KB (fuentes) | +200MB (Chrome) | +50MB |

### 2.5 Header Compartido (UNIFICA TODO)

El header se dibuja igual en TODOS los PDFs:

```
┌──────────────────────────────────────────────────┐
│ [LOGO]    Nombre del Negocio          TÍTULO     │
│           (si show_business_name=true)            │
│────────────── brand_color separator ─────────────│
```

**Reglas del header**:

| `logo_url` | `show_business_name_in_pdf` | Resultado |
|-------------|----------------------------|-----------|
| ✅ existe | `true` | Logo + Nombre + Título |
| ✅ existe | `false` | Solo Logo + Título (logo ya incluye nombre) |
| ❌ null | `true` | Solo Nombre + Título |
| ❌ null | `false` | Solo Título centrado |

### 2.6 Token Resolution (Contrato)

El backend TOMA el `contract_template` del usuario y resuelve los 24 tokens:

```go
// template_tokens.go
var SupportedTokens = map[string]TokenResolver{
    "provider_name":             resolveProviderName,
    "provider_business_name":    resolveProviderBusinessName,
    "provider_email":            resolveProviderEmail,
    "current_date":              resolveCurrentDate,
    "event_date":                resolveEventDate,
    "event_start_time":          resolveEventStartTime,
    "event_end_time":            resolveEventEndTime,
    "event_time_range":          resolveEventTimeRange,
    "event_service_type":        resolveEventServiceType,
    "event_num_people":          resolveEventNumPeople,
    "event_location":            resolveEventLocation,
    "event_city":                resolveEventCity,
    "event_total_amount":        resolveEventTotalAmount,
    "event_deposit_percent":     resolveEventDepositPercent,
    "event_refund_percent":      resolveEventRefundPercent,
    "event_cancellation_days":   resolveEventCancellationDays,
    "client_name":               resolveClientName,
    "client_phone":              resolveClientPhone,
    "client_email":              resolveClientEmail,
    "client_address":            resolveClientAddress,
    "client_city":               resolveClientCity,
    "contract_city":             resolveContractCity,
    "event_services_list":       resolveEventServicesList,
    "event_paid_amount":         resolveEventPaidAmount,
}
```

**Token matching**: Normaliza con NFD (sin acentos) + lowercase + underscores→spaces, igual que `contractTemplate.ts` en Web. Acepta tanto `[Nombre del cliente]` como `[client_name]`.

**Post-processing**: `%%` → `%` (normalización del `%` residual tras tokens de porcentaje).

**Fallback**: Si un token no tiene dato → deja `[Token original]` literal (non-strict mode).

### 2.7 Formato de Moneda

```go
func formatCurrency(amount float64) string {
    return fmt.Sprintf("$%s", number.FormatFloat(amount, 'f', 2, 64))
    // TODO: usar message.NewPrinter(language.MustParse("es-MX"))
    // para formato "25,000.00" consistente con frontends
}
```

### 2.8 Formato de Fecha

```go
func formatDate(dateStr string) string {
    // Parse "2006-01-02" → "15 de junio de 2026"
    t, _ := time.Parse("2006-01-02", dateStr)
    // Usar formato es-MX
    months := []string{"enero", "febrero", "marzo", ...}
    return fmt.Sprintf("%d de %s de %d", t.Day(), months[t.Month()-1], t.Year())
}
```

---

## 3. Flujo del Handler

```go
// pdf_handler.go
func (h *PDFHandler) GetEventPDF(w http.ResponseWriter, r *http.Request) {
    // 1. Extraer user_id del JWT (Auth middleware ya validó)
    userID := auth.UserIDFromContext(r.Context())

    // 2. Parsear params
    eventID := chi.URLParam(r, "eventID")
    pdfType := chi.URLParam(r, "type") // budget, contract, etc.

    // 3. Cargar datos (multi-tenant: SIEMPRE filtra por user_id)
    event, client, err := h.service.GetEventWithClient(r.Context(), userID, eventID)
    profile, _ := h.service.GetUserProfile(r.Context(), userID)
    products, _ := h.service.GetEventProducts(r.Context(), userID, eventID)
    extras, _ := h.service.GetEventExtras(r.Context(), userID, eventID)
    payments, _ := h.service.GetEventPayments(r.Context(), userID, eventID)

    // 4. Fetch logo desde S3 (si existe)
    var logoBytes []byte
    if profile.LogoURL != nil {
        logoBytes, _ = h.s3Client.Download(r.Context(), *profile.LogoURL)
    }

    // 5. Generar PDF según tipo
    pdfData, filename, err := h.pdfService.Generate(pdfType, PDFData{
        Event:     event,
        Client:    client,
        Profile:   profile,
        Products:  products,
        Extras:    extras,
        Payments:  payments,
        LogoBytes: logoBytes,
    })

    // 6. Response
    w.Header().Set("Content-Type", "application/pdf")
    w.Header().Set("Content-Disposition",
        fmt.Sprintf("inline; filename=\"%s\"", filename))
    w.Write(pdfData)
}
```

---

## 4. Frontend Contract Template Editor — Paridad Completa

### 4.1 Plataforma Base: Web

Web (`ContractTemplateEditor.tsx`) es la implementación más completa. Las otras dos plataformas deben alcanzar este nivel, adaptando UI/UX a su lenguaje nativo.

### 4.2 Funcionalidades Obligatorias (TODAS las plataformas)

| # | Feature | Especificación |
|---|---------|----------------|
| 1 | **Editor rich text con chips** | Variables como elementos inline no-editables, visualmente diferenciados (colored chip/badge) |
| 2 | **Inserción en cursor position** | Al tocar un chip → insertar `[Nombre del cliente]` en la posición actual del cursor |
| 3 | **Panel de variables agrupado** | Variables organizadas por categoría (Proveedor, Evento, Condiciones, Cliente, Contrato) |
| 4 | **Vista previa renderizada** | Toggle Edit/Preview. Preview reemplaza tokens con mock data para ver cómo queda |
| 5 | **Formato: Negrita/Cursiva/Subrayado** | Botones B/I/U que envuelven selección con `**` `*` `__` (markdown-like) |
| 6 | **Restablecer default** | Botón que restaura `DEFAULT_CONTRACT_TEMPLATE` |
| 7 | **Plan gating** | Si `user.plan == "free"` → bloquear edición, mostrar upgrade prompt |
| 8 | **Validación de tokens** | Al guardar: verificar que no haya `[tokens no soportados]` |
| 9 | **24 tokens completos** | Todos los tokens de `CONTRACT_TEMPLATE_PLACEHOLDERS` disponibles |
| 10 | **Guardar en profile** | PUT `/api/users/profile` con `contract_template` actualizado |

### 4.3 iOS — Adaptación Nativa

**Patrón Apple**: Mirar cómo Apple Mail edita texto, cómo Pages maneja variables de mail merge, cómo Shortcuts muestra categorías de acciones.

```
┌─────────────────────────────┐
│  < Valores del Contrato  [Guardar] │
├─────────────────────────────┤
│                              │
│  Anticipo ────────────── 50%│
│  ═══════════════════════════ │
│  Cancelación ────────── 15 días│
│  ═══════════════════════════ │
│  Reembolso ───────────── 80%│
│  ═══════════════════════════ │
│                              │
│  Plantilla del Contrato      │
│  ┌─────────────────────────┐ │
│  │ [+ Insertar Variable]   │ │
│  │                          │ │
│  │ 1. El Proveedor es...    │ │
│  │ dedicada a [Tipo de     │ │ ← chips como UILabel dentro de UITextView
│  │ servicio], [Nombre      │ │    con .isEditable = false en el range
│  │ comercial del...],       │ │    (usar NSTextAttachment o attributed string)
│  │                          │ │
│  │ 2. El Cliente:          │ │
│  │ [Nombre del cliente]    │ │
│  │ desea contratar...      │ │
│  └─────────────────────────┘ │
│                              │
│  [B] [I] [U]   [Restablecer]│
│                              │
│  ─── Vista Previa ─────────  │
│  Anticipo: 50% del total    │
│  Cancelación: 15 días       │
│  Reembolso: 80% del anticipo│
│                              │
└─────────────────────────────┘
```

**Implementación iOS**:

| Elemento | Componente Nativo | Referencia Apple |
|----------|-------------------|------------------|
| Editor de texto | `UITextView` con `NSTextStorage` personalizado | Mail compose body |
| Chips inline | `NSTextAttachment` con custom view | Pages mail merge tokens |
| Panel de variables | `UISheetPresentationController` con secciones | Shortcuts action picker |
| Toolbar B/I/U | `UIToolbar` con `UIBarButtonItem` toggle | Notes app formatting bar |
| Preview toggle | Segment control en navigation bar | Safari Reader mode toggle |
| Plan gating | `UIImpactFeedbackGenerator` + overlay | App Store subscription prompts |

**Detalles clave**:
- `ContractTemplateTextView` (UIViewRepresentable) ya existe. Mejorar con:
  - `NSTextAttachment` para chips visuales (no texto plano `[...]`)
  - Toolbar de formato (B/I/U) sobre el keyboard o inline
  - Preview mode con segment control
  - Plan gating con `PlanLimitsManager` (ya existe en el proyecto)

### 4.4 Android — Adaptación Nativa

**Patrón Google**: Mirar cómo Google Docs edita en móvil, cómo Gmail compose funciona, cómo Keep usa chips de labels.

```
┌─────────────────────────────────┐
│  ← Valores del Contrato    [💾] │
├─────────────────────────────────┤
│                                  │
│  Anticipo                        │
│  ┌──────────────────────────────┐│
│  │ Porcentaje       ────── 50%  ││
│  │ ═════════════════════════════ ││
│  └──────────────────────────────┘│
│  % del total como anticipo       │
│                                  │
│  Plantilla del Contrato          │
│  ┌──────────────────────────────┐│
│  │ [+ Insertar Variable]        ││
│  │                               ││
│  │ 1. El Proveedor es...         ││
│  │ dedicada a [Tipo de          ││ ← chips como AnnotatedString
│  │ servicio]↑, [Nombre          ││    con SpanStyle + Clickable
│  │ comercial]↑,                 ││
│  │                               ││
│  └──────────────────────────────┘│
│                                  │
│  [**B**] [*I*] [̲U̲]  [Restablecer] │
│                                  │
│  [👁 Vista Previa]               │
│                                  │
└─────────────────────────────────┘
```

**Implementación Android**:

| Elemento | Componente Compose | Referencia Google |
|----------|-------------------|-------------------|
| Editor de texto | `BasicTextField` con `TextFieldValue` + `AnnotatedString` | Google Docs mobile |
| Chips inline | `SpanStyle` con background + border + click handler | Gmail recipient chips |
| Panel de variables | `ModalBottomSheet` con `FlowRow` agrupado | Material 3 filter chips |
| Toolbar B/I/U | `Row` de `IconButton` con toggle state | Google Keep formatting |
| Preview toggle | `SegmentedButton` (Material 3) | Google Maps transport toggle |
| Plan gating | `UpgradePlanDialog` (YA EXISTE) | Play Store subscription prompts |

**Detalles clave**:
- Reemplazar `OutlinedTextField` plano por `BasicTextField` + `VisualTransformation` que convierta `[Nombre del cliente]` → chip visual
- `AnnotatedString` con `buildAnnotatedString` para detectar `[...]` patterns y renderizar como chips
- Categorías en `ModalBottomSheet` con `LazyColumn` sections (como iOS)
- Preview mode reutilizando `ContractTemplatePreviewDialog` pero con renderización inline (no dialog)

### 4.5 Los 24 Tokens (fuente única de verdad)

Estos son los tokens que el backend resuelve Y que todas las apps muestran:

| Token | Label (UI) | Categoría | Fuente de Dato |
|-------|-----------|-----------|----------------|
| `provider_name` | Nombre del proveedor | Proveedor | `user.name` |
| `provider_business_name` | Nombre comercial del proveedor | Proveedor | `user.business_name` |
| `provider_email` | Email del proveedor | Proveedor | `user.email` |
| `current_date` | Fecha actual | Evento | `time.Now()` formateado |
| `event_date` | Fecha del evento | Evento | `event.event_date` |
| `event_start_time` | Hora de inicio | Evento | `event.start_time` |
| `event_end_time` | Hora de fin | Evento | `event.end_time` |
| `event_time_range` | Horario del evento | Evento | `start - end` combinado |
| `event_service_type` | Tipo de servicio | Evento | `event.service_type` |
| `event_num_people` | Número de personas | Evento | `event.num_people` |
| `event_location` | Lugar del evento | Evento | `event.location` |
| `event_city` | Ciudad del evento | Evento | `event.city` |
| `event_total_amount` | Monto total del evento | Evento | `event.total_amount` (currency) |
| `event_deposit_percent` | Porcentaje de anticipo | Condiciones | `event.deposit_percent` |
| `event_refund_percent` | Porcentaje de reembolso | Condiciones | `event.refund_percent` |
| `event_cancellation_days` | Días de cancelación | Condiciones | `event.cancellation_days` |
| `client_name` | Nombre del cliente | Cliente | `client.name` |
| `client_phone` | Teléfono del cliente | Cliente | `client.phone` |
| `client_email` | Email del cliente | Cliente | `client.email` |
| `client_address` | Dirección del cliente | Cliente | `client.address` |
| `client_city` | Ciudad del cliente | Cliente | `client.city` |
| `contract_city` | Ciudad del contrato | Contrato | `event.city` \|\| `client.city` |
| `event_services_list` | Servicios del evento | Evento | Products list concatenada |
| `event_paid_amount` | Total pagado | Evento | Sum de payments (currency) |

---

## 5. Plan de Implementación por Fases

### Fase 1 — Backend PDF Foundation (3-4 días)

- [ ] `go get github.com/go-pdf/fpdf`
- [ ] `internal/pdf/builder.go` — header compartido con logo/nombre/brand_color
- [ ] `internal/pdf/fonts.go` — cargar DejaVuSans TTF para Unicode
- [ ] `internal/pdf/template_tokens.go` — token resolution con los 24 tokens
- [ ] Tests unitarios del builder y token resolution

### Fase 2 — Backend PDFs Financieros (4-5 días)

- [ ] `internal/pdf/budget.go` — Presupuesto
- [ ] `internal/pdf/invoice.go` — Factura
- [ ] `internal/pdf/payment_report.go` — Reporte de Pagos
- [ ] Lógica financiera: discount (percent/fixed), IVA, depósito
- [ ] Tests unitarios de cada PDF con golden files

### Fase 3 — Backend PDFs Operativos (3-4 días)

- [ ] `internal/pdf/contract.go` — Contrato con template tokens + firmas
- [ ] `internal/pdf/checklist.go` — Checklist de Carga (4 secciones)
- [ ] `internal/pdf/shopping_list.go` — Lista de Insumos
- [ ] `internal/pdf/equipment_list.go` — Lista de Equipo (NUEVO)
- [ ] Tests unitarios

### Fase 4 — Backend API Layer (2 días)

- [ ] `internal/service/pdf_service.go` — orquesta datos + logo + generación
- [ ] `internal/handler/pdf_handler.go` — 7 endpoints GET
- [ ] Rate limiting por usuario (prevenir abuso)
- [ ] Test de integración (handler → PDF response)

### Fase 5 — Frontend PDF Migration (2-3 días × plataforma)

**Web**:
- [ ] Reemplazar `pdfGenerator.ts` → `fetch('/api/events/:id/pdf/:type')`
- [ ] Eliminar dependencias `jspdf`, `jspdf-autotable`
- [ ] Mantener `contractTemplate.ts` para el editor (sigue en frontend)
- [ ] Mantener `inlineFormatting.ts` para preview del editor

**iOS**:
- [ ] Reemplazar `PDFGenerators/` → `APIClient.getPDF(eventID: type:)` → Data
- [ ] Eliminar carpeta `PDFGenerators/` (8 archivos)
- [ ] Share via `UIActivityViewController` con PDF data

**Android**:
- [ ] Reemplazar `pdf/` → `ApiService.getPDF(eventID, type)` → ByteArray
- [ ] Eliminar carpeta `pdf/` (9 archivos incluido legacy)
- [ ] Share via `Intent.createChooser` con FileProvider

### Fase 6 — Contract Editor Paridad iOS (3-4 días)

- [ ] Chips visuales via `NSTextAttachment` en `ContractTemplateTextView`
- [ ] Toolbar B/I/U sobre keyboard
- [ ] Preview mode con segment control
- [ ] Plan gating con `PlanLimitsManager`
- [ ] Validación de tokens al guardar
- [ ] Categorías en picker (ya tiene)

### Fase 7 — Contract Editor Paridad Android (3-4 días)

- [ ] `BasicTextField` + `VisualTransformation` para chips
- [ ] `ModalBottomSheet` con categorías para variables
- [ ] Toolbar B/I/U inline
- [ ] Preview mode inline (no dialog)
- [ ] Plan gating con `UpgradePlanDialog`
- [ ] Validación de tokens al guardar

### Fase 8 — Limpieza + PRD

- [ ] Eliminar código legacy de PDF en frontends
- [ ] Eliminar `PdfGenerator.kt` legacy en Android
- [ ] Actualizar `11_CURRENT_STATUS.md`
- [ ] Actualizar `02_FEATURES.md`
- [ ] Actualizar arquitecturas técnicas por plataforma

---

## 6. Estimación Total

| Fase | Duración | Bloqueantes |
|------|----------|-------------|
| Fase 1: Foundation | 3-4 días | Ninguno |
| Fase 2: Financieros | 4-5 días | Fase 1 |
| Fase 3: Operativos | 3-4 días | Fase 1 |
| Fase 4: API Layer | 2 días | Fase 2+3 |
| Fase 5: Migration | 6-9 días | Fase 4 |
| Fase 6: Editor iOS | 3-4 días | Ninguno (paralelo) |
| Fase 7: Editor Android | 3-4 días | Ninguno (paralelo) |
| Fase 8: Limpieza | 1-2 días | Fase 5+6+7 |
| **Total secuencial** | **~25-34 días** | |
| **Con paralelismo** | **~15-20 días** | Fases 6+7 paralelas con 2-4 |

---

## 7. Código Eliminado

| Plataforma | Archivos eliminados | Líneas aprox. |
|------------|---------------------|---------------|
| Web | `pdfGenerator.ts` (825), `pdfGenerator.test.ts` | ~900 |
| iOS | `PDFGenerators/` (8 archivos) | ~1400 |
| Android | `pdf/` (9 archivos incl. legacy) | ~1900 |
| **Total** | **~20 archivos** | **~4200 líneas** |

**Se CONSERVA en frontends**:
- `contractTemplate.ts` (Web) — para el editor
- `ContractTemplateEditor.tsx` (Web) — editor
- `inlineFormatting.ts` (Web) — preview del editor
- `ContractDefaultsView.swift` (iOS) — editor
- `ContractDefaultsScreen.kt` (Android) — editor

---

## 8. Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Fuentes Unicode (acentos, ñ) | PDFs con `?` en vez de caracteres | Embeber DejaVuSans TTF. Testear con "Niño, Rabía, Año" |
| Logo desde S3 lento | Timeout en generación | Cache en memoria con TTL de 1h. Timeout 5s para S3 |
| Rate limiting | Abuso de generación masiva | 20 PDFs/min por usuario. 429 si excede |
| Tamaño del binario Go | +300KB por fuentes TTF | Aceptable para el beneficio |
| Contrato offline | Apps necesitan red para generar | Cachear último PDF generado localmente |
| Breaking change | Apps viejas sin nuevos endpoints | Versionar: `/api/v2/events/:id/pdf/`. Mantener frontends viejos hasta migrar |
| Markdown en contrato body | `**bold**` debe renderizarse en PDF | Parser de `**` `*` `__` → styled text en gofpdf |

---

## 9. Decisiones Tomadas

| Decisión | Opción elegida | Alternativa descartada | Razón |
|----------|---------------|----------------------|-------|
| Librería PDF | `go-pdf/fpdf` | `chromedp` (HTML→PDF) | Sin CGo, sin Chrome, rápido |
| Formato fuente | TTF embebido | Core fonts (Latin-1 only) | Unicode completo (español) |
| Token resolution | Server-side | Client-side + send text | 1 sola fuente de verdad |
| API style | GET con streaming | POST con S3 upload + URL | Más simple, sin storage extra |
| Contract editor | Web como base | Android o iOS como base | Más features completas |

---

## 10. Ver también

- [[02_FEATURES|Catálogo de Features]]
- [[07_TECHNICAL_ARCHITECTURE_BACKEND|Arq. Backend]]
- [[11_CURRENT_STATUS|Estado Actual]]
- [[09_ROADMAP|Roadmap]]

---

> [!warning] Pendiente de aprobación
> Este documento está en estado **proposed**. Requiere validación antes de iniciar implementación.

#prd #pdf #backend #paridad #contrato
