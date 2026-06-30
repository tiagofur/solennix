import { describe, it, expect } from 'vitest';
import { format } from 'date-fns';
import { buildBlockedDateList, isDateBlocked } from './blockedDates';
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
