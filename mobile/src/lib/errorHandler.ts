import { ErrorUtils } from "react-native";

/**
 * Safely logs errors without exposing sensitive user data
 * @param context - Description of where the error occurred
 * @param error - The error object
 */
export const logError = (context: string, error: unknown): void => {
    if (__DEV__) {
        // In development, log full error for debugging
        console.error(`[${context}]`, error);
    } else {
        // In production, only log the error message without sensitive details
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[${context}] Error:`, message);
        // Sentry integration point: captureException is called here when available
        try {
            const Sentry = require('./sentry');
            if (Sentry?.captureException) {
                Sentry.captureException(error, context);
            }
        } catch {
            // Sentry not available, skip silently
        }
    }
};

/**
 * Gets a user-friendly error message from an error object
 * @param error - The error object
 * @param defaultMessage - Default message if error is not recognized
 * @returns A safe error message to display to users
 */
export const getErrorMessage = (error: unknown, defaultMessage: string = 'Ocurri\u00F3 un error'): string => {
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

/**
 * Sets up global error handlers for uncaught JS errors and unhandled promise rejections.
 * In dev: logs full errors. In production: logs safely (prepared for Sentry).
 * Call once from App.tsx on mount.
 */
export const setupGlobalErrorHandlers = (): void => {
    // Capture unhandled JS errors
    const previousHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
        logError(isFatal ? 'Fatal JS Error' : 'Uncaught JS Error', error);
        // Call the previous handler so React Native's default behavior is preserved
        if (previousHandler) {
            previousHandler(error, isFatal);
        }
    });

    // Capture unhandled promise rejections
    const rejectionTracking = require('promise/setimmediate/rejection-tracking');
    rejectionTracking.enable({
        allRejections: true,
        onUnhandled: (_id: number, error: unknown) => {
            logError('Unhandled Promise Rejection', error);
        },
        onHandled: () => {},
    });
};
