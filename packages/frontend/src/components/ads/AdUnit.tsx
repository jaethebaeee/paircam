import { useEffect, useRef } from 'react';

// AdSense configuration from environment variables
const ADSENSE_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT || '';
const ADSENSE_ENABLED = !!ADSENSE_CLIENT && ADSENSE_CLIENT !== 'ca-pub-XXXXXXXXXXXXXXXX';

/**
 * Google AdSense Ad Unit Component
 *
 * Setup Instructions:
 * 1. Set VITE_ADSENSE_CLIENT in your .env file (e.g., ca-pub-1234567890123456)
 * 2. Set slot IDs via VITE_ADSENSE_SLOT_* environment variables
 * 3. Create ad units in AdSense dashboard and use their slot IDs
 *
 * Ad Unit Types:
 * - 'banner': Horizontal banner (728x90 or responsive)
 * - 'rectangle': Medium rectangle (300x250)
 * - 'sidebar': Sidebar ad (300x600)
 * - 'in-article': In-article native ad
 * - 'in-feed': In-feed native ad
 */

interface AdUnitProps {
  slot: string; // AdSense ad slot ID
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical';
  responsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

// Extend window for adsbygoogle
declare global {
  interface Window {
    adsbygoogle: Record<string, unknown>[];
  }
}

export default function AdUnit({
  slot,
  format = 'auto',
  responsive = true,
  className = '',
  style,
}: AdUnitProps) {
  const adRef = useRef<HTMLModElement>(null);
  const isAdLoaded = useRef(false);

  useEffect(() => {
    // Don't load if AdSense is not configured
    if (!ADSENSE_ENABLED || !slot) return;

    // Only load ad once and if adsbygoogle is available
    if (isAdLoaded.current) return;

    try {
      if (typeof window !== 'undefined' && window.adsbygoogle) {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
        isAdLoaded.current = true;
      }
    } catch (error) {
      // Silent fail in production - ads are non-critical
      if (import.meta.env.DEV) {
        console.error('AdSense error:', error);
      }
    }
  }, [slot]);

  // Don't render if AdSense is not configured
  if (!ADSENSE_ENABLED || !slot) {
    return null;
  }

  return (
    <div className={`ad-container ${className}`} style={style}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{
          display: 'block',
          textAlign: 'center',
          ...style,
        }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
}

