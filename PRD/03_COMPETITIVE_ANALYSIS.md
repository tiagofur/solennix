# 03 — Análisis Competitivo (LATAM + referentes globales)

**Estado:** Vivo — revisión semestral.
**Última actualización:** 2026-04-16.
**Propósito:** entender dónde juega Solennix, qué aprender de competidores, y qué NO copiar.

---

## 1. Mapa del mercado

Cuatro segmentos relevantes:

1. **Software global especializado en eventos/servicios** (Honeybook, Dubsado, 17hats). Inglés, USD, mercado USA/UK, altos precios para LATAM.
2. **Software LATAM especializado en eventos**. Hoy fragmentado, mayoría freemium o hojas-de-cálculo-con-UI. Oportunidad clara.
3. **Herramientas horizontales adaptadas** (Trello + Google Sheets + WhatsApp + Calendly). 80–90% del mercado LATAM hoy vive acá. Es el verdadero competidor.
4. **ERPs genéricos** (Odoo, Zoho). Muy amplios, ninguno pensado para organizador de eventos. Curva de aprendizaje altísima.

---

## 2. Competidores directos (a conocer de memoria)

### 2.1 Honeybook (EEUU) · competidor referencial

- **URL:** honeybook.com
- **Precio:** USD 39/mes o USD 390/año (≈ USD 32/mes) en abril 2026.
- **Fortalezas:**
  - UX muy pulida, se siente "profesional" del lado del cliente final.
  - Firma digital legal integrada.
  - Plantillas de contrato y cotización excelentes.
  - Pagos en EEUU vía ACH/tarjeta, tocado fino.
- **Debilidades (desde lente LATAM):**
  - Solo inglés (algo de español parcial en 2025).
  - Precio en USD, sin localización real.
  - Pagos no integra con MercadoPago/Conekta/PSE/Transbank.
  - Terminología y flujos pensados para freelancer americano, no para organizador de evento de 300 personas con proveedores y staff.
- **Lección que sí copiamos:** sensación premium del portal del cliente, flujo de firma digital.
- **Lo que NO copiamos:** el precio, el tono frío, el peso del onboarding.

### 2.2 Dubsado (EEUU) · competidor de nicho premium

- **URL:** dubsado.com
- **Precio:** USD 40/mes, USD 400/año.
- **Fortalezas:** customización profunda de formularios y workflows. CRM potente.
- **Debilidades:**
  - UI recargada, alta curva de entrada.
  - Solo inglés.
  - Pago con Stripe o Square — sin vínculo con pasarelas LATAM.
- **Lección:** flexibilidad de workflows. **No copiar:** la complejidad.

### 2.3 17hats (EEUU)

- **URL:** 17hats.com
- **Precio:** USD 15–50/mes.
- **Posicionamiento:** similar a Honeybook pero con precio más accesible.
- **Debilidad clave:** producto estancado desde hace años, UX anticuada, sin app nativa competitiva.

### 2.4 Aisle Planner (EEUU — wedding-specific)

- **URL:** aisleplanner.com
- **Precio:** USD 50/mes aprox, nicho boda.
- **Fortaleza:** muy especializado en bodas, herramientas de diseño de mesas, checklist por etapa.
- **Debilidad:** solo bodas. Solennix es polivalente (bodas + quinces + corporativos).

### 2.5 WeddingPlannerPro / Planning Pod (nichos)

- Herramientas muy específicas para wedding planners. No relevantes como competencia directa en LATAM hoy.

### 2.6 Competidores LATAM (observados — completar con investigación local)

> **NOTA:** este bloque necesita investigación de campo actualizada. Las herramientas que aparecen y desaparecen en LATAM son muchas. Rellenar con entrevistas a 20 organizadores en MX/AR/CO/CL en Q2 2026.

| Competidor | País | Modelo | Fortaleza observada | Debilidad observada |
|---|---|---|---|---|
| Aplanar.app | AR | Freemium | UI local, precios en ARS | Producto joven, feature gap, foco bodas |
| Eventos365 | MX | Anual | Integración con salones | UI anticuada, no mobile |
| PlanPro MX | MX | Comisión | Marketplace de proveedores | No es SaaS puro, depende de proveedores pagando |
| WedPlanner CO | CO | Freemium | Foco wedding | Cero traction reportado |
| *(completar)* | | | | |

Metodología para llenar este cuadro: entrevistar 5 organizadores por país, preguntar "¿qué usás hoy?", iterar.

### 2.7 Competencia indirecta (lo que usa el 80% hoy)

| Combo | Qué reemplaza | Por qué gana contra ellos |
|---|---|---|
| **WhatsApp + Excel + Google Drive** | Todo Solennix | Tiempo: Solennix reduce a 30s lo que hoy toma 15min rebuscando en Excel. |
| **Trello + Google Calendar + PDF templates** | Solennix | Paridad operativa pero fragmentada; Solennix consolida sin perder familiaridad. |
| **Notion + Airtable** | Solennix | Consolidación + app móvil nativa + portal cliente. |

---

## 3. Matriz de posicionamiento

**Ejes:**
- Horizontal: Especialización (genérico ⟶ 100% eventos)
- Vertical: Foco LATAM (0% ⟶ 100%)

```
              Alto foco LATAM
                      │
                      │
      Solennix 🟢─────┼─────
                      │       Aplanar.app (AR) ·
                      │        Eventos365 (MX)
                      │
  Notion / Airtable   │
                      │      Honeybook · Dubsado · 17hats · Aisle Planner
──────────────────────┼────────────────────────────────── Alta especialización eventos
  Excel · Trello      │
  WhatsApp combo      │
                      │
                      │
              Bajo foco LATAM
```

**Tesis:** hoy **no hay competidor con alta especialización en eventos + alto foco LATAM**. Ese cuadrante lo queremos nosotros.

---

## 4. Por qué Solennix gana

| Dimensión | Honeybook / Dubsado | Competidor LATAM típico | **Solennix** |
|---|---|---|---|
| Idioma | Inglés | Español | Español (variantes regionales) |
| Moneda | USD | Local pero sin integración pasarela | Local + MercadoPago/Conekta/Stripe |
| Apps nativas iOS+Android | ✓ | Parcial | ✓ full paridad |
| Portal del cliente branded | ✓ | Raro | ✓ (ver PRD/12) |
| Firma digital | ✓ (legal US) | Raro | ✓ canvas + proveedor legal LATAM |
| Precio accesible LATAM | ✗ | Variable | ✓ anclado en USD pero localizado |
| Soporte en horario LATAM | ✗ | ✓ | ✓ WhatsApp |
| Cross-platform data parity | ✓ | ✗ | ✓ (regla CLAUDE.md) |

---

## 5. Qué copiamos (con crédito)

- **Honeybook:** calidad del portal del cliente, fluidez de la firma digital, tone visual premium.
- **Dubsado:** flexibilidad de templates de cotización/contrato.
- **Stripe Dashboard (no es competidor pero es inspiración):** claridad visual de datos financieros.
- **Notion:** sensación de "blank canvas configurable" sin parecer Excel.

## 6. Qué NO copiamos

- **Onboarding de Honeybook/Dubsado:** muy largo, formularios exhaustivos, desalienta al usuario que quiere probar en 3 minutos.
- **Gradientes cyan/violeta de tantos SaaS B2B modernos:** va contra la identidad oro+navy de Solennix.
- **Dark patterns de pricing:** pre-selección de anual, obscurecer cancelación, "solicitar llamada" para ver precio.
- **Foco wedding-only:** segmentamos por "organizador de eventos" amplio, bodas son uno de varios tipos.

---

## 7. Threats radar (riesgos competitivos)

| Amenaza | Probabilidad 12m | Impacto | Plan |
|---|---|---|---|
| Honeybook lanza soporte español real + pasarelas LATAM | Media | Alto | Crecer retention primero, construir ventaja en portal cliente y precio antes de que lleguen. |
| Nuevo player LATAM bien fondeado | Media | Medio | Ser más rápido; tener ya 10.000 MAU antes de que consigan distribución. |
| Plataforma de pago LATAM (MercadoPago) ofrece CRM básico gratis como add-on | Baja | Alto | Solennix ofrece mucho más que CRM de pagos — operación completa. |
| Google/Apple cambia reglas de IAP que nos bloquee | Media | Medio | Priorizar web billing (Stripe) para margen, mobile IAP como comodidad. |

---

## 8. Pricing benchmark

| Producto | USD/mes | USD/año | País |
|---|---|---|---|
| Honeybook | 39 | 390 | USA |
| Dubsado | 40 | 400 | USA |
| 17hats | 15–50 | variable | USA |
| Aisle Planner | 50 | 480 | USA |
| **Solennix Pro** (propuesta) | 15 | 144 | LATAM |
| **Solennix Business** (propuesta) | 49 | 470 | LATAM |

Ver `PRD/04_MONETIZATION.md` para justificación de los precios Solennix.

---

## 9. Siguientes pasos

- **Q2 2026:** realizar 20 entrevistas a organizadores LATAM (5 por país clave). Llenar la tabla de 2.6.
- **Q2 2026:** comprar suscripción de Honeybook por 1 mes y documentar screenshots del portal del cliente para benchmarking.
- **Q3 2026:** Mystery-shopping de 3 competidores LATAM (crear cuenta, simular flujo completo, reportar fricciones).
- **Revisión:** este doc se revisa cada 6 meses. Si un competidor lanza algo grande → ad hoc.
