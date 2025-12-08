import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import {
  useReferralCode,
  getPendingReferralCode,
  hasReferralBeenApplied,
} from '../useReferralCode';
import { localStorageMock } from '../../test/setup';

const REFERRAL_CODE_KEY = 'paircam_pending_referral_code';
const REFERRAL_APPLIED_KEY = 'paircam_referral_applied';

// Wrapper component to provide router context
const createWrapper = (initialEntries: string[] = ['/']) => {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      MemoryRouter,
      { initialEntries },
      children
    );
  };
};

describe('useReferralCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  describe('initial state', () => {
    it('should return null pendingReferralCode when no code exists', () => {
      const { result } = renderHook(() => useReferralCode(), {
        wrapper: createWrapper(),
      });

      expect(result.current.pendingReferralCode).toBeNull();
      expect(result.current.hasAppliedCode).toBe(false);
    });

    it('should load existing code from localStorage', () => {
      localStorageMock.setItem(REFERRAL_CODE_KEY, 'PAIRAB1234');

      const { result } = renderHook(() => useReferralCode(), {
        wrapper: createWrapper(),
      });

      expect(result.current.pendingReferralCode).toBe('PAIRAB1234');
    });

    it('should detect if user has already applied a code', () => {
      localStorageMock.setItem(REFERRAL_APPLIED_KEY, 'true');

      const { result } = renderHook(() => useReferralCode(), {
        wrapper: createWrapper(),
      });

      expect(result.current.hasAppliedCode).toBe(true);
      expect(result.current.pendingReferralCode).toBeNull();
    });
  });

  describe('URL parameter handling', () => {
    it('should extract referral code from URL', () => {
      const { result } = renderHook(() => useReferralCode(), {
        wrapper: createWrapper(['/?ref=PAIRXYZ123']),
      });

      expect(result.current.pendingReferralCode).toBe('PAIRXYZ123');
      expect(localStorageMock.getItem(REFERRAL_CODE_KEY)).toBe('PAIRXYZ123');
    });

    it('should normalize code to uppercase', () => {
      const { result } = renderHook(() => useReferralCode(), {
        wrapper: createWrapper(['/?ref=pairxyz123']),
      });

      expect(result.current.pendingReferralCode).toBe('PAIRXYZ123');
    });

    it('should trim whitespace from code', () => {
      const { result } = renderHook(() => useReferralCode(), {
        wrapper: createWrapper(['/?ref=  PAIRXYZ123  ']),
      });

      expect(result.current.pendingReferralCode).toBe('PAIRXYZ123');
    });

    it('should ignore codes shorter than 6 characters', () => {
      const { result } = renderHook(() => useReferralCode(), {
        wrapper: createWrapper(['/?ref=SHORT']),
      });

      expect(result.current.pendingReferralCode).toBeNull();
    });

    it('should not overwrite existing pending code if URL has no ref param', () => {
      localStorageMock.setItem(REFERRAL_CODE_KEY, 'EXISTINGCODE');

      const { result } = renderHook(() => useReferralCode(), {
        wrapper: createWrapper(['/some-page']),
      });

      expect(result.current.pendingReferralCode).toBe('EXISTINGCODE');
    });

    it('should not process URL code if user already applied a code', () => {
      localStorageMock.setItem(REFERRAL_APPLIED_KEY, 'true');

      const { result } = renderHook(() => useReferralCode(), {
        wrapper: createWrapper(['/?ref=PAIRXYZ123']),
      });

      expect(result.current.pendingReferralCode).toBeNull();
      expect(result.current.hasAppliedCode).toBe(true);
    });
  });

  describe('clearPendingCode', () => {
    it('should clear pending code from state and localStorage', () => {
      localStorageMock.setItem(REFERRAL_CODE_KEY, 'PAIRAB1234');

      const { result } = renderHook(() => useReferralCode(), {
        wrapper: createWrapper(),
      });

      expect(result.current.pendingReferralCode).toBe('PAIRAB1234');

      act(() => {
        result.current.clearPendingCode();
      });

      expect(result.current.pendingReferralCode).toBeNull();
      expect(localStorageMock.getItem(REFERRAL_CODE_KEY)).toBeNull();
    });
  });

  describe('markCodeAsApplied', () => {
    it('should mark code as applied and clear pending code', () => {
      localStorageMock.setItem(REFERRAL_CODE_KEY, 'PAIRAB1234');

      const { result } = renderHook(() => useReferralCode(), {
        wrapper: createWrapper(),
      });

      expect(result.current.pendingReferralCode).toBe('PAIRAB1234');
      expect(result.current.hasAppliedCode).toBe(false);

      act(() => {
        result.current.markCodeAsApplied();
      });

      expect(result.current.pendingReferralCode).toBeNull();
      expect(result.current.hasAppliedCode).toBe(true);
      expect(localStorageMock.getItem(REFERRAL_CODE_KEY)).toBeNull();
      expect(localStorageMock.getItem(REFERRAL_APPLIED_KEY)).toBe('true');
    });
  });

  describe('setPendingCode', () => {
    it('should set a new pending code', () => {
      const { result } = renderHook(() => useReferralCode(), {
        wrapper: createWrapper(),
      });

      expect(result.current.pendingReferralCode).toBeNull();

      act(() => {
        result.current.setPendingCode('NEWCODE123');
      });

      expect(result.current.pendingReferralCode).toBe('NEWCODE123');
      expect(localStorageMock.getItem(REFERRAL_CODE_KEY)).toBe('NEWCODE123');
    });

    it('should normalize the code to uppercase', () => {
      const { result } = renderHook(() => useReferralCode(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setPendingCode('lowercase123');
      });

      expect(result.current.pendingReferralCode).toBe('LOWERCASE123');
    });

    it('should trim whitespace', () => {
      const { result } = renderHook(() => useReferralCode(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setPendingCode('  SPACED123  ');
      });

      expect(result.current.pendingReferralCode).toBe('SPACED123');
    });

    it('should overwrite existing pending code', () => {
      localStorageMock.setItem(REFERRAL_CODE_KEY, 'OLDCODE123');

      const { result } = renderHook(() => useReferralCode(), {
        wrapper: createWrapper(),
      });

      expect(result.current.pendingReferralCode).toBe('OLDCODE123');

      act(() => {
        result.current.setPendingCode('NEWCODE456');
      });

      expect(result.current.pendingReferralCode).toBe('NEWCODE456');
    });
  });
});

describe('getPendingReferralCode', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should return null when no code is stored', () => {
    expect(getPendingReferralCode()).toBeNull();
  });

  it('should return stored code', () => {
    localStorageMock.setItem(REFERRAL_CODE_KEY, 'PAIRAB1234');
    expect(getPendingReferralCode()).toBe('PAIRAB1234');
  });
});

describe('hasReferralBeenApplied', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should return false when no code has been applied', () => {
    expect(hasReferralBeenApplied()).toBe(false);
  });

  it('should return true when a code has been applied', () => {
    localStorageMock.setItem(REFERRAL_APPLIED_KEY, 'true');
    expect(hasReferralBeenApplied()).toBe(true);
  });

  it('should return false for invalid values', () => {
    localStorageMock.setItem(REFERRAL_APPLIED_KEY, 'false');
    expect(hasReferralBeenApplied()).toBe(false);
  });
});
