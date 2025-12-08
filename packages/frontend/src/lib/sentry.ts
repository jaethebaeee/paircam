import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry error tracking for the frontend.
 * This should be called as early as possible in the application lifecycle.
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    if (import.meta.env.DEV) {
      console.log('[Sentry] No DSN configured, error tracking disabled');
    }
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION || '1.0.0',

    // Performance Monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

    // Session Replay for debugging user issues
    replaysSessionSampleRate: 0.1, // Sample 10% of sessions
    replaysOnErrorSampleRate: 1.0, // Capture 100% of sessions with errors

    // Integrations
    integrations: [
      // Browser tracing for performance monitoring
      Sentry.browserTracingIntegration(),
      // Session replay for debugging
      Sentry.replayIntegration({
        // Mask all text for privacy
        maskAllText: false,
        // Block media elements
        blockAllMedia: false,
        // Network request details
        networkDetailAllowUrls: [
          window.location.origin,
          import.meta.env.VITE_API_URL || '',
        ],
      }),
    ],

    // Filter out common noise
    beforeSend(event, hint) {
      const error = hint.originalException;

      // Ignore network errors from ad blockers
      if (error instanceof Error) {
        if (error.message?.includes('Failed to fetch')) {
          return null;
        }
        // Ignore ResizeObserver errors (browser bug)
        if (error.message?.includes('ResizeObserver')) {
          return null;
        }
        // Ignore cancelled requests
        if (error.message?.includes('AbortError')) {
          return null;
        }
      }

      return event;
    },

    // Don't track certain URLs
    denyUrls: [
      // Chrome extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      // Firefox extensions
      /^moz-extension:\/\//i,
      // Safari extensions
      /^safari-extension:\/\//i,
    ],
  });

  if (import.meta.env.DEV) {
    console.log('[Sentry] Initialized for error tracking');
  }
}

/**
 * Set user context for Sentry.
 * Call this after user authentication.
 */
export function setSentryUser(user: { id: string; deviceId?: string } | null): void {
  if (user) {
    Sentry.setUser({
      id: user.id,
      ...(user.deviceId && { deviceId: user.deviceId }),
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Capture a custom exception with additional context.
 */
export function captureException(
  error: Error,
  context?: Record<string, unknown>
): void {
  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    Sentry.captureException(error);
  });
}

/**
 * Capture a custom message with severity level.
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info'
): void {
  Sentry.captureMessage(message, level);
}

/**
 * Add breadcrumb for debugging user flow.
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>
): void {
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: 'info',
  });
}

// Re-export Sentry for direct access when needed
export { Sentry };
