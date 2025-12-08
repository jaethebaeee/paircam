import { useEffect, useRef } from 'react';

/**
 * Google AdSense Ad Unit Component
 *
 * Setup Instructions:
 * 1. Sign up for Google AdSense (https://www.google.com/adsense/)
 * 2. Get your Publisher ID (ca-pub-XXXXXXXXXXXXXXXX)
 * 3. Replace the placeholder in index.html
 * 4. Create ad units in AdSense and use their slot IDs
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
    // Only load ad once and if adsbygoogle is available
    if (isAdLoaded.current) return;

    try {
      if (typeof window !== 'undefined' && window.adsbygoogle) {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
        isAdLoaded.current = true;
      }
    } catch (error) {
      console.error('AdSense error:', error);
    }
  }, []);

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
        data-ad-client="ca-pub-3331898410671902"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
}

/**
 * Pre-configured ad units for common placements
 */

// Header/Top banner ad
export function HeaderAd() {
  return (
    <AdUnit
      slot="HEADER_AD_SLOT_ID" // Replace with actual slot ID
      format="horizontal"
      className="my-4"
    />
  );
}

// Sidebar ad (300x600)
export function SidebarAd() {
  return (
    <AdUnit
      slot="SIDEBAR_AD_SLOT_ID" // Replace with actual slot ID
      format="vertical"
      className="sticky top-24"
      style={{ minHeight: 600, width: 300 }}
    />
  );
}

// In-article ad (placed between content sections)
export function InArticleAd() {
  return (
    <div className="my-8 flex justify-center">
      <AdUnit
        slot="IN_ARTICLE_AD_SLOT_ID" // Replace with actual slot ID
        format="auto"
        className="w-full max-w-2xl"
      />
    </div>
  );
}

// Blog list feed ad (appears between blog posts)
export function FeedAd() {
  return (
    <div className="bg-gray-50 rounded-2xl p-4 my-4">
      <p className="text-xs text-gray-400 text-center mb-2">Advertisement</p>
      <AdUnit
        slot="FEED_AD_SLOT_ID" // Replace with actual slot ID
        format="auto"
      />
    </div>
  );
}

// Footer ad
export function FooterAd() {
  return (
    <div className="bg-gray-100 py-4">
      <div className="max-w-6xl mx-auto px-4">
        <AdUnit
          slot="FOOTER_AD_SLOT_ID" // Replace with actual slot ID
          format="horizontal"
        />
      </div>
    </div>
  );
}
