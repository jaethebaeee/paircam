import { useEffect, useRef } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

type AdFormat = 'auto' | 'rectangle' | 'horizontal' | 'vertical';
type AdSize = 'responsive' | '300x250' | '728x90' | '320x100' | '160x600';

interface AdBannerProps {
  // Ad unit ID from AdSense (e.g., "1234567890")
  adSlot: string;
  // Ad format for responsive sizing
  format?: AdFormat;
  // Fixed size (overrides format if set)
  size?: AdSize;
  // Additional CSS classes
  className?: string;
  // Test mode (shows placeholder instead of real ads)
  testMode?: boolean;
  // Callback when ad loads
  onLoad?: () => void;
  // Callback when ad fails
  onError?: (error: Error) => void;
}

/**
 * Reusable AdSense banner component
 * Automatically hides for premium users
 */
export function AdBanner({
  adSlot,
  format = 'auto',
  size = 'responsive',
  className = '',
  testMode = false,
  onLoad,
  onError,
}: AdBannerProps) {
  const adRef = useRef<HTMLModElement>(null);
  const { isPremium } = useAuthContext();

  // Get size styles
  const getSizeStyles = (): React.CSSProperties => {
    if (size === 'responsive') {
      return {
        display: 'block',
        width: '100%',
        height: 'auto',
      };
    }

    const [width, height] = size.split('x').map(Number);
    return {
      display: 'inline-block',
      width: `${width}px`,
      height: `${height}px`,
    };
  };

  useEffect(() => {
    // Don't load ads for premium users
    if (isPremium) return;

    // Don't load in test mode
    if (testMode) return;

    try {
      // Push ad to adsbygoogle queue
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      onLoad?.();
    } catch (error) {
      console.error('AdSense error:', error);
      onError?.(error instanceof Error ? error : new Error('Ad load failed'));
    }
  }, [isPremium, testMode, onLoad, onError]);

  // Don't render for premium users
  if (isPremium) {
    return null;
  }

  // Test mode placeholder
  if (testMode) {
    const styles = getSizeStyles();
    return (
      <div
        className={`bg-slate-200 border-2 border-dashed border-slate-400 flex items-center justify-center text-slate-500 font-medium ${className}`}
        style={{
          ...styles,
          minHeight: size === 'responsive' ? '90px' : undefined,
        }}
      >
        <span>Ad Placeholder ({size})</span>
      </div>
    );
  }

  return (
    <ins
      ref={adRef}
      className={`adsbygoogle ${className}`}
      style={getSizeStyles()}
      data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
      data-ad-slot={adSlot}
      data-ad-format={format}
      data-full-width-responsive={size === 'responsive' ? 'true' : 'false'}
    />
  );
}

export default AdBanner;
