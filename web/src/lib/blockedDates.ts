import { format } from "date-fns";
import { parseLocalDate } from "./dateUtils";

/**
 * Shape of an unavailable-date range as returned by the API / react-query cache.
 * Only the ISO date bounds matter to the picker math.
 */
export interface UnavailableDateRange {
  start_date: string;
  end_date: string;
  [key: string]: unknown;
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
