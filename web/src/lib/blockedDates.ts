import { format } from "date-fns";
import { parseLocalDate } from "./dateUtils";

/**
 * Structural shape consumed by `buildBlockedDateList`. Only the ISO date bounds
 * matter to the picker math — intentionally narrow (no index signature) so any
 * of the project's `UnavailableDate` variants (api.ts, unavailableDatesService,
 * EventGeneralInfo) is assignable here via TypeScript structural typing.
 */
export interface UnavailableDateRange {
  start_date: string;
  end_date: string;
}

/**
 * Expand a list of unavailable-date ranges into a flat, de-duplicated,
 * ordered list of LOCAL-midnight `Date`s — one per blocked calendar day.
 *
 * Verbatim from the previous inline implementation in `EventList.tsx`
 * (behavior-neutral extraction, REQ-11): walks each range day-by-day using a
 * DST-safe local `setDate(+1)` step, dedupes by the `yyyy-MM-dd` key, and
 * preserves insertion order. The returned list feeds react-day-picker's
 * `disabled` matcher, the `unavailable` modifier, and the auto-skip stepper.
 */
export function buildBlockedDateList(
  unavailableDates: readonly UnavailableDateRange[],
): Date[] {
  const seen = new Set<string>();
  const list: Date[] = [];
  for (const d of unavailableDates) {
    const current = parseLocalDate(d.start_date);
    const end = parseLocalDate(d.end_date);
    while (current <= end) {
      const key = format(current, "yyyy-MM-dd");
      if (!seen.has(key)) {
        seen.add(key);
        list.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }
  }
  return list;
}

/**
 * Whether a given calendar day is blocked, by `yyyy-MM-dd` set membership over
 * a pre-built blocked list. Uses the same LOCAL-midnight parse/format seam as
 * the picker so disable-select and the save guard agree (REQ-6).
 */
export function isDateBlocked(date: Date, blockedDateList: readonly Date[]): boolean {
  const key = format(date, "yyyy-MM-dd");
  return blockedDateList.some((d) => format(d, "yyyy-MM-dd") === key);
}

/**
 * Pure, TZ-pinned-by-input auto-skip helper (REQ-3).
 *
 * Given a LOCAL `yyyy-MM-dd` `today` and a blocked list, advance day-by-day
 * using a DST-safe local `setDate(+1)` step until a free day is found, capped
 * at 365 iterations. Returns the advanced `yyyy-MM-dd`, or the original
 * `today` on cap-exhaust (the save guard backstops it, REQ-7).
 *
 * Extracted from the create-only effect in `EventForm.tsx` so the day-stepping
 * math is unit-testable with explicit inputs (Node caches the timezone at
 * startup, so pinned-TZ behavior is verified by passing the LOCAL `today`
 * string directly rather than by controlling the host clock).
 */
export function advancePastBlockedDate(
  today: string,
  blockedDateList: readonly Date[],
): string {
  const blocked = new Set(blockedDateList.map((d) => format(d, "yyyy-MM-dd")));
  const cursor = parseLocalDate(today);
  const cap = 365;
  let steps = 0;
  while (blocked.has(format(cursor, "yyyy-MM-dd")) && steps < cap) {
    cursor.setDate(cursor.getDate() + 1);
    steps += 1;
  }
  // cap-exhaust -> keep original date; save guard backstops (REQ-3, REQ-7)
  if (blocked.has(format(cursor, "yyyy-MM-dd"))) {
    return today;
  }
  return format(cursor, "yyyy-MM-dd");
}
