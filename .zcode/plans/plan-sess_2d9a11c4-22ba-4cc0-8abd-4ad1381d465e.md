# Plan — Logo más ancho + toggle de nombre en Perfil Público (Web)

## Contexto
- Solo **Web** tiene pantalla de perfil público (`PublicProfilePage.tsx:257-294`). iOS/Android solo tienen pantalla de **configuración** (sin display del logo) → el cambio de UI es Web-only; el backend es compartido.
- El logo hoy es un avatar `h-20 w-20 object-cover` (80×80) → **recorta el ancho**.
- El toggle `show_business_name_in_pdf` (bool, default `true`) **ya existe** en la tabla `users` y se carga en `UserRepo.GetByPublicSlug`, pero **no se expone** en el endpoint público ni en el DTO `PublicOrganizerProfile`.
- Decisión: **reusar el flag tal cual** (sin migrar DB, sin tocar iOS/Android). En el DTO público lo expongo con nombre genérico `show_business_name` (lee de `show_business_name_in_pdf`) para que el `_in_pdf` no aparezca confuso en un contexto web.

## Decisiones de diseño (no respondiste — corrígelas al aprobar si querés otra cosa)
1. **Logo**: `object-contain` + altura fija 80px + ancho auto hasta máx 280px. Deja de recortar; conserva ratio.
2. **Toggle**: reusar `show_business_name_in_pdf` sin renombrar ni migrar.
3. **Nombre oculto (`show=false`)**: se quita el `<h1>` visible; el business name pasa al `alt` del logo (a11y + SEO). Headline/location siguen mostrándose.

---

## Cambios

### Backend
**1. `backend/internal/models/models.go:682` — `PublicOrganizerProfile`**
Agregar campo (siempre presente, bool concreto):
```go
ShowBusinessName bool `json:"show_business_name"`
```

**2. `backend/internal/handlers/public_profile_handler.go:137` — `buildProjection`**
Resolver nil→true y asignar (mismo patrón que usa el PDF):
```go
dto.ShowBusinessName = user.ShowBusinessNameInPdf == nil || *user.ShowBusinessNameInPdf
```

**3. `backend/docs/openapi.yaml:2463` — schema `PublicOrganizerProfile`**
Agregar propiedad:
```yaml
show_business_name:
  type: boolean
```

### Web
**4. Regenerar tipos** (en `web/`): `npm run openapi:types` → actualiza `web/src/types/api.ts` (auto-generado, no se edita a mano).

**5. `web/src/pages/PublicProfile/PublicProfilePage.tsx:259-294` — header card**
- Calcular: `const showName = profile?.show_business_name ?? true;`
- **Logo real (línea 260-264)**: `h-20 w-20 ... object-cover` →
  `h-20 w-auto max-w-[280px] object-contain rounded-xl border border-border shrink-0 bg-surface-alt shadow-sm`
  (altura ancla 80px, ancho fluye proporcional hasta 280px, `contain` evita el recorte).
- **`alt` del logo** (línea 262): `alt=""` → `alt={showName ? "" : displayName}` (decorativo cuando el nombre se muestra; nombre accesible cuando está oculto).
- **Fallback sin logo (línea 266-275)**: si `showName=false` y no hay logo → caja de color de marca **sin la inicial** del nombre (ej. ícono genérico), para no contradecir "ocultar nombre". Si `showName=true`, mantiene la inicial actual.
- **`<h1>` del nombre (línea 279-281)**: envolver con `{showName && (...)}` para ocultar el texto del negocio cuando el toggle está apagado.
- **SEO `<title>` (línea 156-170)**: mantener `displayName` en el `<title>`/meta aunque `showName=false` (no es texto visible; conserva indexación). El control es solo sobre lo que se ve en pantalla.

### Paridad cross-platform (sin cambios necesarios)
- iOS/Android: no tienen pantalla de perfil público. El flag ya está en su modelo `User`. Si en el futuro agregan vista pública, leerán `show_business_name` del mismo endpoint.
- Sin migración de DB: la columna `show_business_name_in_pdf` ya existe y se persiste desde las 3 pantallas de Settings ya implementadas.

---

## Verificación
- `./init.sh` termina en verde.
- Web `npm run check` (regenera tipos + typecheck) pasa.
- Backend: `go build ./...` y tests de `public_profile_handler` (verificar que el JSON incluye `show_business_name`).
- Manual: abrir `/u/{slug}` de un negocio con logo wide → logo se ve entero sin recorte; togglear `show_business_name_in_pdf` OFF en Settings → el `<h1>` desaparece y el `alt` lleva el nombre.

## Fuera de alcance
- Pantallas de perfil público en iOS/Android (no existen).
- Renombrar el flag (dejaría semántica más limpia pero rompe 4 plataformas + DB; se decide reusar).