# Design: Add Profile Sharing in Provider Dashboard (Web)

> Refs: proposal.md · specs/profile-sharing/spec.md · Issue [#1120](https://github.com/tiagofur/solennix/issues/1120) Parte B · PRD §6.4

## Architecture

Frontend puro. Componente presentacional `ShareProfileCard` inyectado en el Dashboard. Lee el slug del authStore + el is_enabled via React Query (`publicProfileConfigService`).

```
Dashboard.tsx
    └── <ShareProfileCard />  (nuevo)
            ├── useAuth() → user.public_slug
            ├── useQuery(['my-public-profile']) → publicProfileConfigService.getMyPublicProfile()
            ├── construye link = `${origin}/u/${slug}`
            ├── si !slug || !is_enabled → CTA Settings
            └── si OK → acciones: copiar / WhatsApp / Web Share (si navigator.share)
```

## Decisions

### D1 — Componente dedicado en Dashboard (no en Settings)

**Decisión:** `ShareProfileCard` va en el dashboard (home del provider), no en Settings.

**Razón:** el acceptance criterion exige <3 clics desde home. En el dashboard está a 1 clic (visible al abrir). En Settings estaría a 2-3 clics (home → Settings → tab). El PRD §6.4 lo dice explícito: "no enterrado en Settings".

### D2 — Slug del authStore (no fetch extra)

**Decisión:** leer `user.public_slug` del authStore directamente. Solo fetch `getMyPublicProfile` para validar `is_enabled`.

**Razón:** el authStore ya tiene el user con `public_slug` (cargado al login). Hacer fetch solo para el slug sería redundante. El fetch de `is_enabled` es necesario porque ese campo vive en `organizer_public_profiles`, no en `users`.

### D3 — Web Share API con feature detection

**Decisión:** renderizar el botón nativo solo si `typeof navigator.share === 'function'`. Si no, ocultarlo (copiar + WhatsApp quedan).

**Razón:** Web Share no está en todos los browsers (Safari desktop, Firefox). Feature detection es el patrón idiomático. No polyfill.

### D4 — Copiar con navigator.clipboard + fallback

**Decisión:** usar `navigator.clipboard.writeText(link)`. Si falla (permisos, http), fallback a un `document.execCommand('copy')` con textarea temporal.

**Razón:** clipboard API es la moderna pero requiere HTTPS y permisos. El fallback defiende entornos restrictivos. Feedback "Copiado" tras éxito.

### D5 — WhatsApp via wa.me con texto prellenado

**Decisión:** `https://wa.me/?text=${encodeURIComponent("Mirá mi perfil: " + link)}` abre WhatsApp con mensaje prellenado (sin número destino — el provider elige a quién enviarlo).

**Razón:** `wa.me/?text=` es el deep link oficial de WhatsApp para compartir texto. Sin número destino = máxima flexibilidad (provider lo envía a quien quiera).

### D6 — Sin QR code (postergado)

**Decisión:** no incluir QR en v1.

**Razón:** añade dependencia (qrcode.react) sin demanda validada. Copiar link + WhatsApp + Share nativo cubren el 90% de los casos. QR se añade después si hay pedidos reales (impresos/tarjetas físicas).

### D7 — Empty state con CTA a Settings

**Decisión:** si `!slug || !is_enabled`, mostrar CTA "Configurá tu perfil público" que linkea a `/settings?tab=public-profile`.

**Razón:** no tiene sentido compartir un link que no funciona o no existe. El CTA guía al provider a completar la config. Reusa el tab deep-link que ya existe en Settings (`?tab=public-profile`).

## Components

| Componente | Archivo | Responsabilidad |
|---|---|---|
| `ShareProfileCard` | `web/src/components/ShareProfileCard.tsx` | Card con share + empty state |
| Dashboard wiring | `web/src/pages/Dashboard.tsx` | Inyecta `<ShareProfileCard />` |
| i18n | `web/src/i18n/locales/{es,en}/dashboard.json` | Strings `share.*` |

## Testing Strategy

- **ShareProfileCard:** render con slug+enabled (acciones visibles), sin slug (CTA), sin enabled (CTA), navigator.share presente/ausente, copiar link (mock clipboard), WhatsApp href, feedback temporal.
- Cobertura target: 85%.

## Out of Scope (recíproco)

- Parte A checklist publicabilidad → sub-issue.
- QR code → futuro.
- Analytics → #1131 o enhancement.
- Mobile apps → S14.
