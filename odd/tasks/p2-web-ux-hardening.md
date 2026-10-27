# P2 — UX hardening web

Segunda tanda del review (UX audit P2.3–P2.10): palette, captcha, validaciones, i18n, PWA, tests.

## Specs

- S1: CommandPalette cubre /staff, /payments/inbox, /requests, /inbound (igual que el sidebar).
- S2: forms públicos con captcha real (Turnstile) además del honeypot; backend verifica el token.
- S3: validaciones con mensajes visibles: QuickQuote discount con error (no clamp silencioso), teléfono con formato, email sin API deprecada de zod.
- S4: Landing usa namespaces i18n (sin diccionarios inline); date-fns con locale consistente.
- S5: PWA `start_url` dinámico según origen de instalación (visitante inbound vs app).
- S6: tests para flujos tocados y páginas públicas sin cobertura.

## Tasks

- P2.1 (S1, inline): palette +4 secciones. Commit: pendiente.
- P2.2 (S2, inline/worker): Turnstile web + verificación backend. Commit: pendiente.
- P2.3 (S3, inline): QuickQuote + teléfono + email zod. Commit: pendiente.
- P2.4 (S4, inline): Landing i18n + date-fns locale. Commit: pendiente.
- P2.5 (S5, inline): PWA start_url. Commit: pendiente.
- P2.6 (S6, inline): tests de lo tocado + páginas públicas. Commit: pendiente.
- P2.7 (verificación): suite web completa 171 archivos / 1643 tests en verde + backend enfocado ok + tsc + redocly. 6 commits en `fix/p2-web-ux-hardening` (palette, turnstile, validaciones, landing-i18n, manifest dinámico, tests públicos). Sin PR (el usuario no lo pidió).

## Log

- L1 (usuario, verbatim): "creo que mi github esta bugado, si esta todo verde mergea y seguimos con la proxima tarea"
- L2 (pregunta P2): usuario eligió "Todo P2 junto".
