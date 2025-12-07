import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';
const DEVICE_ID_KEY = 'paircam_device_id';
const TOKEN_KEY = 'paircam_access_token';
const USER_KEY = 'paircam_user';

export interface User {
  id: string;
  email: string;
  username?: string;
  avatarUrl?: string;
  isPremium: boolean;
}

interface AuthContextType {
  // Auth state
  isAuthenticated: boolean;
  isLoading: boolean;
  deviceId: string | null;
  accessToken: string | null;

  // User state (only set if logged in with Google)
  user: User | null;
  isPremium: boolean;

  // Actions
  signInWithGoogle: (credential: string) => Promise<void>;
  signOut: () => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // Get or create device ID
  const getDeviceId = useCallback((): string => {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = uuidv4();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  }, []);

  // Authenticate with device ID (anonymous)
  const authenticateDevice = useCallback(async (id: string): Promise<string> => {
    const response = await fetch(`${API_URL}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: id }),
    });

    if (!response.ok) {
      throw new Error('Failed to authenticate');
    }

    const data = await response.json();
    return data.accessToken;
  }, []);

  // Sign in with Google
  const signInWithGoogle = useCallback(async (credential: string) => {
    setIsLoading(true);
    try {
      const currentDeviceId = getDeviceId();

      const response = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential,
          deviceId: currentDeviceId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Google sign-in failed');
      }

      const data = await response.json();

      // Store token and user
      localStorage.setItem(TOKEN_KEY, data.accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));

      setAccessToken(data.accessToken);
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  }, [getDeviceId]);

  // Sign out (back to anonymous)
  const signOut = useCallback(() => {
    localStorage.removeItem(USER_KEY);
    setUser(null);
    // Keep device token for anonymous usage
  }, []);

  // Refresh auth state
  const refreshAuth = useCallback(async () => {
    const currentToken = localStorage.getItem(TOKEN_KEY);
    if (!currentToken) return;

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem(TOKEN_KEY, data.accessToken);
        setAccessToken(data.accessToken);
      }
    } catch (error) {
      console.error('Failed to refresh token:', error);
    }
  }, []);

  // Initialize auth on mount
  useEffect(() => {
    const init = async () => {
      try {
        const id = getDeviceId();
        setDeviceId(id);

        // Check for existing user data
        const savedUser = localStorage.getItem(USER_KEY);
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
          } catch {
            localStorage.removeItem(USER_KEY);
          }
        }

        // Check for existing token
        const existingToken = localStorage.getItem(TOKEN_KEY);
        if (existingToken) {
          // Verify token is still valid
          const response = await fetch(`${API_URL}/auth/verify`, {
            headers: { 'Authorization': `Bearer ${existingToken}` },
          });

          if (response.ok) {
            setAccessToken(existingToken);
          } else {
            // Token invalid, get new one
            const newToken = await authenticateDevice(id);
            localStorage.setItem(TOKEN_KEY, newToken);
            setAccessToken(newToken);
          }
        } else {
          // No token, authenticate with device ID
          const newToken = await authenticateDevice(id);
          localStorage.setItem(TOKEN_KEY, newToken);
          setAccessToken(newToken);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [getDeviceId, authenticateDevice]);

  const value: AuthContextType = {
    isAuthenticated: !!accessToken,
    isLoading,
    deviceId,
    accessToken,
    user,
    isPremium: user?.isPremium ?? false,
    signInWithGoogle,
    signOut,
    refreshAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
