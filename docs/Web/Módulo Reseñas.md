# Módulo Reseñas

#web #reseñas #testimonios

> [!abstract] Resumen
> Este módulo cubre el ciclo completo de reseñas post-evento: formulario público sin auth para cliente final y bandeja del organizador para gestionar visibilidad y respuesta.

## Páginas

| Página | Ruta | Auth | Descripción |
|---|---|---|---|
| PublicReviewPage | `/organizer/review/:token` | No | Cliente deja calificación/comentario usando token único |
| ReviewsPage | `/reviews` | Sí | Organizador lista reseñas, ajusta visibilidad y responde |

## Flujo público

1. Link enviado por email: `/organizer/review/:token`
2. Carga metadata: `GET /api/public/reviews/{token}`
3. Envío de reseña: `POST /api/public/reviews/{token}`
4. Estados manejados: loading, unavailable (404/410), success

## Flujo organizador

1. Lista: `GET /api/reviews`
2. Respuesta: `PATCH /api/reviews/{id}/response`
3. Visibilidad: `PATCH /api/reviews/{id}/visibility`

## Servicio web

Archivo: `web/src/services/eventReviewService.ts`

- `getPublicReviewRequest(token)`
- `submitPublicReview(token, payload)`
- `listOrganizerReviews()`
- `updateOrganizerResponse(id, response)`
- `updateVisibility(id, visibility)`

## i18n

Namespace nuevo: `reviews`

- `web/src/i18n/locales/es/reviews.json`
- `web/src/i18n/locales/en/reviews.json`
- Registrado en `web/src/i18n/config.ts`

## Navegación

- Sidebar: item `Reseñas`
- Command palette: shortcut de navegación a `/reviews`

## Archivos clave

- `web/src/pages/PublicReview/PublicReviewPage.tsx`
- `web/src/pages/Reviews/ReviewsPage.tsx`
- `web/src/services/eventReviewService.ts`
- `web/src/App.tsx`
- `web/src/components/Layout.tsx`
