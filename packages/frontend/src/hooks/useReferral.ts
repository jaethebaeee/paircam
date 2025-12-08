import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config/api';

const TOKEN_KEY = 'paircam_access_token';

export interface ReferralStats {
  referralCode: string;
  totalReferrals: number;
  qualifiedReferrals: number;
  pendingReferrals: number;
  totalCoinsEarned: number;
  currentTier: number;
  nextTierReferrals: number;
  nextTierBonus: number;
}

export interface ReferralHistoryItem {
  id: string;
  referredUserUsername?: string;
  referredUserAvatar?: string;
  coinsRewarded: number;
  isQualified: boolean;
  qualifiedAt?: string;
  createdAt: string;
}

export interface ReferralTier {
  tier: number;
  name: string;
  minReferrals: number;
  bonusPerReferral: number;
  milestoneBonus: number;
}

export interface ReferralStatus {
  hasAppliedReferralCode: boolean;
  referrerInfo: {
    referralCode: string;
    referrerUsername?: string;
  } | null;
}

export interface UseReferralReturn {
  stats: ReferralStats | null;
  history: ReferralHistoryItem[];
  tiers: ReferralTier[];
  status: ReferralStatus | null;
  isLoading: boolean;
  error: string | null;
  applyReferralCode: (code: string) => Promise<{ success: boolean; coinsAwarded: number; message: string }>;
  validateReferralCode: (code: string) => Promise<{ valid: boolean; message: string }>;
  refreshStats: () => Promise<void>;
}

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export function useReferral(): UseReferralReturn {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [history, setHistory] = useState<ReferralHistoryItem[]>([]);
  const [tiers, setTiers] = useState<ReferralTier[]>([]);
  const [status, setStatus] = useState<ReferralStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/referrals/me`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch referral stats:', err);
      throw err;
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/referrals/history`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
      const data = await response.json();
      setHistory(data.history || []);
    } catch (err) {
      console.error('Failed to fetch referral history:', err);
      throw err;
    }
  }, []);

  const fetchTiers = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/referrals/tiers`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
      const data = await response.json();
      setTiers(data.tiers || []);
    } catch (err) {
      console.error('Failed to fetch referral tiers:', err);
      throw err;
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/referrals/status`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch referral status:', err);
      throw err;
    }
  }, []);

  const refreshStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Use allSettled to continue even if some requests fail
      const results = await Promise.allSettled([
        fetchStats(),
        fetchHistory(),
        fetchTiers(),
        fetchStatus(),
      ]);

      // Check if any critical requests failed
      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        const firstError = failures[0] as PromiseRejectedResult;
        const message = firstError.reason instanceof Error
          ? firstError.reason.message
          : 'Failed to load referral data';
        setError(message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load referral data';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [fetchStats, fetchHistory, fetchTiers, fetchStatus]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const applyReferralCode = useCallback(async (code: string): Promise<{
    success: boolean;
    coinsAwarded: number;
    message: string;
  }> => {
    try {
      const response = await fetch(`${API_URL}/referrals/apply`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ referralCode: code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to apply referral code');
      }

      // Refresh stats after successful application
      await refreshStats();

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to apply referral code';
      throw new Error(message);
    }
  }, [refreshStats]);

  const validateReferralCode = useCallback(async (code: string): Promise<{
    valid: boolean;
    message: string;
  }> => {
    try {
      const response = await fetch(`${API_URL}/referrals/validate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ referralCode: code }),
      });

      const data = await response.json();
      return data;
    } catch (err) {
      return { valid: false, message: 'Failed to validate code' };
    }
  }, []);

  return {
    stats,
    history,
    tiers,
    status,
    isLoading,
    error,
    applyReferralCode,
    validateReferralCode,
    refreshStats,
  };
}
