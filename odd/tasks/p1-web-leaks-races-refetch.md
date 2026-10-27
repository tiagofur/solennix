# P1 — Leaks, carreras y refetch en web

Fixes del review web (bugs/memoria P1): listeners, carrera de sesión, refetch que pisa edición, checklist, sugerencias, inbox.

## Specs

- S1: resize del sidebar no deja listeners vivos si el drag se interrumpe (`pointercancel`) o el componente desmonta a mitad de drag.
- S2: `checkAuth` en vuelo no re-puebla el user tras un `auth:logout` (sin sesión zombie); sin doble `/auth/me` en StrictMode más allá de lo esperado.
- S3: un refetch de fondo no pisa silenciosamente lo que el usuario escribe en `EventForm`/`ClientForm` en modo edición.
- S4: checklist restaura solo ids vigentes (progreso nunca >100%) y purga claves viejas.
- S5: sugerencias de productos/insumos en `EventForm` con debounce + cancelación (sin stale).
- S6: inbox de solicitudes (`RequestsInboxPage`) con paginación UI real (backend ya pagina) y badge con refresh.

## Tasks

- P1.1 (S1, inline): cleanup resize en `Layout.tsx`. Commit: pendiente (el usuario no pidió commit del P1).
- P1.2 (S2, inline): cancelación en `checkAuth`. Commit: pendiente (ídem).
- P1.3 (S3, inline): dirty-guard o refetchOnWindowFocus off en forms edición. Commit: pendiente (ídem).
- P1.4 (S4, inline): intersección + purga en `EventChecklistView`. Commit: pendiente (ídem).
- P1.5 (S5, inline): debounce + flag cancelled en sugerencias. Commit: pendiente (ídem).
- P1.6 (S6, inline/worker): paginación inbox + badge. Implementado inline (componente `Pagination` compartido + `refetchInterval` 30s en badge). Commit: pendiente (ídem).
- P1.7 (verificación): por ítem — Layout 18 passed, AuthContext 14 passed, EventForm+ClientForm 45 passed, EventChecklistView 2 nuevos passed, EventForm 33 passed (tras P1.5), inbox 6 passed (2 nuevos), `tsc` limpio tras cada ítem. Sin commit (el usuario decide PR).

## Log

- L1 (usuario, verbatim): "ya esta merged, seguimos con el plan"
- L2: P0 mergeado como 5c94175f (#1276); rama P1 `fix/p1-web-leaks-races-refetch` desde main.
