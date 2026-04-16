# 07 — Arquitectura Técnica Web

> **Fecha de auditoría:** 2026-04-16
> **Fuente de verdad para versiones:** `web/package.json`

---

## 1. Stack

| Capa | Librería | Versión |
|---|---|---|
| UI framework | React | 19.2.x |
| Lenguaje | TypeScript | ~5.9.3 |
| Bundler | Vite | 7.3.x |
| Estilos | Tailwind CSS | 4.2.x (via `@tailwindcss/postcss`) |
| Routing | React Router DOM | 7.13.x |
| Server state | TanStack React Query | 5.96.x |
| Client state | React Context (AuthContext, ThemeContext) | — |
| Forms | React Hook Form | 7.71.x |
| Validación | Zod | 4.3.x |
| HTTP | fetch nativo (`ApiClient` class en `lib/api.ts`) | — |
| PDF generation | jsPDF + jspdf-autotable | 4.x / 5.x |
| PDF rendering | @react-pdf/renderer | 4.3.x |
| Drag & drop | @dnd-kit/core + sortable | 6.x / 10.x |
| Gráficos | Recharts | 3.7.x |
| Date utils | date-fns | 4.1.x |
| Calendar picker | react-day-picker | 9.13.x |
| Icons | lucide-react | 0.575.x |
| CSS utils | clsx + tailwind-merge | — |
| Auth social | Firebase SDK (Google/Apple) | 12.11.x |
| Push notif | Firebase Messaging (FCM) | — |
| PWA | vite-plugin-pwa | 1.2.x |
| Tests unitarios | Vitest | 4.0.x |
| Tests E2E | Playwright | 1.58.x |
| Mocking | MSW | 2.12.x |
| OpenAPI codegen | openapi-typescript | 7.4.x |

> **Nota:** CLAUDE.md menciona "React 18+" y "Zustand" — ambos son inexactos a 2026-04-16. La app usa React 19 y no tiene stores Zustand; el estado client se maneja con React Context + React Query.

---

## 2. Estructura del proyecto

```
web/
├── Dockerfile                    # Multi-stage: node:20-alpine builder + nginx:alpine
├── nginx.conf                    # SPA fallback: try_files $uri /index.html
├── vite.config.ts                # Plugins: react, vite-tsconfig-paths, vite-plugin-pwa
├── vitest.config.ts              # jsdom, coverage thresholds 95/90
├── playwright.config.ts          # E2E: tests/e2e/, baseURL localhost:5173
├── tsconfig.json                 # strict: false, paths @/* → src/*
├── postcss.config.js             # @tailwindcss/postcss (Tailwind v4)
├── index.html
├── public/                       # favicons, PWA icons
└── src/
    ├── main.tsx                  # Entry: StrictMode + BrowserRouter
    ├── App.tsx                   # Providers + lazy Routes
    ├── index.css                 # Tailwind @import + @theme tokens
    ├── vite-env.d.ts
    ├── assets/
    ├── contexts/
    │   ├── AuthContext.tsx        # User session, signOut, updateProfile
    │   └── ThemeContext.tsx       # dark/light toggle
    ├── pages/
    │   ├── Landing.tsx
    │   ├── Login.tsx
    │   ├── Register.tsx
    │   ├── ForgotPassword.tsx
    │   ├── ResetPassword.tsx
    │   ├── About.tsx
    │   ├── Privacy.tsx
    │   ├── Terms.tsx
    │   ├── NotFound.tsx
    │   ├── Dashboard.tsx
    │   ├── Search.tsx
    │   ├── Settings.tsx
    │   ├── Pricing.tsx
    │   ├── Events/
    │   │   ├── EventList.tsx
    │   │   ├── EventForm.tsx       # 5-step wizard
    │   │   ├── EventSummary.tsx    # Tab view + PDFs
    │   │   ├── EventPaymentSuccess.tsx
    │   │   └── components/         # EventGeneralInfo, EventProducts, EventExtras,
    │   │                           # EventEquipment, EventSupplies, Payments,
    │   │                           # QuickClientModal
    │   ├── Clients/
    │   │   ├── ClientList.tsx
    │   │   ├── ClientForm.tsx
    │   │   └── ClientDetails.tsx
    │   ├── Products/
    │   │   ├── ProductList.tsx
    │   │   ├── ProductForm.tsx
    │   │   └── ProductDetails.tsx
    │   ├── Inventory/
    │   │   ├── InventoryList.tsx
    │   │   ├── InventoryForm.tsx
    │   │   └── InventoryDetails.tsx
    │   ├── Calendar/
    │   │   └── CalendarView.tsx
    │   ├── QuickQuote/
    │   │   └── QuickQuotePage.tsx
    │   ├── EventForms/
    │   │   └── EventFormLinksPage.tsx
    │   ├── PublicEventForm/
    │   │   └── PublicEventFormPage.tsx  # Ruta pública /form/:token
    │   └── Admin/
    │       ├── AdminDashboard.tsx
    │       └── AdminUsers.tsx
    ├── components/
    │   ├── Layout.tsx              # Shell: sidebar, BottomTabBar, CommandPalette
    │   ├── ProtectedRoute.tsx
    │   ├── AdminRoute.tsx
    │   ├── ErrorBoundary.tsx
    │   ├── ToastContainer.tsx
    │   ├── Modal.tsx
    │   ├── ConfirmDialog.tsx
    │   ├── Pagination.tsx
    │   ├── Breadcrumb.tsx
    │   ├── Skeleton.tsx
    │   ├── Empty.tsx
    │   ├── Logo.tsx
    │   ├── UpgradeBanner.tsx
    │   ├── OnboardingChecklist.tsx
    │   ├── RecentActivityCard.tsx
    │   ├── StatusDropdown.tsx
    │   ├── RowActionMenu.tsx
    │   ├── SortableItem.tsx
    │   ├── OptimizedImage.tsx
    │   ├── CommandPalette.tsx
    │   ├── BottomTabBar.tsx
    │   ├── QuickActionsFAB.tsx
    │   ├── KeyboardShortcutsHelp.tsx
    │   ├── PendingEventsModal.tsx
    │   ├── SetupRequired.tsx
    │   ├── ContractTemplateEditor.tsx
    │   ├── GoogleSignInButton.tsx
    │   ├── AppleSignInButton.tsx
    │   └── AdminAuditLogSection.tsx
    ├── services/
    │   ├── eventService.ts
    │   ├── clientService.ts
    │   ├── productService.ts
    │   ├── inventoryService.ts
    │   ├── paymentService.ts
    │   ├── eventPaymentService.ts
    │   ├── subscriptionService.ts
    │   ├── searchService.ts
    │   ├── activityService.ts
    │   ├── adminService.ts
    │   ├── eventFormService.ts
    │   └── unavailableDatesService.ts
    ├── hooks/
    │   ├── useKeyboardShortcuts.ts
    │   ├── usePagination.ts
    │   ├── usePlanLimits.ts
    │   ├── useTheme.ts
    │   ├── useToast.ts
    │   └── queries/
    │       ├── queryKeys.ts
    │       ├── useEventQueries.ts
    │       ├── useClientQueries.ts
    │       ├── useProductQueries.ts
    │       ├── useInventoryQueries.ts
    │       ├── usePaymentQueries.ts
    │       ├── useSubscriptionQueries.ts
    │       ├── useSearchQueries.ts
    │       ├── useAdminQueries.ts
    │       ├── useEventFormQueries.ts
    │       └── useActivityQueries.ts
    ├── lib/
    │   ├── api.ts                  # ApiClient (fetch wrapper, CSRF, refresh)
    │   ├── queryClient.ts          # QueryClient global, staleTime 2min
    │   ├── errorHandler.ts         # logError, getErrorMessage
    │   ├── firebase.ts             # Firebase app + getAuth
    │   ├── notifications.ts        # FCM push init
    │   ├── pdfGenerator.ts         # jsPDF: budget, contract, checklist, invoice…
    │   ├── contractTemplate.ts     # Template render + validation
    │   ├── inlineFormatting.ts     # Markdown-lite for PDF text
    │   ├── finance.ts              # getEventTotalCharged, getEventTaxAmount, etc.
    │   ├── exportCsv.ts            # Client-side CSV download
    │   └── utils.ts
    └── types/
        ├── api.ts                  # Generado: openapi-typescript desde openapi.yaml
        ├── entities.ts             # Re-exports + Insert/Update derivados
        ├── google.d.ts             # google.accounts.id ambient types
        └── apple.d.ts              # AppleID ambient types
```

---

## 3. Capas y responsabilidades

```
┌──────────────────────────────────────────────────────────┐
│  Pages  (src/pages/**)                                   │
│  Composición de componentes + orquestación de queries.   │
│  No tocan API directamente — delegan a hooks de query    │
│  o a servicios vía mutations.                            │
├──────────────────────────────────────────────────────────┤
│  Components  (src/components/**)                         │
│  UI reutilizable, sin dependencia directa a servicios.   │
│  Reciben props; emiten callbacks.                        │
├──────────────────────────────────────────────────────────┤
│  Query Hooks  (src/hooks/queries/**)                     │
│  Cada dominio tiene su hook file.                        │
│  useQuery → read; useMutation → write + invalidate.      │
├──────────────────────────────────────────────────────────┤
│  Services  (src/services/**)                             │
│  Thin wrappers que llaman api.get/post/put/delete.       │
│  Tipados con types/entities.ts y types/api.ts.           │
├──────────────────────────────────────────────────────────┤
│  ApiClient  (src/lib/api.ts)                             │
│  fetch wrapper: CSRF, credentials:include, 401 refresh,  │
│  auth:logout event, FormData support, 204 handling.      │
├──────────────────────────────────────────────────────────┤
│  Contexts  (AuthContext, ThemeContext)                    │
│  Estado global no-server: sesión de usuario, tema.       │
└──────────────────────────────────────────────────────────┘
```

Flujo típico de lectura:
`Page mounts → useEventQueries.useEvents() → queryClient cache hit o eventService.getAll() → ApiClient.get('/events') → fetch con cookie httpOnly`

Flujo típico de escritura:
`User submits form → useMutation({ mutationFn: eventService.create }) → on success: queryClient.invalidateQueries(queryKeys.events.all) → React Query refetch → UI updated`

---

## 4. Estado

### React Query (server state — fuente principal)

Configuración global en `src/lib/queryClient.ts`:

| Parámetro | Valor |
|---|---|
| `staleTime` | 2 minutos |
| `gcTime` | 10 minutos |
| `retry` queries | 1 |
| `retry` mutations | 0 |
| `refetchOnWindowFocus` | true |

Estructura de query keys centralizada en `src/hooks/queries/queryKeys.ts`. Ejemplo de forma:
- `queryKeys.events.all` → `['events']`
- `queryKeys.events.detail(id)` → `['events', id]`
- `queryKeys.events.paginated(page, limit, sort, order)` → `['events', 'paginated', ...]`

Errores de background refetch: se loguean vía `logError` y disparan un toast throttleado (cooldown 10s) solo si la query ya tenía data visible. Ver `lib/queryClient.ts`.

### React Context (client state)

| Context | Responsabilidad | Archivo |
|---|---|---|
| `AuthContext` | `user: User \| null`, `loading`, `checkAuth`, `signOut`, `updateProfile` | `contexts/AuthContext.tsx` |
| `ThemeContext` | `theme: 'light' \| 'dark'`, `toggleTheme` | `contexts/ThemeContext.tsx` |

`AuthContext` no usa React Query: llama directamente `api.get('/auth/me')` en `useEffect` al montar y escucha el evento global `auth:logout`. Esta es la única excepción al patrón de query hooks.

### Cuándo usar cuál

- **React Query**: todo dato que venga del backend (eventos, clientes, pagos, etc.)
- **AuthContext**: identidad del usuario en sesión — `useAuth()` en cualquier componente
- **ThemeContext**: preferencia dark/light
- **useState local**: estado de UI efímero (modal abierto, tab activo, formulario paso-a-paso)

---

## 5. Routing

### Estructura de rutas (`src/App.tsx`)

```
/                          Landing (público)
/login                     Login (público)
/register                  Register (público)
/forgot-password           ForgotPassword (público)
/reset-password            ResetPassword (público)
/about                     About (público)
/privacy                   Privacy (público)
/terms                     Terms (público)
/form/:token               PublicEventFormPage (público — sin auth)

<ProtectedRoute>
  <Layout>
    /dashboard             Dashboard
    /search                SearchPage
    /calendar              CalendarView
    /cotizacion-rapida     QuickQuotePage
    /events                EventList
    /events/new            EventForm (crear)
    /events/:id/edit       EventForm (editar)
    /events/:id/summary    EventSummary
    /events/:id/payment-success  EventPaymentSuccess
    /clients               ClientList
    /clients/new           ClientForm
    /clients/:id           ClientDetails
    /clients/:id/edit      ClientForm
    /products              ProductList
    /products/new          ProductForm
    /products/:id          ProductDetails
    /products/:id/edit     ProductForm
    /inventory             InventoryList
    /inventory/new         InventoryForm
    /inventory/:id         InventoryDetails
    /inventory/:id/edit    InventoryForm
    /event-forms           EventFormLinksPage
    /settings              Settings

    <AdminRoute>
      /admin               AdminDashboard
      /admin/users         AdminUsers
    </AdminRoute>
  </Layout>
</ProtectedRoute>

<ProtectedRoute>
  /pricing                 Pricing (fuera del Layout — sin sidebar)
</ProtectedRoute>

*                          NotFound
```

### Guards

- **`ProtectedRoute`** (`src/components/ProtectedRoute.tsx`): lee `user` y `loading` de `AuthContext`. Si `loading` → spinner accesible. Si `!user` → `<Navigate to="/login" state={{ from: location }} />`. La ruta de origen se pasa en `state.from` para redirect post-login.
- **`AdminRoute`** (`src/components/AdminRoute.tsx`): extiende ProtectedRoute; si `user.role !== 'admin'` → redirect a `/dashboard`.

### Lazy loading

Todas las páginas se importan con `React.lazy(() => import(...))` y envueltas en `<Suspense fallback={<PageFallback />}>`. El fallback es un spinner centrado con `role="status"` y `aria-live="polite"`. Esto produce un chunk por ruta en el build de Vite.

---

## 6. Forms y validación

### Patrón estándar

```tsx
const schema = z.object({
  name: z.string().min(1, 'Campo requerido'),
  price: z.number().positive('Debe ser mayor a 0'),
});
type FormData = z.infer<typeof schema>;

const methods = useForm<FormData>({ resolver: zodResolver(schema) });
```

- `@hookform/resolvers/zod` conecta Zod al resolver de React Hook Form.
- Los schemas de validación se definen inline en el archivo de la página (no hay un directorio `schemas/` centralizado — el schema vive junto al formulario que lo usa).
- `FormProvider` + `useFormContext` se usan en formularios multi-step (EventForm, QuickQuotePage) para compartir contexto del form entre subcomponentes.

### Formulario multi-step: EventForm

`src/pages/Events/EventForm.tsx` implementa un wizard de 5 pasos:

| Step | Componente | Campos clave |
|---|---|---|
| 1 | `EventGeneralInfo` | fecha, cliente, tipo, estado |
| 2 | `EventProducts` | productos con cantidad/precio/descuento |
| 3 | `EventExtras` | servicios adicionales con costo/precio |
| 4 | `EventEquipment` | equipamiento necesario |
| 5 | `EventSupplies` | insumos/ingredientes |

Cada step se valida con `methods.trigger([campos del step])` antes de avanzar. Ver también `FIELDS_PER_STEP` en el archivo para el mapeo step→fields.

### Zod v4

El proyecto usa Zod 4.x (no v3). Los schemas existentes son compatibles.

---

## 7. Networking

### ApiClient (`src/lib/api.ts`)

Clase singleton exportada como `api`. Métodos públicos:

```typescript
api.get<T>(endpoint, params?)
api.post<T>(endpoint, body)
api.put<T>(endpoint, body)
api.delete<T>(endpoint)
api.postFormData<T>(endpoint, formData)
```

- URL base: `import.meta.env.VITE_API_URL || 'http://localhost:8080/api'`
- `credentials: 'include'` en todos los requests (httpOnly cookies automáticas)
- Sin header `Authorization` — auth via cookie

### Autenticación y CSRF

- Access token en cookie httpOnly (seteada por backend).
- CSRF token leído de `document.cookie` con regex `/csrf_token_v2=([^;]*)/` y enviado en header `X-CSRF-Token`.
- **Refresh flow**: al recibir 401 en ruta no-auth, se hace POST a `/auth/refresh`. Requests concurrentes que reciben 401 comparten la misma `refreshPromise` (dedup). Si el refresh falla → `window.dispatchEvent(new Event('auth:logout'))` → AuthContext limpia `user`.

### Manejo de errores

- HTTP 429: mensaje amigable con hint de `Retry-After`.
- HTTP 204: devuelve `{}` sin parsear body.
- Otros errores: `throw new Error(errorData.error || 'Request failed with status X')`.
- `lib/errorHandler.ts`: `logError(context, error)` — en DEV logea full error, en prod solo el message. `getErrorMessage(error, default)` para mensajes en UI.

### Tipos OpenAPI

El tipo `src/types/api.ts` se genera automáticamente:
```bash
npm run openapi:types
# → openapi-typescript ../backend/docs/openapi.yaml -o src/types/api.ts
```

`src/types/entities.ts` re-exporta schemas bajo nombres idiomáticos y agrega tipos `*Insert` / `*Update`. La fuente de verdad es siempre el spec YAML. Divergencias entre el código Web y el spec son bugs — el spec gana.

---

## 8. Estilos y design system

### Tailwind CSS v4

La app usa Tailwind v4 con API nueva: sin `tailwind.config.ts`. La configuración vive en `src/index.css` via directivas `@import "tailwindcss"` y `@theme {}`.

### Tokens de color (`src/index.css`)

| Token | Valor luz | Uso |
|---|---|---|
| `--color-primary` | `#C4A265` | Dorado marca (brand) |
| `--color-primary-dark` | `#B8965A` | Hover estado primario |
| `--color-accent` | `#1B2A4A` | Azul marino oscuro |
| `--color-bg` | `#F5F4F1` | Fondo general |
| `--color-surface` | `#FAF9F7` | Cards/panels |
| `--color-text` | `#1A1A1A` | Texto primario |
| `--color-success` | `#34c759` | OK / confirmado |
| `--color-warning` | `#ff9500` | Advertencia / cotizado |
| `--color-error` | `#ff3b30` | Error / cancelado |
| `--color-info` | `#007aff` | Info / confirmado |

### Dark mode

Implementado con `@custom-variant dark (&:is(.dark *))`. La clase `.dark` se aplica en `<html>` vía `ThemeContext`. Los tokens se sobreescriben en `.dark` con valores warm-neutral oscuros. El tema persiste en `localStorage` (gestionado por `useTheme` hook).

### Componentes de UI

No hay design system externo (no hay Shadcn, no hay MUI). Todos los componentes son custom en `src/components/`. Utilitarios de clase: `clsx` para condicionales + `tailwind-merge` para merges sin conflictos.

### PWA — `vite.config.ts`

- `name`: "Solennix — Gestión de Eventos"
- `theme_color`: `#C4A265`
- `display`: `standalone`
- `start_url`: `/dashboard`
- Cache de imágenes: `CacheFirst` 30 días
- Cache fuentes Google: `CacheFirst` 365 días
- `navigateFallback`: `/index.html` (excluye `/api/`)

---

## 9. Integraciones externas

### Google Sign-In

- Componente: `src/components/GoogleSignInButton.tsx`
- SDK: `google.accounts.id` cargado via script tag (declarado en `src/types/google.d.ts`)
- Flow: `google.accounts.id.initialize({ client_id, callback }) → handleCredentialResponse → api.post('/auth/google', { id_token }) → checkAuth()`
- Env var requerida: `VITE_GOOGLE_CLIENT_ID`

### Apple Sign-In

- Componente: `src/components/AppleSignInButton.tsx`
- SDK: `AppleID.auth` (declarado en `src/types/apple.d.ts`)
- Flow: `AppleID.auth.init({ clientId, redirectURI, usePopup: true }) → AppleID.auth.signIn() → api.post('/auth/apple', { code, id_token, user }) → checkAuth()`
- Env var requerida: `VITE_APPLE_CLIENT_ID`
- Private Relay: manejo de `@privaterelay.appleid.com` con notice UI

### Firebase / FCM (Push Notifications)

- Configuración: `src/lib/firebase.ts` + `src/lib/notifications.ts`
- Init tras login: `Layout.tsx` importa dinámicamente `initPushNotifications()` cuando `user` se setea
- El token FCM se registra en el backend (endpoint no documentado en spec)
- Env vars: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID`, `VITE_FIREBASE_VAPID_KEY`

### Stripe

- No hay SDK de Stripe en el frontend
- Flow: `subscriptionService.createCheckoutSession()` → obtiene `url` del backend → `window.location.href = url` (redirect a Stripe Hosted Checkout)
- Portal de billing: `subscriptionService.createPortalSession()` → redirect a Stripe Customer Portal
- Webhook handling: exclusivamente en backend
- Post-pago: ruta `/events/:id/payment-success` recibe redirect de Stripe con query params

### Analytics / Sentry

No se encontró integración de analytics (Google Analytics, Mixpanel) ni Sentry en el codebase Web a la fecha de la auditoría. El único logging es `logError` vía `console.error`.

---

## 10. Build y distribución

### Variables de entorno VITE_*

| Variable | Obligatoria | Uso |
|---|---|---|
| `VITE_API_URL` | Sí | Backend base URL |
| `VITE_GOOGLE_CLIENT_ID` | No | Google Sign-In (desactiva el botón si ausente) |
| `VITE_APPLE_CLIENT_ID` | No | Apple Sign-In |
| `VITE_FIREBASE_API_KEY` | No | Firebase / FCM (push desactivado si ausente) |
| `VITE_FIREBASE_AUTH_DOMAIN` | No | Firebase |
| `VITE_FIREBASE_PROJECT_ID` | No | Firebase |
| `VITE_FIREBASE_STORAGE_BUCKET` | No | Firebase |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | No | Firebase |
| `VITE_FIREBASE_APP_ID` | No | Firebase |
| `VITE_FIREBASE_MEASUREMENT_ID` | No | Firebase Analytics |
| `VITE_FIREBASE_VAPID_KEY` | No | FCM VAPID key para push |

### Build script

```bash
cross-env NODE_OPTIONS=--max-old-space-size=4096 tsc -b && vite build
```

El heap ampliado es necesario por el volumen de types generados + recharts.

### Dockerfile (`web/Dockerfile`)

Multi-stage:

```dockerfile
# Stage 1: builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Stage 2: serve
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

`VITE_API_URL` se inyecta como `ARG` en build time — las otras variables deben ser conocidas al momento de build o configuradas como variables de entorno de Vite en el runner.

### Nginx (`web/nginx.conf`)

SPA config mínima: `try_files $uri $uri/ /index.html`. No hay configuración de cache headers ni proxy. El backend Go corre como servicio separado.

### Deploy flow

Sin pipeline CI/CD activo a 2026-04-16. El deploy a VPS es manual:
1. `docker build --build-arg VITE_API_URL=https://api.solennix.com -t solennix-web .`
2. `docker push` a registry
3. `docker pull` + `docker run` en VPS

---

## 11. Convenciones

### Naming

| Artefacto | Convención | Ejemplo |
|---|---|---|
| Componentes | PascalCase, archivo `.tsx` | `EventList.tsx`, `ProtectedRoute.tsx` |
| Hooks | camelCase prefijo `use` | `useEventQueries.ts`, `usePlanLimits.ts` |
| Services | camelCase + sufijo `Service` | `eventService.ts` |
| Tipos | PascalCase para interfaces/types | `EventInsert`, `ClientUpdate` |
| Query keys | objeto centralizado `queryKeys.*` | `queryKeys.events.detail(id)` |
| Alias de path | `@/` → `src/`, `@tests/` → `tests/` | `import { api } from '@/lib/api'` |

### Idioma

- UI y mensajes de usuario: **español** (español latinoamericano / México)
- Código, variables, comentarios técnicos: **inglés**
- Mensajes de error al usuario: siempre en español (ver `lib/api.ts` y validaciones Zod)

### Exports

- Named exports preferidos sobre default exports en pages y components
- Excepción: `App.tsx` usa `export default`

### Colocación de tests

- Tests unitarios: mismo directorio que el archivo (`EventList.test.tsx` junto a `EventList.tsx`)
- Tests de queries: junto al hook (`useEventQueries.test.tsx`)
- Tests E2E: `tests/e2e/*.spec.ts`
- Tests de integración: `tests/integration/*.test.tsx`
- Fixtures: `pages/Events/__tests__/eventSummaryFixtures.ts`

### React Strict Mode

Activo en producción y desarrollo. Detecta side effects impuros.

---

## 12. Testing

### Vitest (unitarios + integración)

Configurado en `vitest.config.ts`:

- Environment: `jsdom`
- Setup: `tests/setup.ts` (matchers @testing-library/jest-dom + GC manual entre tests)
- Pool: `forks` con `--max-old-space-size=6144 --expose-gc` (necesario por EventSummary.test.tsx — 74 renders de componente pesado)
- Timeout: 15s por test, 30s teardown

**Coverage thresholds:**

| Métrica | Umbral |
|---|---|
| Lines | 95% |
| Functions | 95% |
| Statements | 95% |
| Branches | 90% |

Cobertura via `@vitest/coverage-v8`. Reporter: text + json + html + lcov.

### Playwright (E2E)

Configurado en `playwright.config.ts`:

- `testDir`: `tests/e2e/`
- Browser: Chromium (Desktop Chrome)
- `baseURL`: `http://localhost:5173`
- `webServer`: `npm run dev` autoarrancado si no hay servidor existente
- Timeout: 30s por test, 5s por assertion

**Tests E2E existentes:**

| Archivo | Escenario |
|---|---|
| `login.spec.ts` | Login email/password, redirect post-auth |
| `events.spec.ts` | CRUD eventos básico |
| `payments.spec.ts` | Flujo de pago Stripe |
| `pdf.spec.ts` | Generación de PDF descargable |
| `upgrade.spec.ts` | Flujo upgrade de plan |

### MSW (Mock Service Worker)

`msw` 2.x en `tests/mocks/`. Intercepta requests fetch en jsdom para tests unitarios de servicios y query hooks.

### Qué está bien cubierto

- Services (todos tienen `.test.ts`)
- Query hooks (todos tienen `.test.tsx`)
- Componentes principales (Layout, ProtectedRoute, Modal, etc.)
- Pages core (Dashboard, EventList, EventForm, EventSummary con fixtures)

### Qué no está cubierto / debilidades

- `lib/notifications.ts` — sin tests (depende de APIs del browser)
- `lib/firebase.ts` — sin tests
- `PublicEventFormPage` — mejorado en Sprint 2 (AbortController), pendiente test dedicado
- Flujos de error de red en E2E
- Dark mode rendering

---

## 13. Inventario de features (para PRD/02)

### Auth

| Feature | Ruta / Componente |
|---|---|
| Login email + password | `/login` → `Login.tsx` |
| Google One Tap Sign-In | `GoogleSignInButton.tsx` (en Login) |
| Apple Sign-In | `AppleSignInButton.tsx` (en Login) |
| Registro de cuenta | `/register` → `Register.tsx` |
| Recuperación de contraseña | `/forgot-password` → `ForgotPassword.tsx` |
| Reset de contraseña | `/reset-password` → `ResetPassword.tsx` |
| Logout | `AuthContext.signOut()` (sidebar) |
| Sesión persistente (cookie httpOnly + refresh) | `lib/api.ts` |

### Landing / Marketing

| Feature | Ruta |
|---|---|
| Página de inicio | `/` → `Landing.tsx` |
| About | `/about` |
| Privacy Policy | `/privacy` |
| Terms of Service | `/terms` |
| Pricing | `/pricing` (requiere auth) |

### Dashboard

| Feature | Componente |
|---|---|
| KPIs (eventos del mes, ingresos, clientes) | `Dashboard.tsx` |
| Próximos eventos | `Dashboard.tsx` + `useUpcomingEvents` |
| Alertas de atención (eventos sin pago, vencidos) | `Dashboard.tsx` |
| Gráfico de ingresos mensual (Recharts BarChart) | `Dashboard.tsx` |
| Checklist de onboarding | `OnboardingChecklist.tsx` |
| Actividad reciente | `RecentActivityCard.tsx` |
| Banner de upgrade de plan | `UpgradeBanner.tsx` |

### Eventos

| Feature | Ruta / Componente |
|---|---|
| Listado paginado de eventos | `/events` → `EventList.tsx` |
| Filtro por estado (cotizado/confirmado/completado/cancelado) | `EventList.tsx` + `StatusDropdown` |
| Ordenamiento multi-columna | `EventList.tsx` |
| Búsqueda full-text de eventos | `/search` → `SearchPage.tsx` + `useSearchQueries` |
| Exportar eventos a CSV | `EventList.tsx` + `lib/exportCsv.ts` |
| Crear evento (wizard 5 pasos) | `/events/new` → `EventForm.tsx` |
| Editar evento | `/events/:id/edit` → `EventForm.tsx` |
| Vista resumen de evento | `/events/:id/summary` → `EventSummary.tsx` |
| Cambiar estado de evento (dropdown inline) | `StatusDropdown.tsx` |
| Agregar/editar productos del evento | `EventProducts.tsx` |
| Agregar/editar extras del evento | `EventExtras.tsx` |
| Agregar/editar equipamiento | `EventEquipment.tsx` |
| Agregar/editar insumos | `EventSupplies.tsx` |
| Galería de fotos del evento | `EventSummary.tsx` (tab Fotos) |
| Generar PDF de presupuesto | `lib/pdfGenerator.generateBudgetPDF` |
| Generar PDF de contrato | `lib/pdfGenerator.generateContractPDF` |
| Generar PDF de lista de compras | `lib/pdfGenerator.generateShoppingListPDF` |
| Generar PDF de checklist | `lib/pdfGenerator.generateChecklistPDF` |
| Generar PDF de factura | `lib/pdfGenerator.generateInvoicePDF` |
| Generar PDF de reporte de pagos | `lib/pdfGenerator.generatePaymentReportPDF` |
| Link de pago Stripe para cliente | `EventSummary.tsx` + `eventPaymentService` |
| Confirmación post-pago Stripe | `/events/:id/payment-success` |
| Eliminar evento | `EventSummary.tsx` + `ConfirmDialog` |

### Clientes

| Feature | Ruta |
|---|---|
| Listado paginado de clientes | `/clients` |
| Crear cliente | `/clients/new` |
| Editar cliente | `/clients/:id/edit` |
| Ver detalle + historial de eventos | `/clients/:id` |
| Búsqueda de clientes | `SearchPage` + `ClientList` |
| Crear cliente rápido desde EventForm | `QuickClientModal.tsx` |

### Productos (catálogo)

| Feature | Ruta |
|---|---|
| Listado de productos por categoría | `/products` |
| Crear producto (con imagen + recipe) | `/products/new` |
| Editar producto | `/products/:id/edit` |
| Ver detalle + ingredientes | `/products/:id` |

### Inventario

| Feature | Ruta |
|---|---|
| Listado de items de inventario | `/inventory` |
| Crear item | `/inventory/new` |
| Editar item | `/inventory/:id/edit` |
| Ver detalle | `/inventory/:id` |

### Calendario

| Feature | Ruta |
|---|---|
| Vista mensual de eventos | `/calendar` |
| Bloqueo de fechas no disponibles | `CalendarView.tsx` + `unavailableDatesService` |

### Cotización rápida

| Feature | Ruta |
|---|---|
| Generar presupuesto PDF sin crear evento | `/cotizacion-rapida` → `QuickQuotePage.tsx` |

### Formularios públicos (portal de captura)

| Feature | Ruta |
|---|---|
| Gestión de links de formulario | `/event-forms` → `EventFormLinksPage.tsx` |
| Portal público para clientes | `/form/:token` → `PublicEventFormPage.tsx` (sin auth) |

### Settings / Cuenta

| Feature | Sección en `/settings` |
|---|---|
| Editar perfil (nombre, email) | Tab Perfil |
| Cambiar contraseña | Tab Seguridad |
| Branding (logo, color de marca) | Tab Branding |
| Configuración de negocio (nombre, depósito default) | Tab Negocio |
| Preferencias de notificaciones (email + push) | Tab Notificaciones |
| Gestión de suscripción Stripe (portal) | Tab Suscripción |
| Editor de plantilla de contrato | Tab Contrato (`ContractTemplateEditor.tsx`) |
| Indicadores de límite de plan | `usePlanLimits` hook |

### PWA / Notificaciones push

| Feature | |
|---|---|
| App instalable (PWA) | `vite-plugin-pwa` manifest + service worker |
| Notificaciones push (FCM) | `lib/notifications.ts` |
| Offline: assets en cache | Workbox `CacheFirst` |

### Admin (role=admin)

| Feature | Ruta |
|---|---|
| Dashboard de plataforma (stats, revenue, churn) | `/admin` → `AdminDashboard.tsx` |
| Gestión de usuarios | `/admin/users` → `AdminUsers.tsx` |
| Audit log de acciones | `AdminAuditLogSection.tsx` |

### UX transversal

| Feature | Componente |
|---|---|
| Command palette (Ctrl+K / Cmd+K) | `CommandPalette.tsx` |
| Keyboard shortcuts | `useKeyboardShortcuts.ts` + `KeyboardShortcutsHelp.tsx` |
| Bottom tab bar (mobile) | `BottomTabBar.tsx` |
| FAB de acción rápida | `QuickActionsFAB.tsx` |
| Error boundary global | `ErrorBoundary.tsx` |
| Toast notifications | `ToastContainer.tsx` + `useToast.ts` |
| Skeleton loaders | `Skeleton.tsx` |
| Dark mode toggle | `ThemeContext` + `useTheme` |
| Breadcrumb de navegación | `Breadcrumb.tsx` |
| Paginación | `Pagination.tsx` + `usePagination.ts` |
| Imágenes optimizadas | `OptimizedImage.tsx` |
| Búsqueda global | `/search` → `searchService.ts` |

---

## 14. Debt conocido

Referencia completa en `PRD/11_CURRENT_STATUS.md`. Items aplicables a Web tras el audit 2026-04-16 y el trabajo de Sprints 1–3:

### Resueltos (Sprints 1–3, 2026-04-16)

- **P0-WEB-1** (`EventForm.tsx:422–431`): `fetchMissingCosts` dep array loop fijado — `productUnitCosts` removido del dep array.
- **P1-WEB-1** (`EventForm.tsx:803`): `methods.trigger()` ahora recibe los campos del step activo via `FIELDS_PER_STEP`.
- **P1-WEB-2** (`EventForm.tsx:710–714`): Enter en steps 1–4 ahora rutea por `nextStep()` con validación scopeada, no salta directo al save.
- **P1-WEB-3** (`PublicEventFormPage.tsx:88–108`): fetch movido adentro del effect + `AbortController` con cleanup.
- **P2-WEB-2** (`Modal.tsx:32–36`): overflow original capturado y restaurado en cleanup (preserva scroll lock de modales anidados).
- **P2-WEB-3** (`lib/queryClient.ts:14`): throttle de 10s para toasts de background refetch errors.
- **P3-WEB-1** (`Settings.tsx:94–120`): guard de render hasta que `profile !== null`.

### Pendiente

- **P2-WEB-1** (`CalendarView.tsx:98–124`): migrar a React Query (`useEventsByDateRange` + hook para unavailable-dates). Tracked para Sprint 6.

### Polish futuro

- Test dedicado para `PublicEventFormPage`.
- E2E coverage para flujos de error de red.
- Dark mode rendering en tests.
- Centralizar schemas Zod en `src/schemas/` si el doc crece más.
