# Guía de Publicación — App Store (iOS)

> **Estado del código:** Todo está listo. Este documento cubre únicamente los pasos externos
> (cuentas, configuración de plataformas y proceso de build/submit).

---

## Resumen de lo que falta

| # | Paso | Plataforma | Tiempo estimado |
|---|------|------------|-----------------|
| 1 | Crear cuenta Apple Developer | Apple | 1–2 días (aprobación) |
| 2 | Registrar Bundle ID y crear la app en App Store Connect | Apple | 30 min |
| 3 | Crear el In-App Purchase (suscripción Pro) | App Store Connect | 30 min |
| 4 | Configurar RevenueCat | RevenueCat | 1 hora |
| 5 | Rellenar variables de entorno | Local | 5 min |
| 6 | Instalar EAS CLI y hacer login | Local | 10 min |
| 7 | Hacer el build de producción | EAS / Nube | 20–40 min |
| 8 | Completar la ficha de la app en App Store Connect | Apple | 1–2 horas |
| 9 | Submittar a revisión de Apple | EAS | 15 min |
| 10 | Esperar revisión y publicar | Apple | 1–3 días |

---

## Paso 1 — Cuenta Apple Developer Program

1. Ve a [developer.apple.com/programs](https://developer.apple.com/programs)
2. Haz clic en **Enroll** e inicia sesión con tu Apple ID
3. Selecciona **Individual** (o Company si tienes empresa registrada)
4. Paga la membresía anual: **$99 USD / año**
5. Apple tarda 24–48 h en aprobar la cuenta

> **Nota:** Necesitas un iPhone o Mac para el proceso de verificación de identidad.

---

## Paso 2 — Registrar Bundle ID y crear la app

### 2a. Registrar el Bundle ID

1. En [developer.apple.com](https://developer.apple.com) → **Certificates, Identifiers & Profiles**
2. Sección **Identifiers** → botón **+**
3. Selecciona **App IDs** → **App**
4. Description: `Solennix`
5. Bundle ID (Explicit): `com.creapolis.solennix`
6. Capabilities a activar:
   - **In-App Purchase** ✓
   - **Push Notifications** (opcional, para futuro)
7. Haz clic en **Register**

### 2b. Crear la app en App Store Connect

1. Ve a [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. **My Apps** → botón **+** → **New App**
3. Rellena:
   - **Platform:** iOS
   - **Name:** Solennix
   - **Primary Language:** Spanish (Mexico)
   - **Bundle ID:** `com.creapolis.solennix` (selecciona del desplegable)
   - **SKU:** `solennix-ios-001` (cualquier identificador único tuyo)
   - **User Access:** Full Access
4. Haz clic en **Create**

---

## Paso 3 — Crear el In-App Purchase (suscripción Pro)

1. En App Store Connect → tu app → **Monetization** → **In-App Purchases**
2. Haz clic en **+** → **Auto-Renewable Subscription**
3. Configura:
   - **Reference Name:** Solennix Pro Mensual
   - **Product ID:** `com.creapolis.solennix.pro_monthly`
4. Haz clic en **Create**
5. En la ficha del producto:
   - **Subscription Duration:** 1 Month
   - **Price:** selecciona tu tier (ej. **Tier 5** ≈ $99 MXN / $4.99 USD)
   - **Display Name:** Plan Pro
   - **Description:** Acceso completo a todas las funcionalidades de Solennix
6. Crea un **Subscription Group**:
   - Name: `Solennix Subscriptions`
   - Asigna el producto al grupo
7. Guarda todo

### Obtener el Shared Secret (necesario para RevenueCat)

1. En App Store Connect → **Users and Access** → **Integrations** → **In-App Purchase**
2. Haz clic en **Generate** bajo **App-Specific Shared Secret**
3. Copia el secret — lo necesitarás en el Paso 4

---

## Paso 4 — Configurar RevenueCat

### 4a. Crear cuenta y proyecto

1. Ve a [app.revenuecat.com](https://app.revenuecat.com) y regístrate
2. **Create new project** → Name: `Solennix`
3. En el proyecto → **Add app** → plataforma **App Store**
4. Rellena:
   - **App name:** Solennix
   - **Bundle ID:** `com.creapolis.solennix`
   - **App Store Connect App-Specific Shared Secret:** (el del Paso 3)
5. Haz clic en **Save**

### 4b. Configurar entitlement

1. En el menú lateral → **Entitlements** → **+**
2. **Identifier:** `pro`
3. **Description:** Plan Pro
4. Guarda

### 4c. Importar el producto

1. En el menú lateral → **Products** → **+**
2. **Product identifier:** `com.creapolis.solennix.pro_monthly`
3. **Type:** Auto-Renewable Subscription
4. Asigna el entitlement `pro` al producto
5. Guarda

### 4d. Crear el Offering

1. En el menú lateral → **Offerings** → **+**
2. **Identifier:** `default`
3. **Description:** Offering principal
4. Dentro del offering → **Add Package**:
   - **Identifier:** `$rc_monthly`
   - **Platform Product:** selecciona `com.creapolis.solennix.pro_monthly`
5. Guarda

### 4e. Copiar la API Key

1. En el menú lateral → **API Keys**
2. Copia la **Public SDK Key** de la plataforma **iOS**
3. La necesitarás en el Paso 5

---

## Paso 5 — Variables de entorno

Crea o edita el archivo `mobile/.env.production`:

```bash
EXPO_PUBLIC_API_URL=https://tu-backend-en-produccion.com/api
EXPO_PUBLIC_RC_API_KEY_IOS=appl_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
EXPO_PUBLIC_SENTRY_DSN=https://XXXXXX@oXXXXXX.ingest.sentry.io/XXXXXXX
```

> **`EXPO_PUBLIC_RC_API_KEY_IOS`** → la API Key pública iOS de RevenueCat (Paso 4e)
> **`EXPO_PUBLIC_SENTRY_DSN`** → opcional pero recomendado para producción. Crea cuenta en [sentry.io](https://sentry.io) si no tienes.

---

## Paso 6 — Instalar EAS CLI

Desde la carpeta `mobile/`:

```bash
# Instalar EAS CLI globalmente
npm install -g eas-cli

# Verificar instalación
eas --version

# Login con tu cuenta de Expo
eas login

# Vincular el proyecto a tu cuenta Expo (solo primera vez)
eas init
```

> Si no tienes cuenta en Expo, regístrate gratis en [expo.dev](https://expo.dev).

---

## Paso 7 — Build de producción

```bash
cd mobile

# Build para iOS (tarda 20–40 min en los servidores de Expo)
eas build --platform ios --profile production
```

El proceso:
1. Sube el código a los servidores de Expo
2. Genera los certificados de firma automáticamente (o usa los tuyos)
3. Compila el `.ipa`
4. Al terminar, te da un link de descarga y **sube automáticamente a TestFlight**

### Probar en TestFlight antes de submittar

1. En App Store Connect → **TestFlight** → verás el build recién subido
2. Añade tu email como **Internal Tester**
3. Descarga la app **TestFlight** en tu iPhone
4. Prueba el flujo completo, especialmente la suscripción con RevenueCat Sandbox

---

## Paso 8 — Completar la ficha en App Store Connect

Ve a App Store Connect → tu app → **App Store** tab → versión **1.0 Prepare for Submission**.

### Información requerida

**General:**
- [ ] **App Icon:** sube una imagen 1024×1024 px (sin transparencia, sin esquinas redondeadas)
- [ ] **Screenshots:** mínimo 3 capturas para iPhone 6.9" (iPhone 16 Pro Max: 1320×2868 px)
  - Sugerencia: Dashboard, lista de eventos, detalle de evento
- [ ] **Promotional Text** (opcional): máximo 170 caracteres, no sujeto a revisión
- [ ] **Description:** descripción completa de la app en español (máximo 4000 caracteres)
- [ ] **Keywords:** palabras clave separadas por comas (máximo 100 caracteres)
  - Ejemplo: `eventos,catering,banquetes,cotizaciones,agenda,clientes`
- [ ] **Support URL:** `https://www.creapolis.dev` (o tu URL de soporte)
- [ ] **Marketing URL** (opcional)
- [ ] **Privacy Policy URL:** `https://www.creapolis.dev/privacy`

**Pricing & Availability:**
- [ ] **Price:** Free (la monetización es via In-App Purchase)
- [ ] **Availability:** todos los países o solo México inicialmente

**App Review Information:**
- [ ] **Sign-in required:** Yes
  - Proporciona credenciales de prueba (usuario y contraseña de una cuenta demo)
- [ ] **Notes for reviewer:** explica brevemente qué hace la app y cómo probarla
- [ ] **Contact information:** tu nombre, teléfono y email

**Age Rating:**
- [ ] Completa el cuestionario — Solennix debería quedar en **4+**

---

## Paso 9 — Submittar a revisión

Una vez completada toda la ficha y con el build de TestFlight listo:

```bash
# Desde mobile/ — submits el último build a App Store Review
eas submit --platform ios
```

O desde App Store Connect manualmente:
1. Ve a la versión 1.0
2. Selecciona el build de TestFlight
3. Haz clic en **Add for Review**
4. Revisa todo y haz clic en **Submit to App Review**

---

## Paso 10 — Revisión de Apple

- Apple tarda normalmente **1–3 días hábiles** en revisar la app
- Recibirás un email cuando la app sea aprobada o rechazada
- Si hay rechazo, Apple explica el motivo y puedes corregir y re-submittar

### Causas comunes de rechazo (y cómo evitarlas)

| Causa | Cómo prevenirla |
|-------|-----------------|
| Privacy Policy URL no accesible | Asegúrate de que `creapolis.dev/privacy` esté publicada |
| Credenciales de demo no funcionan | Prueba el usuario/contraseña de demo antes de submittar |
| Screenshots no cumplen tamaño | Usa un simulador iPhone 16 Pro Max para capturarlas |
| Falta explicación de In-App Purchase | En las notas al reviewer explica que el plan Pro es mensual |
| Referencia a otra plataforma de pago | Asegúrate de no mencionar Stripe en ninguna pantalla mobile |

---

## Checklist final antes de submittar

```
CÓDIGO
 ✅ eas.json creado con perfil production
 ✅ app.config.ts con buildNumber y privacyManifests
 ✅ react-native-purchases configurado
 ✅ Pantallas PrivacyPolicy y Terms en la app
 ✅ AboutScreen con navegación in-app a las pantallas legales

CUENTAS Y PLATAFORMAS
 □ Cuenta Apple Developer activa ($99/año)
 □ Bundle ID com.creapolis.solennix registrado
 □ App creada en App Store Connect
 □ In-App Purchase com.creapolis.solennix.pro_monthly creado
 □ RevenueCat configurado (entitlement pro, offering default)
 □ EXPO_PUBLIC_RC_API_KEY_IOS rellenado en .env.production

FICHA APP STORE
 □ Ícono 1024×1024 px
 □ Screenshots iPhone 6.9" (mínimo 3)
 □ Descripción en español
 □ Keywords
 □ Privacy Policy URL accesible públicamente
 □ Credenciales de demo para el reviewer
 □ Age Rating completado

BUILD Y SUBMIT
 □ eas build --platform ios --profile production (exitoso)
 □ Probado en TestFlight
 □ Flujo de suscripción probado en Sandbox
 □ eas submit --platform ios
```

---

## Recursos útiles

- [Documentación EAS Build](https://docs.expo.dev/build/introduction/)
- [Documentación EAS Submit](https://docs.expo.dev/submit/introduction/)
- [Guía RevenueCat para iOS](https://www.revenuecat.com/docs/ios)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [App Store Connect Help](https://developer.apple.com/help/app-store-connect/)
