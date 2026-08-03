# Proposal: Add Profile Sharing in Provider Dashboard (Web)

> Refs: Issue [#1120](https://github.com/tiagofur/solennix/issues/1120) (Parte B) · PRD `docs/PRD/15_MARKETPLACE_V2.md` §6.4 · Milestone Solennix v2.0 (Sprint 13 / Fase 1)

## Intent

La economía de v2.0 funciona SI y SOLO SI los proveedores comparten su link `/u/:slug` activamente (PRD §6.4 — cada link compartido = cliente potencial a CAC ~$0). Hoy no hay UX que facilite ni incentive esto. Sin sharing fácil, el directorio (#1117) y el flujo de solicitudes (#1118) quedan sin tráfico. Este change entrega el **botón "Compartir mi perfil"** prominente en el dashboard del proveedor.

## Scope (Parte B — la Parte A "checklist publicabilidad" se posterga)

### In Scope
- Componente `ShareProfileCard` en el dashboard del proveedor: botón prominente "Compartir mi perfil".
- Acciones de share: copiar link, WhatsApp (`wa.me/?text=`), Web Share API nativo (mobile/Chrome Android).
- Incentivo visible: copy "Cada vez que compartís tu perfil, podés recibir solicitudes nuevas".
- Estado empty: si el provider no tiene perfil público habilitado o no tiene slug → CTA "Configurá tu perfil público" que linkea a Settings.
- Construye el link `/u/:slug` desde el `public_slug` del user (ya accesible via authStore + `getMyPublicProfile`).
- i18n ES/EN.

### Out of Scope
- **Parte A (checklist publicabilidad)** → postergada a sub-issue (no bloquea el sharing).
- QR code → postergado (requiere lib nueva; sin demanda validada aún).
- Analytics de sharing ("X visitas este mes") → futuro (#1131 o enhancement).
- Mobile apps (iOS/Android) → S14.

## Approach

**Frontend puro, aditivo.** Nuevo componente `ShareProfileCard` inyectado en el `Dashboard.tsx` del proveedor. Lee el `public_slug` del user autenticado (authStore) + el `is_enabled` del public profile (React Query via `publicProfileConfigService.getMyPublicProfile`). Si todo OK → muestra acciones de share. Si no → CTA a Settings.

URL del perfil: `${frontendURL}/u/${slug}` (el `frontendURL` ya se usa en otros servicios).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `web/src/pages/Dashboard.tsx` | Modified | Inyecta `<ShareProfileCard />` |
| `web/src/components/ShareProfileCard.tsx` | New | Card con botón share + acciones |
| `web/src/components/ShareProfileCard.test.tsx` | New | Tests |
| `web/src/i18n/locales/{es,en}/dashboard.json` | Modified | Strings `share.*` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Provider sin slug configurado | Medium | Empty state con CTA a Settings |
| Web Share API no soportado (desktop/iOS Safari) | Medium | Fallback: ocultar botón nativo si `!navigator.share`, mostrar copiar/WhatsApp |
| Link construido mal (frontendURL faltante) | Low | Reusa el patrón de publicProfileService (VITE_FRONTEND_URL o window.location.origin) |

## Rollback Plan

- Remover `<ShareProfileCard />` del Dashboard.
- Borrar los archivos nuevos.
- Sin cambios en backend ni otras páginas.

## Dependencies

- Issue #1120 (approved). Milestone v2.0.
- Reutiliza authStore (`user.public_slug`) + `publicProfileConfigService.getMyPublicProfile()`.
- El perfil público `/u/:slug` (#787) ya existe.

## Success Criteria

- [ ] El dashboard del proveedor muestra "Compartir mi perfil" en <3 clics desde home (1 clic: está en el home).
- [ ] Copiar link copia `${origin}/u/${slug}` al clipboard.
- [ ] WhatsApp abre `wa.me/?text=` con el link.
- [ ] Web Share nativo aparece solo si `navigator.share` existe.
- [ ] Provider sin perfil habilitado → CTA a Settings.
- [ ] i18n ES/EN.
- [ ] `vitest` verde; `tsc --noEmit` limpio.
- [ ] No rompe el dashboard existente.
