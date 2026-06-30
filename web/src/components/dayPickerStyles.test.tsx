import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { dayPickerStyles } from './dayPickerStyles';

/**
 * Identity test (REQ-1, REQ-11): the shared theming module must keep the
 * `.rdp-unavailable` strikethrough rule byte-identical to the original
 * EventList inline block so the form picker and the calendar render the same
 * blocked-day visual.
 */
describe('dayPickerStyles', () => {
  const css = () => {
    const { container } = render(dayPickerStyles);
    const style = container.querySelector('style');
    return (style?.textContent ?? '').replace(/\s+/g, ' ').trim();
  };

  it('contains the .rdp-unavailable strikethrough rule (REQ-1 visual parity)', () => {
    const text = css();
    expect(text).toContain('.rdp-unavailable .rdp-day-number');
    expect(text).toContain('text-decoration: line-through');
    expect(text).toContain('background-color: var(--color-surface-alt)');
    expect(text).toContain('color: var(--color-text-tertiary)');
  });

  it('byte-identical rule block for the unavailable modifier', () => {
    // Normalized comparison of the exact rule (whitespace-insensitive) so a
    // future edit that changes colors/decoration is caught.
    const expected =
      '.rdp-unavailable .rdp-day-number { ' +
      'background-color: var(--color-surface-alt) !important; ' +
      'color: var(--color-text-tertiary) !important; ' +
      'text-decoration: line-through; }';
    expect(css()).toContain(expected);
  });

  it('keeps the shared cell sizing and accent variables used by both pickers', () => {
    const text = css();
    expect(text).toContain('--rdp-cell-size: 45px');
    expect(text).toContain('--rdp-accent-color: var(--color-primary)');
  });
});
