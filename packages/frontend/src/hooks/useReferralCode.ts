import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

const REFERRAL_CODE_KEY = 'paircam_pending_referral_code';
const REFERRAL_APPLIED_KEY = 'paircam_referral_applied';

export interface UseReferralCodeReturn {
  pendingReferralCode: string | null;
  hasAppliedCode: boolean;
  clearPendingCode: () => void;
  markCodeAsApplied: () => void;
  setPendingCode: (code: string) => void;
}

/**
 * Hook to manage referral code from URL parameters
 *
 * Usage:
 * - When a user visits with ?ref=CODE, the code is stored in localStorage
 * - The code persists until it's applied or cleared
 * - Can be used to pre-fill referral code input during onboarding
 */
export function useReferralCode(): UseReferralCodeReturn {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pendingReferralCode, setPendingReferralCode] = useState<string | null>(null);
  const [hasAppliedCode, setHasAppliedCode] = useState(false);

  // On mount, check for referral code in URL or localStorage
  useEffect(() => {
    // Check if user already applied a code
    const applied = localStorage.getItem(REFERRAL_APPLIED_KEY);
    if (applied === 'true') {
      setHasAppliedCode(true);
      return;
    }

    // Check URL for referral code first
    const urlCode = searchParams.get('ref');
    if (urlCode && urlCode.length >= 6) {
      const normalizedCode = urlCode.toUpperCase().trim();
      localStorage.setItem(REFERRAL_CODE_KEY, normalizedCode);
      setPendingReferralCode(normalizedCode);

      // Remove the ref param from URL (clean URL)
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('ref');
      setSearchParams(newParams, { replace: true });
      return;
    }

    // Otherwise check localStorage for existing pending code
    const storedCode = localStorage.getItem(REFERRAL_CODE_KEY);
    if (storedCode) {
      setPendingReferralCode(storedCode);
    }
  }, [searchParams, setSearchParams]);

  // Clear the pending referral code
  const clearPendingCode = useCallback(() => {
    localStorage.removeItem(REFERRAL_CODE_KEY);
    setPendingReferralCode(null);
  }, []);

  // Mark the referral code as applied (user has used a code)
  const markCodeAsApplied = useCallback(() => {
    localStorage.setItem(REFERRAL_APPLIED_KEY, 'true');
    localStorage.removeItem(REFERRAL_CODE_KEY);
    setHasAppliedCode(true);
    setPendingReferralCode(null);
  }, []);

  // Set a pending code manually
  const setPendingCode = useCallback((code: string) => {
    const normalizedCode = code.toUpperCase().trim();
    localStorage.setItem(REFERRAL_CODE_KEY, normalizedCode);
    setPendingReferralCode(normalizedCode);
  }, []);

  return {
    pendingReferralCode,
    hasAppliedCode,
    clearPendingCode,
    markCodeAsApplied,
    setPendingCode,
  };
}

/**
 * Get pending referral code from localStorage (for use outside of React)
 */
export function getPendingReferralCode(): string | null {
  return localStorage.getItem(REFERRAL_CODE_KEY);
}

/**
 * Check if a referral code has been applied
 */
export function hasReferralBeenApplied(): boolean {
  return localStorage.getItem(REFERRAL_APPLIED_KEY) === 'true';
}
