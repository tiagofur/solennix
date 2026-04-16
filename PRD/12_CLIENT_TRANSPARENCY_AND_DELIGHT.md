# 12 — Client Transparency & Delight Features

**Estado:** Borrador / ideación — no implementar hasta cerrar fix + estabilidad.
**Autor:** Sesión 2026-04-16.
**Objetivo:** Features que hacen que tanto el **organizador** (usuario pagante) como su **cliente** sientan la app como insustituible. Foco en transparencia, comunicación y momentos "antojables" que diferencian a Solennix de hojas de cálculo + WhatsApp.

---

## 1. Contexto

Hoy el organizador usa Solennix puertas adentro: eventos, cotizaciones, contratos, pagos, inventario. El cliente final **no ve nada** — todo es WhatsApp, Excel, PDF por email. Esto tiene dos costos:

1. **Organizador queda expuesto al caos del canal**: cliente pregunta lo mismo 4 veces, pierde pagos, no recuerda decisiones.
2. **Cliente no percibe el trabajo**: "me cobraron X y solo recibí un PDF". La organización invisible es organización desvalorizada.

La propuesta: abrir una **ventana controlada** al cliente — el organizador decide qué mostrar, cuándo, y cómo. Cero WhatsApp obligatorio, cero pérdida de información.

---

## 2. Principios rectores

- **El organizador es soberano.** Toggle todo. Nada se publica sin su permiso.
- **El cliente NO necesita instalar app.** Portal web responsive con link único. Opción mobile si quiere notificaciones.
- **Menos es más.** Cada notificación al cliente debe ganársela. Opt-in por canal, opt-in por milestone.
- **Branding del organizador, no de Solennix.** White-label en tiers Pro/Business. "Powered by Solennix" mínimo y discreto.
- **Paridad cross-platform obligatoria** (iOS · Android · Web · Backend) — ver CLAUDE.md.
- **Monetización como palanca, no muro.** Features gratis que generen deseo de upgrade, no funciones esenciales atrapadas tras paywall.

---

## 3. Feature Groups

### A. Portal público del cliente (`/client/:eventSlug`)

**Qué:** URL única por evento (slug + token firmado, opcional PIN). No requiere cuenta ni instalación.

**Contenido por tarjetas:**
- Header con branding del organizador (logo, colores, nombre).
- Countdown al evento.
- Resumen: fecha, hora, ubicación (mapa), dress code (opcional), invitados.
- Timeline visual de etapas: Contrato ✓ · Señal ✓ · Menú en revisión · Playlist pendiente · Evento.
- Equipo asignado (coordinador, fotógrafo, DJ) con foto y rol — opcional.
- Progress bar agregado: "Tu evento está 72% listo".

**Implementación:**
- Backend: `GET /api/public/events/:slug` (sin auth, valida token firmado HMAC). Retorna subset del evento, ya filtrado por flags `visibleToClient`.
- Web: ruta pública en `web/src/pages/client/ClientEventView.tsx`. Responsive mobile-first.
- iOS/Android: no hay view nativa — el link abre en navegador del cliente. Los organizadores comparten el link desde la app con botón "Copiar link del cliente" o "Enviar por WhatsApp".

**Tier:** Gratis (1 portal activo) · Pro (ilimitado + branding) · Business (white-label completo + dominio custom).

---

### B. Transparencia de pagos (`/client/:eventSlug/payments`)

**Qué:** El cliente ve su balance, historial y próximos vencimientos en tiempo real.

**Contenido:**
- Total del evento.
- Pagado / Pendiente / Vencido (con semáforo).
- Cronograma de cuotas: fecha, monto, estado.
- Historial: cada pago con fecha, método, monto, link a recibo PDF.
- Botón "Pagar ahora" si hay integración (MercadoPago/Stripe/Conekta en LATAM).
- Notificación automática al cliente 3 días antes de cada vencimiento (configurable).

**Implementación:**
- Backend: `GET /api/public/events/:slug/payments` (mismo token firmado).
- Tabla `payment_schedule` (si no existe): `id, event_id, due_date, amount, status (pending/paid/overdue), paid_at, payment_id, receipt_url`.
- Integración con pasarelas → fuera del scope de esta doc, tracking aparte.
- UI: `web/src/pages/client/ClientPayments.tsx`.

**Por qué es "antojable":** el cliente deja de pedir recibos por WhatsApp. El organizador deja de cazar pagos. Todos duermen mejor.

---

### C. Notificaciones por etapa (configurable on/off)

**Qué:** Cuando el organizador completa una tarea interna, se dispara (opcionalmente) una notificación al cliente.

**Milestones sugeridos (extensibles):**
- Contrato firmado
- Señal/pago recibido (cada pago)
- Menú confirmado / modificado
- Playlist recibida
- Confirmación de proveedor clave (catering, DJ, fotógrafo)
- Lista de invitados cerrada
- 7 días / 48h / 24h / 2h antes del evento
- Post-evento: "Gracias por confiar en nosotros"

**Configuración (por evento y por default):**
- Toggle ON/OFF por milestone.
- Canales: email · SMS · WhatsApp (vía Twilio/CloudAPI) · push (si el cliente instaló la app — futuro).
- Templates editables con tokens: `{cliente_nombre}`, `{evento_fecha}`, `{organizador_nombre}`, `{monto}`, `{link_portal}`.
- Quiet hours: nada entre 21:00–09:00 hora local del cliente.

**Implementación:**
- Backend: `internal/service/milestone_notifications.go`, scheduler (cron + event hooks).
- Tabla `milestone_preferences` por usuario + `milestone_triggers` por evento.
- UI settings: `Settings → Notificaciones al cliente` (iOS/Android/Web).

**Tier:** Gratis (email-only, 3 milestones fijos) · Pro (todos los canales excepto WhatsApp Business + 10 milestones) · Business (WhatsApp Business API + milestones ilimitados + templates custom).

---

### D. Thread de comunicación organizador↔cliente

**Qué:** Chat thread por evento, persistente, searchable. Reemplaza el WhatsApp caótico.

**Características:**
- Mensajes texto + adjuntos (imágenes, PDFs, links).
- Notas internas (solo el organizador ve) vs mensajes compartidos.
- Typing indicators, read receipts (el organizador activa/desactiva).
- Búsqueda por palabra clave.
- Export a PDF "Histórico de comunicación" — útil ante disputas.

**Implementación:**
- Backend: `internal/service/event_chat.go`, tabla `event_messages` con campos `author_type (organizer|client|system)`, `visibility (internal|shared)`.
- Real-time vía WebSocket o SSE (futuro) — empieza con polling.
- UI: integrado en `EventDetailView` (iOS/Android) y `EventDetailPage` (Web).

**Tier:** Pro en adelante (gratis sin thread, solo portal read-only).

---

### E. Bandeja "Requiere tu decisión"

**Qué:** El organizador marca ítems que necesitan input del cliente. El cliente entra al portal y los resuelve.

**Ejemplos de decisiones:**
- "Aprobá este menú" → acepta / pide cambios con comentario.
- "Elegí canción principal del vals" → text input o link a Spotify.
- "Subí lista de invitados" → CSV upload o formulario.
- "Confirmá paleta de colores" → seleccionar opción.

**Cada decisión tiene:**
- Deadline sugerido.
- Estado: pendiente · respondida · vencida.
- Notificación automática al cliente si faltan 48h.
- Registro inmutable de la respuesta (audit trail).

**Implementación:**
- Backend: tabla `client_decisions` con `type`, `payload_schema`, `response`, `responded_at`, `deadline`.
- Handler público para responder: `POST /api/public/events/:slug/decisions/:id`.
- UI organizador: componente "Pedir decisión al cliente" con plantillas.
- UI cliente: sección destacada en portal.

**Por qué es "antojable":** todo organizador ha perdido una semana esperando una respuesta por WhatsApp. Esto mata esa fricción.

---

### F. Subida de contenido del cliente

**Qué:** El cliente sube al portal lo que el organizador le pida: referencias visuales, playlist, lista invitados, documentos.

**Implementación:**
- Reutiliza el sistema de uploads del organizador (S3 o disk storage).
- Aparece automáticamente en el event detail del organizador.
- Notification push al organizador cuando el cliente sube algo.

**Tier:** Pro en adelante.

---

### G. Firma digital de contratos (client-side)

**Qué:** El cliente firma el contrato desde el portal, sin imprimir ni scanear.

**Tipos de firma:**
- Nombre tipeado + checkbox "acepto términos".
- Firma dibujada (canvas en touch).
- Validez legal en LATAM varía — chequear por país. Idealmente integración con proveedor (DocuSign, HelloSign, Validasign) en tier Business.

**Metadata capturada:**
- Timestamp UTC + timezone detectado.
- IP del firmante.
- User-agent.
- Hash SHA-256 del documento firmado (inmutabilidad).
- PDF final con página de "Evidencia de firma" adjunta.

**Implementación:**
- Backend: endpoint `POST /api/public/contracts/:id/sign` + `ContractSignature` entity.
- PDF post-firma con metadata.
- Notificación al organizador: email + push.

**Tier:** Pro (firma simple con canvas) · Business (integración legal con proveedor).

---

### H. RSVP de invitados del cliente

**Qué:** El cliente puede activar una sub-página `/client/:eventSlug/rsvp` donde sus invitados confirman asistencia.

**Flow:**
- El cliente carga lista de invitados (CSV o manual) o comparte un link abierto.
- Cada invitado ingresa nombre + confirma asistencia + restricciones alimentarias + +1.
- Conteo en tiempo real visible para cliente y organizador.
- Integración con inventario/catering: "Tenés 95 confirmados, planificaste para 100, todo OK".

**Implementación:**
- Tabla `event_rsvps`.
- Sub-página pública del portal del cliente.

**Tier:** Pro en adelante.

---

### I. Reseñas post-evento

**Qué:** 24–72h después del evento, el cliente recibe un link automático para dejar una reseña (1-5 estrellas + texto opcional).

**Flow inteligente:**
- Si rating ≥4 → prompt "¿Querés compartirla públicamente en Google/Facebook?" con link pre-llenado.
- Si rating ≤3 → solo va al organizador (feedback privado, no quemado público).
- El organizador construye un portfolio público de testimoniales en un URL share-friendly (`/organizer/:slug/reviews`).

**Tier:** Pro en adelante. Feature cruzada con marketing del organizador → retención fuerte.

---

### J. Branding del organizador

**Qué:** Logo, colores, tipografía y dominio custom en todos los touch-points del cliente.

**Alcance:**
- Portal del cliente.
- Emails enviados (desde `eventos@organizador.com` en tier Business — DKIM propio).
- PDF de contratos/cotizaciones/recibos.
- Firma de emails del organizador.

**Implementación:**
- Tabla `organization_branding` con logo_url, primary_color, accent_color, font, email_from, custom_domain.
- CNAME/verificación de dominio para Business.

**Tier:** Pro (logo + colores) · Business (+ custom domain + DKIM).

---

### K. Multi-idioma cliente

**Qué:** El portal del cliente detecta idioma del browser y ofrece: español (default), portugués (Brasil → gran mercado), inglés.

**Implementación:**
- i18n en rutas `/client/:eventSlug` → `i18next` o similar en web.
- Content editorial del organizador (nombres, descripciones): quedan en idioma del organizador. Solo chrome/labels traducidos.

**Tier:** Gratis (es + en) · Pro (+ pt).

---

### L. Resumen de valor post-evento

**Qué:** Página que se activa cuando el evento termina. "En números: 47 tareas coordinadas · 12 proveedores · 8 pagos · 127 invitados confirmados · 23 mensajes intercambiados".

**Objetivo:** hacer visible el trabajo invisible. Construye lealtad (cliente se acuerda de lo que costó hacer el evento).

**Implementación:** agregación estadística del evento en un template PDF + vista web.

**Tier:** Gratis (básico) · Pro (custom branding) · Business (exportable para portfolio).

---

## 4. Matriz de priorización

| Feature | Impacto organizador | Impacto cliente | Complejidad | Dependencias | Prioridad |
|---|---|---|---|---|---|
| A. Portal público | Alto | Alto | Media | — | **P0** |
| B. Transparencia pagos | Alto | Muy alto | Media | A, pasarela opcional | **P0** |
| C. Notificaciones etapa | Alto | Medio | Media | A, email ya existe | **P1** |
| D. Thread comunicación | Muy alto | Alto | Alta | A | **P1** |
| E. Bandeja decisiones | Muy alto | Medio | Media | A, D | **P1** |
| F. Upload del cliente | Medio | Bajo | Baja | A | **P2** |
| G. Firma digital | Alto | Alto | Alta (legal) | A | **P2** |
| H. RSVP invitados | Medio | Medio | Media | A | **P2** |
| I. Reseñas post-evento | Muy alto (marketing) | Bajo | Baja | A | **P1** |
| J. Branding | Medio | Medio | Media | A | **P2** |
| K. Multi-idioma | Bajo | Medio | Baja | A | **P3** |
| L. Resumen de valor | Medio | Alto emocional | Baja | — | **P2** |

**Orden sugerido de implementación:** A → B → I → D → E → C → H → F → G → J → L → K.

---

## 5. Matriz de monetización (tiers)

| Feature | Gratis | Pro | Business |
|---|---|---|---|
| Portal público (A) | 1 activo | ∞ + branding | + dominio custom |
| Transparencia pagos (B) | Read-only | + botón pagar | + reconciliación automática |
| Notificaciones (C) | Email, 3 milestones | Email+SMS, ∞ milestones | + WhatsApp API + templates custom |
| Chat (D) | — | ✓ | + export legal |
| Decisiones (E) | 3/evento | ∞ | + flujos complejos (multi-paso) |
| Upload cliente (F) | 10MB total | 1GB | ∞ |
| Firma digital (G) | — | ✓ (simple) | + proveedor legal |
| RSVP (H) | 50 invitados | 500 | ∞ |
| Reseñas (I) | ✓ | + portfolio público | + integración Google/Facebook |
| Branding (J) | Logo básico | Logo + colores | + dominio + DKIM |
| Multi-idioma (K) | es + en | + pt | + idiomas custom |
| Resumen valor (L) | Básico | + branding | + exportable |

---

## 6. Paridad cross-platform

El portal del cliente **NO necesita view nativa** — se consume en browser. Lo que SÍ debe tener paridad iOS/Android/Web:

| Superficie | iOS | Android | Web | Backend |
|---|---|---|---|---|
| Toggle "visibleToClient" por campo | ✓ | ✓ | ✓ | ✓ |
| Botón "Copiar/compartir link cliente" | ✓ | ✓ | ✓ | — |
| Thread de comunicación (D) | ✓ | ✓ | ✓ | ✓ |
| Settings de notificaciones al cliente (C) | ✓ | ✓ | ✓ | ✓ |
| Bandeja decisiones pendientes (E) | ✓ | ✓ | ✓ | ✓ |
| Upload review (F) | ✓ | ✓ | ✓ | ✓ |
| Dashboard reseñas (I) | read | read | full edit | ✓ |
| Branding editor (J) | read | read | full edit | ✓ |

**Nota clave:** el editor de branding y el portfolio de reseñas son **web-only-edit** (desktop primario según CLAUDE.md). Mobile solo lectura para mantener paridad sin sobrecargar.

---

## 7. Consideraciones técnicas transversales

- **Seguridad del portal público:** token firmado HMAC con expiración configurable (30/90/365 días, default 365). Revocable. Opción PIN extra (4 dígitos).
- **Privacy:** el cliente NO ve: notas internas, márgenes del organizador, otros eventos, info de otros clientes, inventario interno.
- **Audit log:** toda acción del cliente queda loggeada (IP, UA, timestamp).
- **Rate limiting:** endpoints públicos con rate limit agresivo (10 req/min por token).
- **Emails transaccionales:** Resend/Postmark/Mailgun. DKIM+SPF configurado.
- **WhatsApp:** Twilio Conversations o Meta Cloud API. Solo Business tier — costo por mensaje transferible.
- **Accesibilidad:** portal cliente WCAG AA. Dynamic type, contraste, VoiceOver/TalkBack.
- **Performance:** portal cliente < 2s first contentful paint en 3G. Static bundle + API edge caching.

---

## 8. Métricas de éxito

- **% eventos con portal activo** (meta 90 días: 40%).
- **% clientes que entran al portal** (meta: 60%).
- **NPS del cliente final** (encuesta opcional al final del flujo de reseña).
- **Reducción de tiempo de cobranza** (días entre emisión de cuota y pago).
- **% conversión Gratis → Pro atribuible a branding/portal** (tier).
- **# reseñas 4-5 estrellas/mes**.

---

## 9. Preguntas abiertas

- ¿Integramos con Google Calendar para que el cliente agregue el evento con un click? (Fácil, alto valor.)
- ¿Notificaciones WhatsApp en tier Pro con costo pasado al organizador, o reservadas para Business? Decide comercial.
- ¿Dejamos el portal 100% anónimo con link-only, o forzamos auth ligera (email + código) para acciones sensibles como firmar? Preferencia legal: auth ligera para firma.
- ¿Gallery post-evento con fotos del fotógrafo? Escopable como feature separada (cruce con "storage cost" → Business).
- ¿Integración con redes sociales para compartir countdown/portal? (Bajo prioridad, pero viral.)

---

## 10. Siguientes pasos

1. **No implementar todavía.** Primero cerrar fix + estabilidad (fase actual).
2. Validar con el usuario cuáles features son P0 vs P1 vs descartables. Esta matriz es propuesta, no dogma.
3. Para las P0 (A+B), abrir cambio SDD (`/sdd-new client-portal`) cuando se decida implementar.
4. Prototipar el diseño del portal en Figma antes de código — consistencia con la paleta `#C4A265` / `#1B2A4A` y la personalidad "elegante profesional cálida".
5. Investigar regulación de firma digital por país (MX, AR, CO, CL, PE) antes de diseñar G.
