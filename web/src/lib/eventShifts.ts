// Pure helpers for mapping staff shift times between the backend's ISO8601 UTC
// representation and the local HH:mm strings used by <input type="time">.
// Extracted from EventForm.tsx so they can be unit-tested and reused.

// Convert an ISO8601 UTC string (e.g. the backend's shift_start) to the
// browser-local HH:mm representation used by <input type="time">. Returns
// null when the input is empty/invalid so the field stays cleared.
export const isoToLocalHHmm = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

// Combine a YYYY-MM-DD event date with a HH:mm local time into an ISO8601
// UTC string. `dayOffset` shifts the day by N (used for overnight shifts).
// Returns null when either piece is missing.
export const hhmmToUtcIso = (
  eventDate: string | null | undefined,
  hhmm: string | null,
  dayOffset = 0,
): string | null => {
  if (!eventDate || !hhmm) return null;
  const [h, m] = hhmm.split(":").map((n) => Number(n));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const [y, mo, d] = eventDate.split("-").map((n) => Number(n));
  if (Number.isNaN(y) || Number.isNaN(mo) || Number.isNaN(d)) return null;
  const local = new Date(y, mo - 1, d + dayOffset, h, m, 0, 0);
  if (Number.isNaN(local.getTime())) return null;
  return local.toISOString();
};

// Serialize a shift range, bumping the end by +1 day when the user chose an
// end time on or before the start (overnight turno). Backend enforces
// CHECK (shift_end > shift_start), so "19:00 -> 02:00" would otherwise be
// rejected.
export const serializeShift = (
  eventDate: string | null | undefined,
  start: string | null,
  end: string | null,
): { shiftStart: string | null; shiftEnd: string | null } => {
  const shiftStart = hhmmToUtcIso(eventDate, start);
  if (!end) return { shiftStart, shiftEnd: null };
  if (!start) return { shiftStart: null, shiftEnd: hhmmToUtcIso(eventDate, end) };
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const overnight = eh * 60 + em <= sh * 60 + sm;
  return {
    shiftStart,
    shiftEnd: hhmmToUtcIso(eventDate, end, overnight ? 1 : 0),
  };
};

export const isValidUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
