import { useState, useCallback, useRef, useEffect } from 'react';

interface AdFrequencyConfig {
  // Show interstitial every N matches (randomized between min and max)
  minMatchesBetweenAds: number;
  maxMatchesBetweenAds: number;
  // Minimum seconds between any ad display
  minSecondsBetweenAds: number;
  // Session storage key for persistence
  storageKey: string;
}

interface AdFrequencyState {
  matchCount: number;
  lastAdShownAt: number | null;
  nextAdAtMatch: number;
}

const DEFAULT_CONFIG: AdFrequencyConfig = {
  minMatchesBetweenAds: 3,
  maxMatchesBetweenAds: 5,
  minSecondsBetweenAds: 30,
  storageKey: 'paircam_ad_frequency',
};

/**
 * Hook for managing ad frequency capping
 * Shows interstitial ads every 3-5 matches (randomized to feel natural)
 */
export function useAdFrequency(config: Partial<AdFrequencyConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Generate random number between min and max (inclusive)
  const getRandomMatchInterval = useCallback(() => {
    const { minMatchesBetweenAds, maxMatchesBetweenAds } = finalConfig;
    return Math.floor(Math.random() * (maxMatchesBetweenAds - minMatchesBetweenAds + 1)) + minMatchesBetweenAds;
  }, [finalConfig]);

  // Initialize state from session storage or defaults
  const getInitialState = useCallback((): AdFrequencyState => {
    try {
      const stored = sessionStorage.getItem(finalConfig.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load ad frequency state:', e);
    }
    return {
      matchCount: 0,
      lastAdShownAt: null,
      nextAdAtMatch: getRandomMatchInterval(),
    };
  }, [finalConfig.storageKey, getRandomMatchInterval]);

  const [state, setState] = useState<AdFrequencyState>(getInitialState);
  const isShowingAdRef = useRef(false);

  // Persist state to session storage
  useEffect(() => {
    try {
      sessionStorage.setItem(finalConfig.storageKey, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save ad frequency state:', e);
    }
  }, [state, finalConfig.storageKey]);

  /**
   * Check if we should show an interstitial ad
   * Call this when a match ends (before finding next match)
   */
  const shouldShowInterstitial = useCallback((): boolean => {
    // Don't show if already showing
    if (isShowingAdRef.current) return false;

    // Check match count threshold
    if (state.matchCount < state.nextAdAtMatch) return false;

    // Check time since last ad
    if (state.lastAdShownAt) {
      const secondsSinceLastAd = (Date.now() - state.lastAdShownAt) / 1000;
      if (secondsSinceLastAd < finalConfig.minSecondsBetweenAds) return false;
    }

    return true;
  }, [state, finalConfig.minSecondsBetweenAds]);

  /**
   * Record that a match occurred
   * Call this each time user gets matched
   */
  const recordMatch = useCallback(() => {
    setState(prev => ({
      ...prev,
      matchCount: prev.matchCount + 1,
    }));
  }, []);

  /**
   * Record that an ad was shown
   * Resets the counter and sets next random interval
   */
  const recordAdShown = useCallback(() => {
    isShowingAdRef.current = false;
    setState(prev => ({
      matchCount: 0,
      lastAdShownAt: Date.now(),
      nextAdAtMatch: getRandomMatchInterval(),
    }));
  }, [getRandomMatchInterval]);

  /**
   * Mark that an ad is currently being displayed
   */
  const markAdShowing = useCallback(() => {
    isShowingAdRef.current = true;
  }, []);

  /**
   * Skip recording ad (user closed early, ad failed to load, etc.)
   */
  const skipAd = useCallback(() => {
    isShowingAdRef.current = false;
  }, []);

  /**
   * Reset all state (e.g., on session end)
   */
  const reset = useCallback(() => {
    setState({
      matchCount: 0,
      lastAdShownAt: null,
      nextAdAtMatch: getRandomMatchInterval(),
    });
    isShowingAdRef.current = false;
    try {
      sessionStorage.removeItem(finalConfig.storageKey);
    } catch (e) {
      // Ignore storage errors
    }
  }, [finalConfig.storageKey, getRandomMatchInterval]);

  return {
    // State
    matchCount: state.matchCount,
    matchesUntilNextAd: Math.max(0, state.nextAdAtMatch - state.matchCount),

    // Actions
    shouldShowInterstitial,
    recordMatch,
    recordAdShown,
    markAdShowing,
    skipAd,
    reset,
  };
}

export default useAdFrequency;
