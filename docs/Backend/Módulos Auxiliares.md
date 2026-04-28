---
tags:
  - backend
  - módulos
  - auxiliar
  - go
  - api
created: 2025-04-05
updated: 2025-04-05
related:
  - "[[Backend MOC]]"
  - "[[Integraciones]]"
  - "[[Performance]]"
  - "[[Roadmap Backend]]"
---

# Módulos Auxiliares del Backend

Documentación consolidada de cuatro módulos auxiliares del backend de Solennix. Cada uno cumple un rol específico dentro del ecosistema API y operan de forma independiente entre sí.

> [!info] Resumen Rápido
> | Módulo | Handler | Propósito |
> |--------|---------|-----------|
> | Calendario | `UnavailableDateHandler` | Gestión de fechas no disponibles |
> | Búsqueda Global | `SearchHandler` | Búsqueda unificada entre entidades |
> | Uploads | `UploadHandler` | Subida y servicio de imágenes |
> | Dispositivos | `DeviceHandler` | Registro de push tokens + envío real FCM/APNs |

---

## Módulo Calendario (Fechas No Disponibles)

> [!tip] Propósito
> Permite al organizador marcar rangos de fechas como **no disponibles**, bloqueando la creación de eventos en esos períodos.

### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/unavailable-dates` | Lista todas las fechas no disponibles del usuario |
| `POST` | `/api/unavailable-dates` | Crea un nuevo rango de fechas no disponibles |
| `DELETE` | `/api/unavailable-dates/{id}` | Elimina un rango de fechas no disponibles |

### Modelo de Datos — `UnavailableDate`

```
UnavailableDate {
    id         string    // UUID, PK
    user_id    string    // FK → users, obligatorio
    start_date time.Time // Inicio del rango
    end_date   time.Time // Fin del rango
    reason     string    // Opcional — motivo de la no disponibilidad
}
```

### Comportamiento Clave

- **Rangos de fechas**: Se almacena un `start_date` y `end_date`, no fechas individuales. Un solo registro puede cubrir un bloque completo (ej: vacaciones del 10 al 20 de marzo).
- **Filtrado por `user_id`**: Toda query filtra por el usuario autenticado. Es multi-tenant a nivel de fila — ver [[Seguridad]].
- **Validación**: `start_date` debe ser anterior o igual a `end_date`.

> [!example] Ejemplo de Request — Crear rango
> ```json
> POST /api/unavailable-dates
> {
>   "start_date": "2026-01-10",
>   "end_date": "2026-01-20",
>   "reason": "Vacaciones personales"
> }
> ```

> [!warning] Nota de Diseño
> Actualmente no existe validación automática al crear eventos que verifique solapamiento con fechas no disponibles. Esa lógica debe implementarse en el [[Módulo Eventos]].

---

## Módulo Búsqueda Global

> [!tip] Propósito
> Búsqueda unificada que permite al usuario buscar un término y obtener resultados de **múltiples entidades** agrupados por tipo.

### Endpoint

| Método | Ruta | Rate Limit |
|--------|------|------------|
| `GET` | `/api/search?q=query` | 30 requests/minuto |

### Entidades y Campos Buscados

| Entidad | Campos donde se busca |
|---------|-----------------------|
| Clients | `name`, `phone`, `email` |
| Products | `name`, `category` |
| Inventory | `name` |
| Events | `service_type` |

### Comportamiento Clave

- **Resultados agrupados**: La respuesta devuelve los resultados separados por tipo de entidad, no como una lista plana.
- **Estrategia actual — `ILIKE` + `pg_trgm`**: Cada categoría corre en una **goroutine paralela**. Dentro de cada repo, la query usa `ILIKE '%query%'` para matching case-insensitive combinado con `pg_trgm similarity()` para tolerancia de typos. Se aplica un **límite duro de 6 resultados por categoría** antes de retornar.
- **Filtrado por `user_id`**: Cada búsqueda se restringe al usuario autenticado.

> [!example] Ejemplo de Response
> ```json
> GET /api/search?q=juan
> {
>   "clients": [{ "id": "...", "name": "Juan Pérez", ... }],
>   "products": [],
>   "inventory": [],
>   "events": []
> }
> ```

> [!info] Implementación Paralela
> `search_handler.go` lanza 4 goroutines simultáneas (clients, products, inventory, events) y recolecta via `sync.WaitGroup`. Cada `Search()` en el repositorio devuelve hasta 10 candidatos; el **límite de 6 por categoría se aplica en el handler** tras reunir todos los resultados (`result.clients = result.clients[:6]`, etc.). La extensión `pg_trgm` y los índices GIN (`gin_trgm_ops`) deben estar activos — migración `033_add_fulltext_search`.

> [!roadmap] Mejora Planeada — Full-Text Search
> Migrar a **PostgreSQL Full-Text Search** con índices `GIN`:
> - Crear `tsvector` columns en las tablas relevantes
> - Indexar con `GIN` para búsquedas sub-milisegundo
> - Soporte para stemming y acentos en español
> - Ver detalles en [[Roadmap Backend]]

---

## Módulo Uploads

> [!tip] Propósito
> Gestiona la subida de imágenes (fotos de eventos, productos, etc.) y las sirve como archivos estáticos con cache agresivo.

### Endpoints

| Método | Ruta | Rate Limit | Descripción |
|--------|------|------------|-------------|
| `POST` | `/api/uploads/image` | 5 requests/minuto | Sube una imagen |
| `GET` | `/api/uploads/*` | — | Sirve archivos estáticos (cache 1 año) |

### Flujo de Subida

```
Cliente → POST /api/uploads/image (multipart)
    → Validación de tipo (JPEG, PNG)
    → Verificación de límite de plan
    → Almacenamiento en disco local
    → Generación automática de thumbnail
    → Response con URL del archivo
```

### Almacenamiento en Disco

```
{UPLOAD_DIR}/
  └── {userID}/
      ├── {filename}.{ext}          # Imagen original
      └── {filename}_thumb.{ext}    # Thumbnail auto-generado
```

- Cada usuario tiene su propio subdirectorio.
- Thumbnails se generan automáticamente al subir la imagen.

### Límites por Plan

| Plan | Máx. Uploads |
|------|-------------|
| Basic | 50 |
| Pro | 200 |

### Formatos Aceptados

- **JPEG** (`image/jpeg`)
- **PNG** (`image/png`)

> [!warning] Limitación Crítica — Almacenamiento Local
> El almacenamiento actual es **disco local del servidor**. Esto significa:
>
> - **No funciona con múltiples instancias** — cada instancia tiene su propio filesystem
> - **Sin replicación** — si el servidor cae, las imágenes se pierden
> - **Sin CDN** — el ancho de banda sale del servidor de la app
>
> Para producción multi-instancia, migrar a S3/GCS. Ver [[Roadmap Backend]] y [[Despliegue]].

> [!info] Cache de Archivos Estáticos
> Los archivos servidos por `GET /api/uploads/*` tienen headers de cache de **1 año** (`Cache-Control: max-age=31536000`). Esto es seguro porque los filenames incluyen un identificador único — si se re-sube una imagen, el nombre cambia y no hay stale cache.

---

## Módulo Dispositivos (Push Tokens)

> [!tip] Propósito
> Registra y desregistra **push tokens** de dispositivos para habilitar notificaciones push futuras.

### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/devices/register` | Registra un token de dispositivo |
| `POST` | `/api/devices/unregister` | Elimina un token de dispositivo |

### Modelo de Datos — `DeviceToken`

```
DeviceToken {
    id       string    // UUID, PK
    user_id  string    // FK → users
    token    string    // Push token del servicio (APNs/FCM)
    platform string    // "ios" | "android" | "web"
}
```

### Plataformas Soportadas

| Plataforma | Servicio Push |
|-----------|---------------|
| `ios` | Apple Push Notification service (APNs) |
| `android` | Firebase Cloud Messaging (FCM) |
| `web` | Web Push API |

### Comportamiento Clave

- **Un token por dispositivo**: Si se registra un token que ya existe para el usuario, se actualiza en lugar de duplicar.
- **Unregister elimina**: Al desregistrar, el token se borra de la base de datos.

> [!success] Estado de Implementación — Completo
> Los endpoints de registro funcionan correctamente y los tokens **se almacenan** en la base de datos. Además:
>
> - **FCM activo** — `services/push_service.go` envía a Android/Web vía `firebase-admin-go`; batch de hasta 500 tokens por envío con limpieza automática de tokens inválidos.
> - **APNs activo** — envío a iOS vía `sideshow/apns2` con token-based auth.
> - **`notification_service.go`** — templates de notificación definidos (evento próximo 24h/1h, pago pendiente, cotización sin confirmar) con dedupe via `notification_log`.
> - **Background job** — `ProcessPendingReminders` corre cada 15 min para despachar recordatorios encolados.
> - Las credenciales se inyectan vía `FCM_CREDENTIALS_JSON`, `APNS_KEY_PATH`, `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID`. Si no están configuradas, el servicio se deshabilita gracefully sin romper el servidor.

---

## Vista de Dependencias

```
┌─────────────────────────────────────────────────┐
│                  Auth Middleware                 │
│              (todos los módulos)                 │
├─────────┬──────────┬──────────┬─────────────────┤
│Calendar │ Search   │ Uploads  │ Devices         │
│ Handler │ Handler  │ Handler  │ Handler         │
├─────────┼──────────┼──────────┼─────────────────┤
│unavail. │ clients  │ Storage  │ device_tokens   │
│ _dates  │ products │ Provider │ table           │
│ table   │ inventory│(local/S3)│                 │
│         │ events   │          │                 │
└─────────┴──────────┴──────────┴─────────────────┘
         │          │          │          │
         ▼          ▼          ▼          ▼
    PostgreSQL PostgreSQL  Local/S3  PostgreSQL
                          + FCM/APNs
```

## Cross-References

| Tema | Documentación |
|------|--------------|
| Middleware de autenticación | [[Middleware Stack]] |
| Límites de plan y suscripción | [[Autenticación]] |
| Esquema de base de datos | [[Base de Datos]] |
| Plan de mejora de performance | [[Performance]] |
| Roadmap de features pendientes | [[Roadmap Backend]] |
| Servicios externos (FCM, S3) | [[Integraciones]] |
| Despliegue multi-instancia | [[Despliegue]] |
| Seguridad y multi-tenancy | [[Seguridad]] |
| Índice general del backend | [[Backend MOC]] |
