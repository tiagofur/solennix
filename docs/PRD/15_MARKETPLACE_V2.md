---
tags:
  - prd
  - discovery
  - inbound
  - v2
  - solennix
aliases:
  - v2.0 Discovery Layer
  - Directorio
  - Inbound Tools
date: 2026-07-31
updated: 2026-07-31
status: draft
---

# Solennix v2.0 — Discovery & Inbound Layer

> [!important] Encuadre estratégico — 2026-07-31
> **v2.0 añade al SaaS del proveedor herramientas de inbound y descubrimiento.** El objetivo es que Solennix sea **la referencia en LATAM para contratar servicios de eventos** — no por ser un marketplace, sino porque cada proveedor con su perfil público indexable genere tráfico orgánico y reciba solicitudes de cotización.
>
> **NG1 se mantiene íntegro.** El cliente es audiencia del proveedor, no de Solennix. Solennix no conecta dos lados del mercado, no intermedia, y no procesa pagos del servicio (decisión 2026-05-01 reafirmada).
>
> **La pregunta "¿es marketplace?" se responde así:** No. Es inbound tooling para el proveedor — como una landing page profesional compartible y un directorio de descubrimiento, todo dentro de su suscripción SaaS. El acuerdo económico entre cliente y proveedor sigue siendo 100% externo a Solennix.

---

## 0. Contexto

### 0.1 Visión de producto

> [!quote] Frase guía (heredada de `01_PRODUCT_VISION.md`)
> "El organizador de eventos promedio debería poder abrir Solennix un lunes a la mañana y saber, en menos de 30 segundos, exactamente qué eventos tiene esta semana, cuánto le deben, qué le tiene que entregar al cliente, y qué insumos le faltan."

v2.0 **extiende** esa promesa: no solo gestiona la operación, sino que **trae nuevos clientes al proveedor** vía descubrimiento orgánico y solicitudes de cotización. Cuanto más profesional se ve y más fácil es contactarlo, más eventos cierra. El SaaS pasa de "gestión" a "gestión + crecimiento".

### 0.2 Tensión documental (resuelta sin tocar NG1)

`09_ROADMAP.md` Sprint 11 (2026-06-30) decía "primera etapa rumbo a marketplace". Esa frase generó ambigüedad. **v2.0 reformula el rumbo sin levantar NG1**: el directorio y las solicitudes son **herramientas del proveedor** (inbound), no una capa de marketplace two-sided donde Solennix conecta e intermedia.

La implementación del Perfil Profesional Público (#787, PR chain #1097–#1102, 2026-07) ya sembró la infraestructura (`PublicSlug`, `OrganizerPublicProfile`, `PublicLead`, `PublicReview`, portfolio, packages, `lat/lng` reservado, tier Business "destacado en directorio"). v2.0 la materializa como inbound tooling coherente con NG1.

### 0.3 Mercado y vacante competitiva

- **Proveedores** (audiencia actual): organizadores de eventos en LATAM — banqueteros, decoradores, wedding planners, DJs, meseros, fotógrafos de evento. Ya están en la plataforma.
- **Clientes**: personas físicas y empresas que organizan eventos y buscan proveedores. Hoy resuelven vía WhatsApp + Instagram + recomendaciones. **Son audiencia del proveedor**, no de Solennix — Solennix no les cobra ni registra relación contractual directa.
- **Vacante**: en `03_COMPETITIVE_ANALYSIS.md`, el único player LATAM con modelo marketplace es PlanPro MX ("no es SaaS puro, depende de proveedores pagando"). El nicho "SaaS del proveedor + inbound orgánico" está **vacante** en LATAM.

---

## 1. Principios rectores

1. **NG1 se mantiene.** No somos marketplace. No conectamos dos lados del mercado. No intermediamos.
2. **No romper lo existente.** Las apps iOS/Android y la operación actual del proveedor no pueden degradarse en ningún momento. Toda fase es aditiva y reversible.
3. **Paridad cross-platform OBLIGATORIA** (regla `AGENTS.md`). Toda feature que altere dominio, DB o APIs se propaga a iOS, Android, Web y Backend.
4. **No intermediación de pagos** (decisión 2026-05-01). El dinero del servicio queda fuera de la plataforma. Stripe se usa solo para suscripción SaaS al proveedor (B2B).
5. **Privacidad como no-negociable.** Los datos del cliente (PII) del CRM del proveedor **nunca** se exponen. El organizador controla 100% qué aparece en su perfil público (regla heredada de `02_FEATURES.md` §16).
6. **Medir antes de comprometerse.** Cada fase valida la siguiente con datos. Si la Fase 1 no muestra demanda, no se ejecuta la Fase 2.

---

## 2. Modelo de datos

> [!warning] NG1 se mantiene — sin `account_type`
> La separación `provider | client` como tipos de usuario distintos **NO se implementa en v2.0**, porque eso sería construir el lado "cliente" del two-sided market (rompe NG1).
>
> En v2.0, **todo usuario autenticado sigue siendo proveedor/organizador**. El "cliente" que manda una solicitud es un visitante anónimo o un lead (registro CRM del proveedor), **no** un usuario Solennix.

### 2.1 Lo que se reutiliza sin tocar

- `User` (`backend/internal/models/models.go:35-85`): sin cambios. Todos autenticados = organizadores.
- `Client` CRM (`models.go:87-102`): sin cambios. Registro del proveedor, sin credenciales.
- `EventFormLink` → `Event(quoted)`: se reutiliza. No se crea entidad `Quote` nueva.
- `PublicLead` (`models.go:785-797`): se extiende a "solicitud estructurada" — no se reemplaza.
- `OrganizerPublicProfile`, `PublicReview`, `OrganizerPublicPortfolioItem`, `OrganizerPublicPackage`: ya implementados en #787, se consumen.

### 2.2 Nuevas entidades mínimas

| Entidad | Propósito | Fase |
| --- | --- | --- |
| `PublicRequest` (extiende `PublicLead`) | Solicitud estructurada del cliente (visitante anónimo con email de contacto) | F1 |
| `PublicResponse` (nueva) | Respuesta del proveedor con presupuesto | F1 |

### 2.3 Modelos postergados / descartados para v2.0

| Modelo | Por qué no en v2.0 |
| --- | --- |
| `account_type` (provider\|client) en `users` | Construiría el lado cliente del two-sided → rompe NG1 |
| `ProviderVerification` documental | Útil para confianza, pero solo tiene sentido si hay un lado "cliente" con expectativa. Postergado. |
| Cuenta de cliente autenticada | Ídem NG1. |

Si en el futuro se decide levantar NG1 (v3.0, decisión mayor), estos modelos son el punto de partida. Por ahora **no se crean**.

---

## 3. Flujo de solicitud / presupuesto

### 3.1 Funnel completo

```
[Cliente llega a /u/:slug o /proveedores] (SEO o link del proveedor)
   │ clic "Solicitar presupuesto"
   ▼
[Form: event_type, event_date, location, guest_count, budget, services[], message, contact_email]
   │ (sin login — el cliente es visitante, no usuario Solennix)
   ▼
POST /api/public/organizers/{slug}/requests
   ▼
[Request status: PENDING] + notificación push al proveedor
   │
   ├─[Decline]───────────► DECLINED
   ├─[Accept + quote]────► RESPONDED ──► [cliente confirma por fuera] ──► ACCEPTED_BY_CLIENT
   └─[Request info]──────► INFO_REQUESTED ──► [cliente responde] ──► PENDING
   │
   └─[Auto: 14 días sin acción] ─► EXPIRED
   │
   └─[Convertir a evento] ─► BOOKED (crea Event(status=quoted) en dashboard proveedor)
```

**Nota clave:** el "cliente" en este flujo es un **visitante con email de contacto**, no un usuario autenticado de Solennix. Toda la comunicación post-solicitud (coordinar visita, mandar presupuesto final, cobrar) **ocurre fuera de la plataforma** — por WhatsApp, email, o el portal de evento existente. Solennix solo facilita el primer contacto.

### 3.2 Estados formales

| Estado | Significado | Siguiente acción |
| --- | --- | --- |
| `pending` | Solicitud llegó, proveedor debe responder | Push al proveedor |
| `info_requested` | Proveedor pide aclaración | Cliente responde → `pending` |
| `responded` | Proveedor envió presupuesto | Cliente decide (fuera de plataforma) |
| `accepted_by_client` | Cliente confirma interés inicial | Acuerdan fuera |
| `declined_provider` | Proveedor rechaza (no disponible) | Cierra |
| `declined_client` | Cliente rechaza el presupuesto | Cierra |
| `booked` | Convertido a Event en dashboard | Dispara reseña post-evento |
| `expired` | Sin acción 14 días | Limpia pipeline |

### 3.3 Reutilización del flujo Event(quoted)

Una solicitud `accepted_by_client` se puede convertir en `Event` con `status: 'quoted'` en el dashboard del proveedor, precargada. **No es automático en Fase 1** — el proveedor lo dispara con botón "Convertir a evento". Respeta la operación actual.

### 3.4 Anti-spam (no opcional)

Sin verificación de cuenta del cliente, el inbox del proveedor se inunda de basura y el feature muere:

- **F1**: rate-limit IP + captcha + cap de N solicitudes pendientes por proveedor.
- **F2** (si se valida demanda): verificación de email obligatoria antes de enviar.

---

## 4. El directorio de proveedores

### 4.1 Modelo de interacción: **1-a-1** para Fase 1

El cliente elige UN proveedor y le manda una solicitud. Es directo, reversible, filtra clientes serios por fricción, y es **plenamente coherente con NG1** (cada solicitud es un inbound a UN proveedor específico, no una conexión intermediada por Solennix).

Modelos descartados para v2.0:
- **1-a-N (RFQ masivo)**: el cliente manda una solicitud a varios a la vez. Esto **SÍ** rompería NG1 (Solennix estaría conectando un cliente con N proveedores = marketplace). Fuera de scope.
- **Híbrido (Thumbtack-style pay-per-lead)**: requiere matching y lado cliente formal. Postergado a v3.0 si se levanta NG1.

### 4.2 Las tres superficies del directorio

1. **Página índice `/proveedores`** — hero + búsqueda + categorías + destacados.
2. **Resultados filtrados** — sidebar de filtros + lista paginada + orden.
3. **Ficha = perfil público `/u/:slug` existente** (no se duplica). El directorio es el hub; el perfil es la landing.

### 4.3 Desafíos técnicos reales

| Desafío | Fase 1 (mínimo) | Fase 2+ |
| --- | --- | --- |
| **Geo-search** | Filtro por `city` texto (sin coords) | Bounding box con `lat/lng` |
| **Ranking** | featured(Business) → rating → recientes | Score compuesto + proximidad + respuesta |
| **SEO** | sitemap dinámico + schema.org `LocalBusiness` | SSR/ISR para contenido indexable |
| **Moderación** | Criterio de "perfil publicable" (completitud mínima) | Workflow de revisión humano |

### 4.4 Criterio de "perfil publicable al directorio"

Para evitar perfiles vacíos/spam en el directorio público, un perfil debe cumplir:

- Foto de portada.
- Bio / headline no vacía.
- Ubicación estructurada (al menos `city` + `country`).
- Al menos 1 servicio con `show_on_public_profile = true`.

Sin esto, el perfil existe en `/u/:slug` pero **no** aparece en `/proveedores`.

---

## 5. Apps móviles: paridad obligatoria

> [!danger] Regla `AGENTS.md`
> "Paridad Cross-Platform obligatoria. Todo cambio que altere dominio, DB o APIs DEBE propagarse a iOS, Android, Web y Backend."

### 5.1 Proveedor — móvil desde el día uno de cada fase

El proveedor vive en sus apps iOS/Android. El flujo "llegó una solicitud → responder con presupuesto" **debe** llegar al móvil del proveedor, si no, se rompe la operación. Esto no es opcional.

Cada fase backend/web trae aparejada la paridad móvil del proveedor: inbox de solicitudes, push, responder cotización, UI del PublicProfile.

### 5.2 Cliente — siempre web, no se construye app

**No se construye app nativa de cliente en v2.0.** Razones coherentes con NG1:

- El cliente **no es usuario Solennix**. Es visitante del perfil del proveedor. Construirle una app = construir el lado cliente del two-sided market.
- El cliente hace 1-3 eventos en su vida. Bajarse una app para eso es fricción enorme vs WhatsApp + Instagram.
- El acuerdo económico queda fuera de la plataforma, así que no hay transacción in-app que justifique la app.
- Web responsive funciona perfecto en móvil (vía SEO el cliente llega desde el browser).

**Experiencia del cliente móvil:** web responsive del perfil público y del form de solicitud. PWA opcional (Fase 4) si se quiere "add to home screen", pero **sin cuenta de cliente**.

### 5.3 Matriz de paridad por fase

| Fase | Web | iOS | Android | Backend |
| --- | --- | --- | --- | --- |
| F1 — Foundation | Directorio + form solicitud | (sin cambios del lado cliente) | (sin cambios) | PublicRequest, search endpoint |
| F2 — Provider Mobile Parity | — | Inbox solicitudes + responder | Inbox solicitudes + responder | Inbox endpoints |
| F3 — Discovery Polish | Geo + filtros avanzados | (sin cambios mobile) | (sin cambios mobile) | Geo (bounding box) |
| F4 — PWA + Polish | PWA installable + UX | — | — | — |

---

## 6. Monetización

### 6.1 Modelos incluidos formalmente en v2.0

| Modelo | Cuándo | A quién | Risk | Fase |
| --- | --- | --- | --- | --- |
| **SaaS suscripción** (actual) | Mensual/anual | Proveedor | Bajo | Ya |
| **Listing destacado** | Mensual | Proveedor | Bajo | F3 (Business tier) |
| ~~Pay-per-lead~~ | — | — | — | **Descartado para v2.0** (requiere lado cliente formal → NG1) |
| ~~Comisión por transacción~~ | — | — | — | **Descartado** (requiere intermediación de pagos) |

> [!important] Por qué se descarta pay-per-lead en v2.0
> Cobrar al proveedor por cada lead cualificado requiere que Solennix **mida y atestigüe** la calidad del lead (apertura, conversión), lo que implica un rol de intermediación entre cliente y proveedor. Eso cruza la línea de NG1. Se posterga a v3.0 si se decide levantar NG1 con eyes wide open.

### 6.2 Mapeo a planes existentes

| Plan | SaaS | Perfil público | Directorio |
| --- | --- | --- | --- |
| `free` (provider) | Básico | Sí, sin reviews/portfolio | Listado básico |
| `pro` | Sí | Full (reviews, portfolio) | Listado estándar |
| `business` | Sí | Full + branding | **Destacado** en búsquedas |
| `premium` | Sí + soporte | Full | Top placement |

### 6.3 Lectura estratégica

**La economía de v2.0 funciona SI y SOLO SI los proveedores comparten su link `/u/:slug` activamente.** Cada link compartido = un cliente potencial a CAC ~$0. El feature más importante de Fase 1 no es el directorio, es **hacer ridículamente fácil y atractivo compartir el `/u/:slug`**. SEO + "proveedor trae clientes" = motor de adquisición. Todo esto **dentro del SaaS del proveedor** — no hay lado cliente que monetizar.

---

## 7. Protección legal y contractual

### 7.1 Principio rector

> **Solennix NO es parte del contrato de servicio entre cliente y proveedor.**

El cliente contrata directamente con el proveedor. Solennix solo provee la herramienta (perfil público + form de solicitud) al proveedor. Cualquier disputa es entre cliente y proveedor.

### 7.2 Marco contractual

Ya existe ToS de uso de Solennix. Para v2.0 se **refuerza** una sección en los ToS del proveedor:

- El perfil público y el form de solicitud son **herramientas de marketing del proveedor**.
- Solennix no es garante del servicio prestado por el proveedor a sus clientes.
- El proveedor es 100% responsable del contacto y acuerdo con clientes que lleguen vía Solennix.

**No se requiere ToS de cliente** (no hay cuenta de cliente, no hay relación contractual directa cliente↔Solennix). Esto es consistente con NG1.

### 7.3 Lenguaje prohibido en marketing

| ❌ No decir | ✅ Decir |
| --- | --- |
| "Proveedores garantizados por Solennix" | "Proveedores verificados" (si se añade verificación, F3+) |
| "Respaldo total de Solennix" | "Solennix facilita el contacto" |
| "Si algo sale mal te devolvemos tu dinero" | (nada — no se procesa dinero) |
| "Marketplace de eventos" | "Directorio de profesionales" / "Plataforma de gestión" |

Regla mental: si una palabra implica que Solennix responde por el resultado del servicio, no usarla.

---

## 8. Plan faseado de implementación

> [!warning] Regla de no-rotura
> Cada fase es **aditiva y reversible**. Ninguna puede romper las apps existentes. Backend-first con feature flags; los clientes consumen cuando el endpoint está estable.

### Fase 0 — Decisiones fundacionales (sin código)

Antes de cualquier línea de código.

- **0.1** Confirmar que v2.0 respeta NG1 (este PRD lo deja explícito).
- **0.2** Reafirmar decisión "no pagos intermediados" 2026-05-01 (sin cambios).
- **0.3** Reforzar ToS del proveedor con cláusula "no garante" para el inbound.
- **0.4** Confirmar modelo de monetización v2.0 (SaaS + listings destacados; sin pay-per-lead).

### Fase 1 — Foundation (backend + web)

No rompe nada. Reutiliza lo construido en #787.

- **1.1** Backend: extender `PublicLead` → `PublicRequest` estructurada + `PublicResponse`.
- **1.2** Backend: `GET /api/public/organizers` con filtros + paginación + criterio de publicabilidad.
- **1.3** Web: página `/proveedores` (índice + resultados + filtros básicos).
- **1.4** Web: form de solicitud estructurada en `/u/:slug`.
- **1.5** Web: SEO (sitemap dinámico, schema.org `LocalBusiness`).
- **1.6** Web: criterio de "perfil publicable al directorio" + compartido fácil del `/u/:slug`.

### Fase 2 — Provider Mobile Parity

Apps existentes del proveedor. No crea apps nuevas.

- **2.1** Backend: endpoints de inbox de solicitudes + paginación cursor.
- **2.2** iOS: pantalla de Solicitudes en la app del proveedor.
- **2.3** Android: pantalla de Solicitudes en la app del proveedor.
- **2.4** Push notifications cross-platform al llegar solicitud.
- **2.5** iOS/Android: responder cotización + actions inline desde móvil.
- **2.6** iOS/Android: UI del PublicProfile (deuda de #1102).

### Fase 3 — Discovery Polish

- **3.1** Backend: geo-data real (bounding box) + captura de coords en PublicProfile.
- **3.2** Web: geo-search "proveedores cercanos" + filtros avanzados (presupuesto, servicios, disponibilidad).
- **3.3** Backend: moderación de listings (workflow humano).
- **3.4** Cross-platform: featured listings rankeando arriba (tier Business).

### Fase 4 — PWA + Polish (opcional)

- **4.1** Web: PWA installable (sin cuenta de cliente).
- **4.2** Web: UX polish del flujo de solicitud.

### Fases postergadas (v3.0, solo si se decide levantar NG1)

- Cuenta de cliente autenticada + trust score.
- Pay-per-lead / matching híbrido.
- Verificación documental de proveedor + Verified badge.
- App nativa de cliente.
- Pagos intermediados (escrow, comisión).

**Estas fases son "otra empresa".** Requieren revertir NG1 y la decisión 2026-05-01 con eyes wide open. No se planifican en este PRD.

---

## 9. Cómo se mide el éxito de cada fase

Cada fase tiene métricas de validación. Si no se cumplen, la siguiente fase **no se ejecuta**.

| Fase | Métrica de éxito | Umbral para avanzar |
| --- | --- | --- |
| F1 | Tráfico orgánico al `/proveedores` desde Google | ≥ X visitas/mes en 60 días |
| F1 | Solicitudes enviadas desde el directorio | ≥ Y/mes |
| F1 | Conversión solicitud → evento en dashboard proveedor | ≥ Z% |
| F2 | Tasa de respuesta del proveedor a solicitudes (móvil) | ≥ 70% en 48h |
| F3 | Proveedores Business que renuevan con featured | ≥ N% |
| F4 | Sesiones PWA recurrentes | ≥ M |

Los valores exactos (X, Y, Z...) se definen al iniciar cada fase, no antes.

---

## 10. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
| --- | --- | --- | --- |
| Spam de solicitudes mata el inbox del proveedor | Alta | Alto | Rate-limit + captcha (F1) |
| Proveedores no comparten su `/u/:slug` | Media | Crítico | UX de sharing ridículamente fácil + valor visible (F1) |
| Demanda orgánica (SEO) no llega | Media | Alto | SSR/ISR si SPA no indexa; contenido de calidad; validar en F1 |
| Exposición legal como garante | Baja | Crítico | ToS reforzados + lenguaje marketing controlado + no tocar dinero |
| Apps existentes se rompen durante v2.0 | Baja | Crítico | Feature flags + paridad obligatoria + `./init.sh` verde por fase |
| Tentación de "levantar NG1" por presión de crecimiento | Media | Estratégico | Este PRD documenta el cost: "otra empresa". Decidir con eyes wide open. |

---

## 11. Documentos relacionados

- [[01_PRODUCT_VISION]] — Visión (NG1 ratificado, sin cambios).
- [[02_FEATURES]] §16 — Perfil Profesional Público (base de F1).
- [[03_COMPETITIVE_ANALYSIS]] — PlanPro MX como único benchmark marketplace LATAM (no es nuestro modelo).
- [[04_MONETIZATION]] — Modelo SaaS vigente (Free/Pro/Business).
- [[09_ROADMAP]] — Sprint log (actualizado con v2.0 inbound layer).
- [[11_CURRENT_STATUS]] — Decision callout de v2.0.
- [[12_CLIENT_TRANSPARENCY_AND_DELIGHT]] — Portal cliente existente (token-based).

---

#prd #discovery #inbound #v2 #solennix
