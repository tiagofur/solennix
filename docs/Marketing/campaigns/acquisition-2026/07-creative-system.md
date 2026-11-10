---
verified: 2026-10-26
---

# Creative production system

## Visual idea

Show the contrast between the elegant outcome and the fragmented operation behind it—then make Solennix the calm, precise system that connects the details.

The visual system is premium but practical: navy depth, cream space, restrained gold, real product screens, tight typography, and one focal message.

## Master formats

| Master | Pixels | Primary use |
| --- | ---: | --- |
| Vertical video/story | 1080×1920 | Reels, Stories, TikTok, Shorts, vertical X |
| Portrait feed | 1080×1350 | Instagram, Facebook, LinkedIn |
| Square | 1080×1080 | Universal fallback, carousels |
| Pinterest | 1000×1500 | Standard Pins |
| Landscape | 1280×720 | YouTube thumbnails, video covers, X/LinkedIn landscape |

Platform UI changes over time. Re-check official specs before paid uploads; current sources are listed in [12-research-sources.md](12-research-sources.md).

## Brand application

| Element | Rule |
| --- | --- |
| Navy | Primary campaign background `#1B2A4A`; deep background `#0F1A2E` |
| Gold | Accent only: `#C4A265` / `#D4B87A`; never a full solid background |
| Cream | Primary light text/background: `#F5F0E8` |
| Typography | Cinzel or Playfair Display for restrained display titles; Inter/system sans for body and captions |
| Logo | Use approved SVG/PNG. Preserve proportions and clear space |
| Product screens | Use verified final screenshots; never fabricate UI or imply unavailable parity |
| Photography | Real event professionals and operational details; avoid generic luxury stock clichés |

## Creative families

| ID | Family | Message | Visual structure |
| --- | --- | --- | --- |
| C1 | Campaign platform | Tu talento crea. Solennix organiza. | Event atmosphere + real app screen + signature |
| C2 | Fragmentation diagnostic | ¿En cuántos lugares vive tu evento? | WhatsApp/Excel/notes/calendar fragments resolving into one event screen |
| C3 | Product proof | Un evento. Una sola versión. | Large device/product screen with 3–4 connected proof points |
| C4 | Segment workflow | Built for [catering/planners/decorators/etc.] | Relevant operational objects + segment-specific screen |
| C5 | Activation | No migres todo. Empieza con un evento. | 3-step setup sequence and CTA |

## Static copy limits

- One headline, ideally 3–8 words.
- One support line, maximum 16 words.
- One CTA, maximum 5 words.
- Do not place a paragraph inside an image.
- Put context in the caption and accessibility alt text.

## Motion language

- Quick cuts for fragmented tools; calmer transitions once Solennix appears.
- Screen recordings use deliberate zoom and pointer emphasis, not frantic motion.
- Captions remain on screen long enough to read.
- Respect reduced-motion variants for web embeds.
- Avoid decorative glassmorphism or neon SaaS gradients.

## Shot list

Capture in vertical and horizontal framing:

1. Organizer reviewing a laptop before an event.
2. Hands moving between phone, notebook, and spreadsheet.
3. Event setup details: tables, lighting, floral pieces, catering prep.
4. Staff briefing around a clear run-of-show.
5. Product screen recordings: first event, client, quote, inventory, staff, checklist, payment tracking.
6. Desktop-to-mobile handoff.
7. Clean device closeups with no client PII.

## Screenshot safety

- Use demo data only; no real customer names, emails, phone numbers, financial data, addresses, or tokens.
- Verify the displayed feature is currently shipped on that platform.
- Do not crop away context in a way that changes product meaning.
- Keep text readable at the final platform size.

## Accessibility deliverables

Every asset packet includes:

- Captioned master
- Clean master for platform captions
- Transcript
- Alt text
- High-contrast thumbnail
- Audio-rights note
- Consent/release record for any identifiable person

## Creative QA checklist

- [ ] One audience, one problem, one CTA
- [ ] Claim verified against current product sources
- [ ] Correct logo, colors, and clear space
- [ ] Product screen uses demo data and current UI
- [ ] Text inside safe zone and readable on mobile
- [ ] Captions and alt text included
- [ ] Audio and talent rights documented
- [ ] UTM destination assigned
- [ ] Variant ID matches measurement plan

## Generated starter kit

`creative-kit/render.mjs` generates reproducible PNG masters under `out/`. Treat these as launch starters and A/B test controls, not as permanent winners. The rendering code preserves exact text, logo, and product screenshots so the campaign does not depend on unreliable text generation inside images.
