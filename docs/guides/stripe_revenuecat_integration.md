# Guía Completa: Integración de Pagos con Stripe y RevenueCat

Esta guía detalla los pasos necesarios para implementar un sistema de suscripciones híbrido: **Stripe** para la plataforma Web y **RevenueCat** para las aplicaciones móviles (iOS/Android), garantizando que ambos sistemas sincronicen el acceso del usuario en el mismo backend.

---

## 🏗️ Arquitectura del Sistema

1.  **Web:** El usuario paga a través de Stripe Checkout. Stripe notifica a nuestro Backend vía Webhook para activar el plan.
2.  **Móvil:** El usuario paga mediante In-App Purchases (IAP). RevenueCat gestiona la validación con Apple/Google y notifica a nuestro Backend vía Webhook.
3.  **Backend:** Centraliza el estado de la suscripción (`plan: 'basic' | 'pro'`) en la base de datos PostgreSQL, sin importar dónde se realizó la compra.

---

## 💳 Paso 1: Configuración de Stripe (Web)

### 1.1 Crear Producto y Precio

1.  Ve al [Dashboard de Stripe](https://dashboard.stripe.com/test/products).
2.  Crea un producto llamado **"Solennix Pro"**.
3.  Crea un **Precio**:
    - Tipo: Suscripción / Recurrente.
    - Monto: Ejemplo `$499 MXN`.
    - Frecuencia: Mensual.
4.  Copia el **Price ID** (ej. `price_1Q...`). Lo necesitarás para la variable `STRIPE_PRO_PRICE_ID`.

### 1.2 Configurar Webhook

1.  Ve a **Developers > Webhooks**.
2.  Añade un endpoint: `https://tu-api.com/api/subscriptions/webhook/stripe`.
3.  Selecciona los eventos:
    - `checkout.session.completed` (Alta inicial)
    - `customer.subscription.deleted` (Baja de plan)
    - `customer.subscription.updated` (Cambios de estado)
4.  Copia el **Signing Secret** (`whsec_...`).

### 1.3 Billing Portal (Opcional pero Recomendado)

1.  Configura el [Customer Portal](https://dashboard.stripe.com/test/settings/billing/portal) para que los usuarios puedan cancelar o cambiar su tarjeta sin que tú programes nada.
2.  Copia el ID de configuración si usas uno personalizado.

---

## 🐈 Paso 2: Configuración de RevenueCat (Móvil)

RevenueCat es el "puente" que simplifica las compras en iOS y Android.

### 2.1 Configurar Tiendas

1.  En RevenueCat, crea un proyecto.
2.  Configura **App Store Connect** (iOS) y **Google Play Console** (Android) siguiendo sus guías oficiales para obtener las Shared Secrets y JSON de servicio.

### 2.2 Entitlements, Offerings y Productos

1.  **Entitlements:** Crea uno llamado `pro`. Representa el "derecho" a usar funciones premium.
2.  **Products:** Registra los IDs de los productos que creaste en App Store y Play Store (ej. `com.solennix.pro_monthly`).
    - _Nota: Se recomienda aplicar el 15% de markup aquí para cubrir las comisiones de las tiendas._
3.  **Offerings:** Crea un offering `default` que contenga tu paquete mensual.

### 2.3 Webhook de RevenueCat

1.  En el Dashboard de RevenueCat: **Project Settings > Webhooks**.
2.  Añade un Webhook: `https://tu-api.com/api/subscriptions/webhook/revenuecat`.
3.  En **Authorization Header**, inventa una clave secreta (ej. un UUID largo) y ponla tanto en RevenueCat como en tu `.env` de Backend.

---

## ⚙️ Paso 3: Configuración del Backend (Go)

El backend ya tiene los endpoints preparados en `internal/handlers/subscription_handler.go`.

### 3.1 Variables de Entorno (.env)

Asegúrate de que estas variables estén configuradas:

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...

# RevenueCat
REVENUECAT_WEBHOOK_SECRET=tu_secreto_inventado
```

### 3.2 Lógica de Sincronización (CRÍTICO)

Para que el sistema sepa quién compró qué, usamos el `UserID` (UUID) de nuestra base de datos:

- **En Stripe:** Lo enviamos en `client_reference_id` al crear la sesión de Checkout.
- **En RevenueCat:** El SDK móvil debe identificar al usuario con `Purchases.configure(apiKey, appUserID: USER_UUID)`.

Cuando el webhook llega, el backend busca al usuario por ese ID y actualiza el campo `plan` a `'pro'`.

---

## 🌐 Paso 4: Integración Frontend Web (React)

En `web/src/pages/Pricing.tsx`, el flujo ya está implementado:

1.  El usuario hace clic en "Obtener Premium".
2.  Se llama a `/api/subscriptions/checkout-session`.
3.  El backend devuelve una URL de Stripe.
4.  `window.location.href = url` redirige al usuario a la pasarela segura.

---

## 📱 Paso 5: Integración Móvil (Resumen)

Si estás usando React Native o Flutter, sigue estos pasos:

1.  **Instalar SDK:** `react-native-purchases` o `purchases_flutter`.
2.  **Configurar al Login:**
    ```javascript
    // Es vital pasar el ID de nuestro backend
    await Purchases.configure({ apiKey: "goog_...", appUserID: user.id });
    ```
3.  **Mostrar Ofertas:**
    ```javascript
    const offerings = await Purchases.getOfferings();
    if (offerings.current !== null) {
      // Mostrar el precio (que ya incluye tu markup del 15%)
    }
    ```
4.  **Realizar Compra:**
    ```javascript
    try {
      const { purchaserInfo } = await Purchases.purchasePackage(package);
      if (purchaserInfo.entitlements.active["pro"]) {
        // El webhook de RevenueCat llegará al backend en milisegundos
        // para actualizar la base de datos global.
      }
    } catch (e) {
      /* Error o cancelación */
    }
    ```

---

## 🧪 Paso 6: Pruebas (Checklist)

1.  [ ] **Stripe Web:** Usa tarjetas de prueba (4242...) y verifica que el usuario cambie a `pro` en la DB tras el pago.
2.  [ ] **RevenueCat Webhook:** Usa el botón "Test Webhook" en el dashboard de RevenueCat y mira los logs del backend.
3.  [ ] **Sincronización:** Compra en móvil y verifica que al entrar en la Web el usuario ya aparezca como "Pro".
4.  [ ] **Cancelación:** Cancela la suscripción en Stripe y verifica que el backend lo degrade a "Basic".

---

## 💡 Notas Importantes

- **Seguridad:** Nunca expongas tu `STRIPE_SECRET_KEY` en el frontend.
- **Precios:** Si cambias el precio en Stripe, debes actualizar el `STRIPE_PRO_PRICE_ID`.
- **Markup:** El 15% de markup para móvil se configura directamente en los precios de App Store / Play Store.
