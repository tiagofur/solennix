# Fix: fotos de eventos subidas desde iOS no cargan en la web

## Causa raíz (confirmada)

Desacuerdo de esquema en la columna `events.photos`:
- **iOS** escribe un array de strings: `["/api/uploads/.../a.jpg"]` vía `PUT /events/{id}`.
- **Backend/Android/Web** leen/escriben un array de objetos: `[{id, url, thumbnail_url, ...}]` vía `POST /events/{id}/photos`.

`parseEventPhotos` (crud_handler.go:1764) hace `json.Unmarshal` de strings en `[]models.EventPhoto` → **falla** → devuelve `[]` → la web recibe lista vacía y no muestra nada. (Las URLs relativas, que ya arreglaste en esta rama, eran un síntoma menor.)

Decisión acordada: **backend tolerante + alinear iOS al endpoint dedicado** (cierra el bug de raíz y recupera datos existentes).

---

## Parte 1 — Backend tolerante (recupera fotos YA subidas)

**`backend/internal/handlers/crud_handler.go:1764` — `parseEventPhotos`**
- Tras fallar el unmarshal a `[]models.EventPhoto`, reintentar como `[]string` (formato legacy de iOS). Si funciona, mapear cada string a un `models.EventPhoto` sintético:
  - `ID = uuid.New()`, `URL = raw`, `ThumbnailURL = nil`, `Caption = nil`, `CreatedAt = time.Time{}`.
- Esto hace que `GET /events/{id}/photos` devuelva las fotos existentes, **sin migrar la DB**.

**Tests — `backend/internal/handlers/crud_handler_events_coverage_test.go`**
- `TestParseEventPhotos_LegacyStringArray`: input `["/api/uploads/x.jpg"]` → 1 `EventPhoto` con esa URL.
- `TestGetEventPhotos_LegacyStringArray_ReturnsObjects`: flujo HTTP completo devuelve array de objetos.
- (Opcional) `TestAddEventPhoto_ToLegacyEvent_Merges`: un evento con photos en formato string-array recibe una foto nueva vía POST y queda en formato objeto-array.

Verificar: `cd backend && go test ./internal/handlers/...`

> Nota: no normalizamos la DB automáticamente — las fotos legacy se seguirán sirviendo vía mapeo. Una migración física de datos es opcional y fuera de scope.

---

## Parte 2 — Alinear iOS al endpoint dedicado `POST /events/{id}/photos`

### 2.1 Nuevo modelo `EventPhoto`
**Archivo nuevo: `ios/Packages/SolennixCore/Sources/SolennixCore/Models/EventPhoto.swift`**
- `public struct EventPhoto: Codable, Identifiable, Sendable, Hashable` con `id: String`, `url: String`, `thumbnailUrl: String?`, `caption: String?`, `createdAt: String` + `public init`. Snake-case auto-mapeado por el decoder del APIClient.

### 2.2 Nuevo endpoint
**`ios/Packages/SolennixNetwork/Sources/SolennixNetwork/Endpoints.swift`** (junto a `eventProducts`/`eventExtras`)
- `public static func eventPhotos(_ id: String) -> String { "/events/\(id)/photos" }`
- `public static func eventPhoto(_ id: String, _ photoId: String) -> String { "/events/\(id)/photos/\(photoId)" }` (para DELETE).

### 2.3 ViewModel — `EventDetailViewModel.swift`
- `eventPhotos: [String]` (l. 24) → **`eventPhotos: [EventPhoto]`**.
- **Carga** (l. 147-159): reemplazar el parseo manual del JSON string por `apiClient.get(Endpoint.eventPhotos(eventId))` tipado como `[EventPhoto]`.
- **`addPhotos`** (l. 536-556): tras subir cada imagen a `/uploads/image`, llamar `apiClient.post(Endpoint.eventPhotos(eventId), body: ["url": resp.url])` → `EventPhoto` y appendear el objeto (en vez de reescribir todo el array con PUT).
- **`removePhoto(at:eventId:)`** (l. 558-577): cambiar a `apiClient.delete(Endpoint.eventPhoto(eventId, photo.id))` y remover del array por id (en vez de reescribir con PUT).

### 2.4 Vistas consumidoras (3 archivos)
Cambiar de `[String]` a `[EventPhoto]` y leer `.url`/`.id` donde usaban el string crudo:
- **`EventPhotosDetailView.swift`** (grid + lightbox): `APIClient.resolveURL(photo.url)`; `viewModel.removePhoto` ahora por id.
- **`EventDetailView.swift`** (l. 28, 271, 325, 607, 679): pasa `photos: viewModel.eventPhotos` al media component y `photosCount`.
- **`EventDetailMediaComponents.swift`** (l. 52-89): `let photos: [EventPhoto]`, `photos.prefix(4)` con `.url`.

### 2.5 Verificación iOS
- Compilar con xcodebuild (scheme Solennix, simulator iOS). No hay suite de tests unitarios de fotos actualmente; la verificación es de compilación + smoke manual.

---

## Parte 3 — Cierre
- `./init.sh` en verde.
- Documentar en `progress/current.md`.
- Commits separados (Conventional Commits):
  1. `fix(backend): make parseEventPhotos tolerant of legacy iOS string-array photos`
  2. `fix(ios): use dedicated event photos endpoint instead of rewriting event.photos`
- La feature en `feature_list.json` se marca `done` al confirmar verde.

## Fuera de scope
- Android y Web: **sin cambios** (ya usan el endpoint correcto y ya resuelven URLs relativas; el fix del backend restaura sus datos automáticamente).
- Migración física de la DB (normalizar strings → objetos): no necesaria; el mapeo tolerante lo cubre.