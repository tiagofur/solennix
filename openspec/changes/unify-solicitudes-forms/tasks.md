# Tasks: Unify Formularios + Solicitudes

> Refs: `proposal.md`, `design.md`. Product UI: **Solicitudes**. Canonical: `PublicRequest` + `public_request_links`.  
> Default link `submit_mode`: **`auto_event`**. Chained PRs recommended per phase.

## Phase 0: Foundation (DB + models)

- [x] 0.1 Migration `0xx_unify_public_request_links.up.sql`: create `public_request_links` (token, label, status, submit_mode, max_uses, use_count, expires_at) + indexes per design §4.1.
- [x] 0.2 Same migration: `ALTER public_requests` add `source`, `link_id`, `submit_mode`, `contact_phone`, `city`; document `services[].qty` in comments/OpenAPI only.
- [x] 0.3 Down migration: drop new columns + `public_request_links` (keep `public_requests` data-safe).
- [x] 0.4 Models: `PublicRequestLink`, `SubmitMode` (`standard|auto_quote|auto_event`), `RequestSource`; extend `PublicRequest` + `PublicRequestServiceSnapshot` with `Qty`.
- [x] 0.5 Hard-remove or stub-404 `PublicLead` handlers once Phase 1 create path is green (prefer Phase 4 if dual-run needed; greenfield → remove with P1 OpenAPI).

## Phase 1: Repository + catalog resolver

- [x] 1.1 `public_request_link_repo.go`: Create, GetByToken, ListByOrganizer, IncrementUse, Revoke, ExpireStale, CountActive.
- [x] 1.2 Extend `public_request_repo.Create` for new columns; snapshot includes `qty`.
- [x] 1.3 Catalog helper (service or product_repo): `ResolveRequestCatalog(userID, entry)` — profile ON → public items; OFF + link → all `is_active`; profile CTA requires enabled.
- [x] 1.4 Repo tests: link usable matrix, use_count→used, expire, tenant isolation; request create with source/link_id.

## Phase 2: Service (unified create + modes)

- [x] 2.1 `CreateFromProfile`: profile enabled, layer-1 validation (profile matrix), empty services OK, status `pending`, push.
- [x] 2.2 `CreateFromLink`: resolve token, 410 if unusable, validation by `submit_mode`, catalog rule, increment link uses in TX.
- [x] 2.3 `submit_mode=standard` → pending only.
- [x] 2.4 `submit_mode=auto_quote` → insert `PublicResponse` (sum qty×unit_price, inclusions from names) → `responded`.
- [x] 2.5 `submit_mode=auto_event` → same TX as convert: Client+Event(quoted)+products(qty) → `booked` + `event_id`.
- [x] 2.6 Fix `ConvertToEvent`: map phone, guest_count→num_people, city, snapshot qty; notes include source.
- [x] 2.7 Service unit tests: all three modes, invalid services, profile disabled, link expired/max_uses, auto_event field requirements.

## Phase 3: Handlers + router + jobs

- [x] 3.1 Public: `GET /api/public/request-links/{token}`, `POST .../request-links/{token}/requests` (rate-limit + honeypot).
- [x] 3.2 Extend `POST /api/public/organizers/{slug}/requests` body (phone, city, services[].qty).
- [x] 3.3 Auth: `GET/POST /api/organizers/me/request-links`, revoke/delete; plan limit 3 active (free/basic).
- [x] 3.4 Wire router + main; port EFL expire job → links; keep request ExpireStale.
- [x] 3.5 Handler tests: 410 link, 404 profile off, 201 auto_event has event_id, empty catalog OK, 402 plan limit.
- [x] 3.6 OpenAPI: new schemas/paths; mark/remove event-forms + leads; regenerate `web/src/types/api.ts`.

## Phase 4: Kill legacy APIs (backend)

- [x] 4.1 Remove EventFormLink public+auth routes, handlers usage from router (or return 410 with successor message during one release).
- [x] 4.2 Remove PublicLead routes + soft-deprecation leftover.
- [x] 4.3 Migration drop `public_leads`; later migration drop `event_form_links` after web/mobile cutover (or same PR if no dual support).
- [x] 4.4 `go test ./...` green; OpenAPI contract test green.

## Phase 5: Web (visitor + organizer)

- [x] 5.1 Shared `RequestForm` component (layers, honeypot, optional catalog, validation matrices).
- [x] 5.2 Route `/s/:token` (replace `/form/:token`); profile modal uses same form → existing `/requests` create.
- [x] 5.3 Hub `/requests`: Inbox + **Links** tab (create/copy/revoke, submit_mode, ttl, max_uses); remove nav to `/event-forms`.
- [x] 5.4 Services: `requestLinkService` + extend `publicRequestService`; delete/stop using `eventFormService` + `submitLead`.
- [x] 5.5 Redirects: `/form/:token` → `/s/:token` or friendly 410; `/event-forms` → `/requests?tab=links`.
- [x] 5.6 i18n ES/EN; unit tests for form validation + link manager limit messaging.
- [x] 5.7 Visitor success: standard/auto_quote → `/solicitud/:id`; auto_event → success with event created copy (no negotiate).

## Phase 6: Mobile organizer parity

- [ ] 6.1 iOS: models + endpoints for request-links; fold EventFormLinks UI into Requests (“Compartir link”); remove separate menu entry.
- [ ] 6.2 Android: same for `feature/requests` + drop standalone EventFormLinks screen from settings nav.
- [ ] 6.3 Push/deeplink unchanged (`public_request` → request detail); verify auto_event still notifies.
- [ ] 6.4 Platform unit/UI tests for link create + list.

## Phase 7: Docs + cleanup

- [x] 7.1 Update `docs/*/Módulo Formularios Compartibles.md` → point to Solicitudes / archive or rewrite as “Links de Solicitud”.
- [x] 7.2 PRD/status note: unified inbound; remove dual-path language in marketplace docs if present.
- [x] 7.3 Delete dead web/mobile/backend files; `./init.sh` or platform test suites green.
- [x] 7.4 Mark this change ready for verify/archive.

> **Ready for verify/archive.** Implementation phases 0–7 complete on branch `feat/unify-solicitudes-backend-pr1`. Split into chained PRs before merge (backend / web / mobile / docs as needed).

---

## Implementation order

```
0 → 1 → 2 → 3 → 4* → 5 → 6 → 7
         (*4 can start after 3 if web still on old paths; prefer 5 before hard DROP of event_form_links)
```

**PR slices (chained):**

| PR | Phases | Boundary |
|----|--------|----------|
| PR1 | 0–3 | Backend shippable; old EFL still live optional |
| PR2 | 4–5 | Web cutover + kill leads/EFL public |
| PR3 | 6 | Mobile |
| PR4 | 7 | Docs + DROP tables if deferred |

## Review workload forecast

- Estimated changed lines: **high (>>400)** across backend+web+mobile → **Chained PRs recommended: Yes**
- `400-line budget risk: High`
- `Decision needed before apply: Yes` if single-PR forced; default **auto-chain / ask-on-risk** → use table above
- Rollback: PR1 additive; PR2 route redirects; avoid DROP until PR2 green

## Next

Ready for **apply Phase 0–3 (PR1 backend)** after delivery strategy confirm.
