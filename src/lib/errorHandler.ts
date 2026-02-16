/**
 * Safely logs errors without exposing sensitive user data
 * @param context - Description of where the error occurred
 * @param error - The error object
 */
export const logError = (context: string, error: unknown): void => {
  if (import.meta.env.DEV) {
    // In development, log full error for debugging
    console.error(`[${context}]`, error);
  } else {
    // In production, only log the error message without sensitive details
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[${context}] Error:`, message);
  }
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
