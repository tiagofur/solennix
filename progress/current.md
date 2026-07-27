# Sesión Activa — Solennix Agent Progress

## Feature en curso
- **Change (SDD):** `public-professional-profile` · **Issue:** [#787](https://github.com/tiagofur/solennix/issues/787)
- **Estado:** PR1 verde (técnico) abierto · PR2 **implementado y abierto** · governance fix en #1047
- **Branch PR1:** `feat/787-public-profile-pr1-foundation` → [PR #1046](https://github.com/tiagofur/solennix/pull/1046)
- **Branch PR2:** `feat/787-public-profile-pr2-public-get` → [PR #1048](https://github.com/tiagofur/solennix/pull/1048) (stacked sobre PR1)
- **Branch governance:** `chore/stacked-pr-governance` → [PR #1047](https://github.com/tiagofur/solennix/pull/1047)
- **Artifact store:** Engram (no `openspec/changes/public-professional-profile/`)
- **Strict TDD:** activo

---

## Sesión 2026-07-27 (PR2 implementado)

### PR2 — Dominios `public-profile` + `reviews-public-sanitize`
Implementado con TDD estricto (RED→GREEN por unidad, 7 commits):

1. `feat(backend): add PublicReview sanitizer mapper` — `toPublicReview` + `display_name` (server: `"A."` o `"Verified client"`); sin PII.
2. `feat(backend): list public profile services and scan product flag` — `ProductRepo.ListPublicProfileServices` + scan `show_on_public_profile` en GetAll/GetByID/GetAllPaginated/Search.
3. `feat(backend): add PublicProfileRepo.GetByUserID read path` — mínimo (upsert es PR3).
4. `feat(backend): add public profile aggregate GET handler` — `PublicProfileHandler.GetPublicProfile` plan-aware; Free ≤3 services omite reviews/portfolio/socials; Pro+ honra toggles.
5. `fix(backend): sanitize PII from public organizer reviews endpoint` — `ListPublicPortfolioReviews` ya no devuelve `[]*EventReview` crudo (leak activo en main); ahora delega a `listPublicReviews` (sanitizado, plan-gated).
6. `feat(backend): wire public aggregate GET route` — `/{slug}` en grupo `/public/organizers` RateLimit(20).
7. `test(backend): update router test callers` — fixup por signature change.

### Verificación local
- `cd backend && go test ./... -count=1` → **todos los paquetes verde**.
- `./init.sh` → backend verde; web type-check verde (sin cambios web en PR2). Único fail: `QuickClientModal.test.tsx` (flaky preexistente, también falla en main).

### CI de PR2 (#1048)
- Solo corren los workflows `pull_request_target` (PR Governance, Triage) porque la base es una branch intermedia (`feat/787-public-profile-pr1-foundation`).
- `ci-pipeline.yml` (Backend/Frontend Tests) y `ci-diagnostics.yml` (Stages) **solo disparan con base `main`/`develop`** → no arrancan hasta rebasear PR2 sobre main.
- **Esperado** en estrategia stacked-to-main. Los 2 fails de governance (Issue Reference / status:approved) se resuelven al mergear #1047 (acepta `Refs` + label `stacked-pr`).

---

## Cadena de PRs

| # | Scope | Estado |
|---|--------|--------|
| **PR1** | Migración 066, models, `public_slug` en UserRepo, plan keys, stubs OpenAPI | ✅ Hecho · [#1046](https://github.com/tiagofur/solennix/pull/1046) · CI técnico verde |
| **PR2** | `GET /api/public/organizers/{slug}` + sanitize reviews + OpenAPI real | ✅ Hecho · [#1048](https://github.com/tiagofur/solennix/pull/1048) (stacked) |
| **PR3** | Auth `GET/PUT .../public-profile` + Settings “Perfil público” | ⏳ Pendiente |
| **PR4** | `show_on_public_profile` write cap + Free max 3 + UI ProductForm | ⏳ Pendiente |
| **PR5** | Portfolio Pro+ (CRUD, max 6) | ⏳ Pendiente |
| **PR6** | Página pública `/u/:slug` light/dark + polish + docs PRD | ⏳ Pendiente |

### Governance side-PR
- **#1047** `fix(infra): support stacked PRs in PR Governance` — workflow acepta `Refs #N` + label `stacked-pr`; hereda `type:*` del issue padre. **Mergear primero**.

---

## Próximos pasos concretos

1. **Mergear #1047** (reviewer humano).
2. Tras #1047 en main: agregar `stacked-pr` a #1046 y #1048, re-run governance checks.
3. **Mergear #1046 (PR1)** → rebasear #1048 (PR2) sobre main → CI técnico corre.
4. **Mergear #1048 (PR2)**.
5. Arrancar **PR3** desde main actualizado.

## Bloqueos
- Ninguno técnico. CI técnico de PR2 pendiente de rebase sobre main (esperado en stacked).

## Últimas sesiones previas (históricas en este archivo)
- Platform registration + user-cleanup lifecycle (ya shippeados).
- PR1 fix OpenAPI (`show_on_public_profile` opcional) + governance stacked-pr.
