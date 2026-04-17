# 04 — Monetización

**Estado:** Vivo · precios sujetos a A/B testing.
**Fuentes de verdad:**
- Paywalls mobile: RevenueCat (iOS App Store + Google Play).
- Paywalls web: Stripe.
- Feature gates: `backend/internal/services/plan_limits_*.go` + `PlanLimitsManager` en cada cliente.

**Última actualización:** 2026-04-16.

---

## 1. Modelo de negocio

Suscripción SaaS mensual/anual con 3 tiers: **Gratis · Pro · Business**.

- **Billing mobile:** vía App Store (Apple IAP) y Google Play Billing — la plataforma cobra su comisión (15–30%), no hay elección.
- **Billing web:** vía Stripe en USD o moneda local (MXN/ARS/COP/CLP) — margen superior para el negocio.
- **Política cross-platform:** un usuario que compra Pro en iOS tiene Pro también en Android y Web. El backend es source of truth del plan activo (campo `users.plan`), la pasarela es source of truth de la facturación.

---

## 2. Tiers y precios

> Precios son direccionales — revisar en `PRD/09_ROADMAP.md` antes de prometer compromiso público. Precio ancla en USD, se localiza en cada mercado.

| Tier | Precio ancla (USD/mes) | Público objetivo |
|---|---|---|
| **Gratis** | $0 | Probador, organizador nuevo, mercado con baja disposición a pagar. |
| **Pro** | $15 / mes o $144 / año (-20%) | Organizador consolidado con 5–30 eventos/mes. |
| **Business** | $49 / mes o $470 / año (-20%) | Organizador con equipo, marca propia, múltiples líneas de servicio. |

**Localización:** cada mercado tiene precio ajustado a PPP + IVA local. Ejemplo referencial:

| Tier | MXN/mes | ARS/mes | COP/mes | CLP/mes |
|---|---|---|---|---|
| Pro | $299 | $15.000 | $60.000 | $14.000 |
| Business | $899 | $49.000 | $199.000 | $45.000 |

(Revisar con finance antes de publicar. Los montos son referenciales y pueden moverse.)

---

## 3. Matriz de features (qué entra en cada tier)

| Categoría | Feature | Gratis | Pro | Business |
|---|---|:---:|:---:|:---:|
| **Límites de escala** | Eventos activos | 5/mes | ∞ | ∞ |
| | Clientes guardados | 15 | ∞ | ∞ |
| | Productos en catálogo | 25 | ∞ | ∞ |
| | Items de inventario | 30 | ∞ | ∞ |
| | Staff con acceso | 1 (solo dueño) | 3 | ∞ |
| **Documentos** | Cotizaciones | ✓ | ✓ | ✓ |
| | Contratos PDF con template | ✓ básico | ✓ editable | ✓ con firma digital |
| | Branding en PDFs (logo + colores) | logo básico | ✓ completo | ✓ + dominio email propio |
| | Exportar CSV | ✓ | ✓ | ✓ |
| **Pagos (internos al organizador)** | Registro manual de pagos (organizador) | ✓ | ✓ | ✓ |
| | Recordatorios automáticos de pago | — | ✓ | ✓ |
| **Cliente — comunicación (ver `PRD/12`)** | Portal público del cliente | — | ∞ + branding | + dominio custom |
| | Transparencia de pagos (cliente ve balance + cronograma) | — | ✓ | + export API |
| | **Registro de pago por transferencia del cliente + approve/reject** | — | ✓ + bulk approve + email templates | + auto-match con CSV estado de cuenta |
| | Notificaciones al cliente | — | email+SMS, ∞ milestones | + WhatsApp API + custom |
| | Thread de comunicación organizador↔cliente | — | ✓ | + export legal |
| | Bandeja de decisiones pendientes | — | ∞ | + flujos multi-paso |
| | Firma digital de contratos | — | ✓ (canvas) | ✓ con proveedor legal |
| | RSVP de invitados | — | 500 invitados | ∞ |
| | Reseñas post-evento | — | + portfolio público | + integración Google/FB |
| **Operación** | Calendario con eventos | ✓ | ✓ | ✓ |
| | Bloqueo de fechas no disponibles | ✓ | ✓ | ✓ |
| | Checklist por evento | ✓ | ✓ | ✓ |
| | Dashboard KPI | básico | + análisis de tendencia | + forecast |
| | Multi-usuario / staff | 1 usuario | 3 usuarios | ∞ con roles |
| **Inventario** | Catálogo básico | ✓ | ✓ | ✓ |
| | Previsión de demanda (demand forecast) | — | ✓ | ✓ |
| | Alertas de stock bajo | — | ✓ | ✓ |
| **Notificaciones** | Push app organizador | ✓ | ✓ | ✓ |
| | Email organizador | ✓ | ✓ | ✓ |
| **Integraciones** | Google Calendar / iCal export | — | ✓ | ✓ |
| | WhatsApp Business API | — | — | ✓ |
| | Dominio email custom con DKIM | — | — | ✓ |
| | Webhooks / API pública | — | — | ✓ |
| **Soporte** | Canal | docs + email (48h) | WhatsApp (24h) | WhatsApp (4h) + onboarding 1:1 |

---

## 4. Filosofía de feature-gating

### 4.1 Qué NUNCA se atrapa tras paywall

- **Datos del usuario.** Si alguien deja de pagar, puede exportar TODO (CSV completo + PDFs generados) durante 90 días post-downgrade.
- **Lectura del histórico propio.** Un usuario degradado a Gratis que tiene 200 eventos históricos sigue viéndolos y exportándolos; solo pierde la capacidad de crear nuevos más allá del límite del plan Gratis.
- **Login y acceso básico.** No se cobra por entrar. Un usuario sin tarjeta puede operar indefinidamente dentro de los límites Gratis.

### 4.2 Qué sí es palanca fuerte

- **Límite de eventos/mes.** El momento en que el usuario alcanza 5/5 es el mejor momento de conversión. Mostrar upgrade ahí, con claridad.
- **Comunicación con el cliente final es Pro+.** **Decisión 2026-04-16:** el plan Gratis NO incluye NINGUNA feature cara-al-cliente: sin portal público, sin registro de pagos por transferencia, sin notificaciones automáticas al cliente, sin thread, sin bandeja de decisiones, sin reseñas. Gratis es un CRM interno para el organizador que recién arranca; toda la diferenciación "app que el cliente percibe" vive en Pro. Esa brecha es el upgrade driver más fuerte.
- **Portal del cliente + branding.** Un organizador que quiere verse profesional paga por abrir la ventana al cliente con su marca.
- **WhatsApp Business.** Alto costo variable por mensaje enviado → exclusivo de Business, costo transferible al organizador.

### 4.3 Comportamiento al alcanzar un límite

Toda pantalla que golpea un límite Gratis muestra:

1. **Contexto:** "Alcanzaste los 5 eventos de este mes de tu plan Gratis."
2. **Valor concreto del upgrade:** "Con Pro tenés eventos ilimitados, portal del cliente con tu marca y recordatorios automáticos de pago."
3. **Call to action:** "Probar Pro 7 días gratis."
4. **Salida digna:** "Seguir en Gratis, espero al próximo mes." — nunca un dead-end.

**Patrón técnico:** backend devuelve `403 plan_limit_exceeded` con shape:
```json
{
  "error": "plan_limit_exceeded",
  "message": "Has alcanzado el límite de tu plan.",
  "limit": { "type": "events_per_month", "current": 5, "max": 5 }
}
```
Clientes (iOS/Android/Web) parsean y muestran el paywall adecuado. Implementado hoy en `backend/internal/handlers/helpers.go::writePlanLimitError`.

---

## 5. Free trial

- **Pro y Business:** 7 días de prueba gratis, sin cobrar hasta el día 8.
- **Conversión esperada post-trial:** 22% (Pro), 8% (Business) — direccional.
- **Cancelación durante trial:** 1 click, sin fricción, sin retención forzada.

---

## 6. Comunicación de precio (UX)

Reglas no negociables:

- **Siempre mostrar precio mensual + equivalente anual con descuento.** Nunca esconder el precio anual.
- **Siempre moneda local + tasa de cambio declarada.** Si algún mercado paga en USD, decirlo en el checkout.
- **Nunca dark-patterns.** No pre-selección de anual, no auto-renewal escondido, no comparación tramposa vs "competidor falso".
- **Facturación transparente.** Acceso a historial de recibos, descargable en PDF con datos fiscales básicos.

---

## 7. Métricas de salud comercial

| Métrica | Target Q1 post-lanzamiento Pro | Meta Q4 2026 |
|---|---|---|
| Conversión Gratis → Pro | 4% | 8% |
| Conversión Pro → Business | 3% | 6% |
| Churn mensual Pro | <6% | <4% |
| Churn mensual Business | <3% | <2% |
| ARPU (USD) | 12 | 18 |
| LTV / CAC | 3x | 5x |

---

## 8. Riesgos y tradeoffs

- **Plataforma mobile se lleva 15–30% de comisión.** Empujar el upgrade inicial por web cuando se pueda (descuento del primer año por pagar web). Evitar prácticas que Apple/Google puedan sancionar (ver "reader apps" rules).
- **Moneda volátil en AR/VE.** Precios en USD con ajuste mensual + aclaración al usuario. Alternativa: tarifa plana en ARS ajustada trimestralmente.
- **Fraude de suscripción (compartición de cuentas).** Implementar device fingerprinting suave en Business para detectar exceso de sesiones activas.
- **Cancelación dolorosa = churn de reputación.** Flujo de cancelación en 1 click. Encuesta opcional post-cancel. Si cancela por precio → oferta de descuento único.

---

## 9. Roadmap comercial

- **Q2 2026** — Stripe checkout en web, Apple IAP en iOS, Google Play Billing en Android, plan Pro operativo.
- **Q3 2026** — Plan Business habilitado con WhatsApp Business API.
- **Q4 2026** — Portal del cliente como gancho Pro (ver PRD/12).
- **Q1 2027** — Planes anuales con descuento, cupones para partners, programa de referidos.

Ver `PRD/09_ROADMAP.md` para detalle.

---

## 10. Preguntas abiertas

- ¿Plan Pro con cap más bajo de portales (ej. 20) para contener costo de dominio custom?
- ¿Cupones para miembros de AEM (Asociación de Empresarios de Eventos) u otras gremiales por país?
- ¿Tier "Gratis permanente con marca Solennix visible" vs "Gratis 30 días y después downgrade a read-only"?
- ¿Team-pricing transparente (ej. Business = $49 base + $10/staff adicional) o flat?

---

## 11. Keys y secrets — no confundir (lectura obligatoria antes de tocar billing)

Cada integración de cobro tiene **varias keys** en lugares distintos. Confundirlas es la causa #1 de bugs tipo "el pago se cobró pero el usuario no ve el upgrade" o "en iOS ves ofertas de test aunque el backend ya está en producción".

### 11.1 Stripe

| Key | Dónde vive | Prefix | Quién lo usa |
|---|---|---|---|
| Secret API Key | Backend `.env` → `STRIPE_SECRET_KEY` | `sk_live_...` / `sk_test_...` | Backend: crea checkout sessions, lee subscriptions. **Nunca** en el frontend. |
| Webhook Signing Secret | Backend `.env` → `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Backend: valida firma de los eventos webhook de Stripe. |
| Price IDs | Backend `.env` → `STRIPE_PRO_PRICE_ID`, `STRIPE_BUSINESS_PRICE_ID` | `price_...` | Backend: identifica qué tier comprar al crear la checkout session. |
| Billing Portal Config | Backend `.env` → `STRIPE_PORTAL_CONFIG_ID` (opcional) | `bpc_...` | Backend: variante custom del Customer Portal. Si omitís, usa la default del account. |

**El web NO necesita ninguna key de Stripe.** El flujo es: web → tu backend → Stripe Checkout redirect. La `sk_...` nunca sale del servidor.

Distinguir test vs live: Stripe explicita el modo en el prefix (`sk_test_` vs `sk_live_`, `whsec_` vs `whsec_test_` en algunos casos, los price IDs comparten prefix pero el dashboard los separa por modo). **Siempre confirmá que las 4 keys son del mismo modo (todas live o todas test) antes de deployar.**

### 11.2 RevenueCat — 3 keys DISTINTAS (confusión típica)

RevenueCat es especial porque usa **3 keys separadas, una por superficie**:

| Key | Dónde vive | Prefix | Quién lo usa |
|---|---|---|---|
| **Secret API Key** (server REST) | Backend `.env` → `REVENUECAT_API_KEY` | `sk_...` | Backend: grant/revoke de entitlements (ej. cuando Stripe web cobra, el backend llama a RC para que mobile vea el entitlement). |
| **Public App Key iOS** | iOS build → `ios/Config/Secrets.xcconfig` → `REVENUECAT_PUBLIC_API_KEY` | `appl_...` | iOS SDK: `Purchases.configure(withAPIKey:)` — consulta offerings, ejecuta purchases. |
| **Public App Key Android** | Android build → env var o `~/.gradle/gradle.properties` → `REVENUECAT_API_KEY` | `goog_...` | Android SDK: misma función que iOS pero distinto key. |

**Confusión más típica:** asumir que "si el backend está en producción, todas las keys son de prod". **FALSO.** Cada una se configura por separado; es perfectamente posible tener el backend apuntando a live y la iOS apuntando a la Test Store de RC.

#### ⚠️ El prefix `appl_` NO indica test vs live

Dentro de un Project de RevenueCat hay múltiples "apps":
- **Test Store app** — genera key con prefix `appl_` para simular compras sin App Store.
- **Apple App Store app (live)** — la app real; genera OTRA key también con prefix `appl_`.

**Ambas empiezan con `appl_`.** El formato NO te dice cuál es cuál — hay que verificar en el dashboard. Mismo para Android (`goog_` en test y live).

#### Cómo verificar que la key mobile actual es la correcta

1. https://app.revenuecat.com → tu Project.
2. **Project Settings** → **API Keys**.
3. Comparar el valor que tenés en `Secrets.xcconfig` (iOS) / gradle properties (Android) contra la lista del dashboard:
   ```
   Apps:
     • Solennix iOS (App Store)        → appl_XXXX…   ← esta es la que querés en prod
     • Solennix iOS (Test Store)       → appl_YYYY…   ← solo para dev local
     • Solennix Android (Play Store)   → goog_ZZZZ…
     • Solennix Android (Test Store)   → goog_WWWW…
   ```
4. Si tu `Secrets.xcconfig` tiene la del App Store (live) → prod OK. Si tiene la de Test Store → reemplazar.

**Estado actual (2026-04-16):** el comentario de `ios/Config/Secrets.xcconfig:12` dice explícitamente "Current value is the Test Store key — replace with `appl_...` once the Apple App Store app is connected in RevenueCat." Si ya la reemplazaste pero olvidaste actualizar el comentario, perfecto; si no, **es un pendiente activo**.

### 11.3 App Store Connect + Google Play (no son "keys" pero van juntos)

- **App Store Connect** no provee una key consumible por el cliente — la integración se hace por **bundle ID** + productos/subscriptions creados en el dashboard. RC absorbe los productos vía la conexión "Apple App Store" del project.
- **Google Play Console** idem: bundle + products en Play Console, RC absorbe.

**El error típico:** crear los productos en App Store Connect / Play pero olvidar conectarlos en RC. Síntoma: `Purchases.shared.offerings()` devuelve vacío en mobile aunque el store sí los muestre.

### 11.4 Checklist rápido antes de cobrar en prod

- [ ] `STRIPE_SECRET_KEY` es `sk_live_...` (no `sk_test_...`) en VPS `.env`.
- [ ] `STRIPE_WEBHOOK_SECRET` matchea el endpoint LIVE registrado en Stripe Dashboard.
- [ ] `STRIPE_PRO_PRICE_ID` apunta a un price visible en modo Live del Stripe Dashboard.
- [ ] `STRIPE_BUSINESS_PRICE_ID` idem (si querés Business habilitado).
- [ ] `REVENUECAT_API_KEY` es la Secret key del Project de RC, no una public key.
- [ ] `REVENUECAT_WEBHOOK_SECRET` matchea el Authorization Header configurado en el webhook de RC.
- [ ] `ios/Config/Secrets.xcconfig` `REVENUECAT_PUBLIC_API_KEY` es la key de la app "Apple App Store" (live) en RC, no la Test Store.
- [ ] Android gradle property `REVENUECAT_API_KEY` es la key de la app "Google Play Store" (live) en RC, no la Test Store.
- [ ] App Store Connect: productos `solennix_premium_monthly` y `solennix_premium_yearly` en estado "Approved" (no "Waiting for Review").
- [ ] Google Play Console: productos idénticos publicados en al menos closed testing track.
- [ ] RevenueCat Dashboard: entitlement `pro_access` asociado a los productos de ambas stores + default offering activo.

**Si TODOS estos tildes están ✓ → listo para cobrar.** Si uno falta, el síntoma varía (404 en checkout, offerings vacío en mobile, webhook que no llega, etc).
