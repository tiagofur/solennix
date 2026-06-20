# Sesión Activa — Solennix Agent Progress

## Feature en curso
- **ID:** 519
- **Nombre:** refactor(web): sync OpenAPI spec types with the real backend contract
- **Estado:** in_progress

## Plan de trabajo
- [x] Crear rama de trabajo `refactor/sync-openapi-types-issue-519`
- [x] Modificar `backend/docs/openapi.yaml` (añadir preferred_language a User y expires_at a TokenPair, y expandir enum de roles)
- [x] Regenerar tipos `web/src/types/api.ts` con `npm run openapi:types`
- [x] Resolver duplicación en `web/src/types/auth.ts` reexportando el tipo User de `entities.ts`
- [x] Verificar compilación de TypeScript en frontend y tests con `./init.sh`
- [/] Crear Pull Request y asociar al Issue #519

## Notas de Desarrollo
- Se detectó que el rol `team_member` y `assistant` no estaban en el enum del campo `role` del esquema `User` en `openapi.yaml`, lo cual causaba errores de compilación al comparar roles tras unificar el tipo. Se agregaron y la compilación es 100% exitosa.

## Bloqueos
- Ninguno.
