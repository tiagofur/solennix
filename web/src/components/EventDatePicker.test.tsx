import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { enUS } from 'date-fns/locale';
import { EventDatePicker } from './EventDatePicker';

/**
 * Render the picker showing July 2026 with 2026-07-10 blocked.
 *
 * Modal-on-demand (UX parity with the iOS sheet, PR #701 follow-up): the
 * calendar now lives behind a compact trigger button and only mounts when the
 * modal opens. Returns helpers to open the modal and locate day buttons by
 * their visible day-of-month number, skipping outside (prev/next-month) days so
 * the lookup is unambiguous.
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

  const getTrigger = () =>
    container.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]')!;

  // Open the modal so the DayPicker mounts. Asserts the trigger toggled.
  const open = () => {
    const trigger = getTrigger();
    fireEvent.click(trigger);
  };

  const dayButtons = () =>
    Array.from(container.querySelectorAll<HTMLButtonElement>('button')).filter((b) => {
      const text = b.textContent?.trim() ?? '';
      return /^\d+$/.test(text) && !b.closest('.rdp-day_outside');
    });

  const findDay = (n: number) =>
    dayButtons().find((b) => Number(b.textContent?.trim()) === n);

  return { onChange, container, getTrigger, open, dayButtons, findDay };
}

describe('EventDatePicker — modal-on-demand presentation', () => {
  it('renders the trigger button showing the selected date, not the calendar', () => {
    const { container, getTrigger } = setup([
      { start_date: '2026-07-10', end_date: '2026-07-10' },
    ]);
    const trigger = getTrigger();
    // en-US PPP: "July 15th, 2026"
    expect(trigger).toHaveTextContent('July 15th, 2026');
    // The DayPicker is NOT in the DOM while the modal is closed.
    expect(container.querySelector('.rdp-month')).toBeNull();
    expect(findDayIn(container)).toBeUndefined();
  });

  it('shows a locale-aware placeholder when no value is set', () => {
    const { container } = render(
      <EventDatePicker
        value=""
        onChange={vi.fn()}
        locale={enUS}
        label="Event date"
      />,
    );
    const trigger = container.querySelector('button[aria-haspopup="dialog"]')!;
    expect(trigger).toHaveTextContent('MM/DD/YYYY');
  });

  it('clicking the trigger opens the modal and mounts the DayPicker', () => {
    const { container, getTrigger, open } = setup([
      { start_date: '2026-07-10', end_date: '2026-07-10' },
    ]);
    open();
    expect(container.querySelector('.rdp-month')).not.toBeNull();
    // aria-expanded flips with the open state
    expect(getTrigger()).toHaveAttribute('aria-expanded', 'true');
  });

  it('the trigger exposes aria-haspopup="dialog" and aria-expanded toggles', () => {
    const { getTrigger, open } = setup();
    const trigger = getTrigger();
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    open();
    expect(getTrigger()).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('EventDatePicker — disable-select (REQ-2, native disabled per Fix 2)', () => {
  it('renders a blocked day with the NATIVE `disabled` attribute', () => {
    const { open, findDay } = setup([
      { start_date: '2026-07-10', end_date: '2026-07-10' },
    ]);
    open();
    const blocked = findDay(10);
    expect(blocked).toBeDefined();
    // Fix 2: react-day-picker v10 emits native `disabled` (NOT aria-disabled)
    // for disabled days. This is what removes the day from the tab order and
    // makes it screen-reader-announced as disabled.
    expect(blocked!.hasAttribute('disabled')).toBe(true);
    expect(blocked!.getAttribute('disabled')).not.toBe('false');
  });

  it('does NOT emit aria-disabled="true" as the primary blocked attribute', () => {
    const { open, findDay } = setup([
      { start_date: '2026-07-10', end_date: '2026-07-10' },
    ]);
    open();
    const blocked = findDay(10)!;
    // Native disabled is the mechanism; aria-disabled only appears under focus.
    expect(blocked.hasAttribute('disabled')).toBe(true);
  });

  it('renders a free (non-blocked) day WITHOUT disabled', () => {
    const { open, findDay } = setup([
      { start_date: '2026-07-10', end_date: '2026-07-10' },
    ]);
    open();
    const free = findDay(11);
    expect(free).toBeDefined();
    expect(free!.hasAttribute('disabled')).toBe(false);
  });
});

describe('EventDatePicker — selection (REQ-1, REQ-9)', () => {
  it('emits a LOCAL yyyy-MM-dd AND closes the modal when a free day is clicked', () => {
    const { open, findDay, onChange, container } = setup([
      { start_date: '2026-07-10', end_date: '2026-07-10' },
    ]);
    open();
    const free = findDay(11)!;
    fireEvent.click(free);
    expect(onChange).toHaveBeenCalledWith('2026-07-11');
    // Picking a day dismisses the sheet (parity with the iOS sheet's "Done").
    expect(container.querySelector('.rdp-month')).toBeNull();
  });

  it('does not emit when a blocked day is clicked (disable-select)', () => {
    const { open, findDay, onChange } = setup([
      { start_date: '2026-07-10', end_date: '2026-07-10' },
    ]);
    open();
    fireEvent.click(findDay(10)!);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows no event dots (REQ-9 — no DayButton override)', () => {
    const { open, container } = setup([
      { start_date: '2026-07-10', end_date: '2026-07-10' },
    ]);
    open();
    expect(container.querySelector('.rdp-day-dot')).toBeNull();
    expect(container.querySelector('.rdp-day-dots')).toBeNull();
  });

  it('applies the shared .rdp-unavailable strikethrough class to blocked days (REQ-1)', () => {
    const { open, container } = setup([
      { start_date: '2026-07-10', end_date: '2026-07-10' },
    ]);
    open();
    // The unavailable modifier class lands on the day cell (or button) for the
    // blocked date.
    expect(container.querySelector('.rdp-unavailable')).not.toBeNull();
  });
});

describe('EventDatePicker — modal dismissal (UX parity iOS sheet)', () => {
  it('closes the modal on Escape WITHOUT calling onChange', () => {
    const { open, onChange, container } = setup([
      { start_date: '2026-07-10', end_date: '2026-07-10' },
    ]);
    open();
    expect(container.querySelector('.rdp-month')).not.toBeNull();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(container.querySelector('.rdp-month')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('closes the modal on backdrop click WITHOUT calling onChange', () => {
    const { open, onChange, container } = setup([
      { start_date: '2026-07-10', end_date: '2026-07-10' },
    ]);
    open();
    // The backdrop is the aria-hidden sibling rendered before the dialog.
    const backdrop = screen
      .getByRole('dialog')
      .previousElementSibling as HTMLElement;
    fireEvent.click(backdrop);

    expect(container.querySelector('.rdp-month')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
});

/**
 * Local day-button lookup (no modal open) reused by the "calendar not mounted"
 * assertion. Kept outside `setup` because that helper is modal-oriented.
 */
function findDayIn(container: HTMLElement) {
  const buttons = Array.from(
    container.querySelectorAll<HTMLButtonElement>('button'),
  ).filter((b) => {
    const text = b.textContent?.trim() ?? '';
    return /^\d+$/.test(text) && !b.closest('.rdp-day_outside');
  });
  return buttons[0];
}
