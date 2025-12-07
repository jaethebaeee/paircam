import { useEffect, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';
const DEVICE_ID_KEY = 'paircam_device_id';
const TOKEN_KEY = 'paircam_access_token';

export interface AuthState {
  deviceId: string | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface UseAuthReturn extends AuthState {
  authenticate: () => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    deviceId: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Get or create device ID
  const getDeviceId = useCallback((): string => {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = uuidv4();
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  }, []);

  // Authenticate with backend
  const authenticate = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const deviceId = getDeviceId();

      // Call backend to get JWT token
      const response = await fetch(`${API_URL}/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deviceId }),
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`);
      }

      const data = await response.json();
      const { accessToken } = data;

      // Store token
      localStorage.setItem(TOKEN_KEY, accessToken);

      setState({
        deviceId,
        accessToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
        isAuthenticated: false,
      }));
      throw error;
    }
  }, [getDeviceId]);

  // Refresh token
  const refreshToken = useCallback(async () => {
    try {
      const currentToken = localStorage.getItem(TOKEN_KEY);
      if (!currentToken) {
        throw new Error('No token to refresh');
      }

      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      const { accessToken } = data;

      localStorage.setItem(TOKEN_KEY, accessToken);

      setState((prev) => ({
        ...prev,
        accessToken,
        isAuthenticated: true,
      }));
    } catch (error) {
      // If refresh fails, re-authenticate
      await authenticate();
    }
  }, [authenticate]);

  // Logout
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setState({
      deviceId: state.deviceId,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  }, [state.deviceId]);

  // Auto-authenticate on mount
  useEffect(() => {
    const init = async () => {
      try {
        const existingToken = localStorage.getItem(TOKEN_KEY);
        const deviceId = getDeviceId();

        if (existingToken) {
          // Verify token is still valid
          const response = await fetch(`${API_URL}/auth/verify`, {
            headers: {
              Authorization: `Bearer ${existingToken}`,
            },
          });

          if (response.ok) {
            setState({
              deviceId,
              accessToken: existingToken,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
            return;
          }
        }

        // Token invalid or missing, get new one
        await authenticate();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Initialization failed';
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
        }));
      }
    };

    init();
  }, [authenticate, getDeviceId]);

  return {
    ...state,
    authenticate,
    logout,
    refreshToken,
  };
}

