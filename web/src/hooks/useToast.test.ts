import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useToast } from './useToast';

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset the store to empty state between tests
    act(() => {
      const state = useToast.getState();
      state.toasts.forEach((t) => state.removeToast(t.id));
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with an empty toasts array', () => {
    const { toasts } = useToast.getState();
    expect(toasts).toEqual([]);
  });

  it('adds a toast with default type "success"', () => {
    act(() => {
      useToast.getState().addToast('Operación exitosa');
    });

    const { toasts } = useToast.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe('Operación exitosa');
    expect(toasts[0].type).toBe('success');
    expect(toasts[0].id).toBeDefined();
  });

  it('adds a toast with explicit type "error"', () => {
    act(() => {
      useToast.getState().addToast('Algo salió mal', 'error');
    });

    const { toasts } = useToast.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe('Algo salió mal');
    expect(toasts[0].type).toBe('error');
  });

  it('adds a toast with explicit type "info"', () => {
    act(() => {
      useToast.getState().addToast('Información importante', 'info');
    });

    const { toasts } = useToast.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0].type).toBe('info');
  });

  it('adds multiple toasts', () => {
    act(() => {
      useToast.getState().addToast('Toast 1');
      useToast.getState().addToast('Toast 2', 'error');
      useToast.getState().addToast('Toast 3', 'info');
    });

    const { toasts } = useToast.getState();
    expect(toasts).toHaveLength(3);
    expect(toasts[0].message).toBe('Toast 1');
    expect(toasts[1].message).toBe('Toast 2');
    expect(toasts[2].message).toBe('Toast 3');
  });

  it('generates unique ids for each toast', () => {
    act(() => {
      useToast.getState().addToast('Toast A');
      useToast.getState().addToast('Toast B');
    });

    const { toasts } = useToast.getState();
    expect(toasts[0].id).not.toBe(toasts[1].id);
  });

  it('removes a toast by id', () => {
    act(() => {
      useToast.getState().addToast('To remove');
    });

    const { toasts } = useToast.getState();
    const id = toasts[0].id;

    act(() => {
      useToast.getState().removeToast(id);
    });

    expect(useToast.getState().toasts).toHaveLength(0);
  });

  it('only removes the targeted toast, keeping others', () => {
    act(() => {
      useToast.getState().addToast('Keep me');
      useToast.getState().addToast('Remove me');
      useToast.getState().addToast('Keep me too');
    });

    const toastToRemove = useToast.getState().toasts[1];

    act(() => {
      useToast.getState().removeToast(toastToRemove.id);
    });

    const remaining = useToast.getState().toasts;
    expect(remaining).toHaveLength(2);
    expect(remaining[0].message).toBe('Keep me');
    expect(remaining[1].message).toBe('Keep me too');
  });

  it('removeToast with non-existent id does not affect toasts', () => {
    act(() => {
      useToast.getState().addToast('Existing');
    });

    act(() => {
      useToast.getState().removeToast('non-existent-id');
    });

    expect(useToast.getState().toasts).toHaveLength(1);
  });

  it('auto-removes toast after 3 seconds', () => {
    act(() => {
      useToast.getState().addToast('Auto remove');
    });

    expect(useToast.getState().toasts).toHaveLength(1);

    // Advance time by 2999ms — toast should still be there
    act(() => {
      vi.advanceTimersByTime(2999);
    });
    expect(useToast.getState().toasts).toHaveLength(1);

    // Advance the remaining 1ms to reach 3000ms
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(useToast.getState().toasts).toHaveLength(0);
  });

  it('auto-removes only the specific toast after 3 seconds, not others added later', () => {
    act(() => {
      useToast.getState().addToast('First');
    });

    // Add second toast 1 second later
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    act(() => {
      useToast.getState().addToast('Second');
    });

    // At 3 seconds total, only first should be removed
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    const remaining = useToast.getState().toasts;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].message).toBe('Second');

    // At 4 seconds total (3 seconds after second toast), second should be removed
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(useToast.getState().toasts).toHaveLength(0);
  });
});
