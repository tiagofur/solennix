#ios #calidad #testing

# Testing

> [!abstract] Resumen
> Estado actual: cobertura parcial. Hay base de tests unitarios, pero falta cobertura por pantalla y no hay UI tests sistemáticos.

---

## Estado Actual

| Tipo de test | Cobertura | Herramienta |
|-------------|-----------|-------------|
| Unit tests | ⚠️ Parcial (4 suites detectadas) | XCTest |
| UI tests | ❌ 0% sistemático | — |
| Snapshot tests | ❌ 0% | — |
| Performance tests | ❌ 0% | — |

> [!warning] Riesgo
> Con cobertura parcial, refactors por pantalla pueden romper flujos clave sin detección temprana.

Suits detectadas actualmente:
- `ios/SolennixTests/EventDetailViewModelTests.swift`
- `ios/SolennixTests/NotificationManagerTests.swift`
- `ios/Packages/SolennixNetwork/Tests/SolennixNetworkTests/APIClientPolicyTests.swift`
- `ios/Packages/SolennixNetwork/Tests/SolennixNetworkTests/OfflineMutationQueueTests.swift`

---

## Infraestructura Recomendada

| Tipo | Herramienta | Target |
|------|-----------|--------|
| Unit tests | XCTest + Swift Testing | ViewModels, managers, lógica |
| Async tests | Swift concurrency testing | APIClient, AuthManager |
| UI tests | XCUITest | Flujos críticos |
| Snapshot | swift-snapshot-testing | Regresión visual |
| Mocking | Manual protocols / Swift Testing | Dependencias |

---

## Prioridades

| Prioridad | Qué testear | Por qué |
|-----------|-------------|---------|
| P0 | Event Detail / Dashboard / Pricing | Máximo uso y mayor complejidad |
| P0 | Event Form steps | Riesgo alto de regresión funcional |
| P1 | Clients/Products/Inventory | Core operativo diario |
| P1 | Auth + Settings auxiliares | Acceso y configuración |
| P2 | Search/Staff/Onboarding/Payments | Cobertura de bordes y satélites |

---

## Estrategia paralela por pantalla

Cada pantalla se trabaja con 3 tracks simultáneos:

- Track A: i18n (extracción de strings + validación ES/EN)
- Track B: QA funcional (happy path + errores + vacíos)
- Track C: refactor + tests (componentización + unit/UI)

Una pantalla solo se marca cerrada cuando los 3 tracks están completos.

---

## Definition of Done de testing por pantalla

- 1 test unitario mínimo de lógica/formato por pantalla
- 1 UI test mínimo del flujo principal
- 1 estado de error/empty cubierto por test
- Sin regresión en suites existentes del módulo

---

## Relaciones

- [[Arquitectura General]] — SPM facilita testing por paquete
- [[Manejo de Estado]] — @Observable ViewModels como target principal
- [[Capa de Red]] — APIClient actor testeable
- [[../PRD/09_ROADMAP|Roadmap maestro]] — testing como prioridad
- [[Plan iOS i18n + QA + Refactor por Pantalla]] — ejecución operativa pantalla por pantalla
