# 🚀 Guía de Despliegue en VPS (Plesk / Docker)

Tutorial paso a paso para desplegar **Solennix** (backend Go + frontend Vite/React + PostgreSQL) en un VPS utilizando Docker Compose y Plesk para SSL/Reverse Proxy.

---

## 1. Requisitos Previos (API Keys)

Antes de desplegar, asegúrate de tener todas las siguientes credenciales:

### 1.1 — Stripe (Pagos Web)

1. Ve a [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys) (Asegúrate de estar en modo **Live**)
2. Copia la **Secret Key** (comienza con `sk_live_...`)
3. Crea un producto en [Stripe Products](https://dashboard.stripe.com/products) ("Plan Pro") y copia su **Price ID** (`price_...`)
4. Configura el portal en [stripe.com/.../billing/portal](https://dashboard.stripe.com/settings/billing/portal). Copia el **Configuration ID** (`bpc_...`)
5. Configura el **Webhook** apuntando a `https://api.tu-dominio.com/api/subscriptions/webhook/stripe`. Escucha eventos como `checkout.session.completed`, `customer.subscription.updated/deleted`. Copia el **Signing Secret** (`whsec_...`)

### 1.2 — RevenueCat (Compras Móviles)

1. Ve a [app.revenuecat.com](https://app.revenuecat.com) (Project Settings > Webhooks)
2. Crea un webhook hacia `https://api.tu-dominio.com/api/subscriptions/webhook/revenuecat`
3. Como **Authorization Header**, define un _secreto fuerte_ (ej: `Bearer tu-secreto-revenuecat-super-seguro`).

### 1.3 — Resend (Email para Reset de Password)

1. Crea cuenta en [resend.com](https://resend.com)
2. Verifica tu dominio en [resend.com/domains](https://resend.com/domains)
3. Crea una API Key en [resend.com/api-keys](https://resend.com/api-keys) (`re_...`)

### 1.4 — JWT Secret

Genera un secreto seguro (min 32 caracteres) ejecutando localmente:
`openssl rand -hex 32`

---

## 2. Preparación del `.env` de Producción

En tu VPS (dentro de la carpeta `/opt/solennix` o similar), crea tu archivo `.env`:

```env
# ─── Seguridad ─────────────────────────────────────────────────────────
JWT_SECRET=TU_SECRET_DE_32_CHARS_AQUI

# ─── URLs ───────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS=https://app.tu-dominio.com
FRONTEND_URL=https://app.tu-dominio.com

# ─── Resend (Email) ───────────────────────────────────────────────────
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=Solennix <noreply@tu-dominio.com>

# ─── Stripe (Pagos Web) ──────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx
STRIPE_PRO_PRICE_ID=price_xxxxxxxxxxxxxxxxxxxx
STRIPE_PORTAL_CONFIG_ID=bpc_xxxxxxxxxxxxxxxxxxxx

# ─── RevenueCat (Compras In-App) ─────────────────────────────────────
REVENUECAT_WEBHOOK_SECRET=tu-secreto-revenuecat-super-seguro
```

> [!WARNING]
> Protege este archivo (`chmod 600 .env`). Nunca lo subas a tu repositorio Git.

---

## 3. Ajustes en `docker-compose.yml`

Asegúrate de ajustar el archivo `docker-compose.yml` base:

1. **Credenciales DB**: Cambia `solennix_user` y `solennix_password` en la sección `db` y en la variable `DATABASE_URL` del backend.
2. **Build de Frontend**: Cambia el argumento `VITE_API_URL` por tu dominio real de API:
   ```yaml
   frontend:
     build:
       args:
         - VITE_API_URL=https://api.tu-dominio.com/api
   ```
3. **Puerto de Frontend**: El frontend por defecto expone el puerto `:80`. Para evitar colisiones con tu Nginx del host/Plesk, exponlo en el puerto `:3000` (`3000:80`).

---

## 4. Levantar la Aplicación (Docker)

Sube tu código al VPS (vía git o ftp) e inicia Docker:

```bash
cd /opt/solennix

# Iniciar backend, frontend y db
docker compose up -d --build

# Revisar logs
docker compose logs -f
```

---

## 5. Configurar Reverse Proxy y SSL en Plesk

Una vez que los contenedores estén corriendo (`docker compose ps`):

1. **Añade los subdominios** en tu panel de Plesk:
   - `app.tu-dominio.com` (Frontend)
   - `api.tu-dominio.com` (Backend)

2. **Generar Certificados SSL**:
   - Para ambos subdominios, ve a _Certificados SSL/TLS_ y emite certificados con **Let's Encrypt**.

3. **Configurar Reglas de Proxy en Docker (Plesk)**:
   - Ve a la gestión de Apache/Nginx (o Reglas de Proxy en Plesk).
   - Para `app.tu-dominio.com`, desvía el tráfico hacia `http://localhost:3000` (el puerto de tu contenedor frontend).
   - Para `api.tu-dominio.com`, desvía el tráfico hacia `http://localhost:8080` (el puerto de tu contenedor backend).

---

> [!IMPORTANT]
> Recuerda que si modificas las variables de entorno en tu `.env` o en la consola de Plesk, **debes reiniciar los contenedores** implicados (`docker compose restart backend`) para que la configuración surta efecto.
