import { describe, it, expect } from 'vitest';
import { buildBlockedDateList, isDateBlocked, type UnavailableDateRange } from './blockedDates';
import { parseLocalDate, parseEventDate } from './dateUtils';

/**
 * REQ-6 helpers-agreement contract (Web ADR-1):
 * The picker math uses parseLocalDate (local-midnight) while the save guard
 * (EventForm.tsx onSubmit) uses parseEventDate (LOCAL noon). They MUST agree on
 * whether a given calendar day is blocked — otherwise disable-select and the
 * save guard could disagree. This regression test closes that contract by
 * running both over a shared set of fixtures.
 */

/** Verbatim replica of the save-guard check in EventForm.tsx (parseEventDate, noon). */
function guardSaysBlocked(eventDateStr: string, ranges: readonly UnavailableDateRange[]): boolean {
  if (!ranges.length) return false;
  const eventDateObj = parseEventDate(eventDateStr);
  return ranges.some((range) => {
    const start = parseEventDate(range.start_date);
    const end = parseEventDate(range.end_date);
    return eventDateObj >= start && eventDateObj <= end;
  });
}

/** Picker-side check via the local-midnight seam + set membership. */
function pickerSaysBlocked(eventDateStr: string, blockedDateList: readonly Date[]): boolean {
  return isDateBlocked(parseLocalDate(eventDateStr), blockedDateList);
}

const fixtures: { ranges: UnavailableDateRange[]; days: string[] }[] = [
  {
    ranges: [{ start_date: '2026-07-10', end_date: '2026-07-10' }],
    days: ['2026-07-09', '2026-07-10', '2026-07-11'],
  },
  {
    ranges: [{ start_date: '2026-07-10', end_date: '2026-07-13' }],
    days: ['2026-07-09', '2026-07-10', '2026-07-11', '2026-07-12', '2026-07-13', '2026-07-14'],
  },
  {
    ranges: [
      { start_date: '2026-12-31', end_date: '2027-01-02' },
      { start_date: '2024-02-29', end_date: '2024-02-29' },
    ],
    days: ['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03', '2024-02-28', '2024-02-29', '2024-03-01'],
  },
  { ranges: [], days: ['2026-07-10', '2026-07-11'] },
];

describe('REQ-6: picker (local-midnight) and save guard (LOCAL-noon) agree', () => {
  for (const { ranges, days } of fixtures) {
    const blockedDateList = buildBlockedDateList(ranges);
    for (const day of days) {
      it(`agree on ${day} for ranges ${JSON.stringify(ranges)}`, () => {
        expect(pickerSaysBlocked(day, blockedDateList)).toBe(
          guardSaysBlocked(day, ranges),
        );
      });
    }
  }

  it('the guard rejects a blocked submit date (REQ-7 backstop)', () => {
    const ranges = [{ start_date: '2026-07-10', end_date: '2026-07-10' }];
    const list = buildBlockedDateList(ranges);
    // cap-exhaust path: the date stays blocked, the guard MUST reject it.
    expect(guardSaysBlocked('2026-07-10', ranges)).toBe(true);
    expect(pickerSaysBlocked('2026-07-10', list)).toBe(true);
  });

  it('both seams agree across a full month day-by-day', () => {
    const ranges = [
      { start_date: '2026-03-01', end_date: '2026-03-05' },
      { start_date: '2026-03-29', end_date: '2026-03-31' },
    ];
    const list = buildBlockedDateList(ranges);
    for (let day = 1; day <= 31; day++) {
      const iso = `2026-03-${String(day).padStart(2, '0')}`;
      expect(pickerSaysBlocked(iso, list)).toBe(guardSaysBlocked(iso, ranges));
    }
  });
});
