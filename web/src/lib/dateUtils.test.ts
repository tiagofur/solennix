import { describe, it, expect } from 'vitest';
import { format } from 'date-fns';
import { parseLocalDate, parseEventDate, localToday } from './dateUtils';

describe('parseLocalDate', () => {
  it('parses a yyyy-MM-dd string as a LOCAL-midnight date (round-trip)', () => {
    const d = parseLocalDate('2026-07-10');
    // Calendar day is preserved in the LOCAL representation.
    expect(format(d, 'yyyy-MM-dd')).toBe('2026-07-10');
    // LOCAL midnight normalization (hours/minutes/seconds cleared).
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
  });

  it('is symmetric with format() (local-midnight round-trip)', () => {
    const samples = ['2026-01-01', '2026-07-10', '2026-12-31', '2024-02-29'];
    for (const iso of samples) {
      expect(format(parseLocalDate(iso), 'yyyy-MM-dd')).toBe(iso);
    }
  });

  it('survives a DST spring-forward boundary (LOCAL day key is stable)', () => {
    // 2026-03-29 is the EU DST spring-forward day (02:00 -> 03:00 local).
    // Parsing it as local-midnight and re-formatting must keep the same
    // calendar day — the DST gap does not exist at midnight.
    expect(format(parseLocalDate('2026-03-29'), 'yyyy-MM-dd')).toBe('2026-03-29');
  });
});

describe('parseEventDate (LOCAL-noon parse invariant — Fix 3)', () => {
  it('keeps the LOCAL calendar day (LOCAL-noon per ES2016, no "Z" suffix)', () => {
    // A date-TIME string WITHOUT a "Z" suffix is parsed as LOCAL time per
    // ES2016, so "...T12:00:00" is LOCAL noon -> the correct local calendar
    // day in EVERY timezone (verified UTC+14 .. UTC-12).
    expect(format(parseEventDate('2026-07-10'), 'yyyy-MM-dd')).toBe('2026-07-10');
  });

  it('agrees with parseLocalDate on the calendar day (REQ-6 helpers seam)', () => {
    // The save guard (parseEventDate, noon) and the picker math
    // (parseLocalDate, local-midnight) MUST agree on the calendar day.
    // A "Z"-suffix regression on parseEventDate would break this on
    // UTC-behind hosts (UTC noon -> previous local day).
    const samples = ['2026-01-01', '2026-07-10', '2026-12-31', '2024-02-29'];
    for (const iso of samples) {
      expect(format(parseEventDate(iso), 'yyyy-MM-dd')).toBe(
        format(parseLocalDate(iso), 'yyyy-MM-dd'),
      );
    }
  });

  it('constructs a LOCAL-noon Date (no UTC "Z" suffix in the parse)', () => {
    // The contract: parseEventDate uses LOCAL noon (ES2016 date-time w/o "Z"),
    // which is what keeps the save-guard day-correct in UTC+13/+14. A future
    // "normalization" that appends "Z" reverts to UTC-noon and breaks it.
    const iso = '2026-07-10';
    expect(parseEventDate(iso).getTime()).toBe(
      new Date(`${iso}T12:00:00`).getTime(),
    );
    // On any non-UTC host, LOCAL noon must differ from UTC noon (the Z bug).
    const offsetMinutes = new Date().getTimezoneOffset();
    if (offsetMinutes !== 0) {
      expect(parseEventDate(iso).getTime()).not.toBe(
        new Date(`${iso}T12:00:00Z`).getTime(),
      );
    }
  });
});

describe('localToday (TZ-safe default — REQ-5)', () => {
  it('returns the LOCAL yyyy-MM-dd, never the UTC drift', () => {
    // Replaces the pre-existing bug `new Date().toISOString().split('T')[0]`
    // (which emits the UTC day). localToday must match the LOCAL-formatted day.
    const now = new Date();
    expect(localToday(now)).toBe(format(now, 'yyyy-MM-dd'));
    // ISO day and local day can differ near midnight on UTC-offset hosts;
    // localToday always equals the LOCAL day.
    expect(localToday(now)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
