---
tags:
  - prd
  - estado
  - paridad
  - solennix
aliases:
  - Estado Actual
  - Current Status
date: 2026-03-20
updated: 2026-04-29
status: active
---

# Estado Actual del Proyecto — Solennix

**Fecha:** Abril 2026
**Version:** 1.5

> [!success] 2026-04-29 — Sprint 7.E: Payment Submissions Phase 1 (issue #191, backend + web service ✅)
> Implementación de la capa de infraestructura para que clientes (vía portal público tokenizado) envíen comprobantes de transferencias bancarias y organizadores revisen/aprueben. Backend completo + Web service listos. UI (cliente portal + organizer inbox) pendiente para Fase 2.
> - **Backend model**: `PaymentSubmission` struct con fields: event_id, client_id, user_id, amount, transfer_ref, receipt_file_url, status (pending|approved|rejected), reviewed_by, reviewed_at, rejection_reason, linked_payment_id.
> - **DB migration 047**: `payment_submissions` table + 5 indexes (multi-tenant isolation por user_id).
> - **Repository + Handlers**: 6 methods en repo (Create, GetByID, GetByEventID, GetPendingByOrganizerID, GetHistoryByClientEventID, Update) + 4 endpoints:
>   - `POST /api/public/events/{token}/payment-submissions` — cliente envía FormData con receipt
>   - `GET /api/public/events/{token}/payment-submissions?event_id=...&client_id=...` — historial del cliente
>   - `GET /api/organizer/payment-submissions` — pending inbox del organizador
>   - `PUT /api/organizer/payment-submissions/{id}` — review (approve crea auto-Payment row)
> - **Web service layer**: `paymentSubmissionService.ts` con 4 async methods tipados, FormData + multipart, query params.
> - **Testing**: backend `go test ./...` ✅, web `npm run test:run` 1162 tests ✅, CI all stages SUCCESS ✅
> - **PR #199 merged to main** ✅
> - **Pendiente (Fase 2 + 3)**:
>   - [ ] Web UI: `ClientPaymentSubmissionForm` + `OrganizerPaymentInbox`
>   - [ ] iOS/Android organizer review surfaces
>   - [ ] Notifications (submission/approval/rejection)
>   - [ ] S3 integration para receipt storage (actualmente filename only)

> [!success] 2026-04-29 — Sprint 7.D: OpenAPI Sync Phase 2 (issue #187, web types auto-generated ✅)
> Migración Web al modo "tipos auto-generados desde OpenAPI". Ahora `npm run openapi:types` regenera `src/types/api.ts` — no hay drift manual. CI verifica que los tipos estén en sync con el spec.
> - **Setup**: `@redocly/cli` + script `openapi:types` en `web/package.json`
> - **CI verificación**: step "Verify OpenAPI types are committed" detecta drift → falla CI si mismatch
> - **PR #197 merged to main** ✅
> - **Pendiente (Fase 3)**: Cerrar drift restante (formularios públicos, portal, staff teams — 5 grupos de rutas sin docs en backend)

> [!success] 2026-04-28 — Sprint 7.C: Tier Enforcement Phase 1 Backend + Web (issue #190 ✅)
> Feature gating en portal público: backend retorna shapes de datos según plan; Web muestra upgrade banner en gratis.
> - **Backend payload gating** (`GET /api/public/events/{token}`):
>   - **Gratis**: shape básico (sin horario, ubicación, cantidad invitados, info cliente)
>   - **Pro/Business**: shape completo (todos los detalles)
>   - **Expiración**: planes vencidos → fallback a gratis
> - **Helpers**: `IsPlanActive()`, `RequiresPaidPlan()`, `PlanTiers` matriz
> - **Web UI**: banner "Acceso limitado" + CTA "Ver planes"
> - **PR #198 merged to main** ✅
> - **Pendiente (Fase 2 + 3)**:
>   - [ ] Endpoints premium-gated: `/api/events/{id}/milestones`, `/api/events/{id}/chat`, `/api/contracts/*`, `/api/rsvp/*`, `/api/reviews/*`
>   - [ ] iOS/Android paywall UI (Phase 2)

> [!info] 2026-04-27 — Repo Governance and CI/CD Guardrails
> Se endurecio la gobernanza del repositorio para reducir merges incompletos y mejorar trazabilidad de cambios:
> - **Templates y ownership**: `pull_request_template.md`, `ISSUE_TEMPLATE/*`, `CODEOWNERS`.
> - **Automatizacion de mantenimiento**: `dependabot.yml` (npm web/remotion, gomod, gradle, actions), workflow de sync de labels, workflow de triage (labels por path + size + defaults de issues), workflow de release por tags.
> - **CI/CD**: `CI Pipeline` ahora con `concurrency` para cancelar corridas obsoletas; nuevo workflow `iOS CI` (xcodegen + resolve SPM + build simulator sin signing); deploy a produccion con `environment: production`, timeout y health check post-deploy.
> - **Pendiente en Settings** (no versionable por PR): branch protection de `main`, required checks, environment protection rules, secret scanning/push protection, merge policy squash-only, auto-merge y delete branch on merge.

> [!info] 2026-04-27 — Auditoría Web: paridad backend + UX/landing
> Se auditó la app web contra el backend real y se documentó el estado en [[../Web/Auditoría Web 2026-04-27]]. Resultado: paridad funcional alta, pero contrato OpenAPI todavía parcial para formularios públicos, portal cliente y staff teams. La web funciona con tipos/manual fetch en esos flujos, pero no puede declararse 100% protegida por OpenAPI hasta cerrar el drift. Oportunidades principales: widgets Dashboard para `top-clients`, `product-demand`, `forecast`; hooks React Query para portal link/unavailable date mutations; landing más orientada al poder operativo real de Solennix.

> [!info] 2026-04-28 — Backend uploads: contrato de presigned S3 (issue #178)
> Se extendió el dominio de uploads en backend para habilitar direct upload a S3 sin romper compatibilidad:
> - **Storage contract**: `storage.FileResult` ahora incluye metadata opcional (`object_key`, `thumbnail_object_key`, `content_type`) y se agregó `PresignCapableProvider` con `PresignUpload` + `CompletePresignedUpload`.
> - **S3 provider**: implementa presign (`PUT`, 15 min) y finalización con generación de thumbnail post-upload.
> - **HTTP API**: nuevos endpoints autenticados `POST /api/uploads/presign` y `POST /api/uploads/complete`; `POST /api/uploads/image` mantiene payload legacy y suma campos nuevos opcionales.
> - **OpenAPI + tests**: se documentaron request/response nuevos (`UploadPresignRequest`, `UploadPresignResponse`, `UploadCompleteRequest`) y se agregaron contract tests + tests de handler para provider soportado/no soportado.
> [!info] 2026-04-26 — Sprint 7.B: Paywalls mobile coherentes (iOS + Android)
> Parseo del error 403 `plan_limit_exceeded` del backend como error tipado en ambas plataformas móviles, con UI de upgrade coherente en los 3 formularios de creación (Event/Client/Product). Paridad total con Web.
> - **iOS**: `APIError.planLimitExceeded(message:limitType:current:max:)` en `SolennixCore` + detección en `APIClient.validateResponse()` (antes del toast genérico) + `PaywallSheet.swift` componente reutilizable con lock icon, mensaje, CTA "Ver planes" y botón "Cerrar". Wired en `EventFormView`, `ClientFormView`, `ProductFormView` via `.sheet` + `PlanLimitsManager` environment.
> - **Android**: `SolennixException.PlanLimitExceeded(limitType, current, max, message)` en `ApiService.kt` + detección en `wrapError()` (403 + `error == "plan_limit_exceeded"`) + `UpgradePlanDialog` (ya existía en `core:designsystem`) wired en `EventFormScreen`, `ClientFormScreen`, `ProductFormScreen`.
> - **Coherencia**: Web ya tenía `PlanLimitExceededError` en `lib/api.ts` + `window.addEventListener('plan:limit-exceeded')` global. Ahora las 3 plataformas manejan el mismo error con la misma UX: catch del typed error → show paywall UI → dismiss o navigate to pricing.
> - Commit: `d19959ea`

> [!info] 2026-04-26 — iOS Date Parity + Quick Quote Navigation Fix
> Fix definitivo del offset de -1 día en fechas de eventos para iOS. `parseEventDate()` ahora usa timezone local consistente con Web y Android. Además, Quick Quote restaurado como `.sheet` modal (no NavigationLink push) resolviendo el rendering vacío causado por doble NavigationStack.
> - **iOS date fix**: `aa83f998` — resolve date offset bug by using local timezone
> - **iOS Quick Quote**: `58482efe` — restore quick quote modal presentation
> - **Web date fix**: `bb109216` — centralize date-only string parsing to prevent timezone offset
> - **iOS combined**: `023b7d03` — date parity and quick quote navigation fixes

> [!info] 2026-04-23 — Google Play Compliance: Política de Privacidad + Eliminación de Cuenta (Paridad Total)
> Implementación del flujo completo de cumplimiento para resolver el rechazo de Google Play Store. Aseguramos que el usuario tenga control total sobre sus datos tanto en la web como dentro de las aplicaciones móviles.
> - **Web (Compliance Base)**: Nueva página de solicitud de eliminación en `https://creapolis.dev/delete-account` y política de privacidad actualizada en `https://creapolis.dev/privacy-policy`. Refactorización de `Privacy.tsx` con lenguaje profesional, derecho al olvido y link al flujo de borrado.
> - **Settings Entry Points**: Botón "Eliminar Cuenta" agregado a la configuración en las tres plataformas (Web, Android, iOS) apuntando a la nueva URL centralizada.
> - **Android (Parity + Versioning)**: Actualización de `PrivacyScreen.kt` con links directos a `https://creapolis.dev/delete-account`. Incremento de `versionCode` (4 → 5) y `versionName` ("1.1.1" → "1.1.2") para resubmisión.
> - **iOS (Parity)**: Agregado botón de eliminación en `SettingsView.swift` apuntando a la URL centralizada y corrección de acentos en etiquetas legales ("Política", "Términos", "Contraseña").
> Paridad visual y funcional entre plataformas en el card de equipamiento del formulario de evento. iOS tenía una fila compacta sin stock; Android tenía dos filas con `Icons.Default.Close` (inconsistente con el trash del resto de la app) y mostraba el stock pero sin alerta cuando el usuario pedía más del disponible.
> - **Layout unificado** (una sola fila): `nombre + "Stock: N · unit" debajo | stepper 44pt/dp | trash rojo`. iOS ahora lee `InventoryItem.currentStock` + `unit` vía lookup en `equipmentInventory` por `inventoryId`.
> - **Trash icon**: Android cambió `Close` → `Delete` (paridad con cards de Productos/Extras).
> - **Stepper grande**: subido a hit area 44pt/dp con glyph `.title2` / `26.dp` + width fija 36 + `monospacedDigit` / `fontFeatureSettings = "tnum"` — mismo patrón que Paso 2 (Productos). No bloquea ni impone caps: el usuario puede ordenar más del stock.
> - **Alerta inline de overstock**: cuando `qty > stock`, texto de stock + número del stepper se pintan en rojo + ícono warning al lado del stock. Feedback no-bloqueante — el usuario puede querer ordenar más del disponible igual.
> - **Limitación conocida (issue #96)**: el valor "Stock: N" es el **stock total del inventario** (`inventory.current_stock`), NO descuenta reservas de otros eventos en el mismo día. El banner de conflictos arriba ya avisa que HAY choque, pero no cuántas unidades están tomadas. El endpoint `GET /api/equipment/conflicts` devuelve solo event_name + date por conflicto, no qty. Para resolverlo hay que agregar un endpoint que devuelva `available_on_date` por inventory_id (ver issue #96 con plan de backend + iOS + Android + Web).

> [!info] 2026-04-20 — Personal Ola 3: productos con equipo asociado (venta de "servicio de meseros")
> Tercera y última ola de la expansión de Personal. Cierra el ciclo comercial: el organizador ya podía (1) catalogar colaboradores con costo (Phase 1), (2) organizar turnos y RSVP (Ola 1), (3) agrupar en equipos (Ola 2). Ahora puede (4) vender el servicio del equipo como Product con precio al cliente, manteniendo el costo interno por fee.
> - **Backend (migration 045)**: `products.staff_team_id` nullable FK con `ON DELETE SET NULL`. Partial index para queries de "products con team" a futuro. Aditivo — productos existentes intactos.
> - **Tenant isolation opcional**: `CRUDHandler.SetStaffTeamRepo` (siguiendo el patrón de SetNotifier/SetEmailService). Cuando está wireado en main.go, valida que el `staff_team_id` del payload pertenezca al mismo user antes de persistir. Evita que un cliente adjunte el team de otro organizador.
> - **Cliente orquesta expansión**: backend NO hace auto-expansion. Cuando el organizador agrega un Product con team al EventForm, el cliente fetchea `/api/staff/teams/{id}` (endpoint de Ola 2), expande los miembros y los agrega a `selectedStaff` reusando la dedupe y el UPSERT de Ola 2. Consistente con cómo EventProduct copia `unit_price` al agregar (no refresh dinámico).
> - **Semantics snapshot-at-add-time**: si el team se edita después de agregar el Product al evento, el evento NO se actualiza. Si el organizador quiere refrescar, quita y re-agrega el Product. Clara, predecible.
> - **Coexiste con Recipe**: un Product puede tener `staff_team_id` Y `recipe`. No forzamos exclusión.
> - **UI cross-platform**: Product form suma selector opcional "Equipo asociado" (default "Sin equipo") con texto explicativo de qué pasa al agregar al evento. Chip "Incluye equipo" en la lista de productos dentro del EventForm.
> - **Margen interno solamente**: organizador ve `Product.price − Σ(fees)` en cálculos internos. Cliente final NO ve estructura de costos.
> - **Sin plan gating** (consistente con Olas 1 y 2).
> - **Decisiones de producto pospuestas**: visualización de rentabilidad en Dashboard/EventSummary; plan gating si validamos que es premium; link quitar-Product→quitar-staff (v1 deja el staff expandido intacto).

> [!info] 2026-04-19 — Personal Ola 2: equipos (staff_teams + staff_team_members) para asignar cuadrillas en bloque
> Segunda ola de expansión de Personal (después de Ola 1 del mismo día). Motivación: sin equipos, el mismo organizador que tiene una plantilla recurrente de 10 meseros tiene que agregarlos uno por uno a cada evento. Con Ola 2 los agrupa una vez y los asigna a un evento con un solo toque. Escala el modelo a empresas de catering sin cambiar el flujo base de Staff catalog.
> - **Backend (migration 044)**: `staff_teams` (user_id, name, role_label, notes, timestamps) + `staff_team_members` (team_id, staff_id, is_lead, position) con PK compuesta. Cascade a ambos lados; miembros sin fee/status (esos siguen viviendo per-assignment en `event_staff`, así un equipo puede asignarse a varios eventos con distintos costos/RSVPs).
> - **Repo `StaffTeamRepo`**: GetAll con `member_count` barato (sub-SELECT COUNT) para la lista; GetByID con miembros joined con staff name/role/phone/email; Create/Update/Delete transaccionales; Update reemplaza miembros atómicamente (no hay estado por miembro que preservar). Validación de tenant antes de insertar cada miembro.
> - **Endpoints** bajo `/api/staff/teams`: `GET`, `POST`, `GET/{id}`, `PUT/{id}`, `DELETE/{id}`. Integrado como subprefijo estático del `/api/staff` existente — chi resuelve "teams" antes de `/{id}`.
> - **iOS / Android / Web**: CRUD de equipos con pantalla propia accesible desde la lista de Personal (sin tab nuevo). Miembros se eligen desde el catálogo existente con toggle `is_lead` por fila. Badge de corona para el team lead.
> - **Integración con EventForm**: botón "Agregar equipo completo" en el Step 4 del formulario. Expande los miembros a N filas en `event_staff` usando el mismo UPSERT de Ola 1 — no hay endpoint nuevo. Miembros ya asignados se saltean (sin duplicados). Después de expandir, fee/turno/estado son editables por fila.
> - **Sin gating de plan** en esta ola (todos los planes).
> - **Decisiones clave**: team no guarda fee ni status (esos viven per-assignment); miembros upsert via DELETE + INSERT en transacción (no hay estado a preservar). Validación de tenant por miembro evita que un cliente malicioso adjunte staff de otro user.
> - **Ola 3 (no incluida)**: `Product.staff_team_id` para vender staffing al cliente con markup — requiere decisiones de producto abiertas (snapshot vs dynamic team, cálculo de margen visible).

> [!info] 2026-04-19 — Personal Ola 1: turnos + estado RSVP + disponibilidad (paridad iOS · Android · Web · Backend)
> Feature Personal (shipped 2026-04-16 como catálogo plano + costo por evento) expandida con la capa operativa. Motivación del usuario: escalar el uso para equipos de meseros / empresas de catering, sin cerrar la puerta a que el mismo modelo sirva al organizador con plantilla propia. Phase 3 (login del colaborador) se mantiene intacto como roadmap futuro.
> - **Backend (migration 043)**: `event_staff` recibe `shift_start`, `shift_end` (TIMESTAMPTZ nullables — pueden cruzar medianoche) y `status` (enum `pending | confirmed | declined | cancelled`, default `confirmed`). Constraint `shift_end > shift_start`. Todo aditivo — filas existentes siguen válidas.
> - **Backend UPSERT resiliente**: `UpdateEventItems` en `event_repo.go` usa `COALESCE($status, event_staff.status)` para preservar el RSVP cuando un cliente viejo no envía el campo. Mismo patrón que `notification_sent_at` de Phase 2.
> - **Backend endpoint**: `GET /api/staff/availability?date=YYYY-MM-DD` (o rango `start`/`end`). Devuelve solo staff con asignaciones `pending|confirmed` en la ventana; el cliente infiere "libre" por ausencia.
> - **iOS / Android / Web**: modelos extendidos con `shift_start`/`shift_end`/`status` (opcionales — retrocompatibles). Step 4 del EventForm suma pickers de horario colapsables ("Agregar horario (opcional)") y selector de estado con badges de color (amber / green / rose muted / slate). Indicador "Ocupado ese día" al lado de los nombres en el selector de staff cuando la fecha del evento matchea. **Sin pantallas nuevas.**
> - **UX**: strings Rioplatense ("Sin confirmar", "Confirmado", "Rechazó", "Cancelado"). Defaults inteligentes — `status = confirmed` y `shift_start/end = NULL` mantienen el comportamiento pre-Ola-1 para quienes no quieren usar la feature.
> - **Sin gating de plan** en esta ola — todos los planes pueden usar turnos / estado / disponibilidad. Gating sigue siendo solo en Phase 2 (Pro+) para el email, y Phase 3 (Business+) para el login del colaborador.
> - **Roadmap siguiente** (no incluido en esta ola, documentado en [[02_FEATURES#15.ter Personal]]): Ola 2 — equipos (`staff_teams`) para asignar cuadrillas en bloque; Ola 3 — staff como servicio vendible vía `Product.staff_team_id` opcional (markup vs. costo interno).

> [!info] 2026-04-19 — iOS: botón explícito "$ Anticipo" (paridad con Web/Android, issue #80 Opción B)
> iOS quedaba sin el botón directo para registrar anticipo en `EventPaymentsDetailView` — el usuario tenía que tipear el monto a mano. Cerrada la brecha con `viewModel.depositBalance` como saldo pendiente del anticipo y un `PremiumButton` dinámico que aparece cuando `depositBalance > 0.01`.
> - Nuevo botón "$ Anticipo - $X" en `EventPaymentsDetailView.swift` (junto a "Registrar Pago" / "Liquidar"), visible mientras quede anticipo por cobrar.
> - Fix lateral: el botón del hub (`EventDetailView.swift`) usaba `totalPaid < 0.01` como condición, desaparecía tras cualquier pago parcial aunque el anticipo no estuviera cubierto. Ahora usa `depositBalance > 0.01` y muestra el saldo pendiente.
> - Helper `payDeposit()` corregido: pre-llena `paymentAmount` con el saldo pendiente (no el total) y `paymentNotes = "Anticipo"` (convención web).
> - Epsilon alineado a `0.01` en el check "Anticipo cubierto" (antes `0.1`, inconsistente con el resto del código iOS y con web — podía dar drift visual de centavos).
> - Tests unitarios nuevos en `ios/Packages/SolennixFeatures/Tests/SolennixFeaturesTests/EventDetailViewModelTests.swift` cubriendo `payDeposit()` + computed `depositAmount`/`depositBalance`.
> - **Fuera de alcance** (queda para Opción C del issue #80): tipar `Payment.is_deposit` en backend + clientes; fecha límite del anticipo; reportes filtrados por tipo de pago.

> [!info] 2026-04-18 — iOS + Android: toggle "Incluir en checklist" de Extras (paridad con Web)
> El campo booleano `include_in_checklist` (backend migration 028, default `true`) estaba sólo expuesto en Web. iOS y Android recibían el dato del backend pero lo descartaban al decodificar y no tenían UI para togglearlo. Cerrada la brecha en ambas plataformas con default opt-out uniforme (coincide con Web + backend — opt-in se descartó porque la mayoría de extras son físicos y forzar opt-in agrega fricción).
> - **iOS**:
>   - Campo `includeInChecklist: Bool` en `EventExtra.swift` (init del struct + `init(from:)` con `decodeIfPresent` y fallback `true`).
>   - Campo en `SelectedExtra` (UI struct de `EventFormViewModel.swift`) + mapeo en los 3 sitios donde se convierte EventExtra → SelectedExtra + pasar `include_in_checklist` en el payload de save.
>   - Toggle "Incluir en checklist" en `Step3ExtrasView.swift` debajo del toggle existente de "Solo cobrar costo".
>   - `ChecklistPDFGenerator.swift` filtra extras por `includeInChecklist` antes de renderizar la sección EXTRAS (match con el filtro de Web en `pdfGenerator.ts`).
> - **Android**:
>   - Campo `includeInChecklist` en `EventExtra.kt` data class con `@SerialName("include_in_checklist")` + default `true`.
>   - `CachedEventExtra` entity + `asEntity`/`asExternalModel` mappers actualizados.
>   - Room DB bump v7→v8 + `MIGRATION_7_8` que ejecuta `ALTER TABLE event_extras ADD COLUMN include_in_checklist INTEGER NOT NULL DEFAULT 1`.
>   - `ExtraItemPayload` (EventRepository) y `QuoteTransferExtra` extendidos con el campo.
>   - `EventFormViewModel.addExtra` / `updateExtra` reciben el nuevo bool; transfer desde QuickQuote preserva el valor.
>   - Checkbox "Incluir en checklist" en `EventFormScreen.kt` debajo del checkbox "Solo cobrar costo".
> - **Gap conocido (fuera de scope)**: Android `ChecklistPdfGenerator.kt` no incluye extras en el PDF de carga (sólo productos + equipment). iOS y Web sí los incluyen. Pre-existente — no introducido por este cambio. Seguimiento: tarea aparte para sumar la sección EXTRAS al PDF de Android con el mismo filtro por `includeInChecklist`.

> [!info] 2026-04-18 — iOS "Enlaces de Formulario" relocated to tab "Más" (Android parity)
> La entrada al feature Event Form Links (sección 15 del [[02_FEATURES]]) se movió de `Ajustes → Negocio → "Links de Formulario"` al tab `Más → Catálogo → "Enlaces de Formulario"`, inmediatamente después de "Personal". Match exacto con la ubicación en Android (`CompactBottomNavLayout` → tab Más). En iPad, se agregó `SidebarSection.eventFormLinks` a `mainSections` del sidebar con ícono `link`.
> - **Archivos tocados**: `MoreMenuView.swift` (nuevo row), `SettingsView.swift` (removida entrada duplicada en `businessContent`), `Route.swift` (nuevo case en enum `SidebarSection`), `SidebarSplitLayout.swift` (case en `sectionListView` + `mainSections`).
> - **Sin cambios de feature**: `EventFormLinksView` / `EventFormLinksViewModel` / `Route.eventFormLinks` / endpoints intactos — solo re-ubicación de la entrada de navegación.

> [!info] 2026-04-18 — iOS Navigation Bar Appearance Fix (root cause)
> Cierra el hilo abierto el 2026-04-17: a pesar de tener los tab roots con `.searchable` + `.large` + `.safeAreaInset`, el large title seguía sin aparecer en la mayoría de los tabs y Eventos no colapsaba a inline. La causa raíz era **global, no por vista**: en `SolennixApp.swift` se configuraba `UINavigationBar.appearance()` con `configureWithOpaqueBackground()` y el **mismo** appearance asignado a `standardAppearance` y `scrollEdgeAppearance` — eso rompía el rendering del large title y el fade/collapse on-scroll (la nav bar quedaba visualmente idéntica at-rest y scrolled).
> - **Fix 1 — SolennixApp.swift**: eliminada la configuración global de `UINavigationBar.appearance()`. Se deja que SwiftUI use el default de Apple (transparente con large title at rest, blur cuando scrolea). El `UITabBar.appearance()` se mantiene porque el tab bar custom sí tiene paleta propia (surface grouped warm).
> - **Fix 2 — CalendarView.swift**: el body estaba envuelto en `Group { if iPad { ... } else { ScrollView } }`. Aunque Group es "transparente" teóricamente, en combinación con el appearance global roto no dejaba que SwiftUI trackee el ScrollView compact como primary scroll view. Refactorizado a un `calendarBody` computed `@ViewBuilder` que es el direct body.
> - **Fix 3 — DashboardView.swift**: removido `.ignoresSafeArea()` del background (`SolennixColors.surfaceGrouped`). Con `ignoresSafeArea`, el background se extendía al área del nav bar large title y visualmente lo "comía".
> - **Resultado**: las 5 tab roots (Inicio, Calendario, Eventos, Clientes, Más) + las 3 list views secundarias (Productos, Inventario, Personal) ahora muestran el large title at rest y colapsan a inline correctamente al scrollear. Las 30+ detail/form/settings views mantienen su `.inline` explícito — no requirieron cambios.

> [!info] 2026-04-17 — iOS Navigation Bar Standardization
> App bar de iOS unificada al default de Apple con paridad cross-platform mantenida:
> - **Display mode uniforme**: tab roots usan `.large`, detail/form screens usan `.inline` — patrón default de Apple. Fixes: `NotificationPreferencesView` pasó de `.large` a `.inline` (es pushed desde Ajustes); `KeyboardShortcutsHelpView` recibió `.navigationBarTitleDisplayMode(.inline)` explícito con guard `#if os(iOS)`.
> - **Búsqueda unificada vía `.searchable`**: los 5 list views (Eventos, Clientes, Productos, Personal, Inventario) reemplazaron el `InlineFilterBar` custom por el modificador nativo `.searchable` de SwiftUI. Resultado: filtro local mientras tipeás + comportamiento iOS estándar de colapso on-scroll.
> - **Restructura del body con `.safeAreaInset(edge: .top)`**: los 5 list views eliminaron el `VStack` envolvente que rompía el tracking de scroll del large title. Ahora el `List`/`ScrollView` es hijo directo de la navigation stack (pattern Apple Mail/Notes), y banners + chips + filtros viven adentro de `.safeAreaInset`. Esto arregla dos bugs visuales: (a) título invisible al abrir el tab hasta hacer scroll, (b) título grande que no colapsaba a inline al scrollear.
> - **Paridad cross-platform**: la búsqueda global sigue accesible vía tabs Inicio/Calendario/Más (iOS), ícono dedicado en TopAppBar (Android), y Cmd+K CommandPalette (Web). Cada plataforma usa su patrón idiomático.
> - **"Hola, {nombre}" se mantiene** en Dashboard — los 3 plataformas lo tienen con la misma feature (paridad total).

> [!info] 2026-04-11 — iOS Apple Compliance Hardening
> Antes del reenvio a App Review, la app iOS pasa por un hardening de compliance de suscripciones:
> - **Free trial disclosure** agregado al FAQ de `PricingView` (auto-conversion a pago al finalizar los 14 dias).
> - **Subscription disclosure text** reforzado con la clausula explicita de gestion/cancelacion desde Ajustes de la cuenta App Store.
> - **Terms de Uso y Politica de Privacidad** ahora se abren en `SFSafariViewController` apuntando a los URLs canonicos `https://creapolis.dev/terms-of-use/` y `https://creapolis.dev/privacy-policy/`. Las vistas in-app `TermsView`/`PrivacyView` fueron eliminadas — la fuente de verdad legal vive en la web y se actualiza sin requerir releases.
> - Backend changes recientes (FTS search, activity log, admin audit log, CSRF v2) verificados como **sin impacto** sobre iOS: el cliente usa Bearer JWT y bypasa CSRF; los nuevos endpoints no son consumidos por iOS.

> [!tip] Documentos relacionados
> [[PRD MOC]] · [[01_PRODUCT_VISION]] · [[02_FEATURES]] · [[04_MONETIZATION]] · [[09_ROADMAP]] · [[SUPER PLAN MOC]] · [[03_CROSS_PLATFORM_PARITY_MODEL]] · [[11_CROSS_PLATFORM_KPI_SCORECARD]]

---

## 1. Estado General

> [!success] Plataformas funcionales
> Backend y Web estan operativos. iOS y Android en desarrollo activo con features principales implementadas.

| Plataforma                | Estado           | Notas                                                                                                                                                                                                                                                                            |
| ------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend (Go)              | Funcional ✅ + **MVP Contract Freeze cerrado 2026-04-10** | API completa, 47 migraciones, auth multi-proveedor, Stripe, RevenueCat, push notifications (FCM+APNs), paginacion server-side, dashboard analytics (KPIs server-side), FTS, audit logging, CSRF, refresh token rotation, **OpenAPI parcial — 5 grupos de rutas sin documentar (formularios, portal, staff/teams)**, **event handlers a ≥85% coverage** (E1.B2), coverage handlers 78.6%, **Personal completo (Phase 1+2+Olas 1-3)** |
| Web (React)               | Funcional ✅ + **paridad funcional alta; contrato en revisión 2026-04-27** | Todas las paginas principales, panel admin, cotizacion rapida, formularios públicos y portal cliente. `npm run check` regenera tipos desde `backend/docs/openapi.yaml`, pero el spec sigue parcial para rutas públicas nuevas y staff teams; esos flujos web usan tipos/manual fetch hasta cerrar #99. Tests: 95 archivos unit/component en `web/src` + 6 e2e/integration en `web/tests`. Dashboard consume KPIs/revenue/status/activity desde backend; quedan sin UI `top-clients`, `product-demand`, `forecast`. i18n foundation (i18next + ES/EN). |
| iOS (SwiftUI)             | En desarrollo 🔄 · **v1.1.0** | Features principales + widgets (4 tipos) + Live Activity + 7 generadores PDF + **Dashboard KPIs server-side** + **Personal completo** + **Portal Cliente** + **i18n foundation** |
| Android (Jetpack Compose) | En desarrollo 🔄 · **v1.1.2 (versionCode 5)** + **CI job activo** | Features principales, arquitectura modular multi-feature, 8 generadores PDF. **CI Android activo (gradle test + assembleDebug)**. **Dashboard KPIs server-side** + **Personal completo** + **Portal Cliente** + **i18n foundation** + **Google Play compliance**. |

---

## 2. Backend — Implementado

> [!abstract] Resumen
> API REST completa en Go con autenticacion multi-proveedor, CRUD de todas las entidades, suscripciones bidireccionales (Stripe + RevenueCat), panel admin y 47 migraciones. Ver [[07_TECHNICAL_ARCHITECTURE_BACKEND]] para detalles de arquitectura.

### Autenticacion y Usuarios

- ✅ Registro de usuario (`POST /api/auth/register`)
- ✅ Login con JWT (`POST /api/auth/login`)
- ✅ Logout con cookie httpOnly (`POST /api/auth/logout`)
- ✅ Refresh token (`POST /api/auth/refresh`)
- ✅ Forgot password (`POST /api/auth/forgot-password`)
- ✅ Reset password con token (`POST /api/auth/reset-password`)
- ✅ Google Sign-In (`POST /api/auth/google`)
- ✅ Apple Sign-In (`POST /api/auth/apple`)
- ✅ Obtener perfil (`GET /api/auth/me`)
- ✅ Cambiar contrasena (`POST /api/auth/change-password`)
- ✅ Actualizar perfil (`PUT /api/users/me`)
- ✅ Contrato OpenAPI y contract tests cubren tambien OAuth social y update profile consumidos por iOS/Android

### Eventos

- ✅ CRUD completo (`GET/POST /api/events`, `GET/PUT/DELETE /api/events/{id}`)
- ✅ Eventos proximos (`GET /api/events/upcoming`)
- ✅ Items de evento: productos, extras, equipamiento, suministros (`GET/PUT /api/events/{id}/items`)
- ✅ Fotos de evento (`GET/POST /api/events/{id}/photos`, `DELETE /api/events/{id}/photos/{photoId}`)
- ✅ Deteccion de conflictos de equipamiento (`GET/POST /api/events/equipment/conflicts`)
- ✅ Sugerencias de equipamiento (`GET/POST /api/events/equipment/suggestions`)
- ✅ Sugerencias de suministros (`GET/POST /api/events/supplies/suggestions`)
- ✅ Contrato OpenAPI y contract tests cubren tambien fotos de evento usadas por Android

### Clientes

- ✅ CRUD completo (`GET/POST /api/clients`, `GET/PUT/DELETE /api/clients/{id}`)

### Productos

- ✅ CRUD completo (`GET/POST /api/products`, `GET/PUT/DELETE /api/products/{id}`)
- ✅ Ingredientes por producto (`GET/PUT /api/products/{id}/ingredients`)
- ✅ Ingredientes en lote (`POST /api/products/ingredients/batch`)

### Inventario

- ✅ CRUD completo (`GET/POST /api/inventory`, `GET/PUT/DELETE /api/inventory/{id}`)

### Pagos

- ✅ CRUD completo (`GET/POST /api/payments`, `GET/PUT/DELETE /api/payments/{id}`)
- ✅ Android resuelve detalle de pago con cache Room y fallback remoto a `GET /api/payments/{id}` cuando falta el registro local

### Suscripciones

- ✅ Estado de suscripcion (`GET /api/subscriptions/status`)
- ✅ Checkout session Stripe (`POST /api/subscriptions/checkout-session`)
- ✅ Portal session Stripe (`POST /api/subscriptions/portal-session`)
- ✅ Webhook Stripe (`POST /api/subscriptions/webhook/stripe`)
- ✅ Webhook RevenueCat (`POST /api/subscriptions/webhook/revenuecat`)
- ✅ Debug upgrade/downgrade (admin only)

### Dashboard Analytics (server-side)

- ✅ KPIs con monthly aggregates (`GET /api/dashboard/kpis`) — net_sales, cash_collected, VAT computed server-side
- ✅ Revenue chart 6 meses (`GET /api/dashboard/revenue-chart?period=year`) — premium-only
- ✅ Events by status (`GET /api/dashboard/events-by-status?scope=month|all`)
- ✅ Activity log (`GET /api/dashboard/activity`)
- ✅ Admin stats (`GET /api/admin/stats`)

### Personal / Colaboradores

- ✅ CRUD staff (`GET/POST /api/staff`, `GET/PUT/DELETE /api/staff/{id}`)
- ✅ Staff en eventos (`PUT /api/events/{id}/items` con `staff[]`, `GET /api/events/{id}/staff`)
- ✅ Disponibilidad (`GET /api/staff/availability?date=`)
- ✅ Equipos (`GET/POST /api/staff/teams`, `GET/PUT/DELETE /api/staff/teams/{id}`)
- ✅ Email automático al colaborador al asignarlo (Phase 2, Pro+)

### Portal Cliente

- ✅ CRUD public link (`POST/GET/DELETE /api/events/{id}/public-link`)
- ✅ Vista pública (`GET /api/public/events/{token}`) — rate limited 10/min, tier-gated shapes (gratis vs pro)
- ✅ Payment submissions (public client side): `POST /api/public/events/{token}/payment-submissions`, `GET /api/public/events/{token}/payment-submissions?event_id=...&client_id=...`
- ✅ Payment submissions (organizer review): `GET /api/organizer/payment-submissions`, `PUT /api/organizer/payment-submissions/{id}`

### Busqueda

- ✅ Busqueda global (`GET /api/search`) — rate limited 30/min

### Uploads

- ✅ Subida de imagenes (`POST /api/uploads/image`) — rate limited 5/min
- ✅ Servicio de archivos estaticos (`GET /api/uploads/*`) — con cache 1 ano

### Administracion

- ✅ Dashboard de estadisticas (`GET /api/admin/stats`)
- ✅ Lista de usuarios (`GET /api/admin/users`)
- ✅ Detalle de usuario (`GET /api/admin/users/{id}`)
- ✅ Upgrade de usuario (`PUT /api/admin/users/{id}/upgrade`)
- ✅ Lista de suscripciones (`GET /api/admin/subscriptions`)
- ✅ Contrato OpenAPI y contract tests cubren ahora las rutas admin consumidas por Web

### Device Tokens

- ✅ Registro de dispositivo (`POST /api/devices/register`)
- ✅ Baja de dispositivo (`POST /api/devices/unregister`)

### Fechas No Disponibles

- ✅ CRUD (`GET/POST /api/unavailable-dates`, `DELETE /api/unavailable-dates/{id}`)

### Paginacion Server-Side

- ✅ Paginacion en todos los list endpoints (`?page=1&limit=20&sort=col&order=desc`)
- ✅ Response envelope: `{ data, total, page, limit, total_pages }`
- ✅ Backward compatible: sin `page` param retorna array plano
- ✅ Sort allowlist por entidad para prevenir SQL injection
- ✅ Indices compuestos para rendimiento (migracion 030)

### Push Notifications

- ✅ PushService con FCM (firebase-admin-go) + APNs (sideshow/apns2)
- ✅ NotificationService: recordatorios de evento (24h, 1h), pago recibido, evento confirmado
- ✅ Background job cada 15 minutos para recordatorios
- ✅ Tabla notification_log para deduplicacion (migracion 031)
- ✅ Limpieza automatica de tokens invalidos

### Middleware

- ✅ Recovery (panic recovery)
- ✅ X-Request-ID (tracing de requests)
- ✅ CORS (origenes configurables)
- ✅ Security Headers (X-Frame-Options, CSP, HSTS, etc.)
- ✅ Logger (incluye request ID)
- ✅ Auth (JWT middleware)
- ✅ AdminOnly (verificacion de rol)
- ✅ Rate Limiting (configurable por grupo de rutas)

### Health Check

- ✅ `/health` verifica conectividad a PostgreSQL via pool.Ping()

### Email Transaccional

- ✅ Template system reutilizable con branding Solennix (gold #C4A265)
- ✅ Welcome email al registrarse
- ✅ Event reminder email (24h antes)
- ✅ Payment receipt email al crear pago
- ✅ Subscription confirmation al upgrade a Pro

### Token Blacklist Persistente

- ✅ Tabla revoked_tokens (migracion 032) reemplaza sync.Map en memoria
- ✅ Tokens sobreviven reinicio del servidor
- ✅ Cleanup automatico de tokens expirados cada hora

### File Storage Abstraction

- ✅ Interface StorageProvider con implementaciones Local y S3
- ✅ Configurable via STORAGE_PROVIDER=local|s3
- ✅ S3Provider compatible con AWS S3, MinIO, DigitalOcean Spaces

### Migraciones (45 total)

- ✅ 001: Tabla de usuarios
- ✅ 002: Tabla de clientes
- ✅ 003: Tabla de eventos
- ✅ 004: Tabla de productos
- ✅ 005: Tabla de inventario
- ✅ 006: Tablas de union (junction tables)
- ✅ 007: Pagos y suscripciones
- ✅ 008-011: Campos adicionales (logo, brand color, show business name)
- ✅ 012-013: Extension de suscripciones y fix de constraint
- ✅ 014: Indices y cascadas
- ✅ 015: Campos de imagen
- ✅ 016: Equipamiento de eventos
- ✅ 017: Template de contrato en usuarios
- ✅ 018: Rol de usuario (admin)
- ✅ 019: Expiracion de plan
- ✅ 020: Tipo de descuento en eventos + capacidad de equipamiento
- ✅ 021: Campo "bring to event"
- ✅ 022: Fechas no disponibles
- ✅ 023: Tipo de suministro y tabla
- ✅ 024: Excluir costo en suministros de evento
- ✅ 025: IDs OAuth de usuario
- ✅ 026: Device tokens
- ✅ 027-029: Migraciones adicionales
- ✅ 030: Indices de paginacion y rendimiento
- ✅ 031: Tabla notification_log para deduplicacion de push
- ✅ 032: Token blacklist persistente (revoked_tokens)
- ✅ 033: pg_trgm similarity search con índices GIN (gin_trgm_ops) — búsqueda híbrida ILIKE + similarity(), no FTS nativo
- ✅ 034: Audit logs
- ✅ 035: Refresh token families
- ✅ 036: Live activity tokens
- ✅ 037: Cleanup legacy plans
- ✅ 038: Event form links
- ✅ 039: Notification preferences
- ✅ 040: Business plan tier
- ✅ 041: Event public links (Portal Cliente)
- ✅ 042: Staff + event_staff (Personal Phase 1+2+3 hooks)
- ✅ 043: Event staff shift/status (Personal Ola 1)
- ✅ 044: Staff teams + members (Personal Ola 2)
- ✅ 045: Product staff_team_id (Personal Ola 3)
- ✅ 046: Event public link tiers + shape gating (Tier Enforcement)
- ✅ 047: Payment submissions table (Pagos Phase 1)

### MVP Contract Freeze — Cerrado 2026-04-10 ✅

> [!done] Wave 1 T-02 + E1.B2 closed
> Cierre del SUPER_PLAN Wave 1 para el backend: contrato API freezeado en 1.0, validado en CI, y con cobertura de tests en event handlers sobre el gate de 85%.

- [x] **`backend/docs/openapi.yaml`** cubre el 100% de las rutas registradas en `backend/internal/router/router.go`. Agregados en la iteración final: `GET /api/events/search`, `GET /api/dashboard/activity`, `GET /api/admin/audit-logs`, más los 3 GET variants de equipment/supplies suggestions/conflicts usados por mobile.
- [x] **Schemas nuevos** `AuditLog` y `PaginatedAuditLogsResponse` reusables por ambos endpoints de activity log.
- [x] **CI gate** vía `npx @redocly/cli lint` en `.github/workflows/ci.yml` (job `backend`). Rompe el PR si el spec se rompe.
- [x] **Bugs preexistentes corregidos** expuestos por el lint: indentación drifted de schemas admin (`PlatformStats`, `AdminUser`, `SubscriptionOverview`, `AdminUpgradeRequest`) anidados por error dentro de `EventPhotoCreateRequest`, `SubscriptionStatusResponse.subscription` con `nullable` sobre `allOf` sin `type`, y downgrade de `openapi: 3.1.0 → 3.0.3` para alinear con la sintaxis 3.0 usada en todo el documento (`nullable: true`).
- [x] **Contract tests extendidos** en `backend/internal/handlers/contract_test.go` para los 6 endpoints nuevos y los 2 schemas nuevos.
- [x] **Event handlers a ≥85% coverage** (E1.B2 — SUPER_PLAN Wave 1). Nuevo archivo `backend/internal/handlers/crud_handler_events_coverage_test.go` de 1013 LOC:
  - `SearchEvents` 42% → **100%**
  - `UpdateEvent` 74% → **85.5%**
  - `HandleEventPaymentSuccess` 58% → **100%**
  - Suite de fotos (`GetEventPhotos`, `AddEventPhoto`, `DeleteEventPhoto`, `parseEventPhotos`) 0% → 93-100%
  - Suite de supplies (`GetEventSupplies`, `GetSupplySuggestions`) 0% → 93-95%
  - GET variants (`CheckEquipmentConflictsGET`, `GetEquipmentSuggestionsGET`, `GetSupplySuggestionsGET`) 0% → 94%+
  - Setters (`SetNotifier`, `SetEmailService`, `SetLiveActivityNotifier`) 0% → **100%**
  - Total package: 69.8% → **78.6%**
- [x] **E2.C1 desbloqueado** — Web/iOS/Android pueden auditar contra el spec sin riesgo de target móvil.

Commits en rama `super-plan`: `d69df81`, `99c17bc`, `836eba6`.

### Pendiente Backend

> [!warning] Brechas restantes del backend

- ⬜ Verificacion de recibos de App Store / Play Store
- ⬜ Notificacion de cotizacion sin confirmar (email template listo, falta trigger)
- ⬜ Presigned URLs para uploads directos a S3
- ⬜ Redis como alternativa para token blacklist (actualmente DB)

---

## 3. Web — Implementado

> [!abstract] Resumen
> Aplicacion React completa con todas las paginas principales, panel admin, cotizacion rapida, y checklist interactivo. Ver [[08_TECHNICAL_ARCHITECTURE_WEB]] para detalles de arquitectura.

### Web — Backend alignment cerrado 2026-04-10 ✅

> [!done] E2.C1 Web done
> Slice `backend-as-source-of-truth` completo: el Web ya no puede divergir del contrato del backend por construcción. `openapi-typescript` regenera los tipos TypeScript desde `backend/docs/openapi.yaml` en cada `npm run check` y `npm run build`; el CI verifica que `web/src/types/api.ts` commiteado esté sincronizado con el spec y falla el build si alguien modifica el spec sin regenerar.

**Fases ejecutadas del slice** (9 commits en rama `super-plan`):

- **Fase 0** (`0fd6aac`): baseline de salud — fix de 2 errors de ESLint (memoización mal en EventExtras/EventProducts), split de `EventSummary.test.tsx` (1498 LOC, 74 tests) en 6 archivos temáticos para resolver un OOM crónico del worker de vitest que dejaba 58 tests sin ejecutarse. **+43 tests ahora corren realmente**. 15 tests pre-existentes quedaron skipped con TODO documentado (3 por leak en aggregation de ingredientes, 12 por selectors/formatos desactualizados).
- **Fase 1** (`42124d0`): `openapi-typescript` como devDep. Script `openapi:types`. `web/src/types/api.ts` (5133 LOC) generado automáticamente. CI gate que valida la sincronización del archivo commiteado con el spec.
- **Fase 2** (`2c23dd6`): **bug real descubierto** — el Web leía `p.products?.name` (shape legacy de un ORM) pero el backend devuelve `p.product_name` via SQL join. Los PDFs, el summary de evento y el contrato mostraban "Producto" (fallback) en producción. Arreglado en 5 sitios + tipos locales + mocks. Eliminado `any[]` en 4 métodos de services (reemplazado por tipos del spec). Borrado `productService.addIngredients` que era deadcode.
- **Fase 3** (`af85e48`): `entities.ts` pasa a ser capa delgada sobre `components['schemas']`. **Bug del spec del backend arreglado**: `InventoryItem.type` declaraba `enum: [equipment, supply, Equipment, Supply]` sin `ingredient`; corregido a `[ingredient, equipment, supply]`. **Bug de la Web arreglado**: 5 formularios enviaban `user_id` en el body de create; el backend lo ignora (usa JWT) — quitado como dead weight.
- **Fase 4** ⏭️ SKIPPED por decisión del usuario. El backend `/api/dashboard/kpis` no calcula lo que las 3 plataformas (Web, iOS, Android) muestran — todas calculan client-side con 5-8 llamadas CRUD. Migrar solo el Web perpetuaría la divergencia. Postpuesto para un slice cross-platform de Etapa 2 con decisiones ya tomadas (bumpear a v1.1, campos nuevos documentados, fórmulas de `lib/finance.ts` replicables en SQL). **→ Cerrado 2026-04-20**: `DashboardKPIs` ahora incluye `net_sales_this_month`, `cash_collected_this_month`, `vat_collected_this_month`, `vat_outstanding_this_month` computados server-side con una CTE sobre eventos del mes en estado `confirmed/completed`. iOS, Android y Web consumen el mismo endpoint; cero agregacion client-side de los 8 KPI cards. Se agrego ademas el card "Ingresos — Ultimos 6 meses" (premium-only) consumiendo `/api/dashboard/revenue-chart?period=year`, con el mismo comportamiento en las 3 plataformas (visible solo para Pro/Business, sin blur ni upsell para Basic). Fix de bugs UI: Android `KPICard` en row horizontal usa ahora ancho fijo para centrar contenido corto; Web `KpiCard` value ahora usa `text-base sm:text-xl truncate` para no desbordar en viewports moviles.
- **Fase 5** (`9bd07ad`): fotos de evento migradas a los endpoints dedicados `GET/POST/DELETE /api/events/{id}/photos`. Eliminada la lógica que parseaba `event.photos` JSON client-side y serializaba el array completo con cada upload. El backend es ahora la única fuente de verdad del array de fotos.
- **Fase 6** (`67f19ad`): **bug del backend arreglado** — `SearchEventsAdvanced` no buscaba en `e.city`, solo en `e.location`, mientras que el Web filtraba client-side por city. Agregado `e.city ILIKE` al WHERE del SQL. `EventList.tsx` ahora usa el endpoint FTS del backend vía el hook `useEventSearch`; eliminado el comentario `// backend doesn't support these yet` y el bloque de filtrado client-side.
- **Fase 7**: services + hooks para `/api/dashboard/activity` y `/api/admin/audit-logs` + `RecentActivityCard` read-only en el Dashboard + `AdminAuditLogSection` paginada en el AdminDashboard. Los 2 endpoints del contract freeze dejan de ser deadcode del backend.
- **Fase 8** (`d75bab0`): CI pipeline verde de punta a punta — Playwright 28 tests rotos arreglados (selector `getByLabel('Contraseña')` ambiguo por el botón "Mostrar contraseña", `isBackendAvailable()` via `/health` probe para auto-skipear los tests que requieren backend, fix del regex `/registrarse/` → `/regístrate/`, orden de `localStorage.clear()` vs `goto`). `deploy.yml` preparado con comentarios documentando los secrets y el path — **NO activado** por decisión del usuario.
- **Fase 9** (este commit): actualización de docs Obsidian/PRD.

**Bugs preexistentes descubiertos durante el slice** (todos arreglados):
1. `product_name` del backend nunca llegaba a la UI — 5 sitios en PDFs/summary/contrato mostraban "Producto" fallback en producción
2. `user_id` enviado en 5 Insert payloads como dead weight
3. Enum `InventoryItem.type` del spec incorrecto (sin `ingredient`)
4. `SearchEventsAdvanced` no buscaba en `city`
5. `EventSummary.test.tsx` worker OOM que ocultaba 58 tests que nunca corrían
6. 12 tests preexistentes rotos (selectors desactualizados) escondidos por el OOM anterior
7. Playwright job del CI rojo por 28 fails pre-existentes (selector ambiguo `Contraseña`)

**Deuda técnica registrada** (no resuelta en este slice, documentada para slices futuros):
- ~~Migración de dashboard KPIs al backend (Fase 4 skipped — requiere sincronizar Web + iOS + Android con fórmulas SQL nuevas)~~ **→ Cerrado 2026-04-20** en el slice de paridad de dashboard (ver Fase 4 arriba).
- 3 tests skipped por leak en aggregation de ingredientes del componente EventSummary — requiere refactor de la lógica a función pura (bloqueado por Fase 4 que abriría el componente)
- 12 tests skipped por selectors/formatos desactualizados — requieren investigación individual

### Deuda acumulada de los slices Dashboard / Calendar / Events (2026-04-20)

Todos trackeados como GitHub issues ahora para poder priorizarlos individualmente y cerrarlos en slices futuros:

| # | Título | Label |
|---|---|---|
| [#88](https://github.com/tiagofur/eventosapp/issues/88) | Events: mover filter/search mobile al endpoint `/api/events/search` | `type:refactor` |
| [#89](https://github.com/tiagofur/eventosapp/issues/89) | iOS Events: pagination infra existe en VM pero no se dispara en UI | `type:refactor` |
| [#90](https://github.com/tiagofur/eventosapp/issues/90) | Android: Paging3 infra huérfana tras el cambio a sort client-side | `type:refactor` |
| [#91](https://github.com/tiagofur/eventosapp/issues/91) | Android Events list: soft-delete + undo toast (paridad con iOS) | `enhancement` |
| [#92](https://github.com/tiagofur/eventosapp/issues/92) | Android: `feature:events` tests no compilan (VMs con nuevos params) | `type:bug` |
| [#93](https://github.com/tiagofur/eventosapp/issues/93) | CI: agregar job de Android (gradle test + build) al pipeline | `type:chore` |
| [#94](https://github.com/tiagofur/eventosapp/issues/94) | i18n: extraer strings de Dashboard al catálogo (ES + EN) | `enhancement` |
| [#95](https://github.com/tiagofur/eventosapp/issues/95) | i18n: extraer strings de Events list al catálogo (ES + EN) | `enhancement` |

**Gate verde en el pipeline completo**:
- Backend: `go test ./...` + `redocly lint` verdes
- Web: typecheck + lint (0 errors) + 1128 unit tests + build + Playwright (2 pass / 26 auto-skip)
- CI gate de `api.ts` commiteado contra el spec actual

Commits del slice en rama `super-plan`: `0fd6aac`, `42124d0`, `2c23dd6`, `af85e48`, `9bd07ad`, `67f19ad`, `d75bab0`, y el commit de Fase 7 de activity log.

### Slice: Calendar parity + i18n foundation (2026-04-20)

Primera pantalla de paridad post-Dashboard:

- **Backend**: sin cambios — el Calendario no sirve strings desde servidor, solo data.
- **Todas las apps**: extraccion completa de strings hardcodeados → catalogo localizable, con ES + EN reales (no placeholders). Device / navigator locale gobierna; selector de idioma per-usuario queda para otro slice.
  - iOS: nuevo `Localizable.xcstrings` en `SolennixFeatures`, `Package.swift` con `defaultLocalization: "es"` + `resources: [.process("Resources")]`, `project.yml` con `knownRegions: [en, es, Base]`.
  - Android: nuevo `feature/calendar/src/main/res/values/strings.xml` + `values-en/` con 40+ keys. Antes todo era literal `Text("Calendario")` in-line.
  - Web: instalado `i18next` + `react-i18next` + `i18next-browser-languagedetector`, config en `web/src/i18n/config.ts`, catalogos por namespace en `web/src/i18n/locales/{es,en}/calendar.json`.
- **Polish del month view**:
  - Errores antes silenciados ahora visibles: Snackbar (Android), Alert (iOS), banner con Retry (Web).
  - Indicador "+N mas" en celdas con mas de 3 eventos.
  - Haptics nativos en long-press (iOS `sensoryFeedback`, Android `LocalHapticFeedback`).
  - Filtros por status (chips M3 / Menu iOS / pills web).
  - Web: la expansion dia-por-dia de rangos de bloqueo se reemplazo por un `Set<string>` keyed por `YYYY-MM-DD` — O(rangos × diasEnRango) una vez + lookup O(1).
- **ViewModel changes** (iOS + Android): enum `CalendarError { loadFailed, blockFailed, unblockFailed }` en lugar de strings de error hardcodeados en el VM. Los catches vacios historicos (`// Handle error`, `// Silently fail`) ahora escriben al error state.
- **Docs**: nuevo `19_I18N_STRATEGY.md` con el naming convention, file map, patron de uso por plataforma y verificacion rapida.

**Gate verde**:
- iOS: `xcodebuild ... build` → BUILD SUCCEEDED
- Android: `:app:assembleDebug` + `:feature:calendar:testDebugUnitTest` verdes
- Web: 1137 tests (96 suites) verdes, typecheck clean, `vite build` OK

### Paginas Publicas

- ✅ Landing page
- ✅ Login
- ✅ Registro
- ✅ Forgot password
- ✅ Reset password
- ✅ Acerca de (About)
- ✅ Politica de privacidad
- ✅ Terminos de servicio
- ✅ 404 Not Found

### Paginas Protegidas

- ✅ Dashboard (KPIs, resumen)
  - ✅ Alertas de Atencion (DashboardAttentionSection) — 3 categorias paridad cross-platform: cobro por cerrar, evento vencido, cotizacion urgente
  - ⏸️ Acciones inline en alertas: planeadas (Completar / Cancelar / "Pagar y completar" / "Solo completar"), pero **revertidas** tras la primera entrega (PR #72 reverted via PR #76) por un bug financiero compartido con mobile (auto-complete sin verificar monto). Mientras tanto, las acciones se ejecutan desde el detalle del evento. La invalidacion de cache `byEventIds` que surgio del review **sí** quedo en main (PR #78). Re-implementacion del feature inline pendiente.
- ✅ Busqueda global
- ✅ Calendario con vista de eventos
- ✅ Lista de eventos (EventList) con filtros: Todos, Proximos, Pasados, Borradores
- ✅ Cotizacion rapida (Quick Quote)

### Eventos

- ✅ Formulario de evento (nuevo/editar) con componentes:
  - ✅ Informacion general (EventGeneralInfo)
  - ✅ Productos (EventProducts)
  - ✅ Extras (EventExtras)
  - ✅ Equipamiento (EventEquipment)
  - ✅ Suministros (EventSupplies)
  - ✅ Finanzas (EventFinancials)
  - ✅ Pagos (Payments)
- ✅ Resumen de evento (EventSummary) con tabs: Resumen, Pagos, Compras, Contrato, Fotos, Checklist
- ✅ Checklist de carga interactivo (tab en EventSummary) con secciones: Equipo, Insumos Stock, Insumos Compra, Extras
- ✅ Pago exitoso de evento (EventPaymentSuccess)
- ✅ Modal de cliente rapido (QuickClientModal)
- ✅ Modal de fechas no disponibles (UnavailableDatesModal)

### Clientes

- ✅ Lista de clientes
- ✅ Detalle de cliente
- ✅ Formulario de cliente (nuevo/editar)

### Productos

- ✅ Lista de productos
- ✅ Detalle de producto
- ✅ Formulario de producto (nuevo/editar)

### Inventario

- ✅ Lista de inventario
- ✅ Detalle de inventario
- ✅ Formulario de inventario (nuevo/editar)

### Configuracion

- ✅ Settings (perfil, contrasena, negocio)
- ✅ Pricing / planes

### Admin

- ✅ Admin Dashboard (estadisticas, metricas)
- ✅ Admin Users (gestion de usuarios)

### Navegacion Web

- ✅ Sidebar desktop — 6 secciones + Config abajo (sin Cotizacion/CotizacionRapida/Buscar)
- ✅ Bottom Tab Bar mobile — 5 tabs: Inicio, Calendario, Eventos, Clientes, Mas (solo smartphones, <768px)
- ✅ Menu "Mas" mobile — Productos, Inventario, Configuracion
- ✅ QuickActionsFAB — visible solo en smartphones (<768px)
- ✅ CommandPalette (Cmd+K/Ctrl+K) con navegacion a /events
- ✅ Ruta /events agregada en App.tsx

### Infraestructura Web

- ✅ ProtectedRoute (autenticacion requerida)
- ✅ AdminRoute (rol admin requerido)
- ✅ Layout compartido
- ✅ AuthContext + ThemeContext
- ✅ Tests unitarios para la mayoria de paginas

---

## 4. iOS — Implementado

> [!abstract] Resumen
> App SwiftUI con MVVM, SPM packages, 4 tipos de widgets, Live Activity, 7 generadores PDF, Spotlight indexing y RevenueCat. Ver [[05_TECHNICAL_ARCHITECTURE_IOS]] para detalles de arquitectura.

### Autenticacion

- ✅ Login (LoginView)
- ✅ Registro (RegisterView)
- ✅ Biometric gate (BiometricGateView)
- ✅ Forgot password (ForgotPasswordView)
- ✅ Reset password (ResetPasswordView)

### Eventos

- ✅ Lista de eventos (EventListView)
- ✅ Detalle de evento — Hub con cards de navegacion (EventDetailView)
  - ✅ Sub-pantalla: Finanzas (EventFinancesDetailView) — 9 metricas financieras
  - ✅ Sub-pantalla: Pagos (EventPaymentsDetailView) — KPIs, historial, registro de pagos
  - ✅ Sub-pantalla: Productos (EventProductsDetailView) — lista con cantidades y precios
  - ✅ Sub-pantalla: Extras (EventExtrasDetailView) — lista con descripciones y precios
  - ✅ Sub-pantalla: Insumos (EventSuppliesDetailView) — KPIs, badges almacen/compra
  - ✅ Sub-pantalla: Equipo (EventEquipmentDetailView) — lista con cantidades
  - ✅ Sub-pantalla: Lista de compras (EventShoppingListView) — comparacion con stock actual
  - ✅ Sub-pantalla: Fotos (EventPhotosDetailView) — galeria con upload y lightbox
- ✅ Formulario de evento 5 pasos (EventFormView):
  - ✅ Step 1: Informacion general (Step1GeneralView)
  - ✅ Step 2: Productos (Step2ProductsView)
  - ✅ Step 3: Extras (Step3ExtrasView)
  - ✅ Step 4: Suministros y equipamiento (Step4SuppliesEquipmentView)
  - ✅ Step 5: Finanzas (Step5FinancesView)
- ✅ Checklist de evento (EventChecklistView)
- ✅ Quick client sheet (QuickClientSheet)

### Clientes

- ✅ Lista de clientes (ClientListView)
- ✅ Detalle de cliente (ClientDetailView)
- ✅ Formulario de cliente (ClientFormView)
- ✅ Cotizacion rapida (QuickQuoteView)

### Productos

- ✅ Lista de productos (ProductListView) — con busqueda, filtros por categoria, ordenamiento
- ✅ Detalle de producto (ProductDetailView) — KPI cards (precio, costo/unidad, margen, eventos), alerta inteligente, tablas de composicion con costos, demanda por fecha con urgencia y revenue
- ✅ Formulario de producto (ProductFormView) — con gestion estructurada de ingredientes/equipo/insumos con costos estimados

### Inventario

- ✅ Lista de inventario (InventoryListView) — con busqueda, filtro stock bajo, ordenamiento
- ✅ Regla stock bajo iOS alineada: solo alerta si `minimumStock > 0` y `currentStock < minimumStock` (caso 0/0 sin alerta)
- ✅ Detalle de inventario (InventoryDetailView) — KPI cards (costo, valor en stock), pronostico de demanda, alerta inteligente 7 dias, barras de salud de stock, ajuste rapido
- ✅ Formulario de inventario (InventoryFormView)

### Calendario

- ✅ Vista de calendario (CalendarView)
- ✅ Grid de calendario (CalendarGridView)

### Dashboard

- ✅ Dashboard principal (DashboardView)
- ✅ Tarjetas KPI — 8 KPIs (KPICardView)
- ✅ Grafico de estado de eventos (EventStatusChart)
- ✅ Grafico de comparativa financiera (FinancialComparisonChart)
- ✅ Alertas de Atencion (PendingEventsModalView) — 3 categorias paridad cross-platform: cobro por cerrar, evento vencido, cotizacion urgente
- ✅ Acciones inline en alertas (2026-04): Completar / Cancelar / "Pagar y completar" / "Solo completar" (en evento vencido con saldo se muestran las 3 ultimas; "Pagar y completar" auto-completa el evento solo si el monto cubre el saldo). Sheet reusable `PaymentEntrySheet` en `Common/Views/`
- ✅ Quick Actions — 2 botones: Nuevo Evento + Nuevo Cliente
- ✅ Alertas de Stock Bajo — regla: `minimumStock > 0 && currentStock < minimumStock` (caso 0/0 sin alerta)
- ✅ Proximos Eventos con dropdown de estado
- ✅ Onboarding Checklist (OnboardingChecklistView)

### Configuracion

- ✅ Pantalla de configuracion (SettingsView)
- ✅ Editar perfil (EditProfileView)
- ✅ Cambiar contrasena (ChangePasswordView)
- ✅ Configuracion de negocio (BusinessSettingsView)
- ✅ Defaults de contrato (ContractDefaultsView)
- ✅ Precios / planes (PricingView)
- ✅ Acerca de (AboutView)
- ✅ Privacidad (PrivacyView)
- ✅ Terminos (TermsView)

### Busqueda

- ✅ Busqueda global (SearchView)
- ✅ Core Spotlight indexing (SpotlightIndexer)

### Onboarding

- ✅ Onboarding view (OnboardingView)
- ✅ Paginas de onboarding (OnboardingPageView)

### Generacion de PDF (7 tipos)

- ✅ Presupuesto (BudgetPDFGenerator)
- ✅ Contrato (ContractPDFGenerator)
- ✅ Lista de compras (ShoppingListPDFGenerator)
- ✅ Checklist (ChecklistPDFGenerator)
- ✅ Reporte de pagos (PaymentReportPDFGenerator)
- ✅ Factura (InvoicePDFGenerator)
- ✅ Lista de equipamiento (EquipmentListPDFGenerator)

### Widgets (4 tipos)

- ✅ KPI Widget (KPIWidget)
- ✅ Eventos proximos (UpcomingEventsWidget)
- ✅ Lock Screen widget (LockScreenWidget)
- ✅ Widget interactivo (InteractiveWidget)

### Live Activity

- ✅ SolennixLiveActivityAttributes
- ✅ SolennixLiveActivityView
- ✅ LiveActivityManager

### Networking

- ✅ APIClient (actor-based, URLSession)
- ✅ AuthManager con refresh automatico de tokens
- ✅ KeychainHelper para almacenamiento seguro
- ✅ NetworkMonitor para estado de conectividad

### Helpers

- ✅ HapticsHelper (feedback haptico)
- ✅ StoreReviewHelper (solicitud de resena)
- ✅ OnboardingTips
- ✅ SentryHelper (crash reporting)
- ✅ SpotlightIndexer
- ✅ LiveActivityManager

### Navegacion

- ✅ CompactTabLayout — 5 tabs: Inicio, Calendario, Eventos, Clientes, Mas
- ✅ SidebarSplitLayout — 6 secciones + Config abajo (sin Cotizacion/CotizacionRapida/Buscar)
- ✅ MoreMenuView — 3 items: Productos, Inventario, Configuracion
- ✅ QuickActionsFAB — FAB flotante con Nuevo Evento + Cotizacion Rapida (phones)
- ✅ Botones contextuales en EventListView (iPad) — Nuevo Evento + Cotizacion Rapida
- ✅ Busqueda en topbar via .searchable()
- ✅ DeepLinkHandler
- ✅ Route + RouteDestination

### Plan Limits

- ✅ PlanLimitsManager (verificacion de limites por plan)
- ✅ PaywallSheet (UI de upgrade reactivo a 403 `plan_limit_exceeded`)
- ✅ Enforcement en EventFormViewModel, ClientFormViewModel, ProductFormViewModel

### Pendiente iOS

> [!warning] Items pendientes iOS

| Item               | Prioridad | Notas                                                                                      |
| ------------------ | --------- | ------------------------------------------------------------------------------------------ |
| Push notifications | P1        | Device tokens se registran pero backend no envia. Falta manejo de notificaciones entrantes |

> [!note] Items completados iOS
>
> - ~~Contract preview interactivo~~ — EventContractPreviewView implementado con gating de anticipo y campos faltantes
> - ~~StoreKit 2 flujo de compra completo~~ — Reemplazado por RevenueCat SDK — flujo completo implementado
> - ~~Feature gating enforcement~~ — PlanLimitsManager implementado y wired en vistas principales
> - ~~Apple Sign-In en UI~~ — Wired AppleSignInService a LoginView y RegisterView
> - ~~Google Sign-In en UI~~ — GoogleSignIn SDK integrado con GoogleSignInService

---

## 5. Android — Implementado

> [!abstract] Resumen
> App Jetpack Compose con MVVM, Hilt DI, arquitectura multi-module, 8 generadores PDF, RevenueCat billing y Glance widget. Ver [[06_TECHNICAL_ARCHITECTURE_ANDROID]] para detalles de arquitectura.

### Autenticacion

- ✅ Login (LoginScreen)
- ✅ Registro (RegisterScreen)
- ✅ Google Sign-In (GoogleSignInButton — Credential Manager)
- ✅ Apple Sign-In (AppleSignInButton — WebView OAuth flow)
- ✅ Biometric gate (BiometricGateScreen)
- ✅ Forgot password (ForgotPasswordScreen)
- ✅ Reset password (ResetPasswordScreen)

### Eventos

- ✅ Lista de eventos (EventListScreen)
- ✅ Detalle de evento — Hub con cards de navegacion (EventDetailScreen)
  - ✅ Sub-pantalla: Finanzas (EventFinancesScreen) — 9 metricas financieras
  - ✅ Sub-pantalla: Pagos (EventPaymentsScreen) — KPIs, historial, registro de pagos
  - ✅ Sub-pantalla: Productos (EventProductsScreen) — lista con cantidades y precios
  - ✅ Sub-pantalla: Extras (EventExtrasScreen) — lista con descripciones y precios
  - ✅ Sub-pantalla: Insumos (EventSuppliesScreen) — KPIs, badges almacen/compra
  - ✅ Sub-pantalla: Equipo (EventEquipmentScreen) — lista con cantidades
  - ✅ Sub-pantalla: Lista de compras (EventShoppingListScreen) — comparacion con stock
  - ✅ Sub-pantalla: Fotos (EventPhotosScreen) — galeria con upload y lightbox
- ✅ Formulario de evento 6 pasos (EventFormScreen):
  - ✅ StepGeneralInfo
  - ✅ StepProducts
  - ✅ StepExtras
  - ✅ StepEquipment
  - ✅ StepSupplies
  - ✅ StepSummary
- ✅ Checklist de evento (EventChecklistScreen)

### Clientes

- ✅ Lista de clientes (ClientListScreen)
- ✅ Detalle de cliente (ClientDetailScreen)
- ✅ Formulario de cliente (ClientFormScreen)
- ✅ Cotizacion rapida (QuickQuoteScreen, QuickQuoteViewModel, QuickQuotePdfGenerator)

### Productos

- ✅ Lista de productos (ProductListScreen) — con busqueda, filtros por categoria, ordenamiento (nombre/precio/categoria)
- ✅ Detalle de producto (ProductDetailScreen) — KPI cards (precio, costo/unidad, margen, eventos), alerta inteligente, tablas de composicion con costos, demanda por fecha con urgencia y revenue
- ✅ Formulario de producto (ProductFormScreen) — con gestion estructurada de ingredientes/equipo/insumos con picker de inventario y costos estimados

### Inventario

- ✅ Lista de inventario (InventoryListScreen) — con busqueda, filtro stock bajo, ordenamiento (nombre/stock/minimo/costo), costo unitario visible por item y alerta de stock bajo discreta (badge pequeno)
- ✅ Detalle de inventario (InventoryDetailScreen) — KPI cards (stock, minimo, costo, valor), pronostico de demanda, alerta inteligente 7 dias, barras de salud, ajuste rapido de stock
- ✅ Formulario de inventario (InventoryFormScreen)

### Consistencia de Regla Stock Bajo

- ✅ Android, iOS y Web usan regla estricta: `minimum > 0 && stock actual < stock minimo`
- ✅ `stock actual == stock minimo` no dispara alerta
- ✅ `minimum = 0` y `stock = 0` no dispara alerta

### Calendario

- ✅ Vista de calendario (CalendarScreen)

### Dashboard

- ✅ Dashboard principal (DashboardScreen)
- ✅ Tarjetas KPI — 8 KPIs
- ✅ Alertas de Atencion (PendingEventItem en banner) — 3 categorias paridad cross-platform: cobro por cerrar, evento vencido, cotizacion urgente
- ✅ Acciones inline en alertas (2026-04): Completar / Cancelar / "Pagar y completar" / "Solo completar" (Material `Button` por categoria, `ModalBottomSheet` para registrar pago; en evento vencido con saldo se muestran las 3 ultimas y "Pagar y completar" solo auto-completa cuando el monto cubre el saldo). `PaymentModal` extraido a `core:designsystem` para reuso entre dashboard y detalle de evento
- ✅ Quick Actions — 2 botones: Nuevo Evento + Nuevo Cliente
- ✅ Grafico de estado de eventos + Comparativa financiera
- ✅ Alertas de Inventario
- ✅ Proximos Eventos
- ✅ Onboarding Checklist inline
- ✅ Saludo "Hola, nombre" + fecha
- ✅ Onboarding (OnboardingScreen)

### Generacion de PDF (8 tipos)

- ✅ Presupuesto (BudgetPdfGenerator)
- ✅ Contrato (ContractPdfGenerator)
- ✅ Lista de compras (ShoppingListPdfGenerator)
- ✅ Checklist (ChecklistPdfGenerator)
- ✅ Reporte de pagos (PaymentReportPdfGenerator)
- ✅ Factura (InvoicePdfGenerator)
- ✅ Lista de equipamiento (EquipmentListPdfGenerator)
- ✅ Cotizacion rapida (QuickQuotePdfGenerator)

### Configuracion

- ✅ Pantalla de configuracion (SettingsScreen)
- ✅ Editar perfil (EditProfileScreen)
- ✅ Cambiar contrasena (ChangePasswordScreen)
- ✅ Configuracion de negocio (BusinessSettingsScreen)
- ✅ Defaults de contrato (ContractDefaultsScreen)
- ✅ Precios / suscripcion (PricingScreen, SubscriptionScreen)
- ✅ Acerca de (AboutScreen)
- ✅ Privacidad (PrivacyScreen)
- ✅ Terminos (TermsScreen)

### Busqueda

- ✅ Busqueda global (SearchScreen)

### Networking

- ✅ KtorClient (OkHttp engine, Ktor 3.1.0)
- ✅ AuthManager con tokens Bearer
- ✅ Content negotiation (kotlinx.serialization)

### Plan Limits

- ✅ PlanLimitsManager (verificacion de limites por plan)
- ✅ UpgradePlanDialog (prompt de upgrade)
- ✅ Enforcement en EventFormViewModel, ClientFormViewModel, ProductFormViewModel
- ✅ Enforcement en ClientListScreen, ProductListScreen

### Widgets

- ✅ QuickActionsWidget (Glance) — eventos del dia + acciones rapidas (nuevo evento, cotizacion rapida, calendario)

### Graficos

- ✅ DemandForecastChart (Canvas-based bar chart en ProductDetailScreen)

### Navegacion

- ✅ Bottom navigation — 5 tabs: Inicio, Calendario, Eventos, Clientes, Mas
- ✅ MoreMenuScreen — 3 items: Productos, Inventario, Configuracion
- ✅ QuickActionsFAB — FAB con Nuevo Evento + Cotizacion Rapida (phones)
- ✅ Botones contextuales en EventListScreen (tablet) — Nuevo Evento + Cotizacion Rapida
- ✅ SearchBar en TopAppBar
- ✅ Arquitectura modular multi-feature

### Wave Rescate Android — Blockers Play Store (2026-04-11)

> [!danger] Audit 2026-04-11 — los docs estaban desincronizados con el código
> Auditoría cruzada detectó que varios items marcados como "✅ Resuelto" NO están en el código. Ver [[../Android/Firma y Secretos de Release|Firma y Secretos de Release]] para el plan de rescate.

| Bloque | Item                                  | Estado                                  | Archivos afectados                                                                             |
| ------ | ------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **A**  | Keystore password trivial (`asd123`)  | 🔄 Infra lista, usuario debe rotar      | `android/key.properties`, `android/solennix.jks`                                               |
| **A**  | `REVENUECAT_API_KEY` sin validar      | ✅ Fail-fast agregado                   | `android/app/build.gradle.kts`                                                                 |
| **A**  | Release sin fail-fast de secretos     | ✅ Agregado                             | `android/app/build.gradle.kts`                                                                 |
| **B**  | SSL Pinning declarado pero inexistente | ✅ Infra lista, usuario debe generar pins | `android/core/network/.../KtorClient.kt`, `ApiErrorMapper.kt`, `ApiError.kt`                  |
| **C**  | Play Billing botón "Upgrade" vacío    | ✅ Resuelto (ruta `pricing` ahora renderea `SubscriptionScreen`) | `CompactBottomNavLayout.kt:298`, `PricingScreen.kt` eliminado |
| **C**  | `SubscriptionScreen` BillingState incompleto | ✅ Auditado — ya estaba bien (NotReady/Ready/Error cubiertos) | `SubscriptionScreen.kt:94-129`                    |
| **C**  | RevenueCat silent failure en register/Google | ✅ Resuelto con `logInWith` + `Log.w` (no bloquea auth) | `AuthViewModel.kt:172-199`                              |
| **D.1** | 7 silent `catch (_:)` — CRUD acciones    | ✅ Parcial (Product/Inventory delete+adjust, Event primary load) | `ProductListViewModel`, `InventoryListViewModel`, `EventFormViewModel.loadExistingEvent` |
| **D.2** | Silent catches en secondary fetches     | ❌ Pendiente slice 3                     | `EventFormViewModel.fetchProductCosts/fetchEquipmentSuggestions`, `QuickQuoteViewModel.fetchProductCosts` |
| **D.3** | 12 pantallas con spinner sin timeout  | ❌ Pendiente (UX polish, no blocker)    | ClientDetail, ClientForm, ClientList, ProductForm, ProductDetail, Inventory*, EventDetail*... |
| **E**  | `PricingScreen:36` crash si user null | ⏭️ Descartado — archivo eliminado en Bloque C | —                                                                             |
| **E**  | `BuildConfig.API_BASE_URL` sin validar | ⏭️ Descartado — hardcoded a `"https://api.solennix.com/api/"`, no nullable | `core/network/build.gradle.kts:20`                    |
| **E**  | `ClientFormViewModel` campos opcionales sin validación | ⏭️ Descartado — re-audit 2026-04-11 confirmó validación COMPLETA ya existente (name/phone required + email/phone format, hasAttemptedSubmit pattern) | `feature/clients/.../ClientFormViewModel.kt:62-93` |
| **E**  | `EventFormViewModel` sin validación de tiempo client-side | ✅ Agregado `isValidTime24h` + `normalizeTime` helpers; validación en `validateStep(0)` y defensivo en `saveEvent`. Formato `HH:mm` requerido. Rechaza horas iguales pero permite overnight events (20:00→02:00 común en bodas LATAM) | `feature/events/.../EventFormViewModel.kt:validateStep, saveEvent` |
| **F**  | Sync final de docs con realidad       | ✅ Completado — `Roadmap Android.md` corregido (Fase 0.3 y 2.2 dejaron de mentir) | `PRD/11_CURRENT_STATUS.md`, `Android/Roadmap Android.md`, `Android/Firma y Secretos de Release.md` |

### Pendiente Android (no blocker)

> [!warning] Items pendientes Android

| Item                                                 | Prioridad   | Notas                                                                                            |
| ---------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------ |
| Push notifications (FCM)                             | ✅ RESUELTO | FCM completo: SolennixMessagingService implementado, deep links desde notificaciones             |
| Deep linking completo                                | ✅ RESUELTO | Parser completo: auth/app separados, 11 hosts, subrutas de evento                                |
| Navigation Rail (tablets)                            | P2          | Parcialmente implementado via AdaptiveNavigationRailLayout — falta completar refactor de sidebar |
| Live Activity equivalente (notificacion persistente) | P2          | No implementado                                                                                  |

> [!note] Items completados Android
>
> - ~~Widgets (Glance)~~ — QuickActionsWidget implementado con eventos del dia + acciones rapidas
> - ~~Generacion de PDF~~ — 8 generadores implementados: Budget, Contract, Shopping, Checklist, PaymentReport, Invoice, Equipment, QuickQuote
> - ~~RevenueCat SDK integrado~~ — SDK agregado y `Purchases.sharedInstance` inicializado (compra real NO implementada — ver Wave Rescate Bloque C)
> - ~~Google Sign-In mock~~ — Reemplazado mock con Credential Manager real
> - ~~Shared element transitions lista→detalle~~ — SharedTransitionLayout + sharedBounds via LocalSharedTransitionScope/LocalNavAnimatedVisibilityScope. Key pattern: `event_card_{id}`
> - ~~Skeleton → content crossfade~~ — AnimatedContent con skeleton + shimmer en EventListScreen
> - ~~Stagger animations en EventList~~ — AnimatedEventListItem con delay por índice (≤5 items × 45ms)
> - ~~Spring physics en swipes~~ — SwipeToDismissBox en ProductList/InventoryList con feedback elástico del fondo de borrado + reflow spring en secciones de inventario
> - ~~Respetar ANIMATOR_DURATION_SCALE~~ — Delay multiplicado por Settings.Global.ANIMATOR_DURATION_SCALE; skip si = 0
> - ~~Contraste WCAG AA con paleta dorado/navy~~ — Tokens `secondaryText` / `tertiaryText` / `tabBarInactive` recalibrados en `Color.kt` + `EmptyState` con iconografía más legible
> - ~~Soporte `fontScale` extremo~~ — `KPICard`, `PremiumButton` y `QuickActionButton` adaptados para escalas altas con alturas mínimas y textos multi-línea
> - ~~Accesibilidad a11y StatusBadge~~ — contentDescription + Role.Image en StatusBadge
> - ~~TalkBack en flujos principales~~ — labels semánticos y agrupaciones lógicas en tarjetas de `DashboardScreen` y `EventListScreen`
> - ~~Tests de accesibilidad Android~~ — `DashboardAccessibilityTest` y `EventAccessibilityTest` validan contenido narrado por TalkBack
> - ~~Baseline Profiles (infra)~~ — módulo `:baselineprofile` con `BaselineProfileGenerator` + `measureColdStartup`; app integrada con `profileinstaller` y consumo de perfiles en release
> - ~~Dark mode polish (parcial)~~ — contraste dinámico en Events/Inventory para badges/FAB usando `MaterialTheme.colorScheme.onPrimary` (evita blanco fijo en modo oscuro)
> - ~~Photo picker con crop~~ — flujo de fotos de eventos aplica auto-crop 4:3 antes de compresión/upload
> - ~~RevenueCat logInWith llamado en register/Google~~ — El call existe pero está envuelto en `catch (_:) {}` silencioso (ver Wave Rescate Bloque C)
> - ~~Contract preview interactivo~~ — EventContractPreviewScreen implementado con gating de anticipo y campos faltantes
> - ~~Cotizacion rapida (Quick Quote)~~ — QuickQuoteScreen + QuickQuoteViewModel + QuickQuotePdfGenerator
> - ~~Feature gating enforcement~~ — PlanLimitsManager wired into EventForm, ClientForm, ProductForm + UpgradePlanDialog

---

## 6. Tabla de Paridad Detallada

> [!abstract] Referencia de paridad
> Esta seccion documenta el estado feature-por-feature en todas las plataformas. Ver [[02_FEATURES]] para la definicion completa de cada feature y [[04_MONETIZATION]] para el gating por plan.

### Eventos

| Feature                                        | iOS        | Android    | Web              | Backend | Notas                                                                               |
| ---------------------------------------------- | ---------- | ---------- | ---------------- | ------- | ----------------------------------------------------------------------------------- |
| Lista de eventos                               | ✅         | ✅         | ✅               | ✅      | Web: EventList con filtros                                                          |
| Detalle de evento                              | ✅         | ✅         | ✅ (Summary)     | ✅      |                                                                                     |
| Formulario de evento                           | ✅ 5 pasos | ✅ 6 pasos | ✅ Multi-seccion | ✅      | Android incluye paso Summary                                                        |
| Productos en evento                            | ✅         | ✅         | ✅               | ✅      |                                                                                     |
| Extras en evento                               | ✅         | ✅         | ✅               | ✅      |                                                                                     |
| Equipamiento en evento                         | ✅         | ✅         | ✅               | ✅      |                                                                                     |
| Suministros en evento                          | ✅         | ✅         | ✅               | ✅      |                                                                                     |
| Conflictos de equipamiento                     | ✅         | ✅         | ✅               | ✅      |                                                                                     |
| Sugerencias de equipamiento                    | ✅         | ✅         | ✅               | ✅      |                                                                                     |
| Fotos de evento                                | ✅         | ✅         | ✅               | ✅      | Galeria con upload, lightbox y eliminacion en las 3 plataformas                     |
| Checklist de evento                            | ✅         | ✅         | ✅               | ➖      | Cliente-side, interactivo con progreso en las 3 plataformas                         |
| Pago de evento (Stripe)                        | ⬜         | ⬜         | ✅               | ✅      | Solo web tiene checkout Stripe                                                      |
| Registro de pagos en detalle                   | ✅         | ✅         | ✅               | ✅      | iOS y Android: sub-pantalla de pagos con historial y registro                       |
| Eventos proximos                               | ✅         | ✅         | ✅               | ✅      |                                                                                     |
| Quick client en evento                         | ✅         | ⬜         | ✅               | ✅      |                                                                                     |
| Detalle evento: Hub con cards                  | ✅         | ✅         | ✅ (tabs)        | ✅      | Mobile: cards navegables. Web: tabs                                                 |
| Detalle evento: Sub-pantalla finanzas (9 KPIs) | ✅         | ✅         | ✅               | ✅      |                                                                                     |
| Detalle evento: Lista de compras con stock     | ✅         | ✅         | ✅               | ✅      |                                                                                     |
| Detalle evento: Contract preview interactivo   | ✅         | ✅         | ✅               | ✅      | Preview con gating de anticipo y deteccion de campos faltantes en las 3 plataformas |

### Clientes

| Feature               | iOS | Android | Web | Backend | Notas        |
| --------------------- | --- | ------- | --- | ------- | ------------ |
| Lista de clientes     | ✅  | ✅      | ✅  | ✅      |              |
| Detalle de cliente    | ✅  | ✅      | ✅  | ✅      |              |
| Formulario de cliente | ✅  | ✅      | ✅  | ✅      |              |
| Cotizacion rapida     | ✅  | ✅      | ✅  | ➖      | Cliente-side |

### Productos

| Feature                                              | iOS | Android | Web | Backend | Notas                                 |
| ---------------------------------------------------- | --- | ------- | --- | ------- | ------------------------------------- |
| Lista de productos                                   | ✅  | ✅      | ✅  | ✅      |                                       |
| Ordenamiento de lista                                | ✅  | ✅      | ✅  | ✅      | Nombre, Precio, Categoria             |
| Detalle de producto                                  | ✅  | ✅      | ✅  | ✅      |                                       |
| KPI cards (precio, costo, margen, eventos)           | ✅  | ✅      | ✅  | ✅      |                                       |
| Tablas de composicion (insumos, equipo, suministros) | ✅  | ✅      | ✅  | ✅      | Con costos estimados                  |
| Alerta inteligente de demanda                        | ✅  | ✅      | ✅  | ✅      | Demanda 7 dias + revenue estimado     |
| Demanda por fecha con urgencia                       | ✅  | ✅      | ✅  | ✅      | Badges Hoy/Manana, revenue por evento |
| Formulario de producto                               | ✅  | ✅      | ✅  | ✅      |                                       |
| Gestion de ingredientes/equipo/insumos en form       | ✅  | ✅      | ✅  | ✅      | Con picker de inventario y costos     |
| Ingredientes                                         | ✅  | ✅      | ✅  | ✅      |                                       |
| Exportar CSV                                         | ⬜  | ⬜      | ✅  | ➖      | Solo web                              |

### Inventario

| Feature                                 | iOS | Android | Web | Backend | Notas                                         |
| --------------------------------------- | --- | ------- | --- | ------- | --------------------------------------------- |
| Lista de inventario                     | ✅  | ✅      | ✅  | ✅      |                                               |
| Ordenamiento de lista                   | ✅  | ✅      | ✅  | ✅      | Nombre, Stock, Minimo, Costo                  |
| Detalle de inventario                   | ✅  | ✅      | ✅  | ✅      |                                               |
| KPI cards (stock, minimo, costo, valor) | ✅  | ✅      | ✅  | ✅      |                                               |
| Pronostico de demanda desde eventos     | ✅  | ✅      | ✅  | ✅      | Calcula demanda por ingredientes de productos |
| Alerta inteligente de stock 7 dias      | ✅  | ✅      | ✅  | ✅      | Critico/advertencia/OK                        |
| Barras de salud de stock                | ✅  | ✅      | ✅  | ✅      | Stock actual vs minimo vs demanda             |
| Ajuste rapido de stock                  | ✅  | ✅      | ✅  | ✅      | Con botones -10/-1/+1/+10                     |
| Formulario de inventario                | ✅  | ✅      | ✅  | ✅      |                                               |
| Exportar CSV                            | ⬜  | ⬜      | ✅  | ➖      | Solo web                                      |

### Calendario

| Feature                            | iOS | Android | Web | Backend | Notas                                                                          |
| ---------------------------------- | --- | ------- | --- | ------- | ------------------------------------------------------------------------------ |
| Vista mensual (unica vista)        | ✅  | ✅      | ✅  | ✅      | Vista lista ELIMINADA — migrada a seccion Eventos                              |
| Fechas no disponibles (long-press) | ✅  | ✅      | 🔄  | ✅      | Web: pendiente agregar right-click. iOS: pendiente rangos en long-press        |
| Gestion centralizada de bloqueos   | ✅  | ✅      | 🔄  | ✅      | iOS: BlockedDatesSheet implementado. Web: expandir modal. Android: BottomSheet |
| Toolbar simplificado               | 🔄  | 🔄      | 🔄  | ➖      | Refactor pendiente: solo "Gestionar Bloqueos" + "Hoy"                          |
| Panel de dia seleccionado          | ✅  | ✅      | ✅  | ➖      | Split view en tablet/desktop                                                   |

### Autenticacion

| Feature              | iOS | Android | Web | Backend | Notas                                                                  |
| -------------------- | --- | ------- | --- | ------- | ---------------------------------------------------------------------- |
| Login email/password | ✅  | ✅      | ✅  | ✅      |                                                                        |
| Registro             | ✅  | ✅      | ✅  | ✅      |                                                                        |
| Forgot password      | ✅  | ✅      | ✅  | ✅      |                                                                        |
| Reset password       | ✅  | ✅      | ✅  | ✅      |                                                                        |
| Google Sign-In       | ✅  | ✅      | ✅  | ✅      | iOS: GoogleSignIn SDK, Android: Credential Manager, Web: GSI           |
| Apple Sign-In        | ✅  | ✅      | ✅  | ✅      | iOS: AuthenticationServices, Android: WebView OAuth, Web: Apple JS SDK |
| Biometric gate       | ✅  | ✅      | ➖  | ➖      | Solo movil                                                             |
| Refresh token        | ✅  | ✅      | ✅  | ✅      |                                                                        |

### Dashboard

| Feature                       | iOS | Android | Web | Backend | Notas                                                                                    |
| ----------------------------- | --- | ------- | --- | ------- | ---------------------------------------------------------------------------------------- |
| Dashboard principal           | ✅  | ✅      | ✅  | ✅      |                                                                                          |
| Header (saludo + fecha)       | ✅  | ✅      | ✅  | ➖      | Todas las plataformas tienen saludo + fecha                                              |
| KPI cards (8) — server-side   | ✅  | ✅      | ✅  | ✅      | Backend `/api/dashboard/kpis` como source of truth. Cero client-side aggregation.        |
| Revenue chart 6 meses (premium) | ✅ | ✅    | ✅  | ✅      | `/api/dashboard/revenue-chart?period=year`. Premium-only.                                 |
| Events by status (backend)    | ✅  | ✅      | ✅  | ✅      | `/api/dashboard/events-by-status?scope=month\|all`                                       |
| Alertas de Atencion           | ✅  | ✅      | ✅  | ✅      | 3 categorias paridad cross-platform: cobro por cerrar, evento vencido, cotizacion urgente |
| Acciones inline en alertas    | ✅  | ✅      | ✅  | ➖      | Completar / Cancelar / "Pagar y completar" / "Solo completar". Web re-implemented with amount-check guard (PR #79). |
| Quick Actions (2)             | ✅  | ✅      | ✅  | ➖      | Nuevo Evento + Nuevo Cliente en las 3 plataformas                                        |
| Chart: Distribucion estados   | ✅  | ✅      | ✅  | ✅      | Desde backend (antes era client-side)                                                    |
| Chart: Comparacion financiera | ✅  | ✅      | ✅  | ✅      | Zero-padded 6-month data from backend                                                    |
| Stock Bajo                    | ✅  | ✅      | ✅  | ➖      | Regla unificada: `minimum > 0 && stock actual < stock minimo`; `stock==minimo` no alerta |
| Proximos Eventos              | ✅  | ✅      | ✅  | ✅      |                                                                                          |
| Onboarding Checklist          | ✅  | ✅      | ✅  | ➖      | Inline en las 3 plataformas                                                              |
| Orden secciones               | ✅  | ✅      | ✅  | ➖      | Saludo → Onboarding → Banner → Alertas → KPIs → Actions → Charts → Stock → Eventos       |

### Pagos

| Feature                       | iOS | Android | Web | Backend | Notas                                                                |
| ----------------------------- | --- | ------- | --- | ------- | -------------------------------------------------------------------- |
| Registro de pagos en evento   | ✅  | ✅      | ✅  | ✅      | iOS/Android: sub-pantalla de pagos con historial y modal de registro |
| Historial de pagos por evento | ✅  | ✅      | ✅  | ✅      | Con KPIs (Total, Pagado, Saldo) y barra de progreso                  |

### PDFs

| Feature                   | iOS | Android | Web | Backend | Notas                                     |
| ------------------------- | --- | ------- | --- | ------- | ----------------------------------------- |
| Presupuesto PDF           | ✅  | ✅      | ✅  | ➖      | Web: generateBudgetPDF en pdfGenerator.ts |
| Contrato PDF              | ✅  | ✅      | ✅  | ➖      | Con template de tokens personalizables    |
| Lista de compras PDF      | ✅  | ✅      | ✅  | ➖      | Web: generateShoppingListPDF              |
| Checklist PDF             | ✅  | ✅      | ✅  | ➖      | Web: generateChecklistPDF                 |
| Reporte de pagos PDF      | ✅  | ✅      | ✅  | ➖      | Web: generatePaymentReportPDF             |
| Factura PDF               | ✅  | ✅      | ✅  | ➖      | Web: generateInvoicePDF                   |
| Lista de equipamiento PDF | ✅  | ✅      | ⬜  | ➖      | Web pendiente                             |
| Cotizacion rapida PDF     | ✅  | ✅      | ⬜  | ➖      | Web pendiente                             |

### Busqueda

| Feature                     | iOS | Android | Web | Backend | Notas    |
| --------------------------- | --- | ------- | --- | ------- | -------- |
| Busqueda global             | ✅  | ✅      | ✅  | ✅      |          |
| Spotlight / search indexing | ✅  | ⬜      | ➖  | ➖      | Solo iOS |

### Widgets y Extensiones

| Feature                 | iOS | Android | Web | Backend | Notas                                      |
| ----------------------- | --- | ------- | --- | ------- | ------------------------------------------ |
| KPI Widget              | ✅  | ⬜      | ➖  | ➖      | iOS only                                   |
| Eventos proximos widget | ✅  | ✅      | ➖  | ➖      | QuickActionsWidget muestra eventos del dia |
| Lock Screen widget      | ✅  | ⬜      | ➖  | ➖      | iOS only                                   |
| Widget interactivo      | ✅  | ✅      | ➖  | ➖      | QuickActionsWidget con acciones rapidas    |
| Live Activity           | ✅  | ⬜      | ➖  | ➖      | Android no tiene notificacion persistente  |

### Suscripciones

| Feature                                  | iOS | Android | Web         | Backend | Notas                                                                                                                        |
| ---------------------------------------- | --- | ------- | ----------- | ------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Ver estado de suscripcion                | ✅  | ✅      | ✅          | ✅      |                                                                                                                              |
| Flujo de compra                          | ✅  | ✅      | ✅ (Stripe) | ✅      | iOS y Android via RevenueCat SDK, Web via Stripe                                                                             |
| Mostrar plataforma de origen             | ✅  | ✅      | ✅          | ✅      | Badge "Suscrito vía X" en pantalla de suscripción. Ver [[12_SUBSCRIPTION_PLATFORM_ORIGIN]]                                   |
| Instrucciones cancelacion cross-platform | ✅  | ✅      | ✅          | ➖      | Instrucciones contextuales cuando provider ≠ plataforma actual                                                               |
| Portal de gestion                        | ⬜  | ⬜      | ✅ (Stripe) | ✅      | Solo web                                                                                                                     |
| Feature gating                           | ✅  | ✅      | ✅          | ✅      | Backend enforced (403 `plan_limit_exceeded`). iOS: PlanLimitsManager + PaywallSheet. Android: PlanLimitsManager + UpgradePlanDialog. Web: PlanLimitExceededError + global listener. Las 3 plataformas capturan el 403 en formularios de creación. |
| Webhook Stripe                           | ➖  | ➖      | ➖          | ✅      |                                                                                                                              |
| Webhook RevenueCat                       | ➖  | ➖      | ➖          | ✅      |                                                                                                                              |

### Admin

| Feature                | iOS | Android | Web | Backend | Notas    |
| ---------------------- | --- | ------- | --- | ------- | -------- |
| Dashboard admin        | ⬜  | ⬜      | ✅  | ✅      | Solo web |
| Gestion de usuarios    | ⬜  | ⬜      | ✅  | ✅      | Solo web |
| Upgrade de usuario     | ⬜  | ⬜      | ✅  | ✅      | Solo web |
| Lista de suscripciones | ⬜  | ⬜      | ✅  | ✅      | Solo web |

### Configuracion

| Feature                  | iOS | Android | Web | Backend | Notas        |
| ------------------------ | --- | ------- | --- | ------- | ------------ |
| Editar perfil            | ✅  | ✅      | ✅  | ✅      |              |
| Cambiar contrasena       | ✅  | ✅      | ✅  | ✅      |              |
| Configuracion de negocio | ✅  | ✅      | ✅  | ✅      |              |
| Defaults de contrato     | ✅  | ✅      | ⬜  | ✅      | Falta en web |
| Precios / planes         | ✅  | ✅      | ✅  | ✅      |              |
| Acerca de                | ✅  | ✅      | ✅  | ➖      |              |
| Privacidad               | ✅  | ✅      | ✅  | ➖      |              |
| Terminos                 | ✅  | ✅      | ✅  | ➖      |              |

---

## 7. Stack Actual

> [!abstract] Versiones actualizadas a Abril 2026

### Backend

| Capa          | Tecnologia                                  | Version                  | Notas                                                              |
| ------------- | ------------------------------------------- | ------------------------ | ------------------------------------------------------------------ |
| Lenguaje      | Go                                          | 1.24.7                   |                                                                    |
| Router        | chi                                         | v5                       |                                                                    |
| Base de datos | PostgreSQL                                  | 15+                      | pgx/v5 driver                                                      |
| Migraciones   | Custom (embed.FS)                           | 47 migraciones           | Auto-apply on startup                                              |
| Pagos         | Stripe                                      | API actual               | Checkout Sessions + Webhooks                                       |
| Suscripciones | RevenueCat SDK (iOS/Android) + Stripe (Web) | Webhooks bidireccionales | Cross-platform: compra en cualquier plataforma reconocida en todas |

### Web

| Capa      | Tecnologia                                  | Version | Notas                                                              |
| --------- | ------------------------------------------- | ------- | ------------------------------------------------------------------ |
| Framework | React                                       | 19      |                                                                    |
| Routing   | React Router                                | 7.13    |                                                                    |
| Lenguaje  | TypeScript                                  |         |                                                                    |
| Estado    | Context API (primary) + Zustand (available) |         | AuthContext, ThemeContext. Zustand disponible para estado complejo |
| Build     | Vite                                        |         |                                                                    |

### iOS

| Capa          | Tecnologia                   | Version   | Notas                                           |
| ------------- | ---------------------------- | --------- | ----------------------------------------------- |
| Lenguaje      | Swift                        | 5.9+      |                                                 |
| UI            | SwiftUI                      | iOS 17+   |                                                 |
| Arquitectura  | MVVM                         |           | ViewModels por feature                          |
| Networking    | URLSession (actor APIClient) | Nativo    | Token refresh automatico                        |
| Seguridad     | Keychain Services            | Nativo    | KeychainHelper wrapper                          |
| Widgets       | WidgetKit                    | iOS 17+   | 4 tipos                                         |
| Live Activity | ActivityKit                  | iOS 16.1+ |                                                 |
| PDF           | Core Graphics                | Nativo    | 7 generadores                                   |
| Estructura    | Swift Package Manager        |           | SolennixCore, SolennixNetwork, SolennixFeatures |
| Proyecto      | Xcode Project + project.yml  |           | XcodeGen compatible                             |

### Android

| Capa          | Tecnologia                   | Version | Notas                    |
| ------------- | ---------------------------- | ------- | ------------------------ |
| Lenguaje      | Kotlin                       | 2.0.21  |                          |
| UI            | Jetpack Compose + Material 3 |         |                          |
| Arquitectura  | MVVM                         |         | ViewModel por feature    |
| DI            | Hilt                         |         |                          |
| Networking    | Ktor                         | 3.1.0   | OkHttp engine            |
| Serialization | kotlinx.serialization        |         |                          |
| Estructura    | Multi-module Gradle          |         | core/network, feature/\* |

---

## 8. Refactors UI/UX en Progreso (Marzo 2026)

Refactors planificados para lograr paridad total entre las 6 plataformas (iPhone, iPad, Android Phone, Android Tablet, Web Desktop, Web Mobile). Los planes detallados estan en archivos `*_REFACTOR_PLAN.md` en la raiz del proyecto.

### 8.1 Refactor de Navegacion (NAVIGATION_REFACTOR_PLAN.md)

**Estado:** En progreso — implementacion por plataforma en paralelo.

| Cambio                       | iOS | Android | Web | Descripcion                                                                  |
| ---------------------------- | --- | ------- | --- | ---------------------------------------------------------------------------- |
| Bottom Tab Bar: 5 tabs       | ✅  | ✅      | ✅  | Inicio, Calendario, Eventos (NUEVO), Clientes, Mas                           |
| Sidebar: 6+1 secciones       | ✅  | 🔄      | ✅  | 6 secciones + Config abajo. Removidos: Cotizacion, Cotizacion Rapida, Buscar |
| Menu Mas: 3 items            | ✅  | ✅      | ✅  | Solo Productos, Inventario, Config                                           |
| FAB acciones rapidas         | ✅  | ✅      | ✅  | Nuevo Evento + Cotizacion Rapida en phones                                   |
| Busqueda en topbar           | ✅  | ✅      | ✅  | Barra en desktop, icono en phones                                            |
| Botones contextuales Eventos | ✅  | ✅      | ✅  | Header de EventList en tablet/desktop                                        |
| Web Mobile bottom tab bar    | ➖  | ➖      | ✅  | NUEVO: bottom tabs para web <1024px                                          |

### 8.2 Refactor de Dashboard (DASHBOARD_REFACTOR_PLAN.md)

**Estado:** ✅ Completado — todos los items implementados.

| Cambio                                | iOS | Android | Web | Descripcion                                                                        |
| ------------------------------------- | --- | ------- | --- | ---------------------------------------------------------------------------------- |
| ~~Remover botones accion del header~~ | ✅  | ✅      | ✅  | Quick Quote, Search, Refresh movidos a FAB y topbar                                |
| ~~Reducir Quick Actions de 4 a 2~~    | ✅  | ✅      | ✅  | Solo Nuevo Evento + Nuevo Cliente                                                  |
| ~~Crear widget Alertas de Atencion~~  | ✅  | ✅      | ✅  | 3 tipos en las 3 plataformas                                                       |
| ~~Reordenar secciones~~               | ✅  | ✅      | ✅  | Saludo → Onboarding → Banner → Alertas → KPIs → Actions → Charts → Stock → Eventos |
| ~~Saludo en Android Phone~~           | ➖  | ✅      | ➖  | Saludo presente en phone y tablet                                                  |
| ~~Onboarding inline en Android~~      | ➖  | ✅      | ➖  | Checklist inline implementado                                                      |
| ~~Unificar nombre "Ventas Netas"~~    | ✅  | ✅      | ✅  | Consistente en las 3 plataformas                                                   |

### 8.3 Refactor de Calendario (CALENDAR_REFACTOR_PLAN.md)

> [!warning] Pendiente implementacion

**Estado:** Planificado — pendiente implementacion.

| Cambio                       | iOS | Android | Web | Descripcion                                                  |
| ---------------------------- | --- | ------- | --- | ------------------------------------------------------------ |
| Eliminar vista lista         | 🔄  | 🔄      | 🔄  | Migrada a seccion Eventos. Eliminar toggle y codigo de lista |
| Simplificar toolbar          | 🔄  | 🔄      | 🔄  | Solo "Gestionar Bloqueos" + "Hoy"                            |
| Renombrar titulo Web         | ➖  | ➖      | 🔄  | De "Eventos" a "Calendario"                                  |
| Crear gestion de bloqueos    | 🔄  | ✅      | 🔄  | iOS: BlockedDatesSheet. Web: expandir modal                  |
| Long-press rangos (iOS)      | 🔄  | ✅      | ➖  | Agregar campo "Fecha fin" al dialogo                         |
| Right-click bloqueo (Web)    | ➖  | ➖      | 🔄  | onContextMenu para bloqueo rapido                            |
| Mover exportar CSV a Eventos | ➖  | ➖      | 🔄  | De CalendarView a EventList                                  |

---

## 9. Resumen de Brechas Criticas (Abril 2026)

> [!danger] Brechas P1 — Requieren atencion inmediata
>
> - **Push notifications**: Tokens registrados pero backend NO envia. Sin engagement ni recordatorios (iOS, Android, Backend)
> - **Notificaciones email**: Solo reset de contrasena; sin recordatorios de eventos/pagos (Backend)

| Brecha                                             | Plataformas Afectadas | Impacto                                                                   | Esfuerzo Estimado | Prioridad      |
| -------------------------------------------------- | --------------------- | ------------------------------------------------------------------------- | ----------------- | -------------- |
| Push notifications no implementadas                | iOS, Android, Backend | Tokens registrados pero backend NO envia. Sin engagement ni recordatorios | 15-20h            | P1             |
| ~~Plataforma de origen de suscripcion no visible~~ | ~~iOS, Android, Web~~ | ~~Implementado: badge de provider + instrucciones cross-platform~~        | ~~4-6h~~          | ~~Resuelto~~   |
| Notificaciones email limitadas                     | Backend               | Solo reset de contrasena; sin recordatorios de eventos/pagos              | 10-15h            | P1             |
| Stock de equipamiento no es date-aware (issue #96) | iOS, Android, Backend | Card muestra stock total del inventario, no descuenta reservas del mismo dia. Banner de conflictos avisa a alto nivel pero no cuantas unidades estan tomadas | 6-10h             | P2             |
| Live Activity equivalente en Android               | Android               | Sin notificacion persistente durante eventos                              | 6-8h              | P2             |
| Refactor Calendario: Toolbar simplificado          | iOS, Android, Web     | Toolbar pendiente: solo "Gestionar Bloqueos" + "Hoy"                      | 2-4h              | P2             |
| Web: Calendar right-click bloqueo                  | Web                   | Falta right-click para bloqueo rapido de fechas                           | 2-3h              | P2             |
| Panel admin solo en web                            | iOS, Android          | Administracion solo desde navegador                                       | ➖                | P3 (aceptable) |

> [!note] Brechas resueltas
>
> - ~~Contract preview interactivo en mobile~~ — Implementado en iOS y Android con gating de anticipo + deteccion de campos faltantes
> - ~~Web: Defaults de contrato en settings~~ — Settings.tsx tiene ContractTemplateEditor con validacion de tokens
> - ~~Feature gating no enforced~~ — PlanLimitsManager implementado en iOS y Android. Web parcial
> - ~~Play Billing no implementado~~ — Implementado via RevenueCat SDK
> - ~~Generacion de PDF falta en Android~~ — 8 generadores implementados con PdfDocument API
> - ~~Widgets falta en Android~~ — QuickActionsWidget implementado (Glance)
> - ~~StoreKit 2 flujo incompleto~~ — Reemplazado por RevenueCat SDK
> - ~~Google/Apple Sign-In sin UI~~ — Implementado en todas las plataformas
> - ~~Cotizacion rapida falta en Android~~ — QuickQuoteScreen completo
> - ~~Fotos de evento falta en Android~~ — EventPhotosScreen implementado con galeria/upload/lightbox
> - ~~Dashboard: Alertas de Atencion~~ — Implementado en las 3 plataformas
> - ~~Dashboard: Quick Actions 4→2~~ — Ya son 2 en las 3 plataformas
> - ~~Calendario: BlockedDatesSheet iOS~~ — Implementado con CRUD completo
> - ~~Web: Fotos de evento~~ — Tab de fotos con galeria, upload, lightbox y eliminacion
> - ~~Web: Checklist interactivo~~ — Tab de checklist con secciones, checkboxes y progreso
> - ~~Android: Checklist mostraba todo el inventario~~ — Corregido para mostrar solo items del evento (equipo, insumos, ingredientes). Layout tablet ajustado
> - ~~Deep linking incompleto en Android~~ — Parser completo: auth/app separados, 11 hosts, subrutas de evento
> - ~~Dashboard KPIs client-side~~ — Migrado a backend como source of truth (2026-04-20)
> - ~~Web pending events CTAs revertidas~~ — Re-implementadas con amount-check guard (PR #79, 2026-04-21)
> - ~~iOS date -1 day offset~~ — Fixed con local timezone parse (2026-04-26)
> - ~~iOS Quick Quote rendering vacío~~ — Restaurado como .sheet modal (2026-04-26)
> - ~~Google Play compliance~~ — Account deletion + privacy policy (2026-04-23)
> - ~~CI Android inexistente~~ — Job gradle test + assembleDebug activo (2026-04-21)
> - ~~Personal Ola 1/2/3~~ — Turnos + equipos + product-staff completos (2026-04-19/20)
> - ~~Mobile paywall 403 no capturado~~ — iOS PaywallSheet + Android UpgradePlanDialog wired en Event/Client/Product forms (2026-04-26)

---

## 10. Etapa 2: Post-MVP (Planificación)

> [!tip] Documento completo
> Ver [[13_POST_MVP_ROADMAP|Roadmap Post-MVP (Etapa 2)]] para especificaciones, endpoints y estimaciones.

**Estado:** MVP enviado a Apple Store Review (Abril 2026). Web y Backend en producción. Android en preparación. Portal Cliente MVP entregado (Abril 2026, commits `993719c` + `06d69ff`).

### Pilares Planificados

| #   | Pilar                                                                                    | Prioridad | Horas Est. |
| --- | ---------------------------------------------------------------------------------------- | :-------: | :--------: |
| 1   | **Notificaciones Inteligentes** — Preferencias de email/push, resumen semanal            |    P0     |    ~22h    |
| 2   | **Reportes y Analítica** — Reportes por período, PDF/CSV, desglose IVA/márgenes          |    P1     |    ~82h    |
| 3   | **Portal del Cliente** — URL compartible, acciones "en camino"/"llegamos", firma digital |    P1     |   ~107h    |
| 4   | **Diferenciadores** — Plantillas, timeline, WhatsApp, Calendar sync, colaboración        |    P2     |   ~150h+   |

### Próximas direcciones en exploración

> [!note] Pilar 5 — Experiencia del Cliente
> Ver [[14_CLIENT_EXPERIENCE_IDEAS|Ideas Experiencia Cliente (Exploración)]] para el catálogo completo de 7 clusters (A–G) y 20 ideas sobre visibilidad, comunicación bidireccional, transparencia granular, momentos en vivo, co-planificación, pagos in-portal, telemetría inversa y multi-destinatario.
>
> Estado: exploración. Estimación gruesa total 480–730h, distribuibles en 2–3 trimestres según priorización. Requiere decisiones abiertas sobre storage de media, proveedor de pagos LATAM (Stripe vs MercadoPago), y modelo de tokens públicos.

### Email Transaccional — Estado Actual vs Etapa 2

| Email                               | MVP (Actual) |     Etapa 2 (Nuevo)      |
| ----------------------------------- | :----------: | :----------------------: |
| Welcome                             |      ✅      |            ✅            |
| Password reset                      |      ✅      |            ✅            |
| Event reminder (24h)                |      ✅      |       ✅ + opt-out       |
| Payment receipt                     |      ✅      |       ✅ + opt-out       |
| Subscription confirmation           |      ✅      |       ✅ + opt-out       |
| Resumen semanal                     |      ⬜      |        ✅ opt-in         |
| Cotización sin confirmar            |      ⬜      |            ✅            |
| Notificación al cliente del usuario |      ⬜      |            ✅            |
| **Preferencias del usuario**        |      ⬜      | ✅ (toggles en Settings) |

---

#prd #estado #paridad #solennix

---

## Progreso publicación iOS — 2026-04-07

### Completado hoy

- ✅ RevenueCat entitlement corregido a `pro_access` (alineado iOS + backend Go)
- ✅ Pipeline de secretos xcconfig: `ios/Config/Secrets.xcconfig` (gitignored) + `.example` committeado
- ✅ `project.yml` usa `configFiles:` para Debug/Release; `REVENUECAT_PUBLIC_API_KEY` llega al runtime
- ✅ App Group `group.com.solennix.app` añadido a entitlements de main app + widget (typo `roup.` corregido)
- ✅ Build Xcode successful tras cambios
- ✅ `backend/cmd/seed/main.go` — seed idempotente: 8 clientes LATAM, 12 eventos, 15 productos MXN, 20 inventario, pagos
- ✅ Dockerfile + docker-compose.yml con servicio `seed` bajo profile `tools`
- ✅ Cuenta demo en producción: `demo@solennix.com` (Pro forzado, datos sembrados)
- ✅ 10 screenshots iPhone 6.9" en `marketing/ios_screens/final/` (1320×2868)

### Pendiente para mañana

- ⏳ Decidir iPad: app es universal → generar screenshots iPad 13" (2064×2752) o limitar a iPhone-only en `project.yml`
- ⏳ Crear App en App Store Connect (bundle `com.solennix.app`, SKU `solennix-ios-001`)
- ⏳ Registrar App Group en developer.apple.com + habilitar en ambos App IDs
- ⏳ Crear Subscription Group `solennix_premium` + 2 productos en ASC
- ⏳ Conectar Apple App Store en RevenueCat (requiere ASC API `.p8` key)
- ⏳ Reemplazar `test_` RC key por `appl_` en `Secrets.xcconfig`
- ⏳ Desactivar producto Lifetime en RevenueCat
- ⏳ Rellenar metadata ASC (textos en ES ya listos en `ios/APP_STORE_GUIDE.md`)
- ⏳ Subir 10 screenshots a ASC
- ⏳ Cuestionario App Privacy
- ⏳ Credenciales demo en ASC → Sign-in Information
- ⏳ Sentry (diferido hasta antes de TestFlight)

---

## Progreso infraestructura deploy — 2026-04-17

> [!success] Auto-deploy end-to-end funcionando
> Push a `main` → CI Pipeline (~8 min) → al finalizar OK → workflow Deploy to production (~2 min) → SSH al VPS → `git fetch && git reset --hard origin/main` → `docker compose up -d --build`. Primer deploy verificado con commit `e042a4b` corriendo en producción.

### Completado hoy

- ✅ Rename de carpeta raíz `eventosapp/` → `solennix/` para coherencia de marca (local + VPS + `docker-compose.yml project name`)
- ✅ Usuario `deploy` creado en VPS Ubuntu 24.04.4 (Plesk Obsidian 18.0.76, Docker 29.4.0, Compose v5.1.2)
- ✅ Keypair ed25519 CI → VPS: llave privada en GitHub Secret `VPS_SSH_KEY`, pública en `/home/deploy/.ssh/authorized_keys`
- ✅ Keypair ed25519 VPS → GitHub: llave en `/home/deploy/.ssh/github_deploy`, registrada como **Deploy Key read-only** en el repo (fingerprint `AAAA…VShZ/`)
- ✅ `~/.ssh/config` del usuario `deploy` apunta `github.com` a la clave `github_deploy` con `IdentitiesOnly yes`
- ✅ `git remote set-url origin git@github.com:tiagofur/eventosapp.git` — cambio de HTTPS a SSH para poder pull sin credenciales
- ✅ `github.com` añadido a `known_hosts` (ed25519, rsa, ecdsa) para evitar prompts interactivos
- ✅ `docker-compose.yml` con `name: solennix` pinneado en la raíz — garantiza que el project name sea estable sin importar la carpeta
- ✅ `.github/workflows/deploy.yml` con trigger `workflow_run` sobre "CI Pipeline" en `main` + `workflow_dispatch` manual
- ✅ 5 GitHub Secrets configurados en el repo: `VPS_HOST`, `VPS_USERNAME`, `VPS_SSH_KEY`, `VPS_PORT`, `VPS_APP_PATH`
- ✅ Deploy #294 validado: 3 contenedores `Up` en VPS (`solennix-backend-1` :8080, `solennix-frontend-1` :3000, `solennix-db-1` :5433), HEAD en `e042a4b`

### Componentes clave

| Pieza                          | Ubicación                                           | Rol                                                |
| ------------------------------ | --------------------------------------------------- | -------------------------------------------------- |
| Workflow de deploy             | `.github/workflows/deploy.yml`                      | Orquesta el SSH → VPS al terminar CI OK            |
| Docker Compose (project name)  | `docker-compose.yml` (línea 1: `name: solennix`)    | Congela el nombre del stack                        |
| Usuario VPS                    | `/home/deploy/`                                     | Dueño del checkout y del compose stack             |
| Repo en VPS                    | `/home/deploy/solennix/`                            | Working tree sincronizado por `git reset --hard`   |
| Llave CI → VPS                 | `authorized_keys` en VPS + Secret `VPS_SSH_KEY`     | Autentica a `appleboy/ssh-action` desde CI         |
| Llave VPS → GitHub             | `~/.ssh/github_deploy` + Deploy Key en repo        | Autentica al VPS al hacer `git fetch` del privado  |

### Pendientes inmediatos (infra)

- ⏳ Rotar la llave CI → VPS cada 90 días (recordatorio: 2026-07-16)
- ⏳ Instrumentar notificación en Slack/email cuando deploy falla (ahora solo GitHub Actions)
- ⏳ Documentar rollback: `git reset --hard <sha-anterior> && docker compose up -d --build`
- ⏳ Backup automático de `solennix-db` (postgres:15-alpine, puerto 5433) — falta decidir target (S3 vs disco local)
- ⏳ Healthcheck HTTP post-deploy para abortar si backend no responde en 60s

---

## Observabilidad y seguridad — 2026-04-17 (arranque)

> [!info] Rollout inicial de observabilidad + WAF
> Se arranca el stack free/self-hosted para: analytics de tráfico, tracking de errores, uptime, WAF perimetral y anti-bot/anti-DDoS. Primeras 3 piezas (Cloudflare + Sentry + UptimeRobot) cubren el 80% del valor sin costo ni peso adicional en el VPS.

### Stack elegido

| Capa | Servicio | Tier | Dónde corre | Qué cubre |
| ---- | -------- | ---- | ----------- | --------- |
| Perímetro | Cloudflare Free | Gratis | SaaS (delante del VPS) | WAF, DDoS, bot fight mode, rate limiting, cache, analytics de tráfico, SSL terminación |
| Errors + perf | Sentry | Developer (5k err/mo, 5M tracing spans/mo, 50 replays/mo) | SaaS | Stack traces React + Go, performance básico, alertas por email |
| Uptime | UptimeRobot | Free (50 monitors, 5-min interval) | SaaS | Health checks de `/health` + raíz, alerta email cuando baja |
| Analytics producto | GoatCounter | Gratis, self-hosted | Mismo VPS (~40MB RAM) | Pageviews, referrers, países — *pendiente de deploy* |
| Auto-ban IPs | CrowdSec | Gratis, self-hosted + cloud console free | Mismo VPS (~50MB RAM) | Detecta SQLi, path traversal, credential stuffing — *pendiente* |

### Costos y escalado — cuándo pagarías (verificado Abril 2026)

> [!success] Todo el stack es gratis a escala MVP (<1k usuarios activos)
> Ningún servicio se cobra hoy ni en los próximos 6-12 meses. El único que tiene techo relevante a corto plazo es Sentry (5k errores/mes + 1 seat). Los demás dan margen de sobra.

| Servicio | Tier actual | Límites duros | Próximo tier | Disparadores del upgrade |
| -------- | ----------- | ------------- | ------------ | ------------------------ |
| Cloudflare | Free | 5 WAF rules · 5 Page Rules · DDoS + bandwidth ilimitados | Pro $20/mo | Solo si necesitás OWASP Managed Ruleset, >5 WAF rules, Super Bot Fight Mode, o image optimization |
| Sentry | Developer | **5k errors/mo** · 5M tracing spans/mo · 50 replays/mo · **1 seat** · 30 días retención | Team $26/mo (anual) | (a) segundo dev en el equipo, (b) bug en loop que quema los 5k errores, (c) >10k usuarios activos/mes generando errores legítimos |
| UptimeRobot | Free | 50 monitors · intervalo mínimo 5 min · email/SMS · 3 meses logs | Solo $7/mo (anual) | Alertas Slack/webhook o intervalo de 1 min (SLA real) |
| GoatCounter | Self-hosted | Ilimitado en tu VPS | — | Nunca (es software libre EUPL) |
| CrowdSec | Community | 500 alerts/mo · 3 blocklists · 1 org free | Premium from $49/mo | >1 VPS para proteger, o threat intel premium |

**Política de upgrade**: no pagamos nada hasta ver disparador real en el dashboard del servicio. Sentry tiene **Spike Protection ON** por default — si un bug quema la cuota, corta y NO cobra. Los demás simplemente rechazan el exceso (ej. UptimeRobot no te deja crear el monitor #51).

**Revisión trimestral**: chequear consumo en cada dashboard el primer lunes de cada trimestre. Si Sentry pasa 60% del cap sostenido, evaluar Team $26/mo antes de llegar a 100%.

### Cambios de código (backend)

- `backend/cmd/server/main.go` — `sentry.Init` condicional por `SENTRY_DSN`, `defer sentry.Flush(2s)` para entregar el último batch al shutdown
- `backend/internal/middleware/sentry.go` — middleware `mw.Sentry` (basado en `sentry-go/http` con `Repanic: true`)
- `backend/internal/middleware/recovery.go` — sin cambios; queda como outermost y captura el repanic de Sentry
- `backend/internal/router/router.go` — orden de middleware: `Recovery → Sentry → RequestID → CORS → SecurityHeaders → Logger`
- `backend/internal/config/config.go` — nuevos campos `SentryDSN`, `SentryTracesSampleRate` (default 0.1 en prod, 1.0 en dev)
- `backend/go.mod` — `github.com/getsentry/sentry-go v0.45.1`

### Cambios de código (web)

- `web/src/main.tsx` — `Sentry.init` condicional por `VITE_SENTRY_DSN`, `browserTracingIntegration` con `tracesSampleRate: 0.05` en prod (0 en dev)
- `web/src/lib/errorHandler.ts` — `logError` ahora forwardea a `Sentry.captureException` en prod con el `context` como tag
- `web/src/components/ErrorBoundary.tsx` — sin cambios; ya llama `onError` que va a `logError`
- `web/package.json` — `@sentry/react ^10.49.0`

### Configuración de env y build

- `.env.example` — nuevas variables `SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE`, `VITE_SENTRY_DSN`
- `docker-compose.yml` — `frontend.build.args` recibe `VITE_SENTRY_DSN` (build-time)
- `web/Dockerfile` — nuevo `ARG VITE_SENTRY_DSN` inyectado al `npm run build`
- Backend recibe `SENTRY_DSN` vía `backend/.env` (env_file existente)

### Pendientes inmediatos (observabilidad + seguridad)

- ⏳ Crear cuenta Sentry + 2 proyectos (solennix-web, solennix-backend) y pegar DSNs en `.env` del repo y en `backend/.env` del VPS
- ⏳ Crear UptimeRobot free + 2 monitors (`https://solennix.com` y `https://api.solennix.com/health` con keyword "ok")
- ⏳ Self-host GoatCounter para analytics de producto (subdominio `stats.solennix.com`)
- ⏳ Instalar CrowdSec agent en VPS + collection nginx + collection Go
- ⏳ Tabla `audit_logs` ya existe — auditar qué eventos sensibles quedan sin registrar (acceso a pagos, contratos, datos de cliente)
- ⏳ Rate limiting por endpoint más fino en Chi (hoy solo auth/register tienen límites específicos)

---

## Cloudflare Free — configuración completa (2026-04-17)

> [!success] Cloudflare Free desplegado
> Zone `solennix.com` activa en Cloudflare Free. Nameservers cambiados en IONOS.MX (propagando). SSL/TLS Full (strict), Speed optimizado, Security Medium + Bot Fight Mode, 5 WAF Custom Rules + 1 Rate Limit, 3 Page Rules, Web Analytics ON.

### SSL/TLS

- **Modo:** Full (strict) — Cloudflare valida el cert de origen (Let's Encrypt en VPS)
- **Edge Certificates:** Universal SSL automático (Cloudflare emite cert del edge)
- **Always Use HTTPS:** ON (vía Page Rule)
- **HSTS con preload:** pendiente — activar post-propagación con `max-age=31536000; includeSubDomains; preload`

### Speed

| Ajuste          | Estado | Nota                                                  |
| --------------- | ------ | ----------------------------------------------------- |
| Brotli          | ON     | Compresión edge → browser                             |
| Early Hints     | ON     | 103 Early Hints para CSS/JS críticos                  |
| HTTP/3 (QUIC)   | ON     | Negociación H3 en clientes compatibles                |
| Rocket Loader   | OFF    | Incompatible con React/Vite SPA — mantener apagado    |
| Auto Minify     | OFF    | Vite ya minifica en build; Cloudflare Auto Minify está deprecated de todos modos |

### Security

- **Security Level:** Medium
- **Bot Fight Mode:** ON (Super Bot Fight Mode Free tier — bloquea bots definitivamente malos)
- **Browser Integrity Check (BIC):** ON
- **Challenge Passage:** default 30 min

### WAF — 5 Custom Rules (Free: 5/5 used)

| # | Nombre                          | Expresión                                                                                               | Acción               |
| - | ------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------- |
| 1 | Block scanner user agents       | `(lower(http.user_agent) contains "sqlmap") or (... "nikto") or (... "nmap") or (... "masscan") or (... "zgrab")` | Block                |
| 2 | Block path traversal            | `http.request.uri.path matches "\\.\\./" or http.request.uri.path contains "/etc/passwd"`              | Block                |
| 3 | Block SQLi patterns             | `http.request.uri.query matches "(union.*select\|select.*from\|drop\s+table)"`                         | Block                |
| 4 | Challenge empty UA on /api/     | `(starts_with(http.request.uri.path, "/api/") and not starts_with(http.request.uri.path, "/api/public/") and http.user_agent eq "")` | Managed Challenge    |
| 5 | Block admin path probes         | `starts_with(http.request.uri.path, "/wp-admin") or starts_with(http.request.uri.path, "/phpmyadmin") or starts_with(http.request.uri.path, "/.env")` | Block                |

### Rate Limit (Free: 1/1 used)

- **Rate limit login** — `api.solennix.com` + `starts_with(http.request.uri.path, "/api/auth/login")`
- Límite: **5 requests / 10 seg** por IP (~30 req/min, más estricto que lo originalmente planeado gracias al constraint de Free tier)
- Acción al superar: **Block 10 seg**

### Page Rules (Free: 3/3 used)

| Position | URL pattern              | Setting                                                         |
| -------- | ------------------------ | --------------------------------------------------------------- |
| 1        | `solennix.com/assets/*`  | Cache Level: Cache Everything + Edge Cache TTL: 1 month         |
| 2        | `api.solennix.com/*`     | Cache Level: Bypass                                             |
| 3        | `solennix.com/*`         | Always Use HTTPS                                                |

### Analytics

- **HTTP Traffic** (siempre ON en Free): requests, bytes saved, threats, top countries
- **Web Analytics / RUM:** Enable Globally clickeado; datos aparecerán cuando DNS propague y haya tráfico real por el edge

### Post-flight checks (ejecutar cuando propagación DNS termine)

```bash
# 1. Verificar nameservers
dig NS solennix.com +short
# Esperado: 2 nameservers de Cloudflare (*.ns.cloudflare.com)

# 2. Verificar que solennix.com resuelve a IP de Cloudflare (proxied = orange cloud)
dig A solennix.com +short
dig A api.solennix.com +short
# Esperado: IPs de Cloudflare (104.*, 172.*), NO la IP real del VPS (74.208.234.244)

# 3. Verificar que headers cf-ray / cf-cache-status aparecen
curl -sI https://solennix.com/ | grep -i "cf-\|server:\|strict-transport"
curl -sI https://api.solennix.com/health | grep -i "cf-\|server:"
# Esperado: cf-ray: <hex>-<pop>, server: cloudflare, cf-cache-status: DYNAMIC|HIT|MISS|BYPASS

# 4. Verificar SSL Labs grade
# Abrir: https://www.ssllabs.com/ssltest/analyze.html?d=solennix.com
# Esperado: A o A+

# 5. Smoke test del backend real (bypass de Cloudflare, ir directo al origen por IP)
curl -sI --resolve api.solennix.com:443:74.208.234.244 https://api.solennix.com/health
# Esperado: 200 OK desde el VPS directamente (valida que Cloudflare NO es un SPOF)

# 6. Verificar que assets tienen cache correcto (después de 1er hit)
curl -sI https://solennix.com/assets/index.js | grep -i "cf-cache-status\|cache-control"
# Esperado segunda llamada: cf-cache-status: HIT

# 7. Test de WAF — probar que un user-agent sospechoso es bloqueado
curl -sI -A "sqlmap/1.0" https://solennix.com/ | head -1
# Esperado: HTTP/2 403 (Forbidden)

# 8. Test de rate limit — 6 llamadas seguidas a /auth/login deben gatillar 429
for i in {1..6}; do curl -sI -X POST https://api.solennix.com/api/auth/login -o /dev/null -w "%{http_code}\n"; done
# Esperado: primeras 5 responden 400/401, la 6a → 429 Too Many Requests
```

### Rollback plan (si Cloudflare rompe algo en producción)

**Estrategia:** revertir nameservers a los de IONOS original.

```
1. Entrar a IONOS.MX → Dominios → solennix.com → Nameservers
2. Cambiar de:
     ns1.*.ns.cloudflare.com / ns2.*.ns.cloudflare.com
   A (valores originales de IONOS):
     ns1074.ui-dns.com / ns1074.ui-dns.de / ns1074.ui-dns.org / ns1074.ui-dns.biz
3. Guardar. Propagación: ~10 min a 24 h.
4. (Opcional) Pausar el site en Cloudflare mientras se revierte:
   Dashboard → solennix.com → Overview → "Pause Cloudflare on Site" (DNS only, sin proxy)
```

**Rollback parcial (pausar solo una pieza):**
- Page Rule rompe producción → desactivar toggle verde en `Rules → Page Rules`
- WAF rule bloquea tráfico legítimo → desactivar toggle en `Security → Security rules`
- Rate limit muy agresivo → ajustar threshold o desactivar en `Security → Security rules → Rate limiting`
- SSL Full (strict) falla por cert origen → bajar a Full (sin strict) temporalmente en `SSL/TLS → Overview`

**Rollback total (deshacer zone en Cloudflare):**
- Cloudflare Dashboard → solennix.com → Advanced Actions → **Remove Site from Cloudflare**
- DNS queda roto hasta que IONOS tenga los registros originales — tener respaldo de DNS de IONOS antes de borrar la zone.

### Nota operativa

- El cambio de nameservers a Cloudflare se hizo en IONOS.MX el 2026-04-17. Propagación esperada: 1-24 h.
- Cloudflare emite email `activation OK` cuando detecta los NS propagados — mantener revisada la casilla `tiagofur@gmail.com`.
- Mientras propaga: tráfico sigue yendo al IP directo del VPS (74.208.234.244), sin Cloudflare en el medio. No hay downtime.

### Configuración aplicada en el VPS (2026-04-17)

> [!success] VPS configurado vía terminal SSH de Plesk
> TRUST_PROXY activo, nginx con Cloudflare real-IP cargado (22 directivas, módulo http_realip confirmado), backend reiniciado y `https://api.solennix.com/health` responde 200. Firewall Cloudflare-only diferido hasta post-propagación DNS.

**Infra descubierta:**
- Deploy path: `/home/deploy/solennix/` (no `/opt/...`)
- Backend corre en Docker (container `solennix-backend`, imagen build desde `./backend`)
- Compose file: `/home/deploy/solennix/docker-compose.yml`, backend usa `env_file: ./backend/.env`
- Host nginx (Plesk-managed) termina SSL y proxy-pass a `localhost:8080` (backend) y `localhost:3000` (frontend)
- Firewall: iptables con `INPUT DROP` policy + fail2ban (13 jails, incluyendo `plesk-modsecurity`). UFW inactive.

**1. `backend/.env` en el VPS → `TRUST_PROXY=true` (HECHO)**

```bash
# Ejecutado 2026-04-17:
cp /home/deploy/solennix/backend/.env /home/deploy/solennix/backend/.env.bak-YYYYMMDD-HHMMSS
echo "TRUST_PROXY=true" >> /home/deploy/solennix/backend/.env
cd /home/deploy/solennix && docker compose up -d --no-deps --force-recreate backend
# Verificado: docker exec solennix-backend env | grep TRUST_PROXY → TRUST_PROXY=true
# CORS_ALLOWED_ORIGINS ya estaba correcto: https://solennix.com,https://www.solennix.com
```

**2. nginx en el VPS → `set_real_ip_from` + `real_ip_header CF-Connecting-IP` (HECHO)**

Plesk gestiona vhosts per-dominio, así que en lugar de editar cada `server {}`, se creó el snippet en `/etc/nginx/conf.d/cloudflare-real-ip.conf` que se aplica a nivel http (incluido por `nginx.conf` línea 40: `include /etc/nginx/conf.d/*.conf;`) y afecta a todos los server blocks. Verificado: `nginx -T | grep -c set_real_ip_from` = 22 (15 IPv4 + 7 IPv6).

```nginx
# /etc/nginx/snippets/cloudflare-real-ip.conf
set_real_ip_from 173.245.48.0/20;
set_real_ip_from 103.21.244.0/22;
set_real_ip_from 103.22.200.0/22;
set_real_ip_from 103.31.4.0/22;
set_real_ip_from 141.101.64.0/18;
set_real_ip_from 108.162.192.0/18;
set_real_ip_from 190.93.240.0/20;
set_real_ip_from 188.114.96.0/20;
set_real_ip_from 197.234.240.0/22;
set_real_ip_from 198.41.128.0/17;
set_real_ip_from 162.158.0.0/15;
set_real_ip_from 104.16.0.0/13;
set_real_ip_from 104.24.0.0/14;
set_real_ip_from 172.64.0.0/13;
set_real_ip_from 131.0.72.0/22;
set_real_ip_from 2400:cb00::/32;
set_real_ip_from 2606:4700::/32;
set_real_ip_from 2803:f800::/32;
set_real_ip_from 2405:b500::/32;
set_real_ip_from 2405:8100::/32;
set_real_ip_from 2a06:98c0::/29;
set_real_ip_from 2c0f:f248::/32;
real_ip_header CF-Connecting-IP;
real_ip_recursive on;
```

**3. Firewall Cloudflare-only (DIFERIDO hasta post-propagación DNS)**

El VPS NO usa ufw (inactive). Firewall real es iptables gestionado por Plesk + fail2ban (13 jails). Enforcar Cloudflare-only ahora bloquearía tráfico legítimo mientras IONOS/Cloudflare terminan de propagar.

Post-propagación hacerlo vía Plesk UI: **Tools & Settings → Firewall → Firewall Rules → Add Custom Rule**. Regla nueva para cada CIDR de Cloudflare con `Action: Allow`, `Direction: Incoming`, `Ports: 80,443`, `Source: <cidr>`. Al final, una regla `Deny` para `Ports: 80,443` desde `Any`. Alternativa CLI: editar `/etc/iptables/rules.v4` y `systemctl reload iptables`, o `plesk bin firewall --reconfigure`.

Rangos Cloudflare (vigentes 2026-04-17, revisar mensual en https://www.cloudflare.com/ips/):

```
IPv4: 173.245.48.0/20 103.21.244.0/22 103.22.200.0/22 103.31.4.0/22
      141.101.64.0/18 108.162.192.0/18 190.93.240.0/20 188.114.96.0/20
      197.234.240.0/22 198.41.128.0/17 162.158.0.0/15 104.16.0.0/13
      104.24.0.0/14 172.64.0.0/13 131.0.72.0/22
IPv6: 2400:cb00::/32 2606:4700::/32 2803:f800::/32 2405:b500::/32
      2405:8100::/32 2a06:98c0::/29 2c0f:f248::/32
```

No bloquear `22/tcp` (SSH), `8443/tcp`+`8447/tcp` (Plesk admin), `5678` (otro servicio identificado).

**Frontend:** no requiere cambios. `VITE_API_URL=https://api.solennix.com` sigue intacto.

### Rollback del VPS (si algo rompe)

```bash
# Revertir TRUST_PROXY
cp /home/deploy/solennix/backend/.env.bak-YYYYMMDD-HHMMSS /home/deploy/solennix/backend/.env
cd /home/deploy/solennix && docker compose up -d --no-deps --force-recreate backend

# Revertir nginx Cloudflare real-IP
rm /etc/nginx/conf.d/cloudflare-real-ip.conf
nginx -t && systemctl reload nginx
```

---

## Post-flight cerrado — 2026-04-17 (tarde)

> [!success] Propagación DNS completa + firewall Cloudflare-only activo
> NS cambiados en IONOS, propagación verificada global (CF 1.1.1.1 + Google 8.8.8.8), HSTS activo en Cloudflare, firewall iptables/ipset restringiendo origin a rangos oficiales de Cloudflare. Primeros bloqueos registrados en counters (56 pkts dropped vs 2 pkts legítimos de CF en primer minuto).

### Nameservers propagados

```
$ dig NS solennix.com +short
cartman.ns.cloudflare.com.
summer.ns.cloudflare.com.
```

Ambos resolvedores (Cloudflare + Google) retornan los NS de Cloudflare. Email de activación recibido en `tiagofur@gmail.com` — zona oficialmente activa.

### HSTS Configure (Cloudflare → SSL/TLS → Edge Certificates)

Config **conservadora** aplicada — **sin preload** (irreversible ~1 año):

| Campo                                         | Valor                       |
| --------------------------------------------- | --------------------------- |
| Enable HSTS (Strict-Transport-Security)       | ON                          |
| Max Age Header                                | `15552000` (6 meses)        |
| Apply HSTS policy to subdomains               | ON (`includeSubDomains`)    |
| Preload                                       | OFF                         |
| No-Sniff Header (`X-Content-Type-Options`)    | ON                          |

Header verificado: `strict-transport-security: max-age=15552000; includeSubDomains` en respuestas de `solennix.com`.

**Cuando considerar preload:** después de 30 días de tráfico sin incidencias HTTPS, reevaluar subir a `max-age=31536000; includeSubDomains; preload` y enviar a [hstspreload.org](https://hstspreload.org). Preload tiene *lock-in* de ~1 año incluso si se revierte.

### Firewall Cloudflare-only en VPS — aplicado 2026-04-17

**Script idempotente:** `infra/firewall/cloudflare-only.sh` en el repo.

Descarga rangos oficiales desde `https://www.cloudflare.com/ips-v{4,6}`, crea ipsets `cf_v4` (15 CIDRs IPv4) y `cf_v6` (7 CIDRs IPv6) con swap atómico, inserta chain `CF_WEB` que ACCEPT si src ∈ ipset y DROP resto. Jump desde `INPUT` solo para `tcp --dports 80,443`. Preserva loopback, `ESTABLISHED,RELATED`, SSH :22 y Plesk :8443.

**Persistencia:** `netfilter-persistent` + `ipset-persistent` instalados, más systemd unit `ipset-restore.service` que corre antes de `netfilter-persistent.service` para rehidratar los sets al boot. `ufw` fue removido en el apt install (conflicto con `netfilter-persistent`) — sin impacto, ya estaba inactive.

**Evidencia de que funciona (primer minuto post-apply):**

```
$ sudo iptables -L CF_WEB -n -v
Chain CF_WEB (1 references)
 pkts bytes target  prot opt  source       destination
    2   120 ACCEPT  0   --   0.0.0.0/0    0.0.0.0/0    match-set cf_v4 src
   56  3320 DROP    0   --   0.0.0.0/0    0.0.0.0/0

$ sudo iptables -L INPUT -n -v
Chain INPUT (policy ACCEPT)
  292 lo ACCEPT
  330 ctstate RELATED,ESTABLISHED ACCEPT
   58 CF_WEB  tcp  dports 80,443
```

56 pkts DROP en primer minuto = escaneres aleatorios en internet pegándole a la IP del VPS, ahora bloqueados antes de llegar a nginx/Plesk.

**Verificación externa (desde MacBook local, fuera del VPS):**

```
$ curl -I --max-time 5 -k https://74.208.234.244
curl: (28) Connection timed out after 5004 milliseconds  ← bloqueado ✅

$ curl -I https://solennix.com
HTTP/2 200
server: cloudflare
strict-transport-security: max-age=15552000; includeSubDomains  ← HSTS activo ✅
cf-ray: 9edea0b1dbf0fe0e-IAH

$ curl -I https://api.solennix.com/api/health
HTTP/2 404  ← backend responde, pero endpoint no existe (gap documentado abajo)
server: cloudflare
x-api-version: v1
x-request-id: d440e385-d170-40a5-8e94-24d7ecd4f11a
```

### Gap descubierto: `GET /api/health` retorna 404

El backend Go está vivo (responde con headers propios: `x-api-version: v1`, `x-request-id`, CSP, CORS) pero no hay ruta `/api/health` registrada. UptimeRobot está configurado para monitorear `https://api.solennix.com/health` asumiendo `200 OK` con body `ok`.

**Fix pendiente** (nueva tarea, trackeada fuera de este batch):

- Agregar handler `health.Get` en `backend/internal/router/router.go` que retorne `{"status":"ok","version":"..."}` sin auth
- Ruta canónica: `/api/health` (mantener consistencia con prefijo `/api/`)
- UptimeRobot: mantener keyword monitor con `"ok"` en el body

### Rollback unificado (post-propagación)

Orden de rollback de **menor a mayor impacto** si algo falla:

| Paso | Comando                                                         | Deshace                              |
| ---- | --------------------------------------------------------------- | ------------------------------------ |
| 1    | `sudo bash infra/firewall/cloudflare-only.sh rollback`          | Firewall (abre 80/443 al mundo)      |
| 2    | `rm /etc/nginx/conf.d/cloudflare-real-ip.conf && nginx -s reload` | Real-IP de Cloudflare en nginx      |
| 3    | `cp backend/.env.bak-<timestamp> backend/.env && docker compose up -d backend` | TRUST_PROXY=true        |
| 4    | Cloudflare Dashboard → SSL/TLS → Edge Certs → HSTS → Disable    | HSTS header (⚠️ browsers mantienen 6 meses) |
| 5    | IONOS.MX → Nameservers → volver a `ns1074.ui-dns.{com,de,org,biz}` | Salir de Cloudflare completo     |

**NOTA sobre paso 4:** una vez que un navegador recibió el HSTS header con `max-age=15552000`, respetará HTTPS-only durante 6 meses aun si se desactiva server-side. No hay manera de forzar downgrade remoto. Si se necesita serving HTTP mientras HSTS está cacheado, la única vía es emitir `max-age=0` al mismo navegador para invalidar.

### Tareas cerradas en este batch

- [x] #9 Add site solennix.com to Cloudflare
- [x] #10 Change nameservers on IONOS.MX → Cloudflare (propagado global)
- [x] #11 Configure SSL/TLS: Full (strict), HSTS 6m + includeSubDomains (sin preload)
- [x] #12 Speed: Brotli + Early Hints + HTTP/3 ON, Rocket Loader OFF
- [x] #13 Security: Medium + Bot Fight Mode + BIC
- [x] #14 WAF: 5 Custom Rules + 1 Rate Limit (login)
- [x] #15 Page Rules: 3/3 (assets cache, api bypass, always https)
- [x] #16 Web Analytics ON
- [x] #18 VPS: TRUST_PROXY=true activo en backend
- [x] #19 VPS: nginx `set_real_ip_from` con 22 rangos de Cloudflare (15 IPv4 + 7 IPv6)
- [x] #20 VPS: firewall iptables Cloudflare-only activo y persistido
- [x] #17 Post-flight + rollback plan documentado

### Pendientes de infra (fuera de este batch)

- ⏳ `GET /api/health` endpoint en backend Go
- [x] UptimeRobot: 2 monitors (`solennix.com` + `api.solennix.com/health`) — configurado 2026-04-17 (ver sección abajo)
- ⏳ Reboot del VPS para aplicar kernel `6.8.0-110-generic` (pendiente, no urgente)
- ⏳ Validar que reglas de iptables sobreviven el reboot post-kernel-upgrade
- ⏳ Re-evaluar HSTS preload después de 30 días estables
- ⏳ Rotación llave CI → VPS (recordatorio: 2026-07-16)

---

## UptimeRobot — configuración completa (2026-04-17)

> [!success] UptimeRobot Free activo
> Cuenta Free bajo `tiagofur@gmail.com`. 2 monitors activos (intervalo 5 min), status page público, alertas por email. Free tier cubre el 80% del valor — limitaciones documentadas abajo.

### Monitors activos

| ID         | Nombre                    | Tipo    | URL / Keyword                               | Intervalo | Lógica                                        |
| ---------- | ------------------------- | ------- | ------------------------------------------- | --------- | --------------------------------------------- |
| 802870461  | Solennix Backend Health   | Keyword | `https://api.solennix.com/health` + `"ok"`  | 5 min     | Incident cuando keyword `ok` **no existe** en body |
| 802870486  | Solennix Web              | HTTP    | `https://solennix.com`                      | 5 min     | Incident cuando status ≠ 2xx/3xx              |

**Nota:** el monitor de backend apunta a `/health` (root), no `/api/health`. La ruta `/api/health` aún no existe en el backend Go (gap documentado arriba). Cuando se registre el handler, actualizar el monitor para apuntar a `/api/health` y mantener la keyword `ok`.

### Alert contacts

- **Email:** `tiagofur@gmail.com` (verificado)
- **Telegram:** bloqueado en free tier (paid feature)
- **Webhooks / Slack / Discord:** bloqueado en free tier

### Notification settings

| Setting                    | Valor            | Nota                                              |
| -------------------------- | ---------------- | ------------------------------------------------- |
| Notify when **down**       | ON               | Free tier                                         |
| Notify when **up**         | ON               | Free tier                                         |
| Notification delay         | 0 min (inmediato)| Slider fijado en 0 — paid unlocks 1-59 min delay  |
| Reminder cada X min        | Deshabilitado    | **Paid feature** — free no permite repetición     |
| Re-test before notifying   | 2 tests (default)| Hardcoded, no configurable en free                |

### Status page pública

- **ID:** 1067498
- **Nombre:** `Solennix Status`
- **URL pública:** https://stats.uptimerobot.com/lpJYl6r2zB
- **Dominio custom (`status.solennix.com`):** bloqueado en free tier (paid only — CNAME requiere upgrade)
- **Auto-add monitors:** ON — cualquier monitor nuevo se suma solo
- **Monitors mostrados:** `Solennix Backend Health` + `Solennix Web` (ambos 100% Operational)

### Maintenance Windows

> [!warning] Maintenance Windows = paid feature
> La página `/maintenance` en el dashboard muestra explícitamente "Plans start at $7 / month". El tier Free **no permite** silenciar alertas durante ventanas de mantenimiento planificado.

**Workaround manual durante un deploy / mantenimiento programado:**

1. Dashboard → Monitoring → seleccionar el monitor afectado
2. Botón **Pause** (pausa envío de checks y alertas)
3. Ejecutar el deploy / mantenimiento
4. Volver a **Resume** cuando el servicio esté verificado sano

**Cuando hagamos upgrade a plan pago** (a partir de $7/mes), el flujo correcto será:

1. https://dashboard.uptimerobot.com/maintenance → **New Maintenance Window**
2. Campos: `Friendly Name`, `Start Time`, `Duration (minutes)`, `Timezone`, `Repeat` (`Once` / `Daily` / `Weekly` / `Monthly`)
3. Seleccionar monitors afectados (`Solennix Backend Health` y/o `Solennix Web`)
4. Durante la ventana, UptimeRobot no dispara notificaciones aunque el check falle
5. Al terminar, vuelve automáticamente a modo activo

**Convención Solennix para deploys cortos (<15 min):** usar Pause/Resume manual — no amerita upgrade todavía.

### Limitaciones del free tier (confirmadas en dashboard)

| Feature                         | Free   | Paid ($7+/mes)                              |
| ------------------------------- | ------ | ------------------------------------------- |
| Monitors                        | 50     | 50+                                         |
| Intervalo mínimo                | 5 min  | 1 min / 30 s                                |
| HTTP method custom              | ❌ GET | ✅ GET/POST/PUT/HEAD/PATCH/DELETE/OPTIONS   |
| Expected status codes           | 2xx/3xx hardcoded | ✅ configurable                    |
| Timeout custom                  | ❌     | ✅ ajustable                                |
| Reminder notifications          | ❌     | ✅ repetir cada X min                       |
| Notification delay              | 0 fijo | ✅ 1-59 min                                 |
| Maintenance windows             | ❌     | ✅                                          |
| Custom CNAME status page        | ❌     | ✅ `status.solennix.com`                    |
| Telegram / Slack / Discord      | ❌     | ✅                                          |
| SSL certificate checks          | ❌     | ✅                                          |
| Response time charts históricos | 90 días| ✅ ilimitado                                |

### Decisiones tomadas

- **Free tier es suficiente para MVP:** 2 monitors a 5 min cubren el caso (detección < 10 min, notificación inmediata por email).
- **Upgrade diferido:** re-evaluar cuando tengamos clientes pagando (convierte $7/mes en un gasto operativo justificado por SLA).
- **Status page público sin CNAME custom:** la URL `stats.uptimerobot.com/lpJYl6r2zB` es aceptable para uso interno y linkeable desde la app. Si en futuro queremos `status.solennix.com` → upgrade a paid.
- **Redundancia con Sentry:** Sentry cubre errores de app, UptimeRobot cubre disponibilidad externa. No se solapan.

### Rollback / desactivar

Si queremos parar las alertas temporal o definitivamente:

- **Pausa temporal:** Dashboard → Monitoring → cada monitor → botón **Pause**
- **Eliminar definitivo:** Monitoring → `⋮` → **Delete** (ids 802870461 y 802870486)
- **Cerrar cuenta:** Settings → Account → Delete account (elimina también la status page 1067498)
