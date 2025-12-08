/**
 * Google Analytics 4 Event Tracking Utility
 *
 * Usage:
 * 1. Replace G-XXXXXXXXXX in index.html with your actual GA4 Measurement ID
 * 2. Import and use these functions throughout the app
 *
 * Get your Measurement ID:
 * - Go to Google Analytics (analytics.google.com)
 * - Create a new GA4 property
 * - Go to Admin > Data Streams > Web
 * - Copy the Measurement ID (starts with G-)
 */

// GA4 event parameters type
type GtagEventParams = Record<string, string | number | boolean | object | undefined>;

// Extend window interface for gtag
declare global {
  interface Window {
    gtag: (command: 'event' | 'config' | 'set', target: string, params?: GtagEventParams) => void;
    dataLayer: Array<unknown>;
  }
}

// Check if analytics is available
const isAnalyticsAvailable = (): boolean => {
  return typeof window !== 'undefined' && typeof window.gtag === 'function';
};

/**
 * Track a custom event
 */
export const trackEvent = (
  eventName: string,
  parameters?: GtagEventParams
): void => {
  if (!isAnalyticsAvailable()) return;

  window.gtag('event', eventName, parameters);
};

/**
 * Track page view (for SPA navigation)
 */
export const trackPageView = (
  pagePath: string,
  pageTitle?: string
): void => {
  if (!isAnalyticsAvailable()) return;

  window.gtag('event', 'page_view', {
    page_path: pagePath,
    page_title: pageTitle || document.title,
    page_location: window.location.origin + pagePath,
  });
};

