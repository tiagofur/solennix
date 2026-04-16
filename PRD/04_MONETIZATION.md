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
| **Pagos** | Registro manual de pagos | ✓ | ✓ | ✓ |
| | Integración MercadoPago / Stripe / Conekta | — | ✓ | ✓ |
| | Recordatorios automáticos de pago | — | ✓ | ✓ |
| **Cliente** | Portal público del cliente (ver PRD/12) | 1 activo | ∞ + branding | + dominio custom |
| | Transparencia de pagos (cliente ve balance) | solo lectura | + botón pagar | + reconciliación auto |
| | Notificaciones al cliente | email, 3 milestones | email+SMS, ∞ milestones | + WhatsApp API + custom |
| | Thread de comunicación organizador↔cliente | — | ✓ | + export legal |
| | Bandeja de decisiones pendientes | 3/evento | ∞ | + flujos multi-paso |
| | Firma digital de contratos | — | ✓ (canvas) | ✓ con proveedor legal |
| | RSVP de invitados | — | 500 invitados | ∞ |
| | Reseñas post-evento | ✓ | + portfolio público | + integración Google/FB |
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
- **Portal del cliente + branding.** Un organizador que quiere verse profesional paga por quitar el "Powered by Solennix".
- **Integración de pagos.** El organizador quiere cobrar con 1 click desde el portal — upgrade natural a Pro.
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
