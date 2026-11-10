# Design: Unify Formularios + Solicitudes

> Refs: `proposal.md` · current: `add-public-request-flow`, `add-public-request-form` · models `EventFormLink`, `PublicRequest`, `PublicLead`

## 1. Goal

One domain for “pedido de presupuesto”:

| Entry | Who starts | Creates |
|-------|------------|---------|
| Public profile CTA | Visitor on `/u/:slug` | `PublicRequest` `source=public_profile` |
| Shared link | Provider generates URL | `PublicRequest` `source=shared_link` (+ optional auto outcomes) |

**Product UI name:** Solicitudes (ES).  
**Code name:** keep `PublicRequest` (+ `PublicRequestLink`) to avoid a rename tsunami; OpenAPI title can say “Solicitudes / Quote requests”.

---

## 2. Architecture

```
                    ┌─────────────────────────────────────┐
 Visitor web        │  Shared RequestForm (layers 1–2)    │
 /u/:slug  ────────►│                                     │
 /s/:token ────────►│  POST create PublicRequest          │
                    └──────────────┬──────────────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
  source=public_profile    source=shared_link         submit_mode
  profile must be ON       resolve link token         standard | auto_quote | auto_event
  catalog=public items     catalog=auto by profile    ─────────────────────
                           link lifecycle             pending | responded | booked
         │                         │                         │
         └─────────────────────────┴─────────────────────────┘
                                   ▼
                         PublicRequestService
                    (states, respond, convert, expire)
                                   ▼
              public_requests · public_responses · public_request_links
                                   ▼
                    CreateClientTx + CreateEventTx (+ products)
```

Layers stay: **Handler → Service → Repository** (Go/Chi/pgx). Multi-tenant: always scope by `organizer_user_id` / `user_id`.

---

## 3. Decisions

### D1 — Canonical domain is PublicRequest (not EventFormLink)

**Decision:** Evolve `public_requests` + inbox + negotiation. EventFormLink becomes **link generation only** (`public_request_links`), not a parallel submit pipeline.

**Why:** Inbox, statuses, client_token, push, convert, visitor accept already exist on PublicRequest. Rebuilding that on EventFormLink is more work for less marketplace fit.

### D2 — Links are a separate table, not columns on the request

**Decision:** `public_request_links` (1:N requests per multi-use link; 1:1 when `max_uses=1`).

**Why:** Link lifecycle (active/used/expired/revoked, TTL, use_count) is orthogonal to request lifecycle. Mirrors today’s `event_form_links` cleanly.

### D3 — `submit_mode` on the link (not on every request permanently as only path)

**Decision:** Link carries:

| Value | On visitor submit |
|-------|-------------------|
| `standard` | Create request `pending` → organizer inbox (default) |
| `auto_quote` | Create request + **one** `PublicResponse` from selected line items (sum of snapshot prices; qty-aware) → status `responded`. Visitor can accept/decline via existing token flow. |
| `auto_event` | Create request + **inline convert** (Client + Event `quoted` + event_products) → status `booked`. EFL parity. |

Request row always stores `source` + optional `link_id` + effective `submit_mode` snapshot for audit.

**Defaults:**

- Profile CTA: always `standard` (no link).
- New provider links: default `auto_event` if we want EFL muscle memory, or `standard` for safer marketplace habit — **product default: `auto_event`** for “paquete listo” links; UI toggle for the other modes.

### D4 — Catalog resolution (locked product rule)

```
resolveCatalog(organizer, entry):
  if entry == public_profile:
    require profile.is_enabled
    return products where is_active AND show_on_public_profile
  if entry == shared_link:
    if profile.exists AND profile.is_enabled:
      return public profile products  // same as CTA
    else:
      return products where is_active  // full enabled catalog
```

**Never** require selecting catalog items. Empty `services[]` / line items always allowed.

**Snapshot shape** (extend current JSONB):

```json
{
  "product_id": "uuid",
  "name": "string",
  "unit_price": 0,
  "qty": 1,
  "is_featured": false
}
```

Today’s PublicRequest snapshot lacks `qty` (always 1 on convert). EventFormLink has qty. **Unified snapshot includes `qty`.**

### D5 — Unified form schema (layered)

**Layer 1 — always collected (validation matrix):**

| Field | Profile CTA | Shared link | Notes |
|-------|-------------|-------------|-------|
| `contact_name` | required | required | EFL had name |
| `contact_email` | required | required* | *or phone required if email empty — see below |
| `contact_phone` | optional | required for `auto_event` | EFL required phone for CRM |
| `event_date` | optional | recommended; required for `auto_event` | |
| `event_type` | optional | optional; required for `auto_event` | |
| `guest_count` | optional | optional; required for `auto_event` | map → `Event.num_people` |
| `location` | optional | optional | |
| `city` | optional | optional | EFL had city |
| `budget` / `currency` | optional | optional | profile-friendly |
| `message` | optional | optional | |
| line items | optional | optional | |

**Contact rule:** at least one of email or phone required on all paths; for `auto_event`, **both name + phone + date + event_type + guest_count ≥ 1** (EFL parity). Profile path keeps email as primary (visitor status page).

**Layer 2 — optional catalog** with progressive disclosure: collapsed on profile (“¿Querés elegir servicios? Opcional”), pre-expandable on link when provider pinned items (future; v1 = same UI, optional selection).

### D6 — Status machine unchanged (reuse)

Keep exact statuses:

```
pending | info_requested | responded | accepted_by_client
| declined_provider | declined_client | booked | expired
```

Same transitions as `PublicRequestService` today.  
`auto_event` lands on `booked` with `event_id` set.  
`auto_quote` lands on `responded` with a `public_responses` row.

### D7 — Hard deprecation / removal (greenfield)

| Artifact | Action |
|----------|--------|
| `public_leads` + `/leads` APIs | Remove in same change (or immediate hard 410). No dual-write needed. |
| `event_form_links` + `/event-forms` + `/public/event-forms` | Replace with `public_request_links` + new routes; drop after cutover. |
| Web `/event-forms`, `/form/:token` | → Solicitudes link manager + `/s/:token` |
| Web `PublicLeadModal` | Rename to request form; already posts `/requests` |
| Mobile EventFormLinks screens | Fold into Requests feature as “Compartir link” |

No long Sunset window required given near-zero usage — still ship OpenAPI removal + one release note.

### D8 — Convert pipeline is the single CRM write path

**Decision:** All Client/Event creation goes through one service method (today’s `ConvertToEvent`, improved):

- Map `contact_phone` → Client.phone  
- Map `guest_count` → Event.num_people  
- Map `city` if present  
- Line items: `qty` + `unit_price` from snapshot  
- Notes: include source (`public_profile` | `shared_link`)  

`auto_event` calls the same method inside the create transaction (or immediately after insert in one TX).

### D9 — Auth & anti-spam

- Profile + link public POSTs: rate-limit IP (reuse 5/min class), honeypot `website`, pending-cap 100/organizer.
- Link: invalid/expired/revoked/max_uses → **410** `link_invalid`.
- `client_token` unchanged for non-booked visitor actions.
- Push: keep `public_request_created` for `standard` and `auto_quote`; for `auto_event` still notify (“Nueva solicitud convertida a evento”) so mobile doesn’t go silent.

### D10 — Plan limits

Today: basic plan **3 active EventFormLinks**.  
**Carry over:** max **3 active** `public_request_links` on free/basic (same gate, new table). Requests themselves stay unlimited subject to pending-cap.

---

## 4. Data model

### 4.1 New: `public_request_links`

```sql
CREATE TABLE public_request_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,              -- 64 hex (256-bit), like EFL
  label TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'used', 'expired', 'revoked')),
  submit_mode TEXT NOT NULL DEFAULT 'auto_event'
    CHECK (submit_mode IN ('standard', 'auto_quote', 'auto_event')),
  max_uses INT CHECK (max_uses IS NULL OR max_uses >= 1),  -- NULL = unlimited; 1 = EFL parity
  use_count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,                 -- NULL = no expiry
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prl_organizer ON public_request_links (organizer_user_id, status);
CREATE INDEX idx_prl_expires ON public_request_links (expires_at)
  WHERE status = 'active' AND expires_at IS NOT NULL;
```

**Usable iff:** `status = 'active'` AND (`expires_at` IS NULL OR `expires_at > now()`) AND (`max_uses` IS NULL OR `use_count < max_uses`).

On successful submit: `use_count++`; if `max_uses` reached → `status = 'used'`.

Job: expire active links past `expires_at` (hourly, like EFL).

### 4.2 Extend: `public_requests`

```sql
ALTER TABLE public_requests
  ADD COLUMN source TEXT NOT NULL DEFAULT 'public_profile'
    CHECK (source IN ('public_profile', 'shared_link')),
  ADD COLUMN link_id UUID REFERENCES public_request_links(id) ON DELETE SET NULL,
  ADD COLUMN submit_mode TEXT NOT NULL DEFAULT 'standard'
    CHECK (submit_mode IN ('standard', 'auto_quote', 'auto_event')),
  ADD COLUMN contact_phone VARCHAR(40),
  ADD COLUMN city TEXT;

-- services JSONB: document qty in app layer; no DB constraint
```

### 4.3 Drop (same release or N+1)

- `DROP TABLE public_leads;`
- After API cutover: `DROP TABLE event_form_links;`

No mandatory backfill from old tables (near-zero usage). Optional one-off script only if ops needs it.

---

## 5. API contract

### 5.1 Public (visitor)

| Method | Path | Role |
|--------|------|------|
| `GET` | `/api/public/request-links/{token}` | Resolve link: branding, catalog (no prices if profile hide prices), `submit_mode`, expiry |
| `POST` | `/api/public/request-links/{token}/requests` | Submit unified form via link |
| `POST` | `/api/public/organizers/{slug}/requests` | Submit via profile (existing; extended body) |
| `POST` | `/api/public/requests/{id}/action` | accept/decline (unchanged) |
| `GET` | `/api/public/requests/{id}` | visitor status (if already exists) |

**Removed:**  
`/api/public/event-forms/*`, `/api/public/organizers/{slug}/leads`, auth `/api/leads*`, `/api/event-forms*`.

### 5.2 Organizer (auth)

| Method | Path | Role |
|--------|------|------|
| `GET/POST` | `/api/organizers/me/request-links` | List / create links |
| `DELETE` or `POST .../revoke` | `/api/organizers/me/request-links/{id}` | Revoke |
| Existing | `/api/organizers/me/requests*` | Inbox, respond, decline, request-info, convert, unread |

Create link body:

```json
{
  "label": "Paquete XV María",
  "ttl_days": 7,
  "max_uses": 1,
  "submit_mode": "auto_event"
}
```

### 5.3 Unified create body (profile + link)

```json
{
  "contact_name": "Ana",
  "contact_email": "ana@example.com",
  "contact_phone": "+52...",
  "event_type": "Boda",
  "event_date": "2026-11-20",
  "location": "...",
  "city": "...",
  "guest_count": 80,
  "budget": 15000,
  "currency": "MXN",
  "message": "...",
  "services": [{ "product_id": "uuid", "qty": 2 }],
  "website": ""
}
```

Server builds snapshot from catalog resolver (never trust client prices).

---

## 6. Service flows

### 6.1 Create from profile

```
resolve organizer by slug
require profile.is_enabled
validate layer-1 (profile matrix)
snapshot = resolve services against public catalog
insert PublicRequest(source=public_profile, submit_mode=standard, status=pending)
push notify
return { id, client_token, status }
```

### 6.2 Create from link

```
load link by token; assert usable else 410
validate layer-1 (matrix depends on link.submit_mode)
catalog = resolveCatalog(shared_link rule)
snapshot services
BEGIN
  insert PublicRequest(source=shared_link, link_id, submit_mode=link.submit_mode, ...)
  switch submit_mode:
    standard → status pending
    auto_quote → insert PublicResponse(sum qty*price, inclusions from names); status responded
    auto_event → ConvertToEventInTx(...); status booked; set event_id
  increment link use_count / maybe mark used
COMMIT
push notify
return { id, client_token?, status, event_id? }
```

### 6.3 Convert (manual)

Unchanged transitions (`responded` | `accepted_by_client` → `booked`), but field mapping fixed (phone, guests, qty).

---

## 7. Web UX

| Route | Purpose |
|-------|---------|
| `/requests` | Single organizer hub: **Inbox** + tab/section **Links** (replaces `/event-forms`) |
| `/u/:slug` | CTA opens shared `RequestForm` modal |
| `/s/:token` | Public link form (replaces `/form/:token`) |
| `/solicitud/:id` | Visitor status (keep) |

**Nav:** remove “Formularios” top-level; “Solicitudes” owns both.  
**i18n:** reuse solicitudes keys; migrate form copy.

Components:

- `RequestForm` (shared) — layers, honeypot, catalog optional  
- `RequestLinksPanel` — create/copy/revoke  
- Keep inbox + detail actions

---

## 8. Mobile (organizer only)

| Platform | Change |
|----------|--------|
| iOS | Fold EventFormLinks into Requests feature; API client for request-links; deep link unchanged `solennix://requests/{id}` |
| Android | Same; channel `solennix_solicitudes` stays |

Visitor forms remain **web-only**.

---

## 9. Jobs

| Job | Cadence |
|-----|---------|
| Expire stale **requests** (14d non-terminal) | daily (existing) |
| Expire stale **links** | hourly (port EFL job) |

---

## 10. Implementation phases (suggested work units)

| Phase | Scope | Approx risk |
|-------|--------|-------------|
| **P0** | Migration + models + catalog resolver + create profile/link + auto_event | Backend core |
| **P1** | auto_quote + respond/convert field fixes + OpenAPI + drop leads | Backend |
| **P2** | Web: RequestForm, `/s/:token`, inbox+links hub, remove old routes | Web |
| **P3** | iOS + Android organizer parity | Mobile |
| **P4** | Delete EFL handlers/tables, docs, dead services | Cleanup |

Prefer **chained PRs** per phase (backend → web → mobile → cleanup). Delivery strategy: stacked or feature-branch-chain when applying.

---

## 11. Testing contract

- Unit: catalog resolver (profile on/off, invalid product ids), status transitions, link usable matrix, submit_mode branches.
- Handler: 410 link, 404 profile disabled on CTA, 201 auto_event creates event_id, empty services OK.
- Integration: convert maps phone + guest_count + qty.
- Web: form validation matrices; link manager plan limit.
- No requirement to migrate old EFL rows in tests.

---

## 12. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| `auto_quote` price sum is naive | Snapshot server prices only; organizer can still send a new response later (allow re-respond? **v1:** one response like today; if need adjust, decline+new request or extend later) |
| Profile OFF + link uses full catalog exposes internal SKUs | Intended by product; document in UI (“Tu perfil público está apagado: el link muestra todo el catálogo activo”) |
| Breaking external bookmarks `/form/:token` | Temporary redirect `/form/:token` → 410 with message, or rewrite if we migrate tokens (skip if no usage) |
| Scope creep into full Quote entity | Explicit non-goal; stay Event `quoted` |

---

## 13. Open points (non-blocking for implement)

1. **Default `submit_mode` for new links:** design recommends `auto_event` (EFL muscle memory). Confirm at apply time if product prefers `standard` default + checkbox.
2. **Unlimited multi-use links:** supported (`max_uses` NULL); free plan still caps **active link count**, not uses.
3. **Pre-selected services on link create:** nice-to-have v2 (pin package on link); not required for unification MVP.

---

## 14. What this design deliberately does NOT do

- Does not keep dual write to `event_form_links`.
- Does not require clients to “know what they want” (catalog optional).
- Does not build native visitor funnel on mobile.
- Does not introduce a separate `Quote` aggregate.

---

## 15. Traceability to locked product decisions

| Decision | Design section |
|----------|----------------|
| One system, two doors | §1, §5 |
| Same layered form | §3 D5, §7 |
| Link auto_quote / auto_event | §3 D3, §6.2 |
| Catalog profile ON/OFF rules | §3 D4 |
| Catalog never mandatory | §3 D4–D5 |
| Kill Formularios + Leads as products | §3 D7, §10 P4 |
