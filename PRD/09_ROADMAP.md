# 09 — Roadmap

**Estado:** Vivo — revisión al cierre de cada sprint.
**Última actualización:** 2026-04-16 (cierre de Sprint 7.A + Portal Cliente MVP).
**Metodología:** sprints de 2 semanas. Roadmap se fija trimestralmente, se ajusta mensualmente. Fechas son compromisos blandos salvo marcadas como *hard*.

---

## 1. Estado de hoy (2026-04-16)

### 1.1 Producto en producción

| Componente | Versión pública | Status |
|---|---|---|
| iOS | 1.0.2 en App Store MX — `https://apps.apple.com/mx/app/solennix/id6760874129` | ✅ Live (sin los cambios de hoy — próxima release será 1.0.4+) |
| Android | 1.0.0 en Play Store | ✅ Live (sin los cambios de hoy) |
| Web | Producción en `solennix.com` | ✅ Live (sin los cambios de hoy — pendiente deploy manual) |
| Backend | Producción en `api.solennix.com` | ✅ Live (sin los cambios de hoy — pendiente deploy manual) |

### 1.2 Commits en `main` hoy (2026-04-16)

25 commits empujados:

```
a3f425a  fix(android): silent migration of legacy checklist prefs
06d69ff  feat(web): Client Portal MVP
8dff4f3  feat(backend): Portal Cliente MVP
993719c  feat(web): Business tier + plan_limit_exceeded paywall
8d521b2  feat(backend): Business tier + 14-day Stripe trial
8d99328  chore: .env.example completo
0284923  a11y(ios): VoiceOver pass en Dashboard
62a5d6b  perf(ios): DateFormatter cache
f960e02  fix(ios): Dashboard kpis preload
d2b967e  fix(web): CalendarView → React Query
9660842  docs(prd): backfill 10 PRD documents
b4ad3e1  fix(ios): removePhoto undo + utf8 force-unwraps
5e4a900  fix(android): CSV filters + Calendar errors + encrypted checklist
3a72812  fix(backend): sort allowlist + rate limiter + admin errors
8335d5d  fix(web): Modal scroll lock + toast throttle + Settings guard
3b72e8e  fix(ios): Dashboard lifecycle + DateFormatter + safer regex
665c002  fix(android): observeEvent + lifecycle + bounded fanout
8a3162f  fix(web): EventForm step validation + PublicEventForm
a8a8dd4  fix(backend): GetAll LIMIT + Apple token timeout
f1d0ef2  docs(prd): audit backlog + client-transparency roadmap
e5751ae  fix(web): EventForm fetchMissingCosts loop
3bb1cba  fix(android): syncEventItems @Transaction
8277dc2  fix(ios): APIClient timeout + SwiftData error propagation
3ec4eba  fix(backend): restore Apple Sign-In for new users
2ede8c4  feat(web): Google Play badge (previo)
```

### 1.3 Deuda del audit 2026-04-16

De las 38 findings originales:
- **P0:** 7 arregladas, 1 inválida (audit reportó un bug que no existía).
- **P1:** 11 arregladas, 1 skipeada (Apple docs contradicen el finding — documentado en commit).
- **P2:** 8 arregladas, 3 diferidas con razón escrita (MaxBytesReader nil en Go 1.25 no repro, Dashboard 8 GETs requiere nuevo endpoint backend, a11y sweep amplio).
- **P3:** 4 arregladas, 3 diferidas con razón escrita.

**Neto:** 30 de 38 cerradas, 7 formalmente diferidas con justificación, 1 inválida. Ver `PRD/11_CURRENT_STATUS.md` para el detalle.

---

## 2. Matriz de status por feature y plataforma

**Leyenda:** ✅ Shipped · 🚧 En desarrollo · 📋 Planeado · ❌ No aplica · ⏳ Bloqueado.

### 2.1 Core operativo (ya en prod)

| Feature | iOS | Android | Web | Backend |
|---|:-:|:-:|:-:|:-:|
| Auth email + password | ✅ | ✅ | ✅ | ✅ |
| Google Sign-In | ✅ | ✅ | ✅ | ✅ |
| Apple Sign-In | ✅ | ✅ | ✅ | ✅ *(bugfix hoy)* |
| Eventos CRUD | ✅ | ✅ | ✅ | ✅ |
| Clientes CRUD | ✅ | ✅ | ✅ | ✅ |
| Productos CRUD | ✅ | ✅ | ✅ | ✅ |
| Inventario CRUD | ✅ | ✅ | ✅ | ✅ |
| Pagos CRUD | ✅ | ✅ | ✅ | ✅ |
| Calendario | ✅ | ✅ | ✅ | ✅ |
| Cotizaciones PDF | ✅ | ✅ | ✅ | ❌ |
| Contratos PDF | ✅ | ✅ | ✅ | ❌ |
| Facturas PDF | ✅ | ✅ | ✅ | ❌ |
| Dashboard KPIs | ✅ | ✅ | ✅ | ✅ |
| Búsqueda global | ✅ | ✅ | ✅ | ✅ |
| Formularios públicos (lead capture) | ❌ | ❌ | ✅ | ✅ |
| Settings / branding | ✅ | ✅ | ✅ | ✅ |
| Notificaciones email | ✅ | ✅ | ✅ | ✅ |
| Push notifications | ✅ | ✅ | ✅ | ✅ |
| Live Activities | ✅ | ❌ | ❌ | ✅ |
| Admin panel | ❌ | ❌ | ✅ | ✅ |

### 2.2 Pricing / Monetization

| Feature | iOS | Android | Web | Backend |
|---|:-:|:-:|:-:|:-:|
| Plan Básico (gratis) | ✅ | ✅ | ✅ | ✅ |
| Plan Pro — cobro real | ⏳ *(espera RC prod key)* | ⏳ *(espera RC prod key)* | ⏳ *(espera Stripe prod setup)* | ✅ código listo |
| Plan Business — cobro real | ⏳ | ⏳ | ⏳ | ✅ código listo *(STRIPE_BUSINESS_PRICE_ID opcional)* |
| Paywall por `plan_limit_exceeded` | 📋 | 📋 | ✅ *(hoy)* | ✅ |
| 14-day trial web (Stripe) | ❌ | ❌ | ✅ *(hoy)* | ✅ |
| 14-day trial mobile | ⏳ *(config store)* | ⏳ *(config store)* | ❌ | ✅ *(vía RC webhook)* |
| Debug upgrade (dev only) | ❌ | ❌ | ✅ | ✅ |
| Billing portal (Stripe) | ❌ | ❌ | ✅ | ✅ |
| Feature-gating server-side | 🚧 *(parcial)* | 🚧 *(parcial)* | 🚧 *(parcial)* | 🚧 *(faltan límites de PRD/04)* |

### 2.3 Portal Cliente (PRD/12 feature A)

| Feature | iOS | Android | Web | Backend |
|---|:-:|:-:|:-:|:-:|
| Endpoint público `/public/events/{token}` | ❌ | ❌ | ❌ | ✅ *(hoy)* |
| Endpoints organizador (create/get/revoke link) | ❌ | ❌ | ✅ *(hoy, vía service)* | ✅ *(hoy)* |
| UI del portal cliente (read-only) | 📋 (no planeado — es web responsive) | 📋 | ✅ *(hoy)* | ❌ |
| Share card en EventDetail / EventSummary | 📋 | 📋 | ✅ *(hoy)* | ❌ |
| PIN opcional | 📋 | 📋 | 📋 | 📋 |
| Toggles `visibleToClient` por campo | 📋 | 📋 | 📋 | 📋 |
| Plan limit (Gratis 1 / Pro ∞) | — | — | — | 📋 *(Sprint 7.C)* |

### 2.4 Transparencia & engagement cliente (PRD/12 features B-L)

| Feature | iOS | Android | Web | Backend |
|---|:-:|:-:|:-:|:-:|
| B. Transparencia de pagos (cronograma) | 📋 | 📋 | 📋 | 📋 |
| C. Notificaciones por etapa | 📋 | 📋 | 📋 | 📋 |
| D. Thread de comunicación | 📋 | 📋 | 📋 | 📋 |
| E. Bandeja de decisiones | 📋 | 📋 | 📋 | 📋 |
| F. Upload del cliente | 📋 | 📋 | 📋 | 📋 |
| G. Firma digital | 📋 | 📋 | 📋 | 📋 |
| H. RSVP invitados | 📋 | 📋 | 📋 | 📋 |
| I. Reseñas post-evento | 📋 | 📋 | 📋 | 📋 |
| J. Branding completo (dominio custom, DKIM) | 📋 | 📋 | 📋 | 📋 |
| K. Multi-idioma cliente | 📋 | 📋 | 📋 | 📋 |
| L. Resumen de valor post-evento | 📋 | 📋 | 📋 | 📋 |

### 2.5 Infraestructura / CI / CD

| Feature | iOS | Android | Web | Backend | Infra |
|---|:-:|:-:|:-:|:-:|:-:|
| CI tests en GitHub Actions | ❌ *(no corre iOS)* | ❌ *(no corre Android)* | ✅ | ✅ | — |
| CI lint + typecheck | — | — | ✅ | ✅ | — |
| CI E2E Playwright | — | — | ✅ | — | — |
| CI build verification | — | — | ✅ | ✅ | — |
| Auto-deploy VPS | — | — | — | — | 🟡 *prepared, not activated* |

---

## 3. Sprint log (lo que se hizo)

### Sprint 1 — P0 fixes del audit (2026-04-16, cerrado)

- [x] Backend: Apple Sign-In fix para nuevos usuarios (`fix(backend): restore Apple Sign-In for new users`).
- [x] iOS: timeouts APIClient + SwiftData error propagation.
- [x] Android: `syncEventItems` `@Transaction`.
- [x] Web: EventForm `fetchMissingCosts` re-render loop.

**Commits:** 4.

### Sprint 2 — P1 fixes (2026-04-16, cerrado)

- [x] Backend: `GetAll` LIMIT 1000 + Apple token timeout.
- [x] Web: EventForm step validation + PublicEventForm AbortController.
- [x] Android: `observeEvent` single-row Flow + lifecycle-aware WindowInfo + bounded inventory demand.
- [x] iOS: Dashboard `.task` + static DateFormatter + safer regex.

**Commits:** 4.

### Sprint 3 — P2/P3 fixes (2026-04-16, cerrado)

- [x] Web: Modal scroll lock + toast throttle + Settings guard.
- [x] Backend: sort column allowlist + rate limiter thread-safe + admin error shape.
- [x] Android: CSV filters + Calendar errors + encrypted checklist prefs (+ silent migration posterior).
- [x] iOS: removePhoto undo + utf8 force-unwraps.

**Commits:** 4.

### Sprint 4 — Activar deploy VPS (DEFERIDO por usuario)

- [ ] Usuario configura secrets en GitHub (`VPS_HOST`, `VPS_USERNAME`, `VPS_SSH_KEY`, `VPS_PORT`).
- [ ] Reemplazar path placeholder en `.github/workflows/deploy.yml`.

**Status:** el usuario eligió deploy manual por ahora. `.github/workflows/deploy.yml` sigue "prepared, not activated".

### Sprint 5 — Backfill PRD (2026-04-16, cerrado)

- [x] `01_PRODUCT_VISION.md` (147 líneas).
- [x] `02_FEATURES.md` (matriz cross-platform).
- [x] `03_COMPETITIVE_ANALYSIS.md`.
- [x] `04_MONETIZATION.md` (+sección 11 keys/secrets hoy).
- [x] `05_TECHNICAL_ARCHITECTURE_IOS.md` (786 líneas).
- [x] `06_TECHNICAL_ARCHITECTURE_ANDROID.md` (761 líneas).
- [x] `07_TECHNICAL_ARCHITECTURE_WEB.md` (844 líneas).
- [x] `08_TECHNICAL_ARCHITECTURE_BACKEND.md` (715 líneas).
- [x] `09_ROADMAP.md` (este).
- [x] `10_COLLABORATION_GUIDE.md`.

**Commits:** 1 (bundle).

### Sprint 6 — Polish técnico (2026-04-16, cerrado)

- [x] Web: CalendarView migrado a React Query.
- [x] iOS: Dashboard kpis preload (paints counts < 200ms).
- [x] iOS: DateFormatter cache + migración de hot-path helpers.
- [x] iOS: VoiceOver pass en KPICards + AttentionEventsCard + EventStatusChart + status buttons.

**Commits:** 4.

### Sprint 7.A — Pricing foundation (2026-04-16, cerrado)

- [x] `.env.example` completo (30+ vars agrupadas por ownership).
- [x] Migration 040: `users_plan_check` acepta `'business'`.
- [x] `Config.StripeBusinessPriceID` opcional.
- [x] `CreateCheckoutSession` acepta `{plan, skip_trial}`, propaga metadata al Subscription, agrega trial 14d.
- [x] Webhook handler lee `Session.Metadata.plan` para distinguir Pro vs Business.
- [x] Web: `lib/api.ts` detecta `403 plan_limit_exceeded` → toast + CustomEvent + `PlanLimitExceededError`.
- [x] Web: Layout listener del evento → navega a `/pricing` tras 800ms.
- [x] Web: `subscriptionService.createCheckoutSession(plan)` acepta tier.
- [x] Web: `Pricing.tsx` con 3 cards (Básico / Pro / Business) + CTA "Probar 14 días gratis".

**Commits:** 3.

**Bloqueante para activación:** acción del usuario en dashboards externos (ver sección 5 abajo).

### Portal Cliente MVP (PRD/12 feature A — parcial, 2026-04-16)

- [x] Backend: migration 041 `event_public_links` + modelo + repo + handler (4 endpoints: create/get/revoke organizador + GET público).
- [x] Backend: curated response shape `PublicEventView` (evento, organizer branding, cliente, payment summary).
- [x] Backend: 410 Gone para revoked/expired, auto-revoke si el evento se borra.
- [x] Web: route público `/client/:token` → `ClientPortalPage.tsx` con countdown, details grid, payment progress bar, branding del organizador.
- [x] Web: `ClientPortalShareCard` en EventSummary (Copy + WhatsApp share + Rotate + Revoke).
- [x] Web: `eventPublicLinkService` + error states (404 vs 410).

**Commits:** 2.

**Pendiente para completar feature A:**
- [ ] iOS: share card en EventDetailView con bottom sheet (Copy + WhatsApp + Rotate + Revoke).
- [ ] Android: equivalente en EventDetailScreen.
- [ ] OpenAPI: documentar los 4 endpoints.
- [ ] PIN opcional.
- [ ] Field-level `visibleToClient` toggles.
- [ ] Plan limit (Gratis 1 / Pro ∞) — Sprint 7.C.

---

## 4. Próximo trimestre (Q2 2026 — abr/may/jun)

### Sprint 7.B — Client paywalls coherentes (mobile) + Android Play Billing audit

- [ ] iOS: paywall modal reactivo a `plan_limit_exceeded` 403 con CTA contextual.
- [ ] Android: wiring de `UpgradePlanDialog` cuando API devuelve 403.
- [ ] Homologar mensajes de upgrade banner en las 3 plataformas.
- [ ] Audit de Android Play Billing integration: ¿está 100% via RC SDK o falta Play Billing directo?

**Bloqueante externo:** ninguno si RC + productos ya están configurados.

### Sprint 7.C — Enforcement matrix completo

Alinear TODOS los límites server-side con `PRD/04` sección 3.

**Regla global reciente (2026-04-16):** Gratis NO tiene acceso a features de comunicación con el cliente. Hay que gatear `403 plan_limit_exceeded` con `{type: "requires_paid_plan"}` en CADA endpoint del portal cliente + payment submissions + milestone notifications + chat thread + decisiones + firma digital + RSVP + reseñas.

- [ ] Eventos/mes — ya existe (3 para basic).
- [ ] Clientes — ya existe (50 para basic).
- [ ] Catálogo — ya existe (20 para basic).
- [ ] Uploads — ya existe.
- [ ] Event form links — ya existe (3 para basic).
- [ ] **Staff seats** — NO implementado.
- [ ] **Portal cliente (feature A)** — Gratis bloqueado, Pro+ ilimitado. Hoy cualquiera puede crear.
- [ ] **Payment submissions (feature B)** — Gratis bloqueado (cliente no puede submitir si organizer es Gratis).
- [ ] **Milestone notifications (feature C)** — Gratis bloqueado.
- [ ] **Chat thread (feature D)** — Gratis bloqueado.
- [ ] **Decisiones pendientes (feature E)** — Gratis bloqueado.
- [ ] **Firma digital (feature G)** — Pro para canvas, Business para proveedor legal.
- [ ] **RSVP invitados (feature H)** — Pro=500, Business=∞. Feature no implementada aún.
- [ ] **Reseñas post-evento (feature I)** — Gratis bloqueado.
- [ ] Advanced analytics gating — pending.
- [ ] Plan expiry job (downgrade automático tras `plan_expires_at`) — pending.
- [ ] Migrar copy de paywall web/mobile para decir "Esta feature requiere Plan Pro" cuando corresponda, no solo "alcanzaste el límite".

### Sprint 8 — iOS + Android Portal Cliente (completar feature A)

- [ ] iOS `ClientPortalShareSheet.swift` en EventDetailView.
- [ ] Android `ClientPortalShareBottomSheet.kt` en EventDetailScreen.
- [ ] UI tests básicos en ambos (mockeando servicio).
- [ ] Commit cross-platform con paridad verificada.

### Sprint 9 — PRD/12 feature B: Pagos del cliente (visualización + registro por transferencia)

**Decisión 2026-04-16:** reemplazamos el flujo "botón Pagar con Stripe" por registro de pago por transferencia con approve/reject. Solennix NO procesa pagos; el cliente reporta y el organizador aprueba.

- [ ] Backend: tabla `payment_schedule` (cronograma de cuotas con due_date).
- [ ] Backend: tabla `payment_submissions` (registro cliente + estado pending/approved/rejected + resulting_payment_id).
- [ ] Backend: ampliar `PublicEventView` con `payment_schedule` + `payment_history` (solo aprobados).
- [ ] Backend: endpoints nuevos:
  - `POST /api/public/events/{token}/payment-submissions` (cliente registra; clave requerida, comprobante opcional).
  - `GET /api/public/events/{token}/payment-submissions` (cliente ve sus registros + estados).
  - `POST /api/public/uploads/receipt` (upload de comprobante, max 5 MB, rate-limited).
  - `GET /api/events/{id}/payment-submissions` (organizador lista pending + history).
  - `POST /api/events/{id}/payment-submissions/{sid}/approve` (crea row en `payments`).
  - `POST /api/events/{id}/payment-submissions/{sid}/reject` (nota obligatoria).
- [ ] Web: sección "Pagos" en ClientPortalPage con cronograma + formulario "Registrar pago" + historial de submissions con badges de estado.
- [ ] Web: vista organizador en EventDetail con inbox de pending submissions + approve/reject UI.
- [ ] Notifications: nuevo submission → email + push al organizador. Approved/rejected → email al cliente.
- [ ] Email template: 3 días antes de cada vencimiento del cronograma (configurable desde settings).
- [ ] Paridad mobile (iOS + Android): misma vista organizador con bottom sheet approve/reject.
- [ ] Rate limit: 5 submissions/hora por token (anti-spam).
- [ ] Security: content-type whitelist en upload (JPG/PNG/PDF), nombre hasheado, bucket separado.

### Sprint 10 — PRD/12 feature I: Reseñas post-evento

- [ ] Backend: tabla `event_reviews` + endpoints público y privado.
- [ ] Backend: cron job que envía email de review 48h post-evento.
- [ ] Web: UI pública para dejar review desde link en email.
- [ ] Web: portfolio público del organizer `/organizer/:slug/reviews`.
- [ ] Rating ≥4 → prompt de compartir en Google/Facebook (copy + Open Graph).

---

## 5. Bloqueantes externos (tareas del usuario, 2-4 h)

Estas NO las puedo hacer yo. Cuando las completes, Sprint 7 se puede activar completo.

### Stripe Dashboard

- [ ] Crear productos en Stripe Dashboard en modo **Live**:
  - Pro Mensual (precio sugerido USD 15 / equivalente MXN $299)
  - Pro Anual (USD 144 / MXN $2,880, ~20% descuento)
  - Business Mensual (USD 49 / MXN $899)
  - Business Anual (USD 470 / MXN $9,400)
- [ ] Registrar webhook en Stripe → `https://api.solennix.com/api/subscriptions/webhook/stripe` con eventos:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
- [ ] Configurar Billing Portal (allowed actions, appearance).
- [ ] Cargar en VPS `.env`:
  - `STRIPE_SECRET_KEY=sk_live_...`
  - `STRIPE_WEBHOOK_SECRET=whsec_...`
  - `STRIPE_PRO_PRICE_ID=price_...`
  - `STRIPE_BUSINESS_PRICE_ID=price_...`

### App Store Connect (iOS)

- [ ] Crear auto-renewable subscription group "Solennix Premium".
- [ ] Agregar products con IDs idénticos a los que consume RC:
  - `solennix_premium_monthly`
  - `solennix_premium_yearly`
- [ ] Configurar **introductory offer: Free Trial · 14 días** en cada product.
- [ ] Localización de precios (MX, AR, CO, CL, PE al menos).
- [ ] Submit for review (tarda 1–7 días).

### Google Play Console (Android)

- [ ] Crear subscription products matching IDs de RC.
- [ ] Base plans (monthly + annual) con free trial 14 días.
- [ ] Publicar en al menos closed testing track.

### RevenueCat Dashboard

- [ ] Project Settings → API Keys:
  - Verificar `REVENUECAT_API_KEY` (secret) del project — copiarla al `.env` del VPS si no está.
  - Verificar `appl_...` key del app **Apple App Store (live)** (NO Test Store) — reemplazar `ios/Config/Secrets.xcconfig::REVENUECAT_PUBLIC_API_KEY` si no es la correcta (ver `PRD/04` sección 11).
  - Verificar `goog_...` key del app **Google Play Store (live)** — cargar en env var / gradle property de Android.
- [ ] Entitlement `pro_access` creado, asociado a los productos de iOS + Android.
- [ ] Default offering activo con packages vinculados a productos de ambas stores.
- [ ] Webhook configurado → `https://api.solennix.com/api/subscriptions/webhook/revenuecat` con secret header que matchee `REVENUECAT_WEBHOOK_SECRET` en el `.env`.

### Resend / Email

- [ ] Dominio verificado en Resend (DKIM + SPF).
- [ ] `RESEND_API_KEY` cargada en VPS.
- [ ] `RESEND_FROM_EMAIL` usa el dominio verificado.

**Todo esto ya puede estar hecho** (si la auth + push + email funcionan en prod, la mayoría está). El único nuevo es `STRIPE_BUSINESS_PRICE_ID` (opcional) y verificar que la RC mobile key sea live (ver `PRD/04` §11).

---

## 6. Q3 2026 (jul/ago/sep) — Features cliente

- **Sprint 11:** PRD/12 feature C — Notificaciones por etapa configurables.
- **Sprint 12:** PRD/12 feature D — Thread de comunicación organizador↔cliente.
- **Sprint 13:** PRD/12 feature E — Bandeja de decisiones pendientes.
- **Sprint 14:** PRD/12 feature H — RSVP de invitados.

---

## 7. Q4 2026 (oct/nov/dic) — Business tier exclusivo

- **Sprint 15:** WhatsApp Business API (Twilio o Meta Cloud API).
- **Sprint 16:** Firma digital de contratos (canvas en Pro + proveedor legal en Business).
- **Sprint 17:** Branding completo Business (dominio custom + DKIM).
- **Sprint 18:** Analytics avanzados + forecast dashboard.

---

## 8. Q1 2027 — Crecimiento + retención

- Programa de referidos (cliente → cliente).
- Cupones por partner (AEM, cámaras empresariales).
- Planes anuales con descuento promocional.
- PRD/12 feature F — Upload del cliente (moodboards, playlist).
- PRD/12 feature K — Multi-idioma cliente (es/pt/en).
- PRD/12 feature L — Resumen de valor post-evento.

---

## 9. Q2 2027+ — Roadmap largo (sin fecha firme)

- Gallery post-evento con fotos del fotógrafo.
- Integraciones Google Calendar / iCal / Outlook.
- Marketplace de proveedores.
- API pública documentada (tier Business).
- Staff/roles/permisos granulares Business.
- Analytics avanzados + forecast.

---

## 10. Operación paralela (no ligada a sprints)

### Marketing y partnerships

- **Q2 2026:** lanzar blog con SEO posts ("cómo cotizar una boda", "Excel vs Solennix").
- **Q3 2026:** partnerships con wedding planners influencers (50k+ seguidores en Instagram) por país.
- **Q4 2026:** stand en 1 feria de eventos LATAM (EventoBoda MX o Expoferia).

### Soporte

- **Hoy:** email + WhatsApp ad-hoc del founder.
- **Q3 2026:** canal de WhatsApp Business con 1 agente dedicado (part-time).
- **Q4 2026:** knowledge base público + videotutoriales.

### Finanzas

- **Q2 2026:** Stripe Tax para facturación correcta por país.
- **Q3 2026:** provider local para facturación fiscal (Facturama en MX).

---

## 11. Estimaciones de esfuerzo (capacidad)

Asunción: 1 founder-ingeniero + asistente de AI (Claude Code) en jornada completa.

| Tipo de trabajo | Esfuerzo típico |
|---|---|
| Fix P0 bundle cross-platform | 1 sesión intensiva. |
| Feature cliente-facing nueva cross-platform | 2–3 sprints de 2 semanas. |
| Feature interno solo backend | 1 sprint. |
| Backfill de doc PRD completo | 1 sesión. |
| Activación de deploy VPS (cuando secrets listos) | 30 min. |
| Pass de polish cross-platform (ej. P3) | 1 sprint, baja prioridad. |
| Portal Cliente backend MVP + Web UI | ~4 h (medido hoy). |

---

## 12. Compromisos hard (fechas no negociables)

| Milestone | Fecha hard |
|---|---|
| *(ninguno hoy — 2026-04-16)* | — |

Cualquier compromiso hard pasa a listarse acá con fecha específica.

---

## 13. Cómo usar este doc

- **Semanal:** al empezar el sprint, el founder revisa la sección 2 (matriz) + sección 3 (próximo sprint) y confirma.
- **Al cierre de sprint:** tachar ítems completados, mover a "Sprint log" (sección 3).
- **Mensual:** revisión completa de la matriz + reordenar Q actual si hay señales del mercado.
- **Trimestral:** reset de tema y objetivos Q.

**Regla:** el roadmap NO es vinculante externamente hasta que un ítem se marque como "hard" con fecha.
