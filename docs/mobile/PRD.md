# PRD: Solennix Mobile (React Native)

> Última actualización: 2026-02-25

## 1. Resumen Ejecutivo

Crear una app móvil en React Native (Expo) que replique el MVP de la web app de Solennix, adaptada a patrones UX móviles (bottom tabs, stack navigation, pull-to-refresh, swipe actions). Reutiliza la lógica de servicios, tipos y utilidades de la web copiándolos al proyecto mobile. Conecta al mismo backend Go existente. Monetización vía RevenueCat (App Store / Play Store) en lugar de Stripe web.

**Tiempo estimado:** 7-9 semanas (1 desarrollador full-time).

---

## 2. Contexto y Motivación

Solennix es un SaaS para organizadores de eventos (catering, banquetes, fiestas). El MVP web está completo con:

- Gestión de clientes
- Catálogo de productos con recetas
- Inventario de ingredientes
- Cotizaciones con IVA
- Pagos y abonos
- Calendario de eventos
- Generación de PDFs (presupuesto, contrato, lista de compras, factura)

**¿Por qué mobile?** Los organizadores de eventos trabajan en campo — necesitan acceso móvil para consultar cotizaciones, registrar pagos y ver el calendario en sitio.

**Audiencia objetivo:** Los mismos usuarios de la web — organizadores de eventos en México que operan catering/banquetes.

**Plataformas:** iOS y Android.

---

## 3. Decisiones Clave

| Decisión                | Elección                      | Justificación                                                                                                                                     |
| ----------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework               | React Native + Expo           | Reutilizar ~60% de lógica TypeScript del web (tipos, servicios, hooks, validaciones). Curva de aprendizaje menor — el equipo ya trabaja en React. |
| Workflow                | Expo managed                  | Simplifica builds, OTA updates y acceso a APIs nativas sin configuración manual de Xcode/Android Studio.                                          |
| Reutilización de código | Copiar, no compartir          | Evita complejidad de tooling (turborepo, symlinks) para un equipo pequeño. La duplicación es aceptable dado que el MVP está estabilizado.         |
| Navegación              | 5 bottom tabs + stacks        | Convención iOS/Android de máximo 5 tabs. Prioriza acciones más frecuentes en campo.                                                               |
| Subscripciones          | RevenueCat                    | Endpoint ya existe en el backend. Abstrae StoreKit 2 y Google Play Billing.                                                                       |
| Styling                 | NativeWind (Tailwind para RN) | Reutilizar conocimiento del equipo web. Clases similares a las usadas en la web.                                                                  |
| PDFs                    | expo-print + HTML             | Más simple en mobile que portar jspdf. Share sheet nativo integrado.                                                                              |

---

## 4. Alcance — Paridad con MVP Web

### 4.1 Pantallas Públicas (sin auth)

| Pantalla        | Adaptación Mobile                                                       |
| --------------- | ----------------------------------------------------------------------- |
| Login           | Formulario simplificado, biometric auth futuro                          |
| Register        | Formulario en scroll, mismos campos                                     |
| Forgot Password | Formulario simple de email                                              |
| Landing         | **OMITIR** — no necesaria en app nativa; la tienda de apps hace ese rol |

### 4.2 Pantallas Autenticadas

| Pantalla Web   | Pantalla Mobile                     | Adaptación                                                                                                    |
| -------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Dashboard      | Tab "Inicio"                        | KPI cards en scroll vertical, gráficas con `victory-native`, lista de eventos próximos, alertas de stock bajo |
| Calendar       | Tab "Calendario"                    | `react-native-calendars`, dots por evento, vista de día con lista                                             |
| Event Form     | Stack screen, wizard multi-step     | Bottom sheet steps o pantallas secuenciales, pickers nativos para fecha/hora                                  |
| Event Summary  | Stack screen desde lista            | Tabs internos (Resumen, Ingredientes, Contrato, Pagos), share PDF nativo                                      |
| Client List    | Tab "Clientes"                      | FlatList con búsqueda, pull-to-refresh, swipe-to-delete                                                       |
| Client Form    | Stack screen                        | Formulario en scroll                                                                                          |
| Client Details | Stack screen                        | Info + event history en FlatList                                                                              |
| Product List   | Tab "Catálogo" (sub-tab Productos)  | FlatList con categorías                                                                                       |
| Product Form   | Stack screen                        | Form + ingredient picker                                                                                      |
| Inventory List | Tab "Catálogo" (sub-tab Inventario) | FlatList con stock badges                                                                                     |
| Inventory Form | Stack screen                        | Formulario simple                                                                                             |
| Search         | Barra de búsqueda global en header  | Resultados agrupados por tipo                                                                                 |
| Settings       | Tab "Perfil" o dentro de "Más"      | Secciones colapsables, plan info con RevenueCat                                                               |
| Pricing        | Dentro de Settings                  | RevenueCat paywall nativo                                                                                     |

### 4.3 Features No Incluidas en Fase 1

- Onboarding checklist (simplificado como tooltips)
- Pending events modal (reemplazado por lógica inline en Dashboard)
- Stripe checkout (reemplazado por RevenueCat para in-app purchase)
- Push notifications (feature futura)
- Modo offline con sincronización (feature futura)
- Biometric auth (feature futura)

---

## 5. Adaptaciones UX para Mobile

| Patrón Web                     | Patrón Mobile                                                   |
| ------------------------------ | --------------------------------------------------------------- |
| Sidebar navigation             | Bottom tab bar (5 tabs)                                         |
| Tables con columnas sorteables | FlatList con cards `rounded-3xl`, sort via dropdown/chip        |
| Pagination (botones de página) | Infinite scroll con `onEndReached`                              |
| Modal dialogs                  | Bottom sheets (`@gorhom/bottom-sheet`) `rounded-3xl`            |
| Multi-step form (wizard)       | Stack screens o horizontal pager                                |
| Date picker input              | Native date picker (`@react-native-community/datetimepicker`)   |
| Select dropdowns               | Bottom sheet picker                                             |
| Hover states                   | Press/hold states con `Pressable`                               |
| PDF download button            | Share sheet nativo (`expo-sharing`)                             |
| Toast notifications            | Toast posicionado en bottom                                     |
| Search bar en header           | Search bar colapsable en navigation header                      |
| Dark/light toggle              | Seguir tema del sistema + toggle manual + themed scrollbar      |
| Confirmar delete con modal     | Swipe-to-delete + ConfirmDialog                                 |
| Charts (recharts)              | `victory-native` o `react-native-chart-kit`                     |
| Estética General               | **Layered Panel**: `bg-surface-grouped` con cards `rounded-3xl` |

---

## 6. Autenticación y Seguridad

- Token JWT almacenado en `expo-secure-store` (Keychain en iOS, EncryptedSharedPreferences en Android)
- Refresh token flow idéntico al web
- Misma lógica de 401 → logout, adaptada de eventos DOM a callbacks
- Biometric unlock (Touch ID/Face ID) como feature futura — no MVP

---

## 7. Subscripciones y Monetización

| Aspecto  | Web                                 | Mobile                                               |
| -------- | ----------------------------------- | ---------------------------------------------------- |
| Provider | Stripe                              | RevenueCat (App Store / Play Store)                  |
| Checkout | Stripe Checkout redirect            | In-app purchase nativo                               |
| Webhook  | `/api/subscriptions/webhook/stripe` | `/api/subscriptions/webhook/revenuecat`              |
| Portal   | Stripe Customer Portal              | Configuración del dispositivo (Manage Subscriptions) |

- El backend ya tiene el endpoint de RevenueCat implementado
- Paywall nativo usando `react-native-purchases` UI components
- Mismos tiers: **Basic** (gratis) y **Pro** (pago)

### Plan Tiers

| Feature           | Basic (Free) | Pro (Paid) |
| ----------------- | ------------ | ---------- |
| Eventos/mes       | 3            | Ilimitados |
| Clientes          | 50           | Ilimitados |
| Items en catálogo | 20           | Ilimitados |
| PDF generation    | Limitado     | Completo   |
| Payment tracking  | Sí           | Sí         |

---

## 8. PDF en Mobile

La web usa `jspdf` + `jspdf-autotable`. En mobile:

1. Generar HTML templates equivalentes a los 4 PDFs (Budget, Contract, Shopping List, Invoice)
2. Usar `expo-print` para convertir HTML → PDF
3. Usar `expo-sharing` para compartir vía WhatsApp, email, etc.
4. Reutilizar la lógica de cálculo de `lib/finance.ts` sin cambios
5. Templates HTML replican el formato visual de los PDFs web (logo, colores de marca, formato MXN)

---

## 9. Métricas de Éxito

| Métrica                          | Target                    |
| -------------------------------- | ------------------------- |
| Paridad funcional con web MVP    | 100% de features listadas |
| Crash-free rate                  | >99.5%                    |
| App Store rating                 | ≥4.5                      |
| Time to interactive (cold start) | <2s                       |
| APK/IPA size                     | <30MB                     |

---

## 10. Riesgos y Mitigación

| Riesgo                            | Probabilidad | Impacto | Mitigación                                                                                             |
| --------------------------------- | ------------ | ------- | ------------------------------------------------------------------------------------------------------ |
| Expo no soporta alguna lib nativa | Baja         | Alto    | Verificar compatibilidad antes de Fase 0. Fallback: development build con prebuild.                    |
| RevenueCat webhook desincronizado | Media        | Alto    | Implementar polling de status como fallback. Logs detallados en backend.                               |
| Performance de listas grandes     | Media        | Medio   | FlatList optimizada con `getItemLayout`, windowSize, memoización. Paginación server-side si necesario. |
| Review de App Store rechazada     | Baja         | Alto    | Seguir Human Interface Guidelines. No mencionar pagos externos. RevenueCat maneja compliance.          |
| Drift entre código web y mobile   | Media        | Medio   | Mantener tests equivalentes. Documentar cambios en API contract.                                       |

---

## 11. Guía de Diseño Visual — Mobile

> **Referencia completa:** `docs/design/UI-DESIGN-GUIDE.md`
> **Brand Manual:** `marketing/brand-manual/Solennix-Brand-Manual.pdf`

### Filosofía

La app mobile debe ser **moderna, elegante y minimalista**, siguiendo los mismos principios de la web:

- **Espacio es lujo** — Generoso padding entre elementos, nunca amontonar
- **Color como acento** — El dorado `#C4A265` aparece solo en CTAs, iconos activos, badges y focus states
- **Un CTA por pantalla** — Un solo botón `premium-gradient` como acción principal
- **Layered Panel** — `bg-surface-grouped` como fondo, cards `rounded-3xl` con `shadow-sm`

### Tokens de Color (Mobile)

Los tokens están definidos en `mobile/src/theme/colors.ts` y deben coincidir con `web/src/index.css`:

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `primary` | `#C4A265` | `#C4A265` | Acentos, CTAs, iconos activos |
| `background` | `#f3f4f6` | `#000000` | Fondo de pantalla externo |
| `surface` | `#f9fafb` | `#121212` | Áreas internas |
| `card` | `#ffffff` | `#121212` | Cards y contenedores |
| `text.primary` | `#111827` | `#f5f5f7` | Texto principal |
| `text.secondary` | `#6b7280` | `#a1a1aa` | Labels, texto auxiliar |
| `text.tertiary` | `#9ca3af` | `#71717a` | Placeholders |
| `border` | `#e5e7eb` | `#27272a` | Bordes de cards e inputs |

### Reglas de Aplicación de Color

**✅ Correcto:**
- Botón CTA: `premium-gradient` (degradado dorado `#C4A265 → #D4B87A`) con texto blanco
- Tab activo: `colors.primary` para icono y label
- Avatar sin imagen: `bg-primary/10` con texto `colors.primary`
- Badge de categoría: `bg-primary/10` con texto `colors.primary`
- Focus ring: `borderColor: colors.primary` con `opacity: 0.4`

**❌ Incorrecto:**
- Fondo de card en dorado (`backgroundColor: colors.primary`)
- Texto de párrafo en dorado (solo para links e iconos activos)
- Navy (`#1B2A4A`) como fondo de pantalla (solo para landing/branding)
- Colores hardcodeados (`'#gray'`, `'#555'`) en lugar de tokens del theme
- `Platform.select` para colores que deben ser iguales en ambas plataformas

### Componentes Clave (Mobile)

| Componente | Estilo |
|-----------|--------|
| Card | `rounded-3xl`, `shadow-sm`, `bg: colors.card`, `border: colors.border` |
| Botón Primary | `premium-gradient`, `rounded-lg`, `py: spacing.md`, texto blanco `fontWeight: '600'` |
| Botón Secondary | `bg: colors.surface-alt`, `border: colors.border`, `rounded-lg` |
| Input | `bg: colors.card`, `border: colors.border`, `rounded-lg`, focus: `borderColor: colors.primary` |
| Empty State | Ilustración gris suave + título `fontWeight: '600'` + subtítulo `colors.text.secondary` + CTA `premium-gradient` |
| Loading | `Skeleton` con `animate-pulse` en `colors.surface-alt`. **Nunca** spinner solo |

### Checklist de Pantalla Mobile

- [ ] Título usa `fontWeight: '900'` (equivalente a `font-black`) con `letterSpacing: -0.5`
- [ ] Solo un botón `premium-gradient` por pantalla
- [ ] Todos los colores vienen de `useTheme()`, sin hardcoded
- [ ] Dark mode: todos los colores cambian correctamente
- [ ] Cards usan `rounded: 24` (equivalente a `rounded-3xl`)
- [ ] Spacing consistente con escala del theme (`spacing.sm`, `spacing.md`, `spacing.lg`)
- [ ] Precios formateados con `toLocaleString('es-MX', { minimumFractionDigits: 2 })`
- [ ] Skeleton loading en todas las listas y cards
