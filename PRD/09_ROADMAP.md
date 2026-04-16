# 09 — Roadmap

**Estado:** Vivo — revisión al cierre de cada sprint.
**Última actualización:** 2026-04-16.
**Metodología:** sprints de 2 semanas. Roadmap se fija trimestralmente, se ajusta mensualmente. Fechas son compromisos blandos salvo marcadas como *hard*.

---

## 1. Estado de hoy (2026-04-16)

| Plataforma | Estado |
|---|---|
| iOS | 1.0.2 en App Store — `https://apps.apple.com/mx/app/solennix/id6760874129` |
| Android | 1.0.0 release APK signed, activo en Play Store |
| Web | Producción en solennix.com |
| Backend | Producción en api.solennix.com |
| CI/CD | Prepared, NOT activated (secrets VPS pendientes — ver `PRD/11`) |

**Deuda conocida:** 38 findings del audit 2026-04-16 en `PRD/11`. Al cierre del Sprint 3 de esa iteración, 30 arreglados, 7 skipeados con justificación, 1 inválido.

---

## 2. Trimestre actual — Q2 2026 (abr–jun)

**Tema:** *Estabilidad + primer commercialización*.

### Sprint 1 (ya cerrado 2026-04-16) — P0 del audit
- [x] Backend: Apple Sign-In fix para nuevos usuarios.
- [x] iOS: timeouts APIClient + SwiftData error propagation.
- [x] Android: `syncEventItems` transaction.
- [x] Web: EventForm fetchMissingCosts loop.

### Sprint 2 (cerrado 2026-04-16) — P1
- [x] Backend: GetAll LIMIT + Apple token timeout.
- [x] Web: EventForm step validation + PublicEventForm AbortController.
- [x] Android: observeEvent single-row Flow + lifecycle-aware WindowInfo + bounded inventory demand.
- [x] iOS: Dashboard `.task` + DateFormatter static + safer regex.

### Sprint 3 (cerrado 2026-04-16) — P2/P3
- [x] Web: Modal scroll lock + toast throttle + Settings guard.
- [x] Backend: sort column allowlist + rate limiter thread-safe + admin error shape.
- [x] Android: CSV filter respect + calendar errors + encrypted checklist prefs.
- [x] iOS: removePhoto undo + utf8 force-unwraps.

### Sprint 4 — activar deploy VPS *(bloqueado en usuario)*
- [ ] Usuario configura secrets en GitHub (`VPS_HOST`, `VPS_USERNAME`, `VPS_SSH_KEY`, `VPS_PORT`).
- [ ] Usuario pasa path del repo en VPS.
- [ ] Reemplazar placeholder `/path/to/solennix` en `.github/workflows/deploy.yml`.
- [ ] Verificar primer auto-deploy a producción.

### Sprint 5 — Backfill del PRD (este sprint)
- [x] `01_PRODUCT_VISION.md`
- [x] `03_COMPETITIVE_ANALYSIS.md`
- [x] `04_MONETIZATION.md`
- [x] `09_ROADMAP.md`
- [x] `10_COLLABORATION_GUIDE.md`
- [ ] `02_FEATURES.md` — cross-platform parity (se genera después de los 4 docs de arquitectura)
- [ ] `05_TECHNICAL_ARCHITECTURE_IOS.md` — delegado a agente
- [ ] `06_TECHNICAL_ARCHITECTURE_ANDROID.md` — delegado a agente
- [ ] `07_TECHNICAL_ARCHITECTURE_WEB.md` — delegado a agente
- [ ] `08_TECHNICAL_ARCHITECTURE_BACKEND.md` — delegado a agente

### Sprint 6 — Polish técnico restante
- [ ] P2-iOS-3: migrar Dashboard al endpoint agregado `/api/dashboard/kpis` + fetch de listas en paralelo.
- [ ] P2-WEB-1: migrar CalendarView a React Query.
- [ ] P3-iOS-1: pass de DateFormatters estáticos en 14 views.
- [ ] P3-iOS-2: a11y pass — VoiceOver labels en KPICards, charts, botones de status.

### Sprint 7 — Pricing v1
- [ ] Backend: Stripe checkout + webhooks + seats.
- [ ] iOS: RevenueCat IAP con 7-day trial.
- [ ] Android: Google Play Billing.
- [ ] Web: Stripe checkout integrado.
- [ ] Paywalls en todos los clientes usando el error `plan_limit_exceeded`.
- [ ] Matriz de features Gratis/Pro (ver `PRD/04`).

---

## 3. Q3 2026 (jul–sep)

**Tema:** *Portal del cliente + transparencia*. Liberar features de `PRD/12` en orden de prioridad.

- **Sprint 8:** Portal público del cliente (A) — MVP read-only con branding Pro.
- **Sprint 9:** Transparencia de pagos (B) — cronograma, historial, recibo.
- **Sprint 10:** Reseñas post-evento (I) — email automático + rating + portfolio público.
- **Sprint 11:** Notificaciones por etapa (C) — email-only en Gratis, +SMS en Pro.
- **Sprint 12:** Thread de comunicación organizador↔cliente (D).

---

## 4. Q4 2026 (oct–dic)

**Tema:** *Plan Business + profundización features cliente*.

- **Sprint 13:** Plan Business habilitado — WhatsApp Business API integrada (Twilio o Meta Cloud).
- **Sprint 14:** Firma digital de contratos (G) — canvas en Pro, proveedor legal en Business.
- **Sprint 15:** RSVP de invitados (H) — sub-página pública del cliente.
- **Sprint 16:** Bandeja de decisiones pendientes (E).
- **Sprint 17:** Branding custom Business — logo + colores + dominio custom + DKIM.

---

## 5. Q1 2027 (ene–mar)

**Tema:** *Crecimiento + retención*.

- Programa de referidos.
- Cupones / descuentos por partner (AEM, cámaras empresariales).
- Planes anuales con descuento.
- Upload de contenido del cliente (F).
- Resumen de valor post-evento (L).
- Multi-idioma cliente (K) — portugués Brasil, inglés.

---

## 6. Q2 2027+ (roadmap largo)

Orden de prioridad, sin fecha firme:

- Gallery post-evento con fotos del fotógrafo (feature separada).
- Integraciones calendario (Google Calendar, iCal, Outlook).
- Marketplace de proveedores (requiere mucho trabajo de moderación).
- API pública documentada para integraciones de terceros (tier Business).
- Staff / roles / permisos granulares en Business.
- Analytics avanzados + forecast.

---

## 7. Operación y distribución

### Marketing y partnerships

- **2026-Q2:** lanzar blog con casos de uso + SEO posts ("cómo cotizar una boda", "Excel para organizar eventos vs Solennix").
- **2026-Q3:** partnerships con influencers del sector (wedding planners con 50k+ seguidores en Instagram) por país.
- **2026-Q4:** stand en 1 feria de eventos LATAM (EventoBoda MX o Expoferia).

### Soporte

- **Hoy:** email + WhatsApp ad-hoc del founder.
- **Q3 2026:** canal de WhatsApp Business con 1 agente dedicado (part-time).
- **Q4 2026:** knowledge base público + videotutoriales.

### Finanzas

- **Q2 2026:** Stripe Tax para facturación correcta por país.
- **Q3 2026:** provider local para facturación fiscal (Facturama en MX).

---

## 8. Estimaciones de esfuerzo (capacidad)

Asunción: 1 founder-ingeniero + asistente de AI (Claude Code) en jornada completa.

| Tipo de trabajo | Esfuerzo típico |
|---|---|
| Fix P0 bundle cross-platform (similar a Sprint 1 del audit) | 1 sesión intensiva. |
| Feature cliente-facing nueva cross-platform (ej. portal cliente) | 2–3 sprints de 2 semanas. |
| Feature interno solo backend (ej. webhook de Stripe) | 1 sprint. |
| Backfill de doc PRD completo | 1 sesión. |
| Activación de deploy VPS (cuando secrets listos) | 30 min. |
| Pass de polish cross-platform (ej. P3) | 1 sprint, bajo prioridad. |

---

## 9. Compromisos hard (fechas no negociables)

| Milestone | Fecha hard |
|---|---|
| *(ninguno hoy — 2026-04-16)* | — |

Cualquier compromiso hard pasa a listarse acá con fecha específica. Por ahora el roadmap es dirigido por prioridad, no por fecha pública.

---

## 10. Cómo usar este doc

- **Semanal:** al empezar el sprint, el founder revisa qué hay en el sprint y confirma.
- **Al cierre de sprint:** tachar ítems completados, mover a sección "Histórico" si aplica.
- **Mensual:** revisión completa — ¿el orden sigue teniendo sentido? ¿hay una señal del mercado que reorganice?
- **Trimestral:** reset de tema y objetivos.

**Regla:** el roadmap NO es vinculante externamente hasta que un ítem se marque como "hard" con fecha.
