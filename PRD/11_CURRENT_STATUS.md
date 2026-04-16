# Current Status — Solennix

**Last Updated:** 2026-04-16
**Status:** Auditoría cross-platform completa. Known issues backlog priorizado. Auth funcional. Deploy pipeline preparado pero no activado.

---

## Authentication Status

### Google Sign-In ✅

| Platform | Status | Notes |
|----------|--------|-------|
| **iOS** | ✅ Complete | `signInWithGoogle()` en AuthViewModel. Validado en devices. |
| **Android** | ✅ Complete | `GoogleSignInButton` + `viewModel.loginWithGoogle()`. Production-ready. |
| **Web** | ✅ Complete | Custom styled button con Google One Tap flow (refactor 2026-04-12). |
| **Backend** | ✅ Complete | `GoogleSignIn()` handler valida `id_token`. Setea cookie httpOnly. |

### Apple Sign-In ⚠️ (funciona para usuarios existentes — **ROTO para nuevos usuarios**, ver P0-BE-1)

| Platform | Status | Notes |
|----------|--------|-------|
| **iOS** | ✅ Complete | `signInWithApple()` + `SignInWithAppleButton` nativo. App Store compliant. |
| **Android** | ✅ Complete | `AppleSignInButton` via Sign In with Apple SDK. API 26+. |
| **Web** | ✅ Complete | `AppleSignInButton` via AppleID.auth SDK con Private Relay. |
| **Backend** | ⚠️ **BUG** | Ver `P0-BE-1`, `P0-BE-2`, `P0-BE-3`. Nuevos usuarios Apple fallan al crearse. |

---

## Platform Parity Matrix

```
Feature                | iOS | Android | Web | Backend
-----------            | --- | ------- | --- | -------
Google Sign-In         | ✅  | ✅      | ✅  | ✅
Apple Sign-In          | ✅  | ✅      | ✅  | ⚠️
Email/Password Login   | ✅  | ✅      | ✅  | ✅
JWT Refresh Tokens     | ✅  | ✅      | ✅  | ✅
Session Persistence    | ✅  | ✅      | ✅  | ✅
Logout / Token Revoke  | ✅  | ✅      | ✅  | ✅
```

---

## Known Issues — Cross-Platform Audit 2026-04-16

**Total: 38 findings** (8 P0, 12 P1, 11 P2, 7 P3). Prioridad: arreglar P0 en bundle, luego P1, luego P2/P3 oportunistas.

### 🔴 Critical (P0) — 8 findings

#### Backend (3)

- **P0-BE-1** — `auth_handler.go:1200` + `auth_handler.go:1385`: AppleSignIn + AppleCallback llaman `userRepo.Create()` que requiere `password_hash NOT NULL`. Apple no tiene password → cada alta de usuario Apple devuelve 500 contra la DB. Google usa `CreateWithOAuth` correctamente. **Fix:** usar `CreateWithOAuth` en ambos paths Apple.
- **P0-BE-2** — `auth_handler.go:1193–1198` + `1379–1384`: `newUser` en Apple paths no setea `Plan`. Queda `""`. Limits por plan bypaseados → usuario Apple nuevo tiene acceso ilimitado hasta próximo login. **Fix:** setear `Plan: "basic"` antes de `Create`, igual que Register y Google.
- **P0-BE-3** — `auth_handler.go:1356, 1367, 1391`: `tokens, _ := h.authService.GenerateTokenPair(...)` descarta error. Si falla firma → redirect con cookie vacía → sesión rota silenciosa. **Fix:** chequear error y devolver 500 antes del redirect.

#### iOS (3)

- **P0-iOS-1** — `EventDetailViewModel.swift:275`: `addPhotos` sin `@MainActor` pero muta `@Observable` state desde async → Swift concurrency data race. Todos los otros mutating methods de la clase tienen `@MainActor`. **Fix:** agregar `@MainActor` al signature.
- **P0-iOS-2** — `APIClient.swift:62`: `waitsForConnectivity = true` sin `timeoutIntervalForResource` (default 7 días). Request offline o detrás de captive portal queda suspendido indefinidamente, bloquea token refresh. **Fix:** `config.timeoutIntervalForResource = 60`.
- **P0-iOS-3** — `SolennixModelContainer.swift:45`: `fatalError` en fallback path de SwiftData. Si falla persistent + in-memory (posible tras update iOS que cambie schema) → crash al arranque sin recovery. **Fix:** propagar error al caller, mostrar alert.

#### Android (1)

- **P0-AND-1** — `EventRepository.kt:260–263`: `syncEventItems()` sin `@Transaction`. 4 suspend calls secuenciales (deleteProducts, deleteExtras, insertProducts, insertExtras). Flow collector en `getProductsByEventId()` ve ventana vacía entre DELETE e INSERT → EventDetailScreen flickea "0 productos" durante sync. **Fix:** DAO method único con `@Transaction`.

#### Web (1)

- **P0-WEB-1** — `EventForm.tsx:422–431`: `fetchMissingCosts` con `productUnitCosts` en deps del useEffect + `setProductUnitCosts` en el cuerpo → riesgo de loop infinito. `=== undefined` guard es la única protección. **Fix:** sacar `productUnitCosts` del dep array, usar functional update del setter.

---

### 🟠 High (P1) — 12 findings

#### Backend (2)

- **P1-BE-1** — `client_repo.go:26`, `event_repo.go:65`, `product_repo.go:26`, `inventory_repo.go:26`, `payment_repo.go:24`: `GetAll` sin LIMIT en fallback cuando no hay `page`. Usuario con miles de rows devuelve todo. **Fix:** hard cap `LIMIT 1000` o eliminar path no paginado.
- **P1-BE-2** — `auth_handler.go:1310`: `http.PostForm` a Apple token endpoint sin timeout (usa `http.DefaultClient`). Apple hung → goroutine bloqueada indefinidamente, exhaustion del connection pool. **Fix:** `&http.Client{Timeout: 10 * time.Second}` (patrón ya usado en `fetchApplePublicKeys`).

#### iOS (4)

- **P1-iOS-1** — `DashboardView.swift:112–119`: `.onAppear` llama `loadDashboard()` incondicional en cada aparición → flicker visible + 8 requests redundantes por navegación round-trip. **Fix:** `.task` (auto-cancel) o gate con `lastLoadedAt` staleness.
- **P1-iOS-2** — `ClientListViewModel.swift:36,40,43` + `ProductListViewModel.swift:32,35,39` + `InventoryListViewModel.swift:34,37,41`: anti-pattern `@Observable` + `didSet`. El macro reescribe storage y no garantiza `didSet` en Swift 5.9+ → filtering puede quedar stale tras cambio de search/sort. **Fix:** computed property o `.onChange` modifier en la view.
- **P1-iOS-3** — `EventDetailViewModel.swift:79–81`: `canStartLiveActivity` aloca `DateFormatter()` en cada acceso (se lee en cada render). **Fix:** `private static let` formatter.
- **P1-iOS-4** — `ContractTemplateTextView.swift:66`: `try! NSRegularExpression(...)`. Pattern seguro hoy, pero `try!` es fragil ante futuros cambios al pattern. **Fix:** `try?` con fallback, o `do/catch` con `fatalError` explícito.

#### Android (3)

- **P1-AND-1** — `EventDetailViewModel.kt:138–145`: `eventRepository.getEvents()` (full table) colectado en init solo para buscar uno por ID. Re-scan de toda la tabla en cada mutación de cualquier evento. **Fix:** `Flow<Event?>` single-item por `eventId` en DAO.
- **P1-AND-2** — `EventDetailScreen.kt:98`: `collectAsState` (no lifecycle-aware) para WindowInfoTracker. Subscription viva en background. **Fix:** `collectAsStateWithLifecycle()`.
- **P1-AND-3** — `InventoryDetailViewModel.kt:100–128`: N+1 API calls en `loadDemandForecast()`. Fetch all events remote, luego 1 `getEventProductsFromApi` por evento upcoming. 50 eventos = 51 API calls. **Fix:** endpoint server-side `/inventory/:id/demand` o batch.

#### Web (3)

- **P1-WEB-1** — `EventForm.tsx:803`: `methods.trigger()` sin lista de fields → valida TODOS los steps desde el primero. Usuario ve errores en campos que aún no vio. **Fix:** `methods.trigger(['client_id','event_date',...])` con fields del step activo.
- **P1-WEB-2** — `EventForm.tsx:710–714`: `onSubmit` avanza step en vez de guardar. Enter en steps 1–4 saltea validación de `nextStep`, usuario puede saltar a step 5 y disparar save prematuro. **Fix:** form submit solo para save final; `nextStep` solo desde botón.
- **P1-WEB-3** — `PublicEventFormPage.tsx:88–108`: `fetchFormData` fuera del deps → `token` via closure, si cambia tras mount se usa stale. Sin `AbortController` → setState en unmounted. **Fix:** mover `fetchFormData` adentro del effect + AbortController con cleanup.

---

### 🟡 Medium (P2) — 11 findings

#### Backend (2)

- **P2-BE-1** — `handlers/helpers.go:40`: `http.MaxBytesReader(nil, r.Body, maxBodySize)` con ResponseWriter `nil`. Viola contrato stdlib → nil pointer deref si se excede el límite en algunas versiones Go. **Fix:** threadear `w` a través de `decodeJSON(w, r, dst)`.
- **P2-BE-2** — `event_repo.go:96–98`, `client_repo.go:59–61`, `payment_repo.go:59`: sort column inyectado en SQL via `fmt.Sprintf`; allowlist solo en handler. Calls directos a repo (tests, futuro) bypasean el guard. **Fix:** allowlist interno en cada repo method.

#### iOS (3)

- **P2-iOS-1** — `EventDetailViewModel.swift:301–309`: `removePhoto(at:)` borra localmente antes de que el PUT exitoso confirme. Si falla, `errorMessage` se setea pero URL no se restaura → divergencia permanente UI/backend. **Fix:** snapshot del array, restore on error (mirror del patrón `softDeleteClient`).
- **P2-iOS-2** — `APIClient.swift:651–656`: 5 force-unwraps `String.data(using: .utf8)!` en multipart body. Riesgo bajo pero técnicamente unsafe. **Fix:** `Data(string.utf8)` (non-failable).
- **P2-iOS-3** — `DashboardViewModel.swift:185`: TODO real — 8 GETs secuenciales por load. Endpoint `/api/dashboard/kpis` agregado ya existe. ~1.6s latencia serial en 200ms RTT. **Fix:** migrar Dashboard al endpoint agregado.

#### Android (3)

- **P2-AND-1** — `EventListViewModel.kt:149–168`: CSV export lee `uiState.value.events` (cache completo Room), no el filtered paged set. Export con filtro status/fecha activo exporta TODO silently. **Fix:** aplicar predicates antes del CSV o querear Room con filtros.
- **P2-AND-2** — `SolennixDatabase.kt:53–57`: `MIGRATION_4_5` no-op (solo log). Si hubo schema change entre v4 y v5 → drift en devices actualizadas. **Fix:** verificar schema diff v4→v5 y agregar DDL.
- **P2-AND-3** — `CalendarViewModel.kt:128–171`: `toggleDateBlock`, `blockDateRange`, `deleteUnavailableDate` con catch blocks vacíos. Fallo al blockear fecha → usuario no se entera. **Fix:** exponer `errorMessage: String?` en state y emitir.

#### Web (3)

- **P2-WEB-1** — `CalendarView.tsx:98–124`: bypassea React Query completo. Navegación mes dispara 2 API calls sin cache/dedup/SWR. Spinner en cada navegación, data descartada on unmount. **Fix:** `useEventsByDateRange` + hook para unavailable-dates.
- **P2-WEB-2** — `Modal.tsx:32–36`: `document.body.style.overflow = 'unset'` en cleanup borra cualquier scroll lock pre-existente (nested modals, otras UIs). **Fix:** capturar el overflow original antes y restaurarlo.
- **P2-WEB-3** — `lib/queryClient.ts:14`: `QueryCache.onError` dispara toast en cada failed background refetch. Red inestable = flood de toasts idénticos. **Fix:** debounce por timestamp o dedup key.

---

### 🟢 Low (P3) — 7 findings

#### Backend (2)

- **P3-BE-1** — `middleware/ratelimit.go:37–45`: `RateLimitStopFunc` global sobreescrito en cada call. Solo el último limiter registrado tiene stop-func alcanzable. Frágil. **Fix:** acumular en slice y llamar todos.
- **P3-BE-2** — `admin_handler.go:30, 45`: `writeJSON` con `map[string]string{"error":...}` viola convención `{"data","error","message"}`. **Fix:** `writeError(w, status, msg)`.

#### iOS (2)

- **P3-iOS-1** — `EventDetailView.swift:990–1020` + otros: helpers (`formatDateShort`, `parseDateComponents`) allocán 2-3 `DateFormatter` por call durante `body`. **Fix:** `private static let` a nivel view.
- **P3-iOS-2** — KPICard, AttentionEventsCard, EventStatusChart: ~24 accessibility annotations en ~90 archivos. Charts interactivos y status buttons sin `accessibilityLabel`/`Value`. **Fix:** pass targeteado de VoiceOver.

#### Android (2)

- **P3-AND-1** — `EventListViewModel.kt:165`: columna "Pagado" hardcodeada `""` en CSV export. Header exportado, data nunca populated → export engañoso. **Fix:** calcular desde `paymentRepository` o eliminar columna.
- **P3-AND-2** — `EventChecklistViewModel.kt:64`: `SharedPreferences` sin encriptar mientras el resto usa `EncryptedSharedPreferences`. Event IDs expuestos como keys. **Fix:** inyectar la instancia `EncryptedSharedPreferences` de `AuthManager`.

#### Web (1)

- **P3-WEB-1** — `Settings.tsx:94–120`: `useState(profile?.default_deposit_percent || 50)` evaluado una vez al mount. Si `profile` es null al inicio y usuario guarda rápido → sobreescribe valores server con defaults. **Fix:** render settings form solo tras `profile !== null`.

---

## Propuesta de orden de ataque

**Sprint 1 — P0 bundle (objetivo: 1 sesión)**
1. Backend P0-BE-1+2+3 (mismo archivo, bundle atómico) — desbloquea Apple Sign-In en producción.
2. iOS P0-iOS-1 + P0-iOS-2 + P0-iOS-3.
3. Android P0-AND-1.
4. Web P0-WEB-1.
→ Commit por plataforma. Cross-platform parity check al final.

**Sprint 2 — P1 bundle (1-2 sesiones)**
Ataque por plataforma (misma área = mismo commit). Prioridad: P1-WEB-1 + P1-WEB-2 (ambos en EventForm, bundle), P1-BE-1 + P1-BE-2, P1-iOS-1 + P1-iOS-2, P1-AND-1 + P1-AND-2 + P1-AND-3.

**Sprint 3 — P2/P3 cleanup (1 sesión)**
Lo que entre. Prioridad a las que tocan security (P2-BE-2, P3-AND-2) y data integrity (P2-AND-1, P2-iOS-1).

**Sprint 4 — Activar deploy VPS** (requiere vos: secrets GitHub + path VPS, ver notas abajo).

**Sprint 5+ — Backfill PRD docs 01-10 + implementar features PRD/12 (Client Transparency).**

---

## Testing Checklist

- [x] Auth flows Google/Apple (iOS, Android, Web) — pero ⚠️ Apple new-user backend path está roto.
- [x] Session persistence cross-platform.
- [x] Logout en todas las plataformas.
- [ ] **Regression test suite post-P0 fixes** — hay que correr después de sprint 1.
- [ ] E2E Apple Sign-In con usuario nuevo (reproduce P0-BE-1).

---

## Deploy / Build Status

| Component | Version | Environment | Status |
|-----------|---------|-------------|--------|
| iOS | 1.0.2+ | App Store | ✅ Live — `https://apps.apple.com/mx/app/solennix/id6760874129` |
| Android | 1.0.0 | Play Store | ✅ Live — release APK signed |
| Web | Latest | Production | ✅ Live |
| Backend | Latest | Production VPS | ✅ Live — `api.solennix.com` |
| **CI/CD Deploy** | — | — | ⚠️ **Prepared, NOT activated** |

**Deploy pipeline:** `.github/workflows/deploy.yml` existe con comentarios claros. Falla en cada push a main con "missing server host" porque los secrets (`VPS_HOST`, `VPS_USERNAME`, `VPS_SSH_KEY`, `VPS_PORT`) no están seteados y el path `/path/to/solennix` sigue hardcoded como TODO. **Próximos pasos para activar:** ver walkthrough en sesión 2026-04-16 (usuario deferió la tarea por tiempo). Acción requerida del dueño del VPS (Plesk): configurar 4 secrets + pasar la ruta real del repo.

---

## Technical Debt

- **PRD incompleto:** `CLAUDE.md` referencia docs 01-10 que no existen. Solo existen 11 (este) y 12 (Client Transparency). **TODO:** backfill cuando se estabilice el backlog.
- **38 findings de audit 2026-04-16** — ver secciones P0-P3 arriba.
- **Dashboard iOS:** 8 requests secuenciales pese a tener endpoint agregado disponible (P2-iOS-3).
- **Room MIGRATION_4_5 no-op** — revisar schema drift (P2-AND-2).

---

## Resolved (Historical)

- **Android — Contract product names (2026-04-15):** Template renderizaba `"<cantidad> Producto"` porque `CachedEventProduct` no persistía `product_name`. Fix: migration 5→6 + UI consume `EventProduct.productName` directo.
- **Cross-platform Google/Apple Sign-In (2026-04):** completado en 4 plataformas, aunque Apple backend tiene P0 pendiente en flow de nuevo usuario.
- **iOS PDF generation (2026-04-15):** menú wired, share fix, token map unified.
- **iOS plan enum (2026-04-15):** pro/business ya no degradan silently a basic.
- **iOS BGTaskScheduler (2026-04-15):** register movido a AppDelegate.
- **Phase 1-2 Android audit (2026-04):** 18 issues fixed (coroutine leaks, migrations, error hierarchies, security, i18n).
- **Email notifications (2026-04):** 4 tipos totalmente cableados (event reminder, weekly summary, marketing, payment receipt).
