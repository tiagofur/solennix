import * as Sentry from '@sentry/react';

/**
 * Safely logs errors without exposing sensitive user data.
 * In production, also forwards to Sentry (no-op if Sentry DSN is unset).
 */
export const logError = (context: string, error: unknown): void => {
  if (import.meta.env.DEV) {
    console.error(`[${context}]`, error);
    return;
  }
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(`[${context}] Error:`, message);
  Sentry.captureException(error, { tags: { context } });
};

/**
 * Gets a user-friendly error message from an error object
 * @param error - The error object
 * @param defaultMessage - Default message if error is not recognized
 * @returns A safe error message to display to users
 */
export const getErrorMessage = (error: unknown, defaultMessage: string = 'Ocurrió un error'): string => {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  
  return defaultMessage;
};
