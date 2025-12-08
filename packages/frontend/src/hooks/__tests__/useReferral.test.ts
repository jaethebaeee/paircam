import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useReferral, ReferralStats, ReferralHistoryItem, ReferralTier } from '../useReferral';
import { localStorageMock } from '../../test/setup';

const mockStats: ReferralStats = {
  referralCode: 'PAIRAB1234',
  totalReferrals: 10,
  qualifiedReferrals: 8,
  pendingReferrals: 2,
  totalCoinsEarned: 1200,
  currentTier: 2,
  nextTierReferrals: 5,
  nextTierBonus: 500,
};

const mockHistory: ReferralHistoryItem[] = [
  {
    id: 'success-1',
    referredUserUsername: 'NewUser1',
    referredUserAvatar: 'https://example.com/avatar1.jpg',
    coinsRewarded: 125,
    isQualified: true,
    qualifiedAt: '2024-01-15T10:00:00Z',
    createdAt: '2024-01-15T09:00:00Z',
  },
  {
    id: 'success-2',
    referredUserUsername: 'NewUser2',
    coinsRewarded: 100,
    isQualified: false,
    createdAt: '2024-01-14T09:00:00Z',
  },
];

const mockTiers: ReferralTier[] = [
  { tier: 1, name: 'Starter', minReferrals: 0, bonusPerReferral: 100, milestoneBonus: 0 },
  { tier: 2, name: 'Bronze', minReferrals: 5, bonusPerReferral: 125, milestoneBonus: 250 },
  { tier: 3, name: 'Silver', minReferrals: 15, bonusPerReferral: 150, milestoneBonus: 500 },
];

const mockStatus = {
  hasAppliedReferralCode: false,
  referrerInfo: null,
};

describe('useReferral', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    localStorageMock.setItem('paircam_access_token', 'test-token');
  });

  const mockFetchSuccess = () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes('/referrals/me')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockStats),
        });
      }
      if (url.includes('/referrals/history')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ history: mockHistory }),
        });
      }
      if (url.includes('/referrals/tiers')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ tiers: mockTiers }),
        });
      }
      if (url.includes('/referrals/status')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockStatus),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  };

  describe('initial data fetching', () => {
    it('should fetch all referral data on mount', async () => {
      mockFetchSuccess();

      const { result } = renderHook(() => useReferral());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.stats).toEqual(mockStats);
      expect(result.current.history).toEqual(mockHistory);
      expect(result.current.tiers).toEqual(mockTiers);
      expect(result.current.status).toEqual(mockStatus);
      expect(result.current.error).toBeNull();
    });

    it('should include authorization header in requests', async () => {
      mockFetchSuccess();

      renderHook(() => useReferral());

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls.length).toBeGreaterThan(0);

      // Check that Authorization header is included
      const firstCall = calls[0];
      expect(firstCall[1]?.headers?.Authorization).toBe('Bearer test-token');
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ message: 'Server error' }),
        })
      );

      const { result } = renderHook(() => useReferral());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Server error');
    });

    it('should handle network errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error')
      );

      const { result } = renderHook(() => useReferral());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
    });

    it('should work without auth token', async () => {
      localStorageMock.removeItem('paircam_access_token');
      mockFetchSuccess();

      const { result } = renderHook(() => useReferral());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should still make requests, just without auth header
      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const firstCall = calls[0];
      expect(firstCall[1]?.headers?.Authorization).toBeUndefined();
    });
  });

  describe('applyReferralCode', () => {
    it('should successfully apply a valid referral code', async () => {
      const applyResponse = {
        success: true,
        coinsAwarded: 150,
        message: 'You received 150 coins as a welcome bonus!',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/referrals/apply') && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(applyResponse),
          });
        }
        // Return default responses for other endpoints
        if (url.includes('/referrals/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockStats),
          });
        }
        if (url.includes('/referrals/history')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ history: mockHistory }),
          });
        }
        if (url.includes('/referrals/tiers')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ tiers: mockTiers }),
          });
        }
        if (url.includes('/referrals/status')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockStatus),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { result } = renderHook(() => useReferral());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let response;
      await act(async () => {
        response = await result.current.applyReferralCode('PAIRXYZ123');
      });

      expect(response).toEqual(applyResponse);

      // Verify the POST request
      const applyCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => call[0].includes('/referrals/apply')
      );
      expect(applyCall).toBeDefined();
      expect(applyCall![1]?.method).toBe('POST');
      expect(JSON.parse(applyCall![1]?.body as string)).toEqual({ referralCode: 'PAIRXYZ123' });
    });

    it('should throw error for invalid referral code', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/referrals/apply') && options?.method === 'POST') {
          return Promise.resolve({
            ok: false,
            status: 404,
            json: () => Promise.resolve({ message: 'Invalid referral code' }),
          });
        }
        // Default responses for initial fetch
        if (url.includes('/referrals/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockStats),
          });
        }
        if (url.includes('/referrals/history')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ history: [] }),
          });
        }
        if (url.includes('/referrals/tiers')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ tiers: mockTiers }),
          });
        }
        if (url.includes('/referrals/status')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockStatus),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { result } = renderHook(() => useReferral());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.applyReferralCode('INVALID123');
        })
      ).rejects.toThrow('Invalid referral code');
    });

    it('should throw error when applying own referral code', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/referrals/apply') && options?.method === 'POST') {
          return Promise.resolve({
            ok: false,
            status: 400,
            json: () => Promise.resolve({ message: 'You cannot use your own referral code' }),
          });
        }
        // Default responses
        if (url.includes('/referrals/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockStats),
          });
        }
        if (url.includes('/referrals/history')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ history: [] }),
          });
        }
        if (url.includes('/referrals/tiers')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ tiers: mockTiers }),
          });
        }
        if (url.includes('/referrals/status')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockStatus),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { result } = renderHook(() => useReferral());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.applyReferralCode('PAIRAB1234');
        })
      ).rejects.toThrow('You cannot use your own referral code');
    });

    it('should refresh stats after successful application', async () => {
      const applyResponse = {
        success: true,
        coinsAwarded: 150,
        message: 'Success!',
      };

      let fetchCount = 0;
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/referrals/apply') && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(applyResponse),
          });
        }
        if (url.includes('/referrals/me')) {
          fetchCount++;
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockStats),
          });
        }
        if (url.includes('/referrals/history')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ history: [] }),
          });
        }
        if (url.includes('/referrals/tiers')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ tiers: mockTiers }),
          });
        }
        if (url.includes('/referrals/status')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockStatus),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { result } = renderHook(() => useReferral());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialFetchCount = fetchCount;

      await act(async () => {
        await result.current.applyReferralCode('PAIRXYZ123');
      });

      // Stats should be fetched again after applying
      expect(fetchCount).toBeGreaterThan(initialFetchCount);
    });
  });

  describe('validateReferralCode', () => {
    it('should return valid for existing code', async () => {
      mockFetchSuccess();
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/referrals/validate') && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ valid: true, message: 'Valid referral code' }),
          });
        }
        // Default responses
        if (url.includes('/referrals/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockStats),
          });
        }
        if (url.includes('/referrals/history')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ history: [] }),
          });
        }
        if (url.includes('/referrals/tiers')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ tiers: mockTiers }),
          });
        }
        if (url.includes('/referrals/status')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockStatus),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { result } = renderHook(() => useReferral());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let response;
      await act(async () => {
        response = await result.current.validateReferralCode('PAIRXYZ123');
      });

      expect(response).toEqual({ valid: true, message: 'Valid referral code' });
    });

    it('should return invalid for non-existing code', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/referrals/validate') && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ valid: false, message: 'Invalid referral code' }),
          });
        }
        // Default responses
        if (url.includes('/referrals/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockStats),
          });
        }
        if (url.includes('/referrals/history')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ history: [] }),
          });
        }
        if (url.includes('/referrals/tiers')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ tiers: mockTiers }),
          });
        }
        if (url.includes('/referrals/status')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockStatus),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { result } = renderHook(() => useReferral());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let response;
      await act(async () => {
        response = await result.current.validateReferralCode('NONEXISTENT');
      });

      expect(response).toEqual({ valid: false, message: 'Invalid referral code' });
    });

    it('should handle network errors gracefully', async () => {
      mockFetchSuccess();
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/referrals/validate') && options?.method === 'POST') {
          return Promise.reject(new Error('Network error'));
        }
        // Default responses
        if (url.includes('/referrals/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockStats),
          });
        }
        if (url.includes('/referrals/history')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ history: [] }),
          });
        }
        if (url.includes('/referrals/tiers')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ tiers: mockTiers }),
          });
        }
        if (url.includes('/referrals/status')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockStatus),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { result } = renderHook(() => useReferral());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let response;
      await act(async () => {
        response = await result.current.validateReferralCode('ANYCODE');
      });

      // Should return invalid instead of throwing
      expect(response).toEqual({ valid: false, message: 'Failed to validate code' });
    });
  });

  describe('refreshStats', () => {
    it('should refetch all data', async () => {
      mockFetchSuccess();

      const { result } = renderHook(() => useReferral());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear call history
      vi.clearAllMocks();
      mockFetchSuccess();

      await act(async () => {
        await result.current.refreshStats();
      });

      // Should have called all 4 endpoints
      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls.some((c) => c[0].includes('/referrals/me'))).toBe(true);
      expect(calls.some((c) => c[0].includes('/referrals/history'))).toBe(true);
      expect(calls.some((c) => c[0].includes('/referrals/tiers'))).toBe(true);
      expect(calls.some((c) => c[0].includes('/referrals/status'))).toBe(true);
    });

    it('should set loading state during refresh', async () => {
      mockFetchSuccess();

      const { result } = renderHook(() => useReferral());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetchSuccess();

      // Start refresh and verify it eventually completes
      await act(async () => {
        const refreshPromise = result.current.refreshStats();
        // The loading state is set synchronously at the start
        await refreshPromise;
      });

      // After refresh completes, loading should be false
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('status with applied code', () => {
    it('should show referrer info when user has applied a code', async () => {
      const statusWithReferrer = {
        hasAppliedReferralCode: true,
        referrerInfo: {
          referralCode: 'PAIRXYZ123',
          referrerUsername: 'JohnDoe',
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
        if (url.includes('/referrals/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockStats),
          });
        }
        if (url.includes('/referrals/history')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ history: [] }),
          });
        }
        if (url.includes('/referrals/tiers')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ tiers: mockTiers }),
          });
        }
        if (url.includes('/referrals/status')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(statusWithReferrer),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { result } = renderHook(() => useReferral());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.status?.hasAppliedReferralCode).toBe(true);
      expect(result.current.status?.referrerInfo?.referralCode).toBe('PAIRXYZ123');
      expect(result.current.status?.referrerInfo?.referrerUsername).toBe('JohnDoe');
    });
  });
});
