# Sesión Activa — Solennix Agent Progress

## Feature en curso
- **Issue:** #809 — fix(ios): EventFormViewModel silently sets product cost to 0 on API error
- **Estado:** done (PR #944 — fix CI LoginFlowTests)
- **Branch:** `fix/ios-event-form-cost-on-error-809`
- **Worktree:** `/Users/tiagofur/dev/solennix-ios-809`

## Root cause
`EventFormViewModel+Profitability.fetchProductCosts()` y `EventDetailViewModel.loadProductUnitCosts()` seteaban `productUnitCosts[id] = 0` cuando fallaba el fetch de ingredientes. Cero costo → margen inflado artificialmente. Peor: `hasPendingProductCosts` (que dispara el warning naranja "Algunos costos de productos siguen cargando") depende de que el costo sea `nil`, pero el `= 0` lo pisa y el warning **nunca aparece** — el usuario ve rentabilidad falsa sin señal. `QuickQuoteViewModel` ya hacía lo correcto (deja `nil`).

## Cambios
- [x] `EventFormViewModel+Profitability.swift`: removido `productUnitCosts[productId] = 0` del `catch`. Agregado `logger` (`os.log`, subsystem `SolennixLog.subsystem`, category `EventFormProfitability`). En error: `logger.error(...)` + deja `nil` → `hasPendingProductCosts` queda `true` → la UI muestra el warning. Docstring actualizado.
- [x] `EventDetailViewModel.swift`: mismo fix en el `withTaskGroup`. Cambio el tipo del group de `(String, Double)` a `(String, Double)?` para poder retornar `nil` en el `catch` y omitir la asignación. Agregado `logger` (category `EventDetailViewModel`). Docstring corregido (decía "records 0 so the margin stays usable" — ahora documenta el comportamiento correcto).
- [x] Tests `EventFormViewModelProfitabilityTests.swift` (nuevo, en `SolennixFeaturesTests/Events/`): 3 casos — regresión #809 (error deja nil + warning visible), éxito (10*2 + 5*4 = 40, equipment excluido), skip producto cacheado. Patrón: `ProfitabilityMockURLProtocol` + `APIClient(session:)` (copia de `ClientFormViewModelTests`).
- [x] CI fix PR #944: `AuthManager.applyUITestAuthBootstrap()` resuelve auth sincrónicamente en UI tests (evita splash race). `LoginFlowTests` reforzado con `hasSeenOnboarding` seed + `waitForExistence(30s)`.

## Verificación
- `SolennixFeatures` (xcodebuild test): 156/156 (+3 nuevos)
- `Solennix` (xcodebuild test): 469/469 (1 skipped preexistente)
- `./init.sh`: verde (Go + Web 1334/1334)

## Notas
- `ProductIngredient` no tiene init público (es `Codable` sintetizado) → los tests usan JSON raw string + `Data(utf8)` en vez de construir el struct.
- `EventDetailViewModel` usa `withTaskGroup` (paralelo) vs. `EventFormViewModel` usa `for` secuencial — el fix se adaptó a cada patrón (sentinel nil opcional vs. omitir asignación).
- Scope: 2 ViewModels afectados (EventFormVM + EventDetailVM). `QuickQuoteVM` ya correcto, no se tocó.
- Paridad cross-platform NO necesaria: bug de manejo de errores del fetch de costos de iOS.

## Bloqueos
- Ninguno.
