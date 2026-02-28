import * as Sentry from "@sentry/react-native";

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || "";

/**
 * Initialize Sentry for crash reporting.
 * Skips silently if no DSN is configured (e.g. local dev).
 */
export function initSentry(): void {
  if (!SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    debug: __DEV__,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    environment: __DEV__ ? "development" : "production",
  });
}

/**
 * Capture an exception to Sentry with optional context.
 * No-ops if Sentry is not initialized.
 */
export function captureException(error: unknown, context?: string): void {
  if (!SENTRY_DSN) return;

  if (context) {
    Sentry.withScope((scope) => {
      scope.setTag("context", context);
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Wrap the root App component with Sentry's error boundary.
 * Returns the component as-is if no DSN is configured.
 */
export const wrapWithSentry = SENTRY_DSN ? Sentry.wrap : <T,>(component: T) => component;
