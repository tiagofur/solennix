# Solennix — Guía de Publicación en App Store

**Fecha:** 2026-03-28
**Bundle ID:** `com.solennix.app`
**Team ID:** `T5SKULSP2M`

---

## Parte 1: Textos del App Store Listing

### Nombre de la App
```
Solennix - Gestión de Eventos
```
(30 caracteres max. Si no cabe: `Solennix`)

### Subtítulo
```
Cotiza, organiza y cobra eventos
```
(30 caracteres max)

### Categoría
- **Primaria:** Business (Negocios)
- **Secundaria:** Productivity (Productividad)

### Descripción (4000 caracteres max)

```
Solennix es la plataforma todo-en-uno diseñada para organizadores de eventos en Latinoamérica. Si eres banquetero, decorador, wedding planner u organizador de fiestas infantiles, Solennix reemplaza tus hojas de cálculo, libretas y apps desconectadas con una sola herramienta profesional.

GESTIÓN COMPLETA DE EVENTOS
Crea eventos con un formulario guiado paso a paso: datos generales, productos del catálogo, extras, equipo e insumos, y resumen financiero con IVA y descuentos. Rastrea el estado de cada evento desde la cotización hasta el cierre.

CATÁLOGO DE PRODUCTOS CON COSTOS REALES
Organiza tus servicios y productos con precio de venta, costo y margen de ganancia. Agrega recetas con ingredientes para calcular automáticamente el costo real de cada producto.

INVENTARIO INTELIGENTE
Controla tu equipo reutilizable (mesas, sillas, manteles) y tus insumos consumibles (globos, flores, servilletas). Recibe alertas de stock bajo y detecta conflictos cuando el mismo equipo está asignado a dos eventos en la misma fecha.

COTIZACIONES Y CONTRATOS PROFESIONALES
Genera PDFs de cotización y contrato con el logo de tu negocio. Configura IVA, descuentos, anticipo y condiciones de cancelación. Envía documentos profesionales a tus clientes en segundos.

PAGOS Y FINANZAS
Registra pagos parciales (anticipo, segundo pago, saldo final) con diferentes métodos de pago. Visualiza cuánto falta por cobrar de cada evento y lleva un control financiero claro.

CALENDARIO Y DASHBOARD
Ve todos tus eventos en un calendario mensual con indicadores de estado. Tu dashboard te muestra KPIs, eventos próximos y métricas de tu negocio.

CLIENTES ORGANIZADOS
Directorio centralizado de clientes con historial de eventos, gasto total y búsqueda rápida por nombre o teléfono.

WIDGETS Y LIVE ACTIVITIES (Premium)
Ve tu próximo evento desde la pantalla de inicio con widgets de iOS. Monitorea eventos en curso desde la Dynamic Island.

HECHO PARA LATINOAMÉRICA
Interfaz completa en español. Soporte para pesos mexicanos y monedas locales. IVA configurable. Flujo de trabajo diseñado para cómo realmente trabajan los organizadores de eventos en la región.

PLANES
• Básico (Gratis): Hasta 3 eventos/mes, 50 clientes, 20 productos. Perfecto para empezar.
• Premium: Eventos ilimitados, sin marca de agua en PDFs, widgets, Live Activities, reportes avanzados y soporte prioritario.

Descarga Solennix y transforma la manera en que gestionas tu negocio de eventos.
```

### Texto Promocional (170 caracteres max)
```
Tu centro de comando para eventos. Cotiza en minutos, controla inventario, cobra pagos y genera documentos profesionales. Hecho para organizadores de eventos en LATAM.
```

### Keywords (100 caracteres max, separadas por coma)
```
eventos,cotizaciones,banquetes,bodas,catering,inventario,pagos,fiestas,organizador,presupuesto
```

### URL de Soporte
```
https://creapolis.dev/terms-of-use/
```

### URL de Política de Privacidad
```
https://creapolis.dev/privacy-policy/
```

### Copyright
```
© 2026 Creapolis Dev
```

### What's New (para la versión 1.0.0)
```
¡Bienvenido a Solennix! Primera versión de la plataforma de gestión de eventos:

• Gestión completa de eventos con formulario multi-paso
• Catálogo de productos con costos y recetas
• Inventario con detección de conflictos de equipo
• Generación de PDFs (cotizaciones y contratos)
• Registro de pagos parciales
• Calendario de eventos
• Dashboard con KPIs
• Widgets de iOS y Live Activities (Premium)
• Sign in with Apple y Google Sign-In
```

---

## Parte 2: Pasos en tu Mac (requieren tu acción directa)

### Paso 1: Crear la App en App Store Connect

1. Ve a [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Inicia sesión con tu Apple ID de Developer
3. Click en **"Apps"** → botón **"+"** → **"New App"**
4. Llena el formulario:
   - **Platforms:** iOS
   - **Name:** `Solennix - Gestión de Eventos`
   - **Primary Language:** Spanish (Mexico)
   - **Bundle ID:** Selecciona `com.solennix.app` (si no aparece, ve al Paso 2 primero)
   - **SKU:** `solennix-ios-001`
   - **User Access:** Full Access
5. Click **"Create"**

### Paso 2: Registrar el Bundle ID (si no aparece en el Paso 1)

1. Ve a [developer.apple.com/account/resources/identifiers](https://developer.apple.com/account/resources/identifiers/list)
2. Click **"+"** → **"App IDs"** → **"App"**
3. Description: `Solennix`
4. Bundle ID: **Explicit** → `com.solennix.app`
5. Capabilities: marca estas casillas:
   - ✅ **Sign In with Apple**
   - ✅ **In-App Purchase** (para suscripciones RevenueCat)
   - ✅ **Push Notifications** (para notificaciones futuras)
6. Click **"Continue"** → **"Register"**

7. **Repite para el Widget Extension:**
   - Bundle ID: `com.solennix.app.widgets`
   - Capabilities: ninguna especial necesaria

### Paso 3: Certificados y Firma (en Xcode)

Ya configuré el `project.yml` con tu Team ID y signing automático. Ahora en tu Mac:

1. Abre el proyecto en Xcode:
   ```bash
   cd ios
   xcodegen generate
   open Solennix.xcodeproj
   ```

2. En Xcode, ve a **Solennix target → Signing & Capabilities**
3. Marca **"Automatically manage signing"** (ya debería estar)
4. Selecciona tu Team: debería aparecer tu cuenta de developer
5. Xcode creará automáticamente:
   - **Development certificate** (para pruebas)
   - **Distribution certificate** (para App Store)
   - **Provisioning profiles** (para ambos)

6. **Verifica también el Widget Extension:**
   - Click en target `SolennixWidgetExtension`
   - Mismo proceso: Automatic signing con tu Team

> **Si Xcode muestra errores de signing:** ve a Xcode → Settings → Accounts → tu Apple ID → "Download Manual Profiles" y luego "Manage Certificates" → "+" → "Apple Distribution"

### Paso 4: Configurar In-App Purchases (RevenueCat/StoreKit)

1. En App Store Connect → tu app → **"In-App Purchases"** (o **"Subscriptions"**)
2. Crea un **Subscription Group**: `solennix_premium`
3. Agrega las suscripciones:
   - **Mensual:** Product ID `solennix_premium_monthly`, precio ~$149 MXN/mes
   - **Anual:** Product ID `solennix_premium_yearly`, precio ~$1,199 MXN/año
4. Llena las localizaciones en español
5. Configura los precios para cada territorio (México como referencia)

### Paso 5: Generar Screenshots

Apple requiere screenshots para estos dispositivos como mínimo:

| Dispositivo | Tamaño (px) | Requerido |
|-------------|-------------|-----------|
| iPhone 6.9" (iPhone 16 Pro Max) | 1320 × 2868 | ✅ Sí |
| iPhone 6.7" (iPhone 15 Plus/Pro Max) | 1290 × 2796 | ✅ Sí |
| iPhone 6.5" (iPhone 11 Pro Max) | 1284 × 2778 | Recomendado |
| iPad Pro 13" (6th gen) | 2064 × 2752 | Si soportas iPad |

**Pantallas recomendadas para screenshots (5-10):**

1. **Dashboard** — "Tu centro de comando para eventos"
2. **Calendario de eventos** — "Todos tus eventos de un vistazo"
3. **Formulario de evento (paso productos)** — "Cotiza en minutos"
4. **Detalle de evento con totales** — "Control financiero completo"
5. **Lista de inventario** — "Inventario inteligente"
6. **PDF de cotización** — "Documentos profesionales"
7. **Registro de pagos** — "Rastrea cada pago"
8. **Lista de clientes** — "Tus clientes organizados"
9. **Widgets** — "Información al instante"
10. **Detección de conflictos** — "Nunca dobles-reserves equipo"

**Cómo tomar screenshots:**
```bash
# Opción 1: Desde el simulador de Xcode
# Cmd + S en el simulador guarda un screenshot

# Opción 2: Desde un dispositivo real conectado
# Botón lateral + botón de volumen arriba
```

> **Tip:** Puedes usar herramientas como [Fastlane Frameit](https://docs.fastlane.tools/actions/frameit/) o [Screenshots Pro](https://apps.apple.com/app/id1545891498) para agregar marcos de dispositivo y texto sobre tus screenshots.

### Paso 6: Preparar el App Icon

✅ Ya tienes el icono de 1024x1024 en `Assets.xcassets/AppIcon.appiconset/`. Xcode genera automáticamente todos los tamaños necesarios desde iOS 17+.

Verifica que:
- No tenga transparencia (Apple lo rechaza)
- No tenga esquinas redondeadas (iOS las aplica automáticamente)
- Se vea bien en tamaño pequeño (29pt)

### Paso 7: Build, Archive y Upload

1. En Xcode, selecciona **"Any iOS Device (arm64)"** como destino
2. **Product → Archive**
3. Espera a que compile (puede tomar unos minutos)
4. Se abre el **Organizer** con tu archive
5. Click **"Distribute App"** → **"App Store Connect"** → **"Upload"**
6. Marca las opciones:
   - ✅ Upload your app's symbols
   - ✅ Manage Version and Build Number
7. Click **"Upload"**
8. Espera a que suba (~5-10 min dependiendo de la conexión)

### Paso 8: Completar el Listing en App Store Connect

1. Ve a App Store Connect → tu app → **"1.0 Prepare for Submission"**
2. Sube los **screenshots** para cada tamaño de dispositivo
3. Llena:
   - **Description:** (usa el texto de la Parte 1)
   - **Keywords:** (usa las keywords de la Parte 1)
   - **Promotional Text:** (usa el texto de la Parte 1)
   - **Support URL:** `https://creapolis.dev/terms-of-use/`
   - **Marketing URL:** (tu sitio web si tienes)
4. En **App Review Information:**
   - **Contact:** Tu nombre, email, teléfono
   - **Demo Account:** Si la app requiere login, proporciona credenciales de prueba
   - **Notes:** "App de gestión de eventos para organizadores profesionales en Latinoamérica"
5. En **Age Rating:** Completa el cuestionario (debería ser 4+, no tiene contenido sensible)
6. En **App Privacy:**
   - Vincula a tu **Privacy Policy URL**
   - Completa el cuestionario de datos (ya lo declaramos en el PrivacyInfo.xcprivacy)
7. En **Build:** Selecciona el build que subiste
8. Click **"Submit for Review"**

---

## Parte 3: Checklist Pre-Submission

### Código y Configuración
- [x] Team ID configurado en project.yml (`T5SKULSP2M`)
- [x] Code signing configurado (Automatic, Apple Development/Distribution)
- [x] PrivacyInfo.xcprivacy creado con datos recolectados declarados
- [x] Info.plist usa $(MARKETING_VERSION) y $(CURRENT_PROJECT_VERSION)
- [x] Bundle ID: `com.solennix.app`
- [ ] Regenerar proyecto con `xcodegen generate`
- [ ] Verificar que compila sin errores en Release
- [ ] Verificar que no hay `print()` o `console.log` de debug
- [ ] Verificar que las URLs de API apuntan a producción (no localhost)

### App Store Connect
- [ ] App creada en App Store Connect
- [ ] Bundle ID registrado en Developer Portal
- [ ] Suscripciones in-app configuradas
- [ ] Screenshots subidos (mínimo 6.7" y 6.9")
- [ ] Descripción, keywords y textos completados
- [ ] Privacy Policy URL configurada
- [ ] App Privacy questionnaire completado
- [ ] Age Rating completado
- [ ] Demo account para review (si aplica)

### Build y Upload
- [ ] Archive exitoso (Product → Archive)
- [ ] Upload a App Store Connect exitoso
- [ ] Build procesado y visible en App Store Connect
- [ ] Build seleccionado en la versión 1.0

### Legal
- [x] Términos de uso: https://creapolis.dev/terms-of-use/
- [x] Política de privacidad: https://creapolis.dev/privacy-policy/
- [ ] EULA personalizado (opcional, Apple tiene uno genérico)

---

## Parte 4: Tiempos Estimados

| Paso | Tiempo estimado | Quién |
|------|----------------|-------|
| Registrar Bundle ID | 5 min | Tiago |
| Crear app en App Store Connect | 10 min | Tiago |
| Configurar signing en Xcode | 10 min | Tiago |
| Configurar suscripciones | 30 min | Tiago |
| Tomar screenshots | 1-2 horas | Tiago |
| Completar listing | 30 min | Tiago (textos ya listos) |
| Archive + Upload | 15-30 min | Tiago |
| Review de Apple | 24-48 horas | Apple |

**Total estimado de tu parte: ~3-4 horas de trabajo**

---

## Notas Importantes

1. **La primera review de Apple puede tomar 24-48 horas.** Si rechazan algo, te dicen exactamente qué corregir.
2. **Razones comunes de rechazo:**
   - La app crashea o tiene bugs obvios
   - Screenshots no coinciden con la app real
   - Falta la Privacy Policy
   - La app requiere login pero no dan cuenta demo
   - Metadata tiene contenido placeholder ("Lorem ipsum")
3. **Si usas RevenueCat:** asegúrate de que el entorno de producción esté configurado y las suscripciones estén aprobadas en App Store Connect antes de subir.
