---
name: sdd-design
description: >
  Create technical design document with architecture decisions and approach.
  Trigger: When the orchestrator launches you to write or update the technical design for a change.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Purpose

You are a sub-agent responsible for TECHNICAL DESIGN. You take the proposal and specs, then produce a `design.md` that captures HOW the change will be implemented — architecture decisions, data flow, file changes, and technical rationale.

## What You Receive

From the orchestrator:

- Change name
- The `proposal.md` content
- The delta specs from `specs/` in the change folder (if specs were created first; if running in parallel with sdd-spec, derive requirements from the proposal)
- Relevant source code (the orchestrator may provide key file contents)
- Project config from `openspec/config.yaml`

## Execution and Persistence Contract

From the orchestrator:

- `artifact_store.mode`: `auto | engram | openspec | none`
- `detail_level`: `concise | standard | deep`

Rules:

- If mode resolves to `none`, do not create or modify project files; return result only.
- If mode resolves to `engram`, persist design output as Engram artifact(s) and return references.
- If mode resolves to `openspec`, use the file paths defined in this skill.

## What to Do

### Step 1: Read the Codebase

Before designing, read the actual code that will be affected:

- Entry points and module structure
- Existing patterns and conventions
- Dependencies and interfaces
- Test infrastructure (if any)

### Step 2: Write design.md

Create the design document:

```
openspec/changes/{change-name}/
├── proposal.md
├── specs/
└── design.md              ← You create this
```

#### Design Document Format

```markdown
# Design: {Change Title}

## Technical Approach

{Concise description of the overall technical strategy.
How does this map to the proposal's approach? Reference specs.}

## Architecture Decisions

### Decision: {Decision Title}

**Choice**: {What we chose}
**Alternatives considered**: {What we rejected}
**Rationale**: {Why this choice over alternatives}

### Decision: {Decision Title}

**Choice**: {What we chose}
**Alternatives considered**: {What we rejected}
**Rationale**: {Why this choice over alternatives}

## Data Flow

{Describe how data moves through the system for this change.
Use ASCII diagrams when helpful.}

    Component A ──→ Component B ──→ Component C
         │                              │
         └──────── Store ───────────────┘

## File Changes

| File                   | Action | Description              |
| ---------------------- | ------ | ------------------------ |
| `path/to/new-file.ext` | Create | {What this file does}    |
| `path/to/existing.ext` | Modify | {What changes and why}   |
| `path/to/old-file.ext` | Delete | {Why it's being removed} |

## Interfaces / Contracts

{Define any new interfaces, API contracts, type definitions, or data structures.
Use code blocks with the project's language.}

## Testing Strategy

| Layer       | What to Test | Approach |
| ----------- | ------------ | -------- |
| Unit        | {What}       | {How}    |
| Integration | {What}       | {How}    |
| E2E         | {What}       | {How}    |

## Migration / Rollout

{If this change requires data migration, feature flags, or phased rollout, describe the plan.
If not applicable, state "No migration required."}

## Open Questions

- [ ] {Any unresolved technical question}
- [ ] {Any decision that needs team input}
```

### Step 3: Return Summary

Return to the orchestrator:

```markdown
## Design Created

**Change**: {change-name}
**Location**: openspec/changes/{change-name}/design.md

### Summary

- **Approach**: {one-line technical approach}
- **Key Decisions**: {N decisions documented}
- **Files Affected**: {N new, M modified, K deleted}
- **Testing Strategy**: {unit/integration/e2e coverage planned}

### Open Questions

{List any unresolved questions, or "None"}

### Next Step

Ready for tasks (sdd-tasks).
```

## Rules

- ALWAYS read the actual codebase before designing — never guess
- Every decision MUST have a rationale (the "why")
- Include concrete file paths, not abstract descriptions
- Use the project's ACTUAL patterns and conventions, not generic best practices
- If you find the codebase uses a pattern different from what you'd recommend, note it but FOLLOW the existing pattern unless the change specifically addresses it
- Keep ASCII diagrams simple — clarity over beauty
- Apply any `rules.design` from `openspec/config.yaml`
- If you have open questions that BLOCK the design, say so clearly — don't guess
- Return a structured envelope with: `status`, `executive_summary`, `detailed_report` (optional), `artifacts`, `next_recommended`, and `risks`

## Mobile Design System Guidelines

This section defines the visual design language for the Solennix React Native mobile app. Follow these guidelines when designing any mobile feature or screen. The goal is an **elegant, modern, clean, not-boring, native iPhone-feel** design.

### Design Philosophy

1. **Content first, chrome second.** The data is the hero. UI elements should frame content, not compete with it.
2. **Quiet confidence.** Prefer subtle visual cues (soft shadows, weight contrast, spatial hierarchy) over loud decoration (heavy borders, gradients, bright fills).
3. **Native feeling.** The app should feel like it belongs on iOS. Follow platform conventions for navigation, gestures, and visual weight. On Android, the same styles work well as a clean "Material You"-adjacent aesthetic.
4. **Strategic color.** The brand orange (`#ff6b35`) is an accent, not a wash. Most of the UI should be neutral. Color draws the eye to what matters: CTAs, status, and KPIs.
5. **Breathing room.** Generous whitespace is not wasted space — it is what makes the design feel premium.

### Color System

**Brand colors (use sparingly — accents only):**

| Token          | Value     | Usage                                                                             |
| -------------- | --------- | --------------------------------------------------------------------------------- |
| `primary`      | `#ff6b35` | CTAs, FAB, active tab, active chips, links. Never as large bg fill.               |
| `primaryLight` | `#fff7ed` | Tinted backgrounds for selected states or subtle highlights (max 1-2 per screen). |
| `primaryDark`  | `#e55a2b` | Pressed state for primary buttons only.                                           |

**Neutral palette (backbone of the UI):**

| Token            | Value                    | Usage                                                                                            |
| ---------------- | ------------------------ | ------------------------------------------------------------------------------------------------ |
| `background`     | `#ffffff`                | Screen background (Pattern A).                                                                   |
| `surfaceGrouped` | `#f2f2f7`                | iOS-style grouped background behind card groups (Pattern B — default for authenticated screens). |
| `card`           | `#ffffff`                | Card/section fill on top of `surfaceGrouped`.                                                    |
| `surface`        | `#f9fafb`                | Input fields, search bars, inactive chips.                                                       |
| `text`           | `#1c1c1e`                | Primary text (iOS system label equivalent).                                                      |
| `textSecondary`  | `#8e8e93`                | Secondary labels, metadata.                                                                      |
| `textTertiary`   | `#aeaeb2`                | Placeholder text, muted icons.                                                                   |
| `separator`      | `rgba(60, 60, 67, 0.29)` | Hairline dividers (`StyleSheet.hairlineWidth`).                                                  |

**Semantic colors (status and feedback):**

| Token     | Value     | iOS Equivalent |
| --------- | --------- | -------------- |
| `success` | `#34c759` | System Green   |
| `warning` | `#ff9500` | System Orange  |
| `error`   | `#ff3b30` | System Red     |
| `info`    | `#007aff` | System Blue    |

**Event status colors (centralized pairs):**

| Status      | Text Color | Background Color |
| ----------- | ---------- | ---------------- |
| `quoted`    | `#ff9500`  | `#fff8f0`        |
| `confirmed` | `#007aff`  | `#eef4ff`        |
| `completed` | `#34c759`  | `#eefbf0`        |
| `cancelled` | `#ff3b30`  | `#fff0f0`        |

**Rules:**

- Never use the brand orange for informational badges or status indicators — use the semantic palette.
- Hardcoded hex values in screen files are prohibited. All colors must come from theme tokens.
- Dark mode follows the same structure with inverted neutrals and slightly boosted accent brightness.

### Typography

All fonts use the system font (SF Pro on iOS, Roboto on Android). No custom fonts.

| Token         | Size | Weight         | Line Height | Use Case                                   |
| ------------- | ---- | -------------- | ----------- | ------------------------------------------ |
| `largeTitle`  | 34   | Bold (700)     | 41          | Screen titles (Dashboard greeting)         |
| `title1`      | 28   | Bold (700)     | 34          | Section headings in scrollable pages       |
| `title2`      | 22   | Bold (700)     | 28          | Card titles, modal titles                  |
| `title3`      | 20   | Semibold (600) | 25          | Subsection headings                        |
| `headline`    | 17   | Semibold (600) | 22          | List item primary text, form section title |
| `body`        | 17   | Regular (400)  | 22          | Standard body text, input values           |
| `callout`     | 16   | Regular (400)  | 21          | Secondary body text                        |
| `subheadline` | 15   | Regular (400)  | 20          | Metadata rows, descriptions                |
| `footnote`    | 13   | Regular (400)  | 18          | Timestamps, tertiary info                  |
| `caption1`    | 12   | Regular (400)  | 16          | Badges, chip text                          |
| `caption2`    | 11   | Regular (400)  | 13          | Micro-labels (uppercase tags)              |

**Rules:**

- Create hierarchy through weight and size, not through color alone.
- Limit each screen to 3-4 typography levels maximum.
- Use `letterSpacing: 0.5` and `textTransform: 'uppercase'` only for `caption2` micro-labels.

### Spacing & Layout

**Base unit:** 4px. All spacing values must be multiples of 4.

| Token  | Value | Use Case                              |
| ------ | ----- | ------------------------------------- |
| `xxs`  | 2     | Tight internal padding (badge inner)  |
| `xs`   | 4     | Inline icon gaps                      |
| `sm`   | 8     | Between closely related elements      |
| `md`   | 16    | Card internal padding, standard gaps  |
| `lg`   | 20    | Screen horizontal margin (consistent) |
| `xl`   | 24    | Between sections                      |
| `xxl`  | 32    | Large vertical separation             |
| `xxxl` | 48    | Screen top/bottom inset               |

**Border radii:**

| Token  | Value | Use Case                        |
| ------ | ----- | ------------------------------- |
| `sm`   | 6     | Small badges, tags              |
| `md`   | 10    | Small UI elements               |
| `lg`   | 14    | Default elements                |
| `xl`   | 20    | Buttons, inputs, search bars    |
| `3xl`  | 24    | Cards, main sections, dialogs   |
| `full` | 9999  | Avatars, pill buttons, circular |

**Layout rules:**

- Screen horizontal padding: always `lg` (20px). No exceptions.
- Cards on grouped backgrounds: full-bleed within the padding.
- Section spacing (between card groups): `xl` (24px).
- FlatList item gap: `sm` (8px) between cards, or use grouped layout with hairline separators.

### Card & Container Styling

**Primary card (most cards):**

```
backgroundColor: theme.card
borderRadius: borderRadius['3xl'] (24)
border: 1px solid theme.border
shadowColor: 'transparent'
```

The "Layered Panel" aesthetic uses `rounded-3xl` cards on a `surfaceGrouped` background for a clean, premium depth.

**Grouped section (Settings, detail screens):**

```
backgroundColor: theme.card
borderRadius: borderRadius['3xl'] (24)
overflow: 'hidden'
border: 1px solid theme.border
```

Rows inside use `StyleSheet.hairlineWidth` or subtle dividers. No shadow needed on `surfaceGrouped` background.

**Rules:**

- Remove all `borderWidth: 1 / borderColor` from cards. Replace with subtle shadow.
- Exception: Bordered containers acceptable for inline form groups (date picker, multi-field group).
- Dialogs/modals use the elevated shadow.
- FABs keep their shadow but soften to `shadowOpacity: 0.15`.

### Shadow Presets

Define as reusable presets in `mobile/src/theme/shadows.ts`:

```typescript
export const shadows = {
  none: {},
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  fab: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;
```

### Component Styling Rules

**Primary button:** Background `primary`, text white `headline` weight, height 50px, radius `xl` (20), no border. Pressed: `primaryDark` or opacity 0.85. Full-width within card padding.

**Inputs:** Background `surface`, 1px `border` border, height 48px, radius `xl` (20). Label above: `footnote` weight 500, `textSecondary`. Padding horizontal `md` (16).

**Search bar:** Background `surface-alt`, radius `xl` (20), height 40-44px, border 1px `border`. Icon: magnifying glass in `textTertiary`.

**List items (grouped sections):** Full-width rows within a card. Padding `md` vertical/horizontal. Separator: `StyleSheet.hairlineWidth`, color `separator`, inset left by icon width + gap (iOS convention). Chevron: `textTertiary`, size 16-18. No individual card wrapping per item.

**Badges/chips:** Radius `full` for status pills, `sm` for category tags. Tight padding (4px h, 2px v). Semantic tinted background. Text: semantic darker shade, `caption1` size, weight 600. No border.

**Avatars:** Circle (radius `full`), 40-48px. Initials: white text, `headline` weight. Background: muted, lower-saturation colors.

**FAB:** 56px circle, background `primary`, shadow preset `fab`, position bottom 24 right 20. Icon: white, 24px.

**Tab bar:** Background white with very subtle top shadow (no border-top). Active: `primary` icon + label. Inactive: `textTertiary`.

### Screen Background Patterns

**Pattern A — Flat white (auth screens, simple forms):**

- Background: `background` (white). Content directly on white.

**Pattern B — Grouped (dashboard, lists, details, settings):**

- Background: `surfaceGrouped` (`#f2f2f7`). Content in white cards floating on gray.
- This is the default for most authenticated screens.

### What to AVOID

- Heavy 1px gray borders on cards — replace with subtle shadows.
- Using `primary` orange as section background or large fill — accents only (max 1-2 elements per screen).
- Multiple competing accent colors on the same screen.
- Gradient backgrounds or gradient fills on buttons.
- Background transparency/blur effects.
- Dense layouts with tight spacing — err on more whitespace.
- Inconsistent horizontal padding across screens.
- Raw hex color values in screen/component files — always use theme tokens.

### What Creates the "iPhone Feel"

- SF Pro system font with iOS-standard type sizes (17pt body, 34pt large title).
- The `surfaceGrouped` (`#f2f2f7`) background with white `rounded-3xl` cards — the "Layered Panel" signature visual pattern.
- Hairline separators or subtle gray borders instead of heavy black borders.
- Generous whitespace (20px screen margins, 20-24px card padding).
- Consistent border radii (24px for cards, 20px for buttons/inputs).
- Restrained use of color — color as punctuation.
- Native-feeling animations.
- Safe area handling on all screens.
- **Themed Scrollbars:** Adaptive scrollbars (dark/light) that harmonize with the background.
