# Measurement and attribution

## North-star definition

**Activated organizer:** a newly registered organizer who creates their first event within 7 days of registration.

This is the primary campaign outcome. Raw signup is an intermediate event.

## Verified current capability

The current Solennix registration funnel records:

- `register_view`
- `registered`
- `email_verified`
- `first_login`

Admin reporting exposes 30-day counts and registration method. Marketing page views also derive source from referrer, `src`, or `utm_source`.

The current evidence does **not** establish durable campaign attribution through `first_event_created`. Paid media remains blocked until this gap is closed or an equally reliable first-party alternative is proven.

## P0 instrumentation specification

| Event | Trigger | Required properties | Trust boundary |
| --- | --- | --- | --- |
| `campaign_landing_view` | Campaign landing loads | anonymous_id, source, medium, campaign, content, landing_path, device, country | Server validated |
| `register_view` | Register screen loads | anonymous_id, attribution_id | Existing; extend attribution |
| `registered` | Account created | user_id, method, attribution_id | Server only |
| `email_verified` | Verification succeeds | user_id, attribution_id | Server only |
| `first_login` | First authenticated session | user_id, platform, attribution_id | Server only |
| `first_event_created` | User creates first event | user_id, platform, hours_since_registration, attribution_id | Server only; idempotent |
| `activated_7d` | First event occurred within 7 days | user_id, attribution_id | Derived server-side |

### Attribution requirements

- Store campaign parameters in a first-party attribution record with consent-aware retention.
- Link anonymous visit to user only at successful registration.
- Preserve first-touch and last-non-direct touch separately.
- Do not put email, phone, name, or other PII in URLs, pixels, or ad-platform custom parameters.
- Deduplicate browser and server events before using them as optimization conversions.
- Verify web, iOS, and Android paths independently.

## UTM naming convention

Use lowercase ASCII and underscores. Do not improvise names during publishing.

| Parameter | Convention | Examples |
| --- | --- | --- |
| `utm_source` | platform | `instagram`, `facebook`, `tiktok`, `youtube`, `linkedin`, `pinterest`, `whatsapp`, `threads`, `x` |
| `utm_medium` | distribution type | `organic_social`, `paid_social`, `video`, `community`, `creator`, `referral`, `email` |
| `utm_campaign` | stable campaign | `acq26_tu_talento_crea` |
| `utm_content` | asset and variant | `v01_manifesto_hook7lugares`, `c02_chaos_carousel`, `v03_quote_demo` |
| `utm_term` | optional audience/test | `wedding_planners_mx`, `catering_mx` |
| `utm_id` | platform-independent campaign ID | `acq26` |

Example:

`https://solennix.com/register?utm_id=acq26&utm_source=instagram&utm_medium=organic_social&utm_campaign=acq26_tu_talento_crea&utm_content=v01_manifesto`

## Link registry

Maintain [templates/link-registry.csv](templates/link-registry.csv). One asset may have multiple platform URLs, but every URL must map back to one stable asset ID.

## Funnel dashboard

| Metric | Formula | Use |
| --- | --- | --- |
| Landing → register view | register views / qualified landing visitors | Message-to-destination alignment |
| Register completion | registered / register views | Registration friction |
| Verification rate | verified / registered | Email and trust friction |
| First-login rate | first login / verified | Return/login friction |
| Activation rate | activated 7d / registered | Campaign and onboarding quality |
| CPAU | spend / activated 7d | Paid acquisition efficiency |
| 30-day retained activation | active organizers at day 30 / activated 7d | Quality guardrail |

## Baseline and targets

No absolute target is invented. Establish a 14-day pre-paid baseline from current production data and record:

- New registrations by day and platform
- Verification and first-login rates
- First-event activation rate
- Country/device mix
- Organic source mix
- 7/30-day active-organizer rate

After the baseline, set:

- 30-day activated-user target
- Maximum approved CPAU
- Minimum activation rate by source
- Retention guardrail

## Weekly scorecard

| Area | Metric | Result | Previous | Decision | Owner |
| --- | --- | --- | --- | --- | --- |
| Acquisition | Activated organizers | | | | |
| Efficiency | CPAU | | | | |
| Funnel | Register completion | | | | |
| Activation | First event within 7d | | | | |
| Quality | 30-day retained activation | | | | |
| Creative | Best asset IDs | | | | |
| Safety | Complaints/policy/consent issues | | | | |

## Data QA

- Reconcile ad-platform clicks, landing sessions, server funnel events, and user/event records.
- Verify UTMs survive redirects and registration.
- Test Google/Apple/email registration separately.
- Exclude internal/team traffic from performance reads.
- Monitor duplicate events and bot traffic.
- Record timezone and cohort windows explicitly.
- Do not publish “results” until data definitions and sample sizes are defensible.
