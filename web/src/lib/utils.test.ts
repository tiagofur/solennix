import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
  });

  it('filters falsy values', () => {
    const isHidden = false;
    expect(cn('base', isHidden && 'hidden', null, undefined, '', 'visible')).toBe('base visible');
  });

  it('merges conflicting tailwind classes', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});
