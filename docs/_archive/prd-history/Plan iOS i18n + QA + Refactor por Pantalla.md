#ios #plan #i18n #testing #refactor

# Plan iOS i18n + QA + Refactor por Pantalla

> [!info] Objetivo
> Ejecutar una pasada completa de calidad en iOS, pantalla por pantalla, cubriendo en paralelo:
> - traducciones (ES/EN)
> - funcionalidad
> - diseño/UI
> - tests (unit + UI + snapshot mínimo)
> - refactor a componentes para evitar archivos gigantes

> [!success] Principio operativo
> Cada pantalla se cierra solo cuando cumple Definition of Done (DoD) de 5 dimensiones: i18n, UX/diseño, funcionalidad, tests, mantenibilidad.

---

## 1) Baseline audit (2026-05-08)

- Vistas SwiftUI auditadas: 61
- Tests iOS encontrados: 4
- Archivo más grande: `EventDetailView.swift` (1160 líneas)
- Hotspots de tamaño:
  - `Step4SuppliesEquipmentView.swift` (808)
  - `DashboardView.swift` (742)
  - `InventoryDetailView.swift` (741)
  - `SettingsView.swift` (732)
  - `EventListView.swift` (721)
  - `ProductDetailView.swift` (646)
  - `PricingView.swift` (627)

Estado de testing (actual):
- Unit tests: parciales (network + 2 tests app)
- UI tests: no detectados
- Snapshot tests: no detectados

---

## 2) Definition of Done por pantalla

Una pantalla se marca DONE solo si pasa todo:

1. i18n
- Cero hardcodes visibles para usuario en View/ViewModel.
- Claves en `Localizable.xcstrings` con ES y EN.
- Formatos dinámicos localizados (fecha, moneda, plurales, interpolaciones).

2. Diseño
- Respeta `SolennixDesign` (`Spacing`, `CornerRadius`, `SolennixColors`, tipografías).
- Buen comportamiento en iPhone y iPad (compact/regular).
- Estados visuales completos: loading, empty, error, success.

3. Funcionalidad
- Flujos críticos manualmente verificados (happy path + edge paths).
- Manejo de errores explícito (mensajes entendibles, retry cuando aplique).

4. Tests
- Unit tests de lógica (ViewModel/formatter/mapper/helpers de pantalla).
- UI test mínimo del flujo principal de esa pantalla.
- Snapshot o golden mínimo para 1 estado representativo (si aplica).

5. Mantenibilidad
- Ningún archivo de vista supera 350-400 líneas objetivo.
- Se extraen subcomponentes/presenters cuando hay bloques largos repetibles.
- Se separa formatting/business mapping de la View.

---

## 3) Estructura de ejecución en paralelo (por cada pantalla)

Para cada pantalla se ejecutan 3 tracks en paralelo:

- Track A (i18n): extracción de strings + claves + revisión de formato locale.
- Track B (QA funcional): checklist de flujo + errores + estados.
- Track C (refactor + tests): componentización + tests unit/UI.

Cierre de pantalla:
- Merge solo cuando A+B+C están verdes.
- Sin cierres parciales de i18n sin test mínimo.

---

## 4) Olas de trabajo (orden recomendado)

### Ola 1 (P0) — mayor riesgo usuario y mayor complejidad

- `DashboardView.swift`
- `EventDetailView.swift`
- `EventListView.swift`
- `EventFormView.swift` + `Step1..Step5`
- `SettingsView.swift`
- `PricingView.swift`
- `SubscriptionView.swift`

Criterio: pantallas núcleo, navegación frecuente, y alta densidad de copy/lógica.

### Ola 2 (P1) — módulos core de operación diaria

- Clients: `ClientListView`, `ClientDetailView`, `ClientFormView`, `QuickQuoteView`
- Products: `ProductListView`, `ProductDetailView`, `ProductFormView`
- Inventory: `InventoryListView`, `InventoryDetailView`, `InventoryFormView`
- Calendar: `CalendarView`, `CalendarGridView`

### Ola 3 (P2) — satélites + especializadas

- Staff: `Staff*View`
- Payments: `PaymentInboxView`
- Search: `SearchView`
- Event sub-screens: `EventChecklistView`, `EventContractPreviewView`, `EventShoppingListView`, `EventSuppliesDetailView`, `EventStaffDetailView`, `EventProductsDetailView`, `EventEquipmentDetailView`, `EventExtrasDetailView`, `EventFinancesDetailView`, `EventPaymentsDetailView`, `EventPhotosDetailView`
- Event form links: `EventFormLinksView`
- Onboarding: `OnboardingView`, `OnboardingPageView`
- Auth: `LoginView`, `RegisterView`, `ForgotPasswordView`, `ResetPasswordView`, `BiometricGateView`

---

## 5) Refactor strategy anti-archivo-gigante

Límites de tamaño:
- View principal: objetivo <= 350 líneas.
- Subviews/componentes: objetivo <= 180 líneas.
- Helpers de formato/mapeo: archivo separado por dominio.

Patrones de extracción:
- `ScreenName+Sections.swift` para bloques grandes de layout.
- `ScreenName+Components.swift` para piezas reutilizables.
- `ScreenNameFormatter.swift` para fechas/moneda/textos derivados.
- `ScreenNameStrings.swift` solo como transición temporal; destino final `FeatureL10n` + `Localizable.xcstrings`.

Regla:
- No mover lógica de negocio a la View al extraer UI.
- Si una subvista necesita demasiados bindings, crear ViewState intermedio.

---

## 6) Plantilla checklist por pantalla

Copiar para cada pantalla:

- Pantalla: `<ScreenName>`
- Ruta: `<path>`
- Prioridad: `P0|P1|P2`

Checklist:
- [ ] i18n: hardcodes eliminados
- [ ] i18n: claves ES/EN agregadas
- [ ] i18n: plurales/interpolaciones validadas
- [ ] Diseño: estados visuales completos
- [ ] Diseño: iPad regular width validado
- [ ] Función: happy path validado
- [ ] Función: errores/empty states validados
- [ ] Tests unitarios agregados/actualizados
- [ ] UI test flujo principal agregado
- [ ] Refactor: archivo debajo de 400 líneas o justificado

---

## 7) Primer backlog sugerido (sprint inicial)

Sprint iOS-I18N-01:
- `EventDetailView.swift`
- `DashboardView.swift`
- `PricingView.swift`

Objetivos sprint:
- Reducir cada archivo al menos 25% vía componentes.
- Cerrar i18n visible de usuario en esas 3 pantallas.
- Agregar tests unitarios de formatters y 1 UI test por pantalla.

Criterio de salida sprint:
- 3 pantallas cerradas con DoD completo.
- Sin regresiones en tests existentes.

---

## 8) Métricas de control semanal

- Pantallas cerradas por semana.
- Hardcodes detectados vs resueltos.
- Líneas máximas por archivo (top 10).
- Tests iOS totales y por módulo.
- Defectos encontrados post-merge.

Meta 4 semanas:
- 100% pantallas iOS con DoD completo.
- 0 pantallas > 500 líneas.
- UI tests para todos los flujos críticos.
