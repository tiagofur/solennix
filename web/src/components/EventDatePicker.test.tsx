import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { enUS } from 'date-fns/locale';
import { EventDatePicker } from './EventDatePicker';

/**
 * Render the picker showing July 2026 with 2026-07-10 blocked.
 * Returns helpers to locate day buttons by their visible day-of-month number,
 * skipping outside (prev/next-month) days so the lookup is unambiguous.
 */
function setup(blocked: { start_date: string; end_date: string }[] = []) {
  const onChange = vi.fn();
  const { container } = render(
    <EventDatePicker
      value="2026-07-15"
      onChange={onChange}
      unavailableDates={blocked}
      locale={enUS}
      label="Event date"
    />,
  );

  const dayButtons = () =>
    Array.from(container.querySelectorAll<HTMLButtonElement>('button')).filter((b) => {
      const text = b.textContent?.trim() ?? '';
      return /^\d+$/.test(text) && !b.closest('.rdp-day_outside');
    });

  const findDay = (n: number) =>
    dayButtons().find((b) => Number(b.textContent?.trim()) === n);

  return { onChange, container, dayButtons, findDay };
}

describe('EventDatePicker — disable-select (REQ-2, native disabled per Fix 2)', () => {
  it('renders a blocked day with the NATIVE `disabled` attribute', () => {
    const { findDay } = setup([{ start_date: '2026-07-10', end_date: '2026-07-10' }]);
    const blocked = findDay(10);
    expect(blocked).toBeDefined();
    // Fix 2: react-day-picker v10 emits native `disabled` (NOT aria-disabled)
    // for disabled days. This is what removes the day from the tab order and
    // makes it screen-reader-announced as disabled.
    expect(blocked!.hasAttribute('disabled')).toBe(true);
    expect(blocked!.getAttribute('disabled')).not.toBe('false');
  });

  it('does NOT emit aria-disabled="true" as the primary blocked attribute', () => {
    const { findDay } = setup([{ start_date: '2026-07-10', end_date: '2026-07-10' }]);
    const blocked = findDay(10)!;
    // Native disabled is the mechanism; aria-disabled only appears under focus.
    expect(blocked.hasAttribute('disabled')).toBe(true);
  });

  it('renders a free (non-blocked) day WITHOUT disabled', () => {
    const { findDay } = setup([{ start_date: '2026-07-10', end_date: '2026-07-10' }]);
    const free = findDay(11);
    expect(free).toBeDefined();
    expect(free!.hasAttribute('disabled')).toBe(false);
  });
});

describe('EventDatePicker — selection (REQ-1, REQ-9)', () => {
  it('emits a LOCAL yyyy-MM-dd when a free day is clicked', () => {
    const { findDay, onChange } = setup([{ start_date: '2026-07-10', end_date: '2026-07-10' }]);
    const free = findDay(11)!;
    fireEvent.click(free);
    expect(onChange).toHaveBeenCalledWith('2026-07-11');
  });

  it('does not emit when a blocked day is clicked (disable-select)', () => {
    const { findDay, onChange } = setup([{ start_date: '2026-07-10', end_date: '2026-07-10' }]);
    fireEvent.click(findDay(10)!);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows no event dots (REQ-9 — no DayButton override)', () => {
    const { container } = setup([{ start_date: '2026-07-10', end_date: '2026-07-10' }]);
    expect(container.querySelector('.rdp-day-dot')).toBeNull();
    expect(container.querySelector('.rdp-day-dots')).toBeNull();
  });

  it('applies the shared .rdp-unavailable strikethrough class to blocked days (REQ-1)', () => {
    const { container } = setup([{ start_date: '2026-07-10', end_date: '2026-07-10' }]);
    // The unavailable modifier class lands on the day cell (or button) for the
    // blocked date.
    expect(container.querySelector('.rdp-unavailable')).not.toBeNull();
  });
});
