# Sesión Activa — Solennix Agent Progress

## Feature en curso
- **Issue:** #835 — fix(android): App Search index not cleared on logout
- **Estado:** done (pendiente PR)
- **Branch:** `fix/android-logout-search-index-835`

## Root cause
`SettingsViewModel.logout()` limpia Room (`localCacheManager.clearAll()`) pero nunca llama `AppSearchIndexer.removeAll()`. Los clientes/eventos/productos del tenant anterior quedan en el índice de búsqueda del dispositivo hasta que el próximo sync los sobrescribe. Data leak entre tenants.

## Cambios
- Inyectado `AppSearchIndexer` en `SettingsViewModel`.
- Agregado `appSearchIndexer.removeAll()` en `logout()` tras `localCacheManager.clearAll()`.
- Test actualizado: verifica `appSearchIndexer.removeAll()` se llama exactamente 1 vez en logout.

## Verificación
- `:feature:settings:testDebugUnitTest`: verde
- `./init.sh`: verde

## Bloqueos
- Ninguno.
