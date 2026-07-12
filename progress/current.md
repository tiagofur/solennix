# Sesión Activa — Solennix Agent Progress

## Feature en curso
- **Issue:** #815 — fix(ios): Deep link tokens lack client-side format validation
- **Estado:** done (pendiente merge PR #954)
- **Branch:** `fix/ios-deeplink-token-validation-815`
- **Worktree:** `/Users/tiagofur/dev/solennix-ios-815`

## Root cause
`DeepLinkHandler.handle()` aceptaba cualquier `token` non-empty para `reset-password` y `team-invite`. El caller (`ContentView.handleDeepLink`) confía ciegamente en el `DeepLinkAction` retornado y lo escribe directo a bindings (`deepLinkResetToken` / `deepLinkTeamInviteToken`) que alimentan `AuthFlowView` → tokens malformados llegaban a la UI antes del reject del server.

## Cambios
- [x] `DeepLinkHandler.swift`: agregados 2 validadores `private static` con `NSRegularExpression` cacheado (patrón de `ContractTemplateTextView.swift:72`):
  - `isValidResetToken` → regex `^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$` (3 segmentos Base64URL, JWT shape — backend `AuthService.GenerateResetToken`, HS256).
  - `isValidTeamInviteToken` → regex `^[0-9a-f]{64}$` (64 hex lowercase — backend `generateFormToken`, `hex.EncodeToString` siempre lowercase; uppercase rechazado para matchear server output).
  - Endurecidos los 2 `guard` en `handle()`: agregada la condición `isValidXToken(token)` además del `!token.isEmpty` existente. Token inválido → `nil` → el caller no-op y la app queda en root (mismo comportamiento que scheme/host incorrecto).
  - Doc comments actualizados documentando los formatos esperados.
- [x] Tests `DeepLinkHandlerTests.swift`:
  - **Actualizados 2 existentes** (sus tokens placeholder rompían con las nuevas reglas): `testHandleResetPasswordWithToken` ahora usa un JWT-shaped string real; `testHandleTeamInviteWithToken` ahora usa 64-char lowercase hex.
  - **Agregados 2 nuevos** de rechazo: `testHandleResetPasswordRejectsNonJWTToken` (no-dots, too many/few segments, invalid chars) y `testHandleTeamInviteRejectsNonHexToken` (non-hex chars, wrong length 32/128, uppercase, 'g' not hex).

## Verificación
- `SolennixTests` (xcodebuild test): 471/471 (+2 nuevos, 1 skipped preexistente)
- `./init.sh`: verde (Go + Web)

## Notas
- El regex valida **shape**, no validez criptográfica — eso es job del server. El cliente solo filtra lo obviamente malformado antes de navegar.
- `event` route NO se tocó: ya valida shape via `parseEventRoute` (segment count + subpaths).
- Spotlight actions (`handleSpotlight`) out of scope: driven por Core Spotlight, no URLs.
- Test data gotcha: `#` es delimiter de fragment en URLs → no llega al query value. Los tests de invalid chars usan `!` + percent-encoding. Y el token hex64 original tenía 63 chars (typo) → corregido a 64.
- Paridad cross-platform NO necesaria: validación client-side de iOS.

## Bloqueos
- Ninguno.
