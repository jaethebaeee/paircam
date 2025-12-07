import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { localStorageMock } from '../../test/setup';

describe('useAuth', () => {
  const mockFetch = global.fetch as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  describe('initialization', () => {
    it('should initialize with loading state', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ accessToken: 'mock-token' }),
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should create device ID if not exists', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ accessToken: 'mock-token' }),
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'paircam_device_id',
        expect.any(String)
      );
      expect(result.current.deviceId).not.toBeNull();
    });

    it('should use existing device ID', async () => {
      localStorageMock.store['paircam_device_id'] = 'existing-device-id';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ accessToken: 'mock-token' }),
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.deviceId).toBe('existing-device-id');
    });
  });

  describe('auto-authentication', () => {
    it('should verify existing token on mount', async () => {
      localStorageMock.store['paircam_access_token'] = 'existing-token';
      localStorageMock.store['paircam_device_id'] = 'device-123';

      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/verify'),
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer existing-token',
          },
        })
      );
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.accessToken).toBe('existing-token');
    });

    it('should re-authenticate if token verification fails', async () => {
      localStorageMock.store['paircam_access_token'] = 'expired-token';
      localStorageMock.store['paircam_device_id'] = 'device-123';

      // First call: verify fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      // Second call: new token
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ accessToken: 'new-token' }),
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.accessToken).toBe('new-token');
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should authenticate if no token exists', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ accessToken: 'new-token' }),
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/token'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('deviceId'),
        })
      );
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('authenticate', () => {
    it('should successfully authenticate and store token', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ accessToken: 'test-token' }),
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.accessToken).toBe('test-token');
      expect(result.current.isAuthenticated).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'paircam_access_token',
        'test-token'
      );
    });

    it('should handle authentication failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized',
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toContain('Authentication failed');
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toContain('Network error');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      // Initial auth
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ accessToken: 'initial-token' }),
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Refresh
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ accessToken: 'refreshed-token' }),
      });

      await act(async () => {
        await result.current.refreshToken();
      });

      expect(result.current.accessToken).toBe('refreshed-token');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'paircam_access_token',
        'refreshed-token'
      );
    });

    it('should re-authenticate if refresh fails', async () => {
      // Initial auth
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ accessToken: 'initial-token' }),
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Refresh fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      // Re-authenticate
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ accessToken: 're-authenticated-token' }),
      });

      await act(async () => {
        await result.current.refreshToken();
      });

      expect(result.current.accessToken).toBe('re-authenticated-token');
    });

    it('should throw error if no token to refresh', async () => {
      // Initial auth
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ accessToken: 'initial-token' }),
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear the token
      localStorageMock.store = {};

      // Refresh should trigger re-auth
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ accessToken: 'new-token' }),
      });

      await act(async () => {
        await result.current.refreshToken();
      });

      // Should have re-authenticated
      expect(result.current.accessToken).toBe('new-token');
    });
  });

  describe('logout', () => {
    it('should clear token and update state', async () => {
      // Initial auth
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ accessToken: 'test-token' }),
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(true);

      act(() => {
        result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.accessToken).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('paircam_access_token');
    });

    it('should preserve device ID on logout', async () => {
      // Initial auth
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ accessToken: 'test-token' }),
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const deviceId = result.current.deviceId;

      act(() => {
        result.current.logout();
      });

      expect(result.current.deviceId).toBe(deviceId);
    });
  });

  describe('state management', () => {
    it('should update loading state during authentication', async () => {
      let resolveAuth: (value: unknown) => void;
      const authPromise = new Promise((resolve) => {
        resolveAuth = resolve;
      });

      mockFetch.mockImplementationOnce(() => authPromise);

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveAuth!({
          ok: true,
          json: () => Promise.resolve({ accessToken: 'test-token' }),
        });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should clear error on successful authentication', async () => {
      // First auth fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Server error',
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).not.toBeNull();

      // Retry auth succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ accessToken: 'test-token' }),
      });

      await act(async () => {
        await result.current.authenticate();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
