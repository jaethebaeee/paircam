import { useEffect, useRef } from 'react';

// AdSense configuration from environment variables
const ADSENSE_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT || '';
const ADSENSE_ENABLED = !!ADSENSE_CLIENT && ADSENSE_CLIENT !== 'ca-pub-XXXXXXXXXXXXXXXX';

/**
 * AdBanner Component - Google AdSense Integration
 *
 * Displays responsive Google AdSense advertisements.
 *
 * SETUP INSTRUCTIONS:
 * 1. Set VITE_ADSENSE_CLIENT in your .env file (e.g., ca-pub-1234567890123456)
 * 2. Set VITE_ADSENSE_SLOT for your default ad slot
 * 3. Test in production (AdSense only works on verified domains)
 *
 * @see https://support.google.com/adsense/answer/9274025 for ad unit setup
 */

interface AdBannerProps {
  /**
   * Ad format type:
   * - 'horizontal': Leaderboard (728x90) - Best for top/bottom of page
   * - 'rectangle': Medium Rectangle (300x250) - Best for sidebar/in-content
   * - 'vertical': Skyscraper (160x600) - Best for sidebars
   * - 'responsive': Auto-sizing (recommended for mobile-first)
   */
  format?: 'horizontal' | 'rectangle' | 'vertical' | 'responsive';

  /** Custom CSS class for styling the container */
  className?: string;

  /** Ad slot ID from your AdSense account */
  slot?: string;
}

declare global {
  interface Window {
    adsbygoogle: Array<Record<string, unknown>>;
  }
}

const DEFAULT_SLOT = import.meta.env.VITE_ADSENSE_SLOT || '';

export default function AdBanner({
  format = 'responsive',
  className = '',
  slot = DEFAULT_SLOT
}: AdBannerProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const isLoaded = useRef(false);

  useEffect(() => {
    // Don't initialize if AdSense is not configured
    if (!ADSENSE_ENABLED || !slot) return;

    // Prevent duplicate ad initialization
    if (isLoaded.current) return;

    try {
      // Initialize AdSense
      if (typeof window !== 'undefined' && adRef.current) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        isLoaded.current = true;
      }
    } catch (error) {
      // Silent fail in production - ads are non-critical
      if (import.meta.env.DEV) {
        console.error('AdSense error:', error);
      }
    }
  }, [slot]);

  // Get ad size configuration based on format
  const getAdConfig = () => {
    switch (format) {
      case 'horizontal':
        return {
          style: { display: 'inline-block', width: '728px', height: '90px' },
          responsiveClass: 'hidden md:block', // Only show on desktop
        };
      case 'rectangle':
        return {
          style: { display: 'inline-block', width: '300px', height: '250px' },
          responsiveClass: '',
        };
      case 'vertical':
        return {
          style: { display: 'inline-block', width: '160px', height: '600px' },
          responsiveClass: 'hidden lg:block', // Only show on large screens
        };
      case 'responsive':
      default:
        return {
          style: { display: 'block' },
          responsiveClass: '',
        };
    }
  };

  const config = getAdConfig();

  // Don't render anything if AdSense is not configured
  if (!ADSENSE_ENABLED || !slot) {
    return null;
  }

  return (
    <div
      ref={adRef}
      className={`ad-container overflow-hidden ${config.responsiveClass} ${className}`}
      aria-label="Advertisement"
      role="complementary"
    >
      <ins
        className="adsbygoogle"
        style={config.style}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format === 'responsive' ? 'auto' : undefined}
        data-full-width-responsive={format === 'responsive' ? 'true' : undefined}
      />
      {/* Fallback text for ad blockers or loading state */}
      <noscript>
        <div className="bg-gray-100 rounded-lg p-4 text-center text-gray-500 text-sm">
          Advertisement
        </div>
      </noscript>
    </div>
  );
}

/**
 * AdPlaceholder - Shows a placeholder when ads are disabled or loading
 * Useful for development/testing
 */
export function AdPlaceholder({
  format = 'responsive',
  className = ''
}: Pick<AdBannerProps, 'format' | 'className'>) {
  const getPlaceholderSize = () => {
    switch (format) {
      case 'horizontal':
        return 'h-[90px] max-w-[728px]';
      case 'rectangle':
        return 'h-[250px] w-[300px]';
      case 'vertical':
        return 'h-[600px] w-[160px]';
      default:
        return 'h-[100px]';
    }
  };

  return (
    <div
      className={`
        ${getPlaceholderSize()}
        bg-gradient-to-br from-gray-100 to-gray-200
        rounded-xl border-2 border-dashed border-gray-300
        flex items-center justify-center
        ${className}
      `}
    >
      <span className="text-gray-400 text-sm font-medium">Ad Space</span>
    </div>
  );
}
