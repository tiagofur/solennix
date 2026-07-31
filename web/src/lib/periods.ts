import { format, startOfMonth, endOfMonth } from "date-fns";

/**
 * Period range helpers shared by the Events list filters.
 *
 * Lifted verbatim from `EventList.tsx` (ADR: pure utilities live in lib/, not
 * page components). These are TZ-naive — they operate on YYYY-MM-DD strings so
 * the result round-trips cleanly through the URL query string
 * (`?from=...&to=...`) without a local-midnight seam.
 */

export type Period = "today" | "week" | "month";
export type ActivePeriod = "all" | Period | "custom";

export interface PeriodRange {
  from: string;
  to: string;
}

/**
 * Resolve a named period ("today" | "week" | "month") to a `{ from, to }`
 * range of YYYY-MM-DD strings anchored on the current date.
 *
 * - "week" follows the Monday–Sunday convention (Sunday `getDay() === 0`
 *   rolls back to the previous Monday).
 * - Returns empty strings for unknown periods so callers can no-op safely.
 */
export const getPeriodRange = (period: Period): PeriodRange => {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  if (period === "today") return { from: todayStr, to: todayStr };

  if (period === "week") {
    const day = today.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      from: format(monday, "yyyy-MM-dd"),
      to: format(sunday, "yyyy-MM-dd"),
    };
  }

  if (period === "month") {
    return {
      from: format(startOfMonth(today), "yyyy-MM-dd"),
      to: format(endOfMonth(today), "yyyy-MM-dd"),
    };
  }

  return { from: "", to: "" };
};

/**
 * Inverse of `getPeriodRange`: given the active `from`/`to` URL params, return
 * the matching named period or "custom"/"all".
 *
 * - "all" when both are empty.
 * - "custom" when set but not matching today/this-week/this-month.
 */
export const getActivePeriod = (from: string, to: string): ActivePeriod => {
  if (!from && !to) return "all";
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  if (from === todayStr && to === todayStr) return "today";

  const day = today.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  if (from === format(monday, "yyyy-MM-dd") && to === format(sunday, "yyyy-MM-dd")) return "week";

  if (from === format(startOfMonth(today), "yyyy-MM-dd") && to === format(endOfMonth(today), "yyyy-MM-dd")) return "month";

  return "custom";
};
