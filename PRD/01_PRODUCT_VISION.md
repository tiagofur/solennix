# 01 — Visión de Producto

**Estado:** Vivo · revisión trimestral.
**Dueño:** tiagofur@gmail.com (founder).
**Última actualización:** 2026-04-16.

---

## 1. El problema

El organizador de eventos de Latinoamérica (bodas, quinceañeras, bautizos, corporativos, eventos sociales en general) vive su operación entre:

- **WhatsApp** — para cada conversación con cada cliente, proveedor, staff.
- **Hojas de Excel sueltas** — para cotizaciones, inventario, control de pagos.
- **PDFs enviados por email** — para contratos que se firman, se imprimen, se escanean, se pierden.
- **Calendario de papel o Google Calendar sin integración** — para la agenda real.
- **Memoria propia** — para el resto.

El costo es invisible pero medible:

- Pierde cotizaciones porque no respondió a tiempo.
- Dobla fechas porque no tenía visibilidad consolidada.
- Pierde plata porque no sabe cuánto pagaron y cuánto falta.
- Pierde al cliente porque no percibió el trabajo que hay detrás.
- Se agota — el negocio depende del organizador, no al revés.

Las herramientas existentes (Honeybook, Dubsado) son anglocéntricas, caras en dólares y diseñadas para freelancers americanos, no para el organizador de eventos de CDMX, Buenos Aires, Bogotá, Santiago o Lima.

---

## 2. La visión

**Solennix** es la plataforma operativa única del organizador de eventos en LATAM: concentra eventos, clientes, inventario, cotizaciones, contratos, pagos y comunicación con el cliente final en una sola herramienta, en español, a precios en moneda local, disponible en iOS, Android y Web, con API propia y backend propio.

En 12 meses queremos ser **la herramienta default** que recomienda un organizador experimentado a uno que está arrancando.

---

## 3. Usuarios

### 3.1 Usuario primario — el organizador ("el dueño del negocio")

| Atributo | Descripción |
|---|---|
| Rol | Dueño/operador del negocio de eventos. |
| Escala | De 1 persona (solo él/ella) a equipo pequeño (2–8 personas). |
| Rango típico de eventos/mes | 3–40. |
| Ticket típico | USD 800 – USD 15.000 por evento. |
| Tech-savviness | Medio. Usa WhatsApp Business, Canva, Instagram con fluidez. Excel avanzado ocasional. No escribe SQL, no quiere "configurar integraciones". |
| Plataforma primaria | Desktop para trabajo de cotización/contrato. Mobile para consultar en el evento o en movimiento. |
| Idioma | Español (variantes regionales). Algunos bilingües EN/PT. |
| Dolor principal | El caos de coordinar varias cosas a la vez y que se le escape algo. |
| Lo que le importa | Profesionalismo percibido + control + menos horas de caos por evento. |

### 3.2 Usuario secundario — el cliente del organizador

Persona que contrata el evento: novios, quinceañera + familia, empresa contratante, padres del festejado, etc.

| Atributo | Descripción |
|---|---|
| Rol | Paga el evento. |
| Expectativa | Recibir información clara, ver que haya orden, poder preguntar sin sentirse mendigando respuestas. |
| Canal actual | Casi exclusivamente WhatsApp + algún Google Drive eventual. |
| Fricción | "Le escribí hace 3 días y no me contesta, ¿qué cotizó exactamente?, ¿cuánto me queda por pagar?, ¿cuándo me piden el siguiente pago?" |
| Oportunidad Solennix | Portal del cliente (ver `PRD/12`) — transparencia controlada por el organizador. |

### 3.3 Usuario terciario — staff del organizador

Fotógrafo, DJ, coordinador de logística, personal de cocina. Usuarios esporádicos que necesitan saber: dónde, cuándo, qué, con quién. No se optimiza para ellos en v1; acceso vía link público en el futuro.

---

## 4. Propuesta de valor

**Una frase:** "Tu oficina de producción de eventos, en el bolsillo, en español, sin parecer un Excel."

**Tres pilares:**

1. **Control total del pipeline en un lugar.** Eventos, cotizaciones, contratos, inventario, pagos y clientes en un mismo modelo, con paridad entre iOS, Android y Web.
2. **Profesionalismo percibido sin esfuerzo.** PDFs con marca, portal del cliente, firma digital, mensajes automáticos — el cliente final siente que está con un profesional, no con alguien que le manda voice notes.
3. **Precio y lenguaje del mercado LATAM.** Precios en MXN/ARS/COP/CLP, UI en español, métodos de pago locales, soporte por WhatsApp.

**Lo que NO somos (anti-posicionamiento):**

- No somos una red social de eventos.
- No somos un marketplace entre organizadores y clientes (al menos por ahora).
- No somos un CRM genérico — estamos especializados en eventos.
- No somos una herramienta para equipos de 50+ personas con permisos granulares — somos para el founder/operador y un equipo chico.

---

## 5. Objetivos (12 meses)

| Métrica | Meta 2026 | Estado 2026-04 |
|---|---|---|
| Usuarios activos mensuales (MAU) | 2.500 | (a medir) |
| % organizadores LATAM que pagan (Pro+Business) | 12% | (a medir) |
| Eventos creados/mes | 15.000 | (a medir) |
| NPS del organizador | ≥40 | (a medir) |
| % eventos con portal de cliente activo | 25% | 0% (feature no liberada) |
| Retención mes 3 | ≥55% | (a medir) |
| Países con presencia activa | MX, AR, CO, CL | MX (App Store live), resto en evaluación |

Los porcentajes son direccionales: el negocio prioriza crecimiento con retención por sobre picos de adquisición sin retención.

---

## 6. Principios de producto (no negociables)

1. **UI en español siempre.** Código en inglés. El producto se percibe como LOCAL, no como "software gringo traducido".
2. **Paridad cross-platform.** Toda feature en cualquier plataforma debe existir en las otras 3 (o declarar explícitamente por qué no — ver `CLAUDE.md` sección 1).
3. **El organizador es soberano sobre los datos de su negocio.** Exportable en CSV/PDF siempre. Sin lock-in por formato.
4. **Foco obsesivo en el desktop primero** para flujos de trabajo pesados (cotización, contrato). Mobile para consultas rápidas, captura en evento, aprobaciones.
5. **Elegancia por defecto.** Paleta oro cálido `#C4A265` + navy `#1B2A4A`. Cero gradientes cyan/púrpura, cero glassmorphism decorativo. Ver `CLAUDE.md` sección "Diseño".
6. **Performance como feature.** <2s en 3G para el portal del cliente, dashboard <1s primer contenido, sync offline en mobile.
7. **Privacy-first.** El cliente no ve notas internas, márgenes, ni otros clientes del organizador. Todo el portal público es opt-in.
8. **Monetización por palanca, no por muro.** Gratis tiene que DOLER un poco cuando se alcanza el techo, pero NUNCA atrapar datos del usuario ni comprometer su operación. Ver `PRD/04_MONETIZATION.md`.

---

## 7. Dominio

Terminología canónica (ver también `CLAUDE.md`):

| UI (español) | Código (inglés) | DB (snake_case) |
|---|---|---|
| Evento | `Event` | `events` |
| Cliente | `Client` | `clients` |
| Producto | `Product` | `products` |
| Inventario | `InventoryItem` | `inventory_items` |
| Cotización | `Quote` | `quotes` |
| Contrato | `Contract` | `contracts` |
| Pago | `Payment` | `payments` |
| Receta | `Recipe` | *(subestructura del producto)* |
| Equipo | `Equipment` | *(tipo de inventario reutilizable)* |
| Insumo | `Supply` | *(tipo de inventario consumible)* |
| Extra | `EventExtra` | `event_extras` |
| Checklist | `Checklist` | *(tareas por evento)* |
| Plan | `Plan` | *(tier: gratis/pro/business)* |

---

## 8. North-star

> **El organizador de eventos promedio debería poder abrir Solennix un lunes a la mañana y saber, en menos de 30 segundos, exactamente qué eventos tiene esta semana, cuánto le deben cobrar, qué le tiene que entregar al cliente, y qué insumos le faltan.**

Todo lo demás se mide contra esa frase.
