/**
 * Google AdSense Configuration
 *
 * SETUP INSTRUCTIONS:
 * 1. Replace 'ca-pub-XXXXXXXXXXXXXXXX' with your AdSense Publisher ID
 * 2. Replace ad slot IDs with your actual ad unit IDs from AdSense
 * 3. Update index.html with your Publisher ID
 *
 * AD PLACEMENT STRATEGY:
 * - Interstitials: Between matches (every 3-5 matches, frequency capped)
 * - Banners: Landing page, waiting queue, video chat sidebar
 * - Premium users see NO ads (handled by components automatically)
 */

// Your AdSense Publisher ID (format: ca-pub-XXXXXXXXXXXXXXXX)
export const ADSENSE_PUBLISHER_ID = 'ca-pub-XXXXXXXXXXXXXXXX';

// Ad Unit Slot IDs (create these in your AdSense dashboard)
export const AD_SLOTS = {
  // Interstitial ad shown between matches
  interstitial: '1234567890',

  // Banner ad on landing page (below hero section)
  landingHero: '2345678901',

  // Banner ad in waiting queue
  waitingQueue: '3456789012',

  // Sidebar ad during video chat (desktop only)
  videoSidebar: '4567890123',

  // Footer banner ad
  footer: '5678901234',
} as const;

// Frequency capping settings for interstitial ads
export const INTERSTITIAL_CONFIG = {
  // Minimum matches before showing an ad
  minMatchesBetweenAds: 3,

  // Maximum matches before forcing an ad
  maxMatchesBetweenAds: 5,

  // Minimum seconds between any ad display
  minSecondsBetweenAds: 30,

  // Seconds user must wait before skipping (5 = standard)
  minDisplaySeconds: 5,

  // Auto-close after this many seconds (0 = never)
  autoCloseSeconds: 15,
} as const;

// Banner ad sizes
export const AD_SIZES = {
  // Responsive (auto-adjusts to container)
  responsive: 'responsive',

  // Medium rectangle (good for sidebars)
  rectangle: '300x250',

  // Leaderboard (good for headers/footers)
  leaderboard: '728x90',

  // Mobile banner
  mobileBanner: '320x100',

  // Skyscraper (tall sidebar)
  skyscraper: '160x600',
} as const;

// Whether to show test/placeholder ads in development
export const SHOW_TEST_ADS_IN_DEV = true;

// Geographic regions with highest CPM (for analytics)
export const HIGH_CPM_REGIONS = ['US', 'UK', 'CA', 'AU', 'DE', 'FR', 'JP'];
