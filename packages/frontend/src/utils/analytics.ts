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

// Extend window interface for gtag
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
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
  parameters?: Record<string, any>
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

// ============================================
// Pre-defined Event Trackers for PairCam
// ============================================

/**
 * Track when user starts a chat
 */
export const trackChatStart = (mode: 'video' | 'text' | 'voice'): void => {
  trackEvent('chat_start', {
    chat_mode: mode,
    event_category: 'engagement',
    event_label: `${mode}_chat_initiated`,
  });
};

/**
 * Track when user gets matched with someone
 */
export const trackMatchFound = (waitTimeSeconds: number): void => {
  trackEvent('match_found', {
    wait_time_seconds: waitTimeSeconds,
    event_category: 'engagement',
  });
};

/**
 * Track when user skips to next person
 */
export const trackSkip = (chatDurationSeconds: number): void => {
  trackEvent('chat_skip', {
    chat_duration_seconds: chatDurationSeconds,
    event_category: 'engagement',
  });
};

/**
 * Track when user ends a chat session
 */
export const trackChatEnd = (
  chatDurationSeconds: number,
  endedBy: 'user' | 'partner' | 'error'
): void => {
  trackEvent('chat_end', {
    chat_duration_seconds: chatDurationSeconds,
    ended_by: endedBy,
    event_category: 'engagement',
  });
};

/**
 * Track when user opens premium modal
 */
export const trackPremiumModalOpen = (source: string): void => {
  trackEvent('premium_modal_open', {
    source: source,
    event_category: 'monetization',
  });
};

/**
 * Track premium purchase initiation
 */
export const trackPremiumPurchaseStart = (plan: string, price: number): void => {
  trackEvent('begin_checkout', {
    currency: 'USD',
    value: price,
    items: [{
      item_id: `premium_${plan}`,
      item_name: `Premium ${plan}`,
      price: price,
      quantity: 1,
    }],
  });
};

/**
 * Track premium purchase completion
 */
export const trackPremiumPurchaseComplete = (plan: string, price: number): void => {
  trackEvent('purchase', {
    transaction_id: `txn_${Date.now()}`,
    currency: 'USD',
    value: price,
    items: [{
      item_id: `premium_${plan}`,
      item_name: `Premium ${plan}`,
      price: price,
      quantity: 1,
    }],
  });
};

/**
 * Track user report submission
 */
export const trackReport = (reason: string): void => {
  trackEvent('user_report', {
    report_reason: reason,
    event_category: 'safety',
  });
};

/**
 * Track blog article read
 */
export const trackBlogView = (
  articleSlug: string,
  articleTitle: string,
  category: string
): void => {
  trackEvent('blog_view', {
    article_slug: articleSlug,
    article_title: articleTitle,
    category: category,
    event_category: 'content',
  });
};

/**
 * Track blog article share
 */
export const trackBlogShare = (
  articleSlug: string,
  platform: 'twitter' | 'facebook' | 'linkedin' | 'copy'
): void => {
  trackEvent('share', {
    method: platform,
    content_type: 'article',
    item_id: articleSlug,
  });
};

/**
 * Track FAQ expansion
 */
export const trackFaqExpand = (question: string): void => {
  trackEvent('faq_expand', {
    question: question,
    event_category: 'content',
  });
};

/**
 * Track signup/login
 */
export const trackSignUp = (method: string): void => {
  trackEvent('sign_up', {
    method: method,
  });
};

export const trackLogin = (method: string): void => {
  trackEvent('login', {
    method: method,
  });
};

/**
 * Track errors
 */
export const trackError = (errorType: string, errorMessage: string): void => {
  trackEvent('error', {
    error_type: errorType,
    error_message: errorMessage,
    event_category: 'error',
  });
};
