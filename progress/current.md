# Sesión Activa — Solennix Agent Progress

## Feature en curso
- **Issue:** #800 — fix(ios): AuthManager logs out on network failure with valid keychain tokens
- **Estado:** done (pendiente PR)
- **Branch:** `fix/ios-auth-offline-session-restore`

## Root cause
`AuthManager.checkAuth()`: cuando `/auth/me` fallaba por **error de red** con tokens presentes pero `currentUser == nil` (siempre nil en cold launch — iOS no persistía el usuario), el código hacía `authState = .unauthenticated`. El usuario caía al login con tokens válidos en keychain.

Brecha de paridad: Android ya persistía el usuario (`KEY_USER_JSON`) y restauraba optimistamente; iOS no.

## Cambios
- [x] `AuthManager.swift`: persistencia de `currentUser` en UserDefaults (`setCurrentUser`/`clearCurrentUser`/`loadCachedUser`) — paridad con Android `KEY_USER_JSON`
- [x] `AuthManager.swift`: fix del path offline — `loadCachedUser()` antes del fetch + `.unknown` (deferred) en vez de `.unauthenticated` cuando hay tokens pero no se alcanza el server
- [x] `AuthManager.swift`: path de refresh-failed transitorio con tokens intactos ahora explícito `.unknown`
- [x] `KeychainHelper.swift`: protocolo `KeychainStoring` (saveString/readString/delete) para testeabilidad
- [x] `APIClient.swift` + `AuthManager.swift`: usan `any KeychainStoring` en vez de `KeychainHelper` concreto
- [x] `SolennixApp.swift`: hook de reconnect resuelve estado `.unknown` diferido llamando `checkAuth()`
- [x] `AuthManagerTests.swift` (nuevo): 7 tests cubren los 4 paths de `checkAuth` + persistencia + cold launch + signOut

## Verificación
- `AuthManagerTests`: 7/7 pasan (paquete SolennixNetwork)
- `APIClientPolicyTests`: 12/12 pasan
- `SolennixTests` (app): 450/450 pasan (1 skipped)
- Build proyecto `Solennix`: OK
- Nota: `KeychainHelperTests` fallan solo en contexto standalone SPM sin host app (preexistente, no causado por este cambio)

## Notas
- El protocolo `KeychainStoring` fue necesario porque el Keychain del simulador no es confiable en test bundles SPM sin host app
- Cambios cross-platform NO necesarios: Android ya correcto, Web usa cookie httpOnly, Backend sin cambios

## Bloqueos
- Ninguno.
