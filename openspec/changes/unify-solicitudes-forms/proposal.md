# Proposal: Unify Formularios + Solicitudes

> Product name: **Solicitudes** · One domain, two entry points

## Intent

Merge **EventFormLink** (shared form links) and **PublicRequest** (public-profile inbound) into a **single** quote-request system. Kill **PublicLead** fully. Greenfield-friendly: almost no production usage of either funnel.

## Why

- Same user job: visitor asks for a budget with event intent data.
- Two UIs and two backends create product confusion and code duplication.
- EventFormLink is stronger at “ready-to-event”; PublicRequest is stronger at negotiation + inbox + marketplace inbound.
- Long-term correctness > preserving two parallel products.

## Product decisions (locked)

1. **One system**, two doors: public profile CTA + provider-shared link.
2. **Same layered form**: always min contact/event fields; catalog optional.
3. **Link submit mode**: flag(s) for auto-quote / auto-event (recover EventFormLink productivity).
4. **Catalog rules**:
   - Public profile **enabled** → only public-profile catalog (`is_active` + `show_on_public_profile`).
   - Public profile **disabled** → no profile CTA; only provider links; full enabled catalog (`is_active` products).
5. Catalog **never mandatory**.
6. Evolve **PublicRequest** as the canonical domain; retire EventFormLink + PublicLead as products.

## Scope

| In | Out (later / non-goals) |
|----|-------------------------|
| Domain model + migrations | Native visitor forms on iOS/Android (stay web) |
| Backend API unification | Full Quote entity (still Event status=quoted) |
| Web: one form, one inbox, link manager | Captcha beyond honeypot/rate-limit |
| Mobile: one organizer surface (inbox + links) | Marketplace escrow / payments |
| Deprecate/remove leads + event-forms APIs | Data migration of historical leads (optional drop) |

## Approach (summary)

- Canonical entity: **PublicRequest** (product UI: Solicitudes).
- New side entity: **PublicRequestLink** (replaces EventFormLink) — token, TTL, uses, `submit_mode`.
- Profile CTA and link submit both create PublicRequest with `source`.
- Shared form schema + shared convert-to-event pipeline.
- Phased delivery: backend contract → web visitor/provider → mobile organizer → delete dead code.

## Success criteria

- Provider has **one** inbox and **one** “share link” action under Solicitudes.
- Visitor sees **one** form on `/u/:slug` and `/s/:token` (or equivalent).
- Link with `auto_event` recreates today’s EventFormLink outcome (Client + Event quoted + products).
- No separate Formularios or Leads product surfaces.
- Cross-platform parity for domain/API (web + iOS + Android organizer).
