import { describe, it, expect } from 'vitest';
import { format } from 'date-fns';
import { buildBlockedDateList, isDateBlocked, advancePastBlockedDate } from './blockedDates';
import { parseLocalDate } from './dateUtils';

const toIso = (d: Date) => format(d, 'yyyy-MM-dd');

describe('buildBlockedDateList', () => {
  it('returns an empty list for no unavailable dates', () => {
    expect(buildBlockedDateList([])).toEqual([]);
  });

  it('expands a single-day range into one date', () => {
    const list = buildBlockedDateList([{ start_date: '2026-07-10', end_date: '2026-07-10' }]);
    expect(list.map(toIso)).toEqual(['2026-07-10']);
  });

  it('expands a multi-day range into each calendar day in order', () => {
    const list = buildBlockedDateList([{ start_date: '2026-07-10', end_date: '2026-07-13' }]);
    expect(list.map(toIso)).toEqual(['2026-07-10', '2026-07-11', '2026-07-12', '2026-07-13']);
  });

  it('expands each date as a LOCAL-midnight Date (TZ of generated Dates)', () => {
    const list = buildBlockedDateList([{ start_date: '2026-07-10', end_date: '2026-07-10' }]);
    const [d] = list;
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
  });

  it('merges overlapping ranges and dedupes shared days', () => {
    const list = buildBlockedDateList([
      { start_date: '2026-07-10', end_date: '2026-07-12' },
      { start_date: '2026-07-11', end_date: '2026-07-13' },
    ]);
    expect(list.map(toIso)).toEqual(['2026-07-10', '2026-07-11', '2026-07-12', '2026-07-13']);
  });

  it('handles ranges provided in reverse/unordered chronological order', () => {
    const list = buildBlockedDateList([
      { start_date: '2026-07-14', end_date: '2026-07-14' },
      { start_date: '2026-07-10', end_date: '2026-07-11' },
    ]);
    // Insertion order is preserved (later range appended after the earlier one),
    // but each range's internal expansion stays ordered.
    expect(list.map(toIso)).toEqual(['2026-07-14', '2026-07-10', '2026-07-11']);
  });

  it('produces independent Date instances (no shared mutation)', () => {
    const list = buildBlockedDateList([{ start_date: '2026-07-10', end_date: '2026-07-11' }]);
    // Mutating one entry must not affect the others.
    list[0].setFullYear(1999);
    expect(toIso(list[1])).toBe('2026-07-11');
  });
});

describe('isDateBlocked', () => {
  const list = buildBlockedDateList([{ start_date: '2026-07-10', end_date: '2026-07-12' }]);

  it('returns true for a blocked day', () => {
    expect(isDateBlocked(parseLocalDate('2026-07-11'), list)).toBe(true);
  });

  it('returns false for a non-blocked day', () => {
    expect(isDateBlocked(parseLocalDate('2026-07-13'), list)).toBe(false);
  });

  it('returns false for an empty blocked list', () => {
    expect(isDateBlocked(parseLocalDate('2026-07-11'), [])).toBe(false);
  });

  it('agrees on the boundary days (start and end inclusive)', () => {
    expect(isDateBlocked(parseLocalDate('2026-07-10'), list)).toBe(true);
    expect(isDateBlocked(parseLocalDate('2026-07-12'), list)).toBe(true);
  });
});

describe('advancePastBlockedDate (auto-skip math, REQ-3)', () => {
  const block = (start: string, end: string) => buildBlockedDateList([{ start_date: start, end_date: end }]);

  it('keeps today when it is NOT blocked (no-op)', () => {
    expect(advancePastBlockedDate('2026-07-10', [])).toBe('2026-07-10');
  });

  it('advances a single blocked day to the next free day', () => {
    expect(advancePastBlockedDate('2026-07-10', block('2026-07-10', '2026-07-10'))).toBe('2026-07-11');
  });

  it('advances past a run of consecutive blocked days', () => {
    expect(advancePastBlockedDate('2026-07-10', block('2026-07-10', '2026-07-12'))).toBe('2026-07-13');
  });

  it('keeps the original date on cap-exhaust (>365 consecutive blocked days, REQ-3 cap)', () => {
    // Cap is 365 iterations; blocking MORE than 365 days means the loop
    // exhausts before finding a free day -> keep original (save guard backstops).
    const start = parseLocalDate('2026-01-01');
    const list: Date[] = [];
    for (let i = 0; i < 400; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      list.push(d);
    }
    expect(advancePastBlockedDate('2026-01-01', list)).toBe('2026-01-01');
  });

  it('steps from the LOCAL day regardless of host TZ (pinned-TZ by input, REQ-3/REQ-5)', () => {
    // Simulates the UTC-6 @23:00 and UTC+8 morning scenarios deterministically:
    // the caller passes the already-formatted LOCAL today string, so the helper
    // always steps from the LOCAL calendar day, never the UTC day.
    expect(advancePastBlockedDate('2026-07-10', block('2026-07-10', '2026-07-10'))).toBe('2026-07-11');
    expect(advancePastBlockedDate('2026-12-31', block('2026-12-31', '2026-12-31'))).toBe('2027-01-01');
  });

  it('is DST-safe when stepping across a spring-forward boundary', () => {
    // 2026-03-29 is the EU DST spring-forward (02:00 -> 03:00 local). Stepping
    // from 2026-03-27 across the gap must land on 2026-03-30, proving the
    // local setDate(+1) advances exactly one calendar day.
    expect(advancePastBlockedDate('2026-03-27', block('2026-03-27', '2026-03-29'))).toBe('2026-03-30');
  });

  it('returns a valid yyyy-MM-dd string', () => {
    const out = advancePastBlockedDate('2026-07-10', block('2026-07-10', '2026-07-10'));
    expect(out).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Round-trips through parseLocalDate + format.
    expect(format(parseLocalDate(out), 'yyyy-MM-dd')).toBe(out);
  });
});
