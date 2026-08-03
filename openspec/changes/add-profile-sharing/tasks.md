# Tasks: Add Profile Sharing

> Branch: `feat/v2-profile-sharing`. Refs: proposal.md, design.md, specs/profile-sharing/spec.md, Issue #1120 (Parte B).

## Phase 1: Componente ShareProfileCard

- [x] 1.1 Strings i18n `share.*` añadidos al namespace `dashboard` (ES+EN): title, incentive, copy_link, copied, whatsapp, share_native, whatsapp_text, empty_title, empty_message, empty_cta.
- [x] 1.2 Crear `ShareProfileCard.tsx`: lee user.public_slug (useAuth) + is_enabled (React Query publicProfileConfigService). Link `${origin}/u/${slug}`. Acciones: copiar (clipboard + fallback execCommand + feedback 2s), WhatsApp (wa.me/?text= encoded), Web Share nativo (feature detection). Empty state CTA → /settings?tab=public-profile. Incentivo visible.
- [x] 1.3 Tests ShareProfileCard (10): activo con acciones, empty CTA (no enabled), empty (sin slug), incentivo, URL correcta, copiar + feedback, WhatsApp href encoded, native share presente/ausente, loading skeleton.

## Phase 2: Wiring + verify + PR

- [x] 2.1 Inyectar `<ShareProfileCard />` en Dashboard.tsx (sección prominente, tras OnboardingChecklist + UpgradeBanner, antes del ATTENTION SECTION).
- [x] 2.2 `tsc --noEmit` limpio; ESLint pasa; `vitest run` verde (1546 tests, 0 FAILs).
- [x] 2.3 verify-report.md escrito (PASS); PR abierto.

## Implementation Order

Lineal: 1 (componente) → 2 (wiring+verify). Frontend, sin migración, sin backend. 2 fases (issue más chico que #1117/#1118).
