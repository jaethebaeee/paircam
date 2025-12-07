/**
 * Freemium Limits Hook
 * Tracks daily usage for free tier users and enforces limits
 */

import { useState, useEffect, useCallback } from 'react';

// Free tier limits
export const FREE_TIER_LIMITS = {
  DAILY_MATCHES: 10,           // Max matches per day
  DAILY_SKIPS: 50,            // Max skips per day
  SESSION_DURATION: 60 * 60,   // Max session duration in seconds (1 hour)
};

interface UsageData {
  matchCount: number;
  skipCount: number;
  sessionStartTime: number | null;
  lastResetDate: string;
}

const STORAGE_KEY = 'paircam_usage_data';

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getDefaultUsageData(): UsageData {
  return {
    matchCount: 0,
    skipCount: 0,
    sessionStartTime: null,
    lastResetDate: getToday(),
  };
}

function loadUsageData(): UsageData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return getDefaultUsageData();

    const data: UsageData = JSON.parse(stored);

    // Reset if it's a new day
    if (data.lastResetDate !== getToday()) {
      return getDefaultUsageData();
    }

    return data;
  } catch {
    return getDefaultUsageData();
  }
}

function saveUsageData(data: UsageData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage might be full or disabled
  }
}

export interface FreemiumLimitsResult {
  // Current usage
  matchCount: number;
  skipCount: number;
  sessionDuration: number;

  // Limits
  maxMatches: number;
  maxSkips: number;
  maxSessionDuration: number;

  // Status
  canMatch: boolean;
  canSkip: boolean;
  isSessionExpired: boolean;

  // Remaining
  matchesRemaining: number;
  skipsRemaining: number;
  sessionTimeRemaining: number;

  // Actions
  incrementMatch: () => boolean;
  incrementSkip: () => boolean;
  startSession: () => void;
  endSession: () => void;
  resetDailyLimits: () => void;
}

export function useFreemiumLimits(isPremium: boolean): FreemiumLimitsResult {
  const [usageData, setUsageData] = useState<UsageData>(loadUsageData);
  const [sessionDuration, setSessionDuration] = useState(0);

  // Check if it's a new day and reset
  useEffect(() => {
    const today = getToday();
    if (usageData.lastResetDate !== today) {
      const newData = getDefaultUsageData();
      setUsageData(newData);
      saveUsageData(newData);
    }
  }, [usageData.lastResetDate]);

  // Track session duration
  useEffect(() => {
    if (!usageData.sessionStartTime) {
      setSessionDuration(0);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const duration = Math.floor((now - usageData.sessionStartTime!) / 1000);
      setSessionDuration(duration);
    }, 1000);

    return () => clearInterval(interval);
  }, [usageData.sessionStartTime]);

  // Premium users have no limits
  if (isPremium) {
    return {
      matchCount: 0,
      skipCount: 0,
      sessionDuration: 0,
      maxMatches: Infinity,
      maxSkips: Infinity,
      maxSessionDuration: Infinity,
      canMatch: true,
      canSkip: true,
      isSessionExpired: false,
      matchesRemaining: Infinity,
      skipsRemaining: Infinity,
      sessionTimeRemaining: Infinity,
      incrementMatch: () => true,
      incrementSkip: () => true,
      startSession: () => {},
      endSession: () => {},
      resetDailyLimits: () => {},
    };
  }

  const canMatch = usageData.matchCount < FREE_TIER_LIMITS.DAILY_MATCHES;
  const canSkip = usageData.skipCount < FREE_TIER_LIMITS.DAILY_SKIPS;
  const isSessionExpired = sessionDuration >= FREE_TIER_LIMITS.SESSION_DURATION;

  const incrementMatch = useCallback((): boolean => {
    if (!canMatch) return false;

    const newData = {
      ...usageData,
      matchCount: usageData.matchCount + 1,
    };
    setUsageData(newData);
    saveUsageData(newData);
    return true;
  }, [usageData, canMatch]);

  const incrementSkip = useCallback((): boolean => {
    if (!canSkip) return false;

    const newData = {
      ...usageData,
      skipCount: usageData.skipCount + 1,
    };
    setUsageData(newData);
    saveUsageData(newData);
    return true;
  }, [usageData, canSkip]);

  const startSession = useCallback((): void => {
    if (usageData.sessionStartTime) return;

    const newData = {
      ...usageData,
      sessionStartTime: Date.now(),
    };
    setUsageData(newData);
    saveUsageData(newData);
  }, [usageData]);

  const endSession = useCallback((): void => {
    const newData = {
      ...usageData,
      sessionStartTime: null,
    };
    setUsageData(newData);
    saveUsageData(newData);
    setSessionDuration(0);
  }, [usageData]);

  const resetDailyLimits = useCallback((): void => {
    const newData = getDefaultUsageData();
    setUsageData(newData);
    saveUsageData(newData);
  }, []);

  return {
    matchCount: usageData.matchCount,
    skipCount: usageData.skipCount,
    sessionDuration,
    maxMatches: FREE_TIER_LIMITS.DAILY_MATCHES,
    maxSkips: FREE_TIER_LIMITS.DAILY_SKIPS,
    maxSessionDuration: FREE_TIER_LIMITS.SESSION_DURATION,
    canMatch,
    canSkip,
    isSessionExpired,
    matchesRemaining: Math.max(0, FREE_TIER_LIMITS.DAILY_MATCHES - usageData.matchCount),
    skipsRemaining: Math.max(0, FREE_TIER_LIMITS.DAILY_SKIPS - usageData.skipCount),
    sessionTimeRemaining: Math.max(0, FREE_TIER_LIMITS.SESSION_DURATION - sessionDuration),
    incrementMatch,
    incrementSkip,
    startSession,
    endSession,
    resetDailyLimits,
  };
}
