/**
 * Ad Banner Component
 * Shows ads to non-premium users
 * Includes dismiss and upgrade options
 */

import { useState, useEffect } from 'react';

interface AdBannerProps {
  isPremium: boolean;
  placement: 'top' | 'bottom' | 'sidebar' | 'interstitial';
  onUpgrade?: () => void;
  onClose?: () => void;
  showAfterSeconds?: number;
}

export default function AdBanner({
  isPremium,
  placement,
  onUpgrade,
  onClose,
  showAfterSeconds = 0,
}: AdBannerProps) {
  const [visible, setVisible] = useState(showAfterSeconds === 0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (showAfterSeconds > 0 && !isPremium) {
      const timer = setTimeout(() => {
        setVisible(true);
      }, showAfterSeconds * 1000);
      return () => clearTimeout(timer);
    }
  }, [showAfterSeconds, isPremium]);

  // Don't show for premium users
  if (isPremium || dismissed || !visible) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    onClose?.();
  };

  // Interstitial (full screen)
  if (placement === 'interstitial') {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in">
        <div className="bg-white rounded-3xl max-w-lg w-full p-6 relative">
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Ad content */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📺</span>
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Advertisement</p>
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl h-[250px] flex items-center justify-center mb-4">
              {/* AdSense placeholder - replace with actual ad code */}
              <div className="text-center text-gray-400">
                <p className="text-sm">Ad Space</p>
                <p className="text-xs">300x250</p>
              </div>
            </div>
          </div>

          {/* Upgrade CTA */}
          <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-4 mb-4">
            <p className="text-center text-gray-700 mb-3">
              <span className="font-semibold">Remove all ads</span> with Premium
            </p>
            <button
              onClick={onUpgrade}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
            >
              Upgrade for $2.99/week
            </button>
          </div>

          <button
            onClick={handleDismiss}
            className="w-full py-2 text-gray-500 text-sm hover:text-gray-700 transition-colors"
          >
            Continue with ads
          </button>
        </div>
      </div>
    );
  }

  // Top banner
  if (placement === 'top') {
    return (
      <div className="bg-gradient-to-r from-gray-100 to-gray-200 border-b border-gray-300 py-2 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-gray-500 mr-2">Ad</p>
            <div className="bg-white rounded px-4 py-1 text-sm text-gray-600">
              {/* AdSense placeholder */}
              728x90 Leaderboard Ad
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onUpgrade}
              className="text-xs px-3 py-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full font-medium hover:shadow-md transition-all"
            >
              Remove Ads
            </button>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Bottom banner
  if (placement === 'bottom') {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 animate-slide-up">
        <div className="max-w-6xl mx-auto p-3 flex items-center justify-between gap-4">
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-gray-400 mr-2">Sponsored</p>
            <div className="bg-gray-100 rounded-lg px-6 py-2 text-sm text-gray-500">
              {/* AdSense placeholder */}
              320x50 Mobile Banner
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onUpgrade}
              className="text-xs px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full font-bold hover:shadow-md transition-all flex items-center gap-1"
            >
              <span>Go Premium</span>
              <span className="text-yellow-200">→</span>
            </button>
            <button
              onClick={handleDismiss}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Sidebar
  if (placement === 'sidebar') {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="p-4">
          <p className="text-xs text-gray-400 mb-2 text-center">Advertisement</p>
          <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl h-[250px] flex items-center justify-center mb-4">
            {/* AdSense placeholder */}
            <div className="text-center text-gray-400">
              <p className="text-sm">Ad Space</p>
              <p className="text-xs">300x250</p>
            </div>
          </div>
          <button
            onClick={onUpgrade}
            className="w-full py-2 text-sm text-pink-600 font-medium hover:bg-pink-50 rounded-lg transition-colors"
          >
            Remove ads →
          </button>
        </div>
      </div>
    );
  }

  return null;
}
