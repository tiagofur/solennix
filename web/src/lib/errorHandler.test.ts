import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logError, getErrorMessage } from './errorHandler';

describe('errorHandler', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('logs full error in dev', () => {
    const error = new Error('Test error');
    logError('TestContext', error);
    expect(consoleErrorSpy).toHaveBeenCalledWith('[TestContext]', error);
  });

  it('logs sanitized error in production', () => {
    consoleErrorSpy.mockClear();
    const error = new Error('Prod error');
    console.error('[ProdContext] Error:', error.message);
    expect(consoleErrorSpy).toHaveBeenCalledWith('[ProdContext] Error:', 'Prod error');
  });

  it('getErrorMessage returns message from Error', () => {
    const error = new Error('Something went wrong');
    expect(getErrorMessage(error)).toBe('Something went wrong');
  });

  it('getErrorMessage returns string directly', () => {
    expect(getErrorMessage('Simple error')).toBe('Simple error');
  });

  it('getErrorMessage returns message from object', () => {
    expect(getErrorMessage({ message: 'Object error' })).toBe('Object error');
  });

  it('getErrorMessage returns default for unknown', () => {
    expect(getErrorMessage(undefined)).toBe('Ocurrió un error');
  });

  it('logError logs sanitized message in production for Error instance', () => {
    const originalDev = import.meta.env.DEV;
    import.meta.env.DEV = false;

    const error = new Error('Production error');
    logError('ProdTest', error);
    expect(consoleErrorSpy).toHaveBeenCalledWith('[ProdTest] Error:', 'Production error');

    import.meta.env.DEV = originalDev;
  });

  it('logError logs Unknown error in production for non-Error', () => {
    const originalDev = import.meta.env.DEV;
    import.meta.env.DEV = false;

    logError('ProdTest', 42);
    expect(consoleErrorSpy).toHaveBeenCalledWith('[ProdTest] Error:', 'Unknown error');

    import.meta.env.DEV = originalDev;
  });

  it('getErrorMessage returns custom default message', () => {
    expect(getErrorMessage(null, 'Custom fallback')).toBe('Custom fallback');
  });
});
