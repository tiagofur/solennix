import { startOfDay, format } from "date-fns";

// ============================================================================
// TZ SEAM — Web ADR-1 (single local-midnight seam for the picker; the LOCAL-noon
// `parseEventDate` is confined to the save-guard compare only). NEVER mix the two
// helpers for the same concern; REQ-6 (`helpersAgree.test.ts`) pins that they
// agree on the calendar day so disable-select and the save guard stay in sync.
// ============================================================================

/**
 * Parse a YYYY-MM-DD date string as a LOCAL-midnight Date.
 *
 * Used by ALL picker-side date math (react-day-picker `disabled` /
 * `modifiers`, the blocked-date list builder, and the auto-skip stepping):
 * it matches the existing reference consumer (`EventList.tsx`) so the form
 * picker stays visually + behaviorally identical to `/events?view=calendar`.
 *
 * `new Date(y, m - 1, d)` already constructs a LOCAL-midnight instant; wrapping
 * it in `startOfDay` is a belt-and-suspenders normalization for DST edge cases
 * (it clears any sub-day drift so comparisons and set-membership keys are stable).
 */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return startOfDay(new Date(y, m - 1, d));
}

/**
 * Parse a YYYY-MM-DD date string into a Date that represents the correct
 * calendar day regardless of the user's timezone.
 *
 * LOCAL-noon parse per ES2016: a date-time string WITHOUT a "Z" suffix is
 * parsed as LOCAL time, so "...T12:00:00" is LOCAL noon -> zero offset
 * conversion -> the correct local calendar day in EVERY timezone (verified
 * from UTC+14 .. UTC-12). DO NOT append "Z" — that reverts to UTC-noon and
 * breaks the save-guard compare in UTC+13/+14.
 *
 * Confined to the save-guard compare seam (`EventForm.tsx` onSubmit). The
 * broader picker math uses `parseLocalDate` (local-midnight) instead.
 */
export function parseEventDate(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00`);
}

/**
 * Format a Date as a LOCAL `yyyy-MM-dd` string.
 *
 * Replaces the pre-existing UTC-today bug
 * (`new Date().toISOString().split("T")[0]`, which emits the UTC day and drifts
 * one day on devices behind/ahead of UTC near midnight). Used for the new-event
 * default date so REQ-5 (TZ-safe default) holds.
 */
export function localToday(date: Date = new Date()): string {
  return format(date, "yyyy-MM-dd");
}
