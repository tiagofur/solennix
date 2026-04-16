# 02 — Features & Paridad Cross-Platform

**Estado:** Vivo — actualizar cuando se agrega / remueve una feature.
**Última actualización:** 2026-04-16.
**Fuente de verdad:** `PRD/05..08` (inventarios por plataforma).

---

## 1. Cómo leer esta matriz

| Símbolo | Significado |
|---|---|
| ✅ | Implementado y funcional |
| ⚠️ | Implementado pero con bug conocido (ver `PRD/11`) |
| 🟡 | Parcial — solo read-only o subset limitado |
| ❌ | No implementado |
| — | No aplica a esa plataforma (ej. backend no tiene UI) |
| 🍎 | iOS-only por diseño (deliberate) |
| 🤖 | Android-only por diseño |
| 🌐 | Web-only por diseño |

**Regla de paridad** (ver `CLAUDE.md`): toda feature cross-platform debería ser ✅ en las 3 plataformas cliente. Las excepciones (🍎 / 🤖 / 🌐) se declaran explícitamente.

---

## 2. Autenticación

| Feature | iOS | Android | Web | Backend |
|---|:-:|:-:|:-:|:-:|
| Login email + password | ✅ | ✅ | ✅ | ✅ |
| Registro de cuenta | ✅ | ✅ | ✅ | ✅ |
| Google Sign-In nativo | ✅ | ✅ | ✅ | ✅ |
| Apple Sign-In nativo | ✅ | ✅ | ✅ | ✅ *(bug P0 resuelto Sprint 1)* |
| Forgot / Reset password | ✅ | ✅ | ✅ | ✅ |
| Logout + token revoke | ✅ | ✅ | ✅ | ✅ |
| Session persistence post-relaunch | ✅ | ✅ | ✅ | ✅ |
| JWT refresh flow (rotación) | ✅ | ✅ | ✅ | ✅ |
| Biometric gate (Face ID / Touch ID / fingerprint) | ✅ | ❌ | — | — |
| Change password (autenticado) | ✅ | ✅ | ✅ | ✅ |
| CSRF protection | — | — | ✅ | ✅ |

**Brecha conocida:** Android no tiene biometric gate equivalente al iOS `BiometricGateView`.

---

## 3. Dashboard

| Feature | iOS | Android | Web | Backend |
|---|:-:|:-:|:-:|:-:|
| KPIs agregados (revenue, events, clients, low stock) | ✅ | ✅ | ✅ | ✅ `/dashboard/kpis` |
| Próximos eventos | ✅ | ✅ | ✅ | ✅ `/events/upcoming` |
| Attention events (pagos vencidos, eventos a vencer) | ✅ | ✅ | ✅ | ✅ (derivado) |
| Gráfico de ingresos mensual | ✅ | ✅ | ✅ | ✅ `/dashboard/revenue-chart` |
| Distribución por status | ✅ | ✅ | ✅ | ✅ `/dashboard/events-by-status` |
| Top clients por gasto | ❌ | ❌ | ❌ | ✅ `/dashboard/top-clients` (endpoint listo, UI pendiente) |
| Product demand ranking | ❌ | ❌ | ❌ | ✅ `/dashboard/product-demand` |
| Forecast de ingresos | ❌ | ❌ | ❌ | ✅ `/dashboard/forecast` |
| Onboarding checklist card | ✅ | ✅ | ✅ | — |
| Recent activity card | ✅ | ✅ | ✅ | ✅ `/dashboard/activity` |
| Upgrade banner (plan limits) | ✅ | ✅ | ✅ | — |

**Oportunidad:** top clients, product demand, forecast son endpoints listos en backend sin UI en clientes. Features fáciles para Sprint futuro.

**Deuda:** iOS carga Dashboard con 8 GETs secuenciales en vez de usar `/dashboard/kpis` agregado (`P2-iOS-3`).

---

## 4. Eventos

| Feature | iOS | Android | Web | Backend |
|---|:-:|:-:|:-:|:-:|
| Lista paginada | ✅ | ✅ | ✅ | ✅ |
| Filtro por status | ✅ | ✅ | ✅ | ✅ |
| Filtro por rango de fechas | ✅ | ✅ | ✅ | ✅ |
| Búsqueda full-text | ✅ | ✅ | ✅ | ✅ `/search` |
| Ordenamiento (date, total, client, status) | ✅ | ✅ | ✅ | ✅ |
| Exportar a CSV | 🟡 *(vía PDF)* | ✅ *(respeta filtros post-Sprint 3)* | ✅ | — |
| Crear evento multi-step | ✅ | ✅ | ✅ | ✅ |
| Editar evento | ✅ | ✅ | ✅ | ✅ |
| Detalle completo | ✅ | ✅ | ✅ | ✅ |
| Cambiar status inline (dropdown) | ✅ | ✅ | ✅ | ✅ |
| Quick client creation durante form | ✅ | ✅ | ✅ | — |
| Productos del evento | ✅ | ✅ | ✅ | ✅ |
| Extras del evento | ✅ | ✅ | ✅ | ✅ |
| Equipamiento del evento | ✅ | ✅ | ✅ | ✅ |
| Insumos del evento | ✅ | ✅ | ✅ | ✅ |
| Conflictos de equipo entre eventos | ✅ | ✅ | ✅ | ✅ |
| Sugerencias de equipo / insumos | ✅ | ✅ | ✅ | ✅ |
| Checklist del evento | ✅ | ✅ | ❌ | — |
| Photos gallery | ✅ | ✅ | ✅ | ✅ |
| Eliminar foto con undo | ✅ *(Sprint 3)* | ✅ | ✅ | ✅ |
| Registrar pagos | ✅ | ✅ | ✅ | ✅ |
| Link de pago Stripe (al cliente) | ✅ | ✅ | ✅ | ✅ |
| Eliminar evento | ✅ | ✅ | ✅ | ✅ |
| Live Activity del día del evento | 🍎 | — | — | ✅ *(APNs tokens)* |

**Brecha:** Web no tiene checklist — feature solo mobile.

---

## 5. PDFs generables

Todos los PDFs se generan **client-side** (iOS con `UIGraphicsPDFRenderer`, Android con `PdfDocument`, Web con `jsPDF`). Backend no genera PDFs.

| PDF | iOS | Android | Web |
|---|:-:|:-:|:-:|
| Presupuesto / cotización | ✅ | ✅ | ✅ |
| Contrato | ✅ | ✅ | ✅ |
| Checklist del evento | ✅ | ✅ | ✅ |
| Lista de equipamiento | ✅ | ✅ | ❌ |
| Lista de compras / insumos | ✅ | ✅ | ✅ |
| Factura | ✅ | ✅ | ✅ |
| Reporte de pagos | ✅ | ✅ | ✅ |
| Quick Quote (sin evento) | ✅ | ❌ | ✅ |

**Brechas:**
- Web no genera "lista de equipamiento" — se puede incluir en el reporte completo.
- Android no genera "Quick Quote" independiente (feature Pro / futura).

---

## 6. Clientes

| Feature | iOS | Android | Web | Backend |
|---|:-:|:-:|:-:|:-:|
| Lista paginada | ✅ | ✅ | ✅ | ✅ |
| Búsqueda | ✅ | ✅ | ✅ | ✅ |
| Crear cliente | ✅ | ✅ | ✅ | ✅ |
| Editar cliente | ✅ | ✅ | ✅ | ✅ |
| Detalle + historial de eventos | ✅ | ✅ | ✅ | ✅ |
| Soft delete con undo | ✅ | ✅ | ✅ | ✅ |
| Quick client desde EventForm | ✅ | ✅ | ✅ | — |

---

## 7. Productos (catálogo)

| Feature | iOS | Android | Web | Backend |
|---|:-:|:-:|:-:|:-:|
| Lista con filtro por categoría | ✅ | ✅ | ✅ | ✅ |
| Crear producto | ✅ | ✅ | ✅ | ✅ |
| Editar producto | ✅ | ✅ | ✅ | ✅ |
| Detalle | ✅ | ✅ | ✅ | ✅ |
| Recipe (ingredientes) | ✅ | ✅ | ✅ | ✅ |
| Demand forecast chart | ✅ | ✅ | ❌ | ✅ |
| Imagen de producto | ✅ | ✅ | ✅ | ✅ `/uploads/image` |
| Batch ingredientes (N+1 mitigation) | 🟡 *(cache in-memory)* | 🟡 | ❌ | ✅ `/products/ingredients/batch` |

---

## 8. Inventario

| Feature | iOS | Android | Web | Backend |
|---|:-:|:-:|:-:|:-:|
| Lista con filtros | ✅ | ✅ | ✅ | ✅ |
| Crear / editar / eliminar | ✅ | ✅ | ✅ | ✅ |
| Detalle | ✅ | ✅ | ✅ | ✅ |
| Demand forecast por item | ✅ | ✅ *(bounded + cache Sprint 2)* | ❌ | ❌ *(cliente-side)* |
| Alertas de stock bajo | ✅ | ✅ | ✅ | ✅ *(derivado)* |
| Ajuste de stock manual | ✅ | ✅ | ✅ | ✅ |

---

## 9. Calendario

| Feature | iOS | Android | Web | Backend |
|---|:-:|:-:|:-:|:-:|
| Vista mensual con eventos | ✅ | ✅ | ✅ | ✅ |
| Bloquear fecha / rango no disponible | ✅ | ✅ *(errores surface Sprint 3)* | ✅ | ✅ |
| Desbloquear | ✅ | ✅ | ✅ | ✅ |
| Razón de bloqueo (texto) | ✅ | ✅ | ✅ | ✅ |

---

## 10. Settings

| Feature | iOS | Android | Web | Backend |
|---|:-:|:-:|:-:|:-:|
| Edit profile (nombre, email) | ✅ | ✅ | ✅ | ✅ |
| Change password | ✅ | ✅ | ✅ | ✅ |
| Business settings (nombre, logo, default deposit) | ✅ | ✅ | ✅ | ✅ |
| Branding (logo + color de marca) | ✅ | ✅ | ✅ | ✅ |
| Contract template editor | ✅ | ✅ | ✅ | — |
| Notification preferences (email + push toggles) | ✅ | ✅ | ✅ | ✅ |
| Subscription / pricing | ✅ *(IAP via RevenueCat)* | ✅ *(Play Billing via RevenueCat)* | ✅ *(Stripe Checkout)* | ✅ |
| Suscription portal (cancelar / actualizar tarjeta) | ✅ *(IAP)* | ✅ *(Play)* | ✅ *(Stripe Portal)* | ✅ |
| Dark mode toggle | ✅ *(system)* | ✅ | ✅ | — |
| Multi-idioma (es / pt / en) | ❌ | ❌ | ❌ | ❌ *(planned PRD/12 K)* |
| About | ✅ | ✅ | ✅ | — |

---

## 11. Búsqueda

| Feature | iOS | Android | Web | Backend |
|---|:-:|:-:|:-:|:-:|
| Búsqueda global (eventos + clientes + productos + inventario) | ✅ | ✅ | ✅ | ✅ `/search` |
| Spotlight integration (Siri) | 🍎 | — | — | — |
| Command palette (`Cmd/Ctrl+K`) | ❌ | ❌ | 🌐 | — |

---

## 12. Notificaciones

| Feature | iOS | Android | Web | Backend |
|---|:-:|:-:|:-:|:-:|
| Push notifications | ✅ *(APNs)* | ✅ *(FCM)* | ✅ *(FCM web)* | ✅ |
| Rich push (imágenes, acciones) | ✅ *(Notification Service Extension)* | ✅ *(FCM)* | ⚠️ *(limitado por web)* | ✅ |
| Email: recibo de pago | ✅ | ✅ | ✅ | ✅ |
| Email: recordatorio de evento | ✅ | ✅ | ✅ | ✅ |
| Email: resumen semanal | ✅ | ✅ | ✅ | ✅ |
| Email: marketing opt-in | ✅ | ✅ | ✅ | ✅ |
| Device token registration | ✅ | ✅ | ✅ | ✅ `/devices/register` |
| Live Activity registration (iOS) | 🍎 | — | — | ✅ `/live-activities/register` |

---

## 13. Portal público / Formularios de captura

| Feature | iOS | Android | Web | Backend |
|---|:-:|:-:|:-:|:-:|
| Gestión de links de formulario | ✅ | ❌ | ✅ | ✅ `/event-forms` |
| Portal público (cliente sin login) | — | — | ✅ `/form/:token` | ✅ `/public/event-forms/{token}` |
| Submit desde portal público | — | — | ✅ | ✅ |

**Brecha:** Android no tiene UI de gestión de event-form-links.

**Futuro (PRD/12):** portal del cliente más completo con transparencia de pagos, milestones, decisiones pendientes, thread de comunicación, firma digital, RSVP, reseñas — todos pendientes para Q3-Q4 2026.

---

## 14. Cotización rápida (Quick Quote)

Feature para generar un presupuesto PDF sin crear evento en DB. Útil para prospects.

| Feature | iOS | Android | Web | Backend |
|---|:-:|:-:|:-:|:-:|
| Flujo Quick Quote | ✅ | ❌ | ✅ `/cotizacion-rapida` | — |
| PDF generado | ✅ | ❌ | ✅ | — |

**Brecha:** Android no tiene Quick Quote (feature opcional, no blocker).

---

## 15. Admin (role = admin)

| Feature | iOS | Android | Web | Backend |
|---|:-:|:-:|:-:|:-:|
| Dashboard de plataforma | ❌ | ❌ | ✅ `/admin` | ✅ `/admin/stats` |
| Listado de usuarios | ❌ | ❌ | ✅ | ✅ `/admin/users` |
| Detalle usuario | ❌ | ❌ | ✅ | ✅ |
| Upgrade/downgrade plan manual | ❌ | ❌ | ✅ | ✅ |
| Overview suscripciones | ❌ | ❌ | ✅ | ✅ |
| Audit logs | ❌ | ❌ | ✅ | ✅ |

**Por diseño:** Admin es Web-only. Mobile no lo necesita (es una función interna de Solennix, no de los organizadores).

---

## 16. UX transversal

| Feature | iOS | Android | Web |
|---|:-:|:-:|:-:|
| Error boundary global | ✅ | ✅ | ✅ |
| Toast notifications | ✅ | ✅ | ✅ |
| Skeleton loaders | ✅ | ✅ | ✅ |
| Empty states | ✅ | ✅ | ✅ |
| Pull-to-refresh | ✅ | ✅ | ✅ |
| Keyboard shortcuts | ✅ *(iPad / Mac Catalyst)* | ❌ | ✅ |
| Command palette (`Cmd/Ctrl+K`) | ❌ | ❌ | ✅ |
| Bottom tab bar (mobile) | ✅ | ✅ *(nav component)* | ✅ |
| Sidebar (desktop / tablet) | ✅ *(iPad NavigationSplitView)* | ❌ | ✅ |
| Dark mode | ✅ | ✅ | ✅ |
| Accesibilidad base (VoiceOver / TalkBack / aria) | 🟡 *(P3-iOS-2 pendiente)* | 🟡 | 🟡 |
| Deep links | ✅ *(`solennix://`)* | ✅ *(`solennix://`)* | ✅ *(routing)* | 
| Widget en home screen | ✅ | ✅ | ❌ |

---

## 17. Features iOS-only (deliberate)

- **Live Activities** (Dynamic Island + Lock Screen con estado del evento del día).
- **Spotlight search** (integración Siri, indexar eventos/clientes).
- **Siri Intents / App Intents** (comandos de voz — target `SolennixIntents`).
- **Biometric gate** (Face ID / Touch ID al abrir la app).
- **Notification Service Extension** (rich push con imágenes procesadas).

## 18. Features Android-only (deliberate)

Actualmente ninguna estricta. El widget de Glance y el foldable support son exclusivos por naturaleza de plataforma, no por decisión.

## 19. Features Web-only (deliberate)

- **Command palette** (`Cmd/Ctrl + K`) — desktop-primary UX.
- **Admin console** (todas las funciones de administración interna).
- **Portal público del cliente** (`/form/:token`) — por diseño no requiere app instalada.
- **Stripe Hosted Checkout** (flujo web de pago).
- **Keyboard shortcuts avanzados** (F-keys, chord bindings).

---

## 20. Roadmap de features (referencia)

Ver `PRD/09_ROADMAP.md` para el detalle completo. Highlights de próximos sprints:

- **Sprint 6 (Q2 2026):** polish técnico — dashboard agregado iOS, CalendarView con React Query, DateFormatters estáticos.
- **Sprint 7 (Q2 2026):** pricing v1 — Stripe + RevenueCat activos, paywalls en todos los clientes.
- **Sprint 8–12 (Q3 2026):** portal del cliente y transparencia (features A-I de `PRD/12`).
- **Sprint 13+ (Q4 2026):** plan Business con WhatsApp API, firma digital legal, RSVP.

---

## 21. Cómo usar esta matriz

- **Antes de implementar una feature nueva** → chequear si ya existe en alguna plataforma. Si sí, leer el PRD de esa plataforma para ver el patrón.
- **Cerrando un sprint** → actualizar esta matriz con los ✅ nuevos.
- **Priorizando backlog** → features con ❌ en plataformas donde otras tienen ✅ son candidatas naturales de paridad.
- **Detectando drift** → si la matriz dice ✅ pero el comportamiento en device no funciona, es bug de `PRD/11`.

---

## 22. Notas de drift conocido

Estado a 2026-04-16:

- **Apple Sign-In backend:** resuelto Sprint 1 (nuevo user + Plan + token errors). Mobile sign-in para user nuevo ahora funciona.
- **Android biometric gate:** NO existe. Feature deliberadamente no priorizada.
- **Web checklist evento:** NO existe. Checklist solo mobile por simplicidad (evento suele chequearse on-site).
- **Dashboard features avanzadas (top-clients, product-demand, forecast):** endpoints listos en backend, UI pendiente en los 3 clientes.
- **Quick Quote Android:** no implementado. Baja prioridad, feature auxiliar.
- **Event form links management Android:** no implementado.
- **Admin mobile:** por diseño, admin es Web-only.
- **Multi-idioma cliente (es/pt/en):** nada implementado. Planeado para Q1 2027 (`PRD/12 K`).
