import { useState, useEffect, useCallback } from 'react';
import { X, Crown, Clock } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import AdBanner from './AdBanner';

interface InterstitialAdProps {
  // Whether the interstitial should be shown
  isVisible: boolean;
  // Callback when user closes/skips the ad
  onClose: () => void;
  // Callback to show premium modal
  onUpgrade?: () => void;
  // Ad slot ID
  adSlot?: string;
  // Minimum display duration in seconds (user can't skip during this time)
  minDisplaySeconds?: number;
  // Auto-close after this many seconds (0 = never)
  autoCloseSeconds?: number;
  // Test mode
  testMode?: boolean;
}

/**
 * Full-screen interstitial ad displayed between matches
 * Features:
 * - Countdown timer before skip is available
 * - Upgrade to premium CTA
 * - Auto-close option
 */
export function InterstitialAd({
  isVisible,
  onClose,
  onUpgrade,
  adSlot = '0987654321',
  minDisplaySeconds = 5,
  autoCloseSeconds = 15,
  testMode = false,
}: InterstitialAdProps) {
  const [countdown, setCountdown] = useState(minDisplaySeconds);
  const [canSkip, setCanSkip] = useState(false);
  const { isPremium } = useAuthContext();

  // Reset countdown when ad becomes visible
  useEffect(() => {
    if (isVisible) {
      setCountdown(minDisplaySeconds);
      setCanSkip(false);
    }
  }, [isVisible, minDisplaySeconds]);

  // Countdown timer
  useEffect(() => {
    if (!isVisible || canSkip) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setCanSkip(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible, canSkip]);

  // Auto-close timer
  useEffect(() => {
    if (!isVisible || autoCloseSeconds === 0) return;

    const timer = setTimeout(() => {
      onClose();
    }, autoCloseSeconds * 1000);

    return () => clearTimeout(timer);
  }, [isVisible, autoCloseSeconds, onClose]);

  const handleSkip = useCallback(() => {
    if (canSkip) {
      onClose();
    }
  }, [canSkip, onClose]);

  const handleUpgrade = useCallback(() => {
    onClose();
    onUpgrade?.();
  }, [onClose, onUpgrade]);

  // Don't render for premium users or when not visible
  if (isPremium || !isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center">
      {/* Skip/Close button */}
      <button
        onClick={handleSkip}
        disabled={!canSkip}
        className={`absolute top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-full transition-all
          ${canSkip
            ? 'bg-white/20 hover:bg-white/30 text-white cursor-pointer'
            : 'bg-white/10 text-white/50 cursor-not-allowed'
          }`}
      >
        {canSkip ? (
          <>
            <X className="w-4 h-4" />
            <span>Skip Ad</span>
          </>
        ) : (
          <>
            <Clock className="w-4 h-4" />
            <span>Skip in {countdown}s</span>
          </>
        )}
      </button>

      {/* Main content */}
      <div className="max-w-lg w-full mx-4 flex flex-col items-center gap-6">
        {/* Ad container */}
        <div className="w-full bg-slate-800 rounded-xl overflow-hidden shadow-2xl">
          <AdBanner
            adSlot={adSlot}
            size="300x250"
            className="mx-auto"
            testMode={testMode}
          />
        </div>

        {/* Finding next match message */}
        <div className="text-center">
          <p className="text-white/80 text-lg">Finding your next match...</p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>

        {/* Upgrade CTA */}
        {onUpgrade && (
          <button
            onClick={handleUpgrade}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-500
              text-black font-semibold rounded-full hover:from-yellow-400 hover:to-amber-400
              transition-all shadow-lg hover:shadow-xl hover:scale-105"
          >
            <Crown className="w-5 h-5" />
            <span>Remove Ads with Premium</span>
          </button>
        )}

        {/* Ad label */}
        <p className="text-white/40 text-xs">
          Advertisement - Ads help keep PairCam free
        </p>
      </div>
    </div>
  );
}

export default InterstitialAd;
