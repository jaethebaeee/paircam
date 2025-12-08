import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';
const DEVICE_ID_KEY = 'paircam_device_id';
const TOKEN_KEY = 'paircam_access_token';

interface AuthContextType {
  // Supabase Auth State
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isPremium: boolean;

  // Device-based Auth (fallback)
  deviceId: string | null;
  accessToken: string | null;

  // Auth Actions
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;

  // Modal State
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  authModalMode: 'login' | 'signup';
  setAuthModalMode: (mode: 'login' | 'signup') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Supabase auth state
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Device-based auth state (fallback when Supabase not configured)
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Premium status
  const [isPremium, setIsPremium] = useState(false);

  // Auth modal state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');

  // Get or create device ID
  const getOrCreateDeviceId = useCallback((): string => {
    let storedDeviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!storedDeviceId) {
      storedDeviceId = uuidv4();
      localStorage.setItem(DEVICE_ID_KEY, storedDeviceId);
    }
    return storedDeviceId;
  }, []);

  // Authenticate with backend using device ID
  const authenticateWithBackend = useCallback(async (devId: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deviceId: devId }),
      });

      if (!response.ok) {
        throw new Error('Backend authentication failed');
      }

      const data = await response.json();
      localStorage.setItem(TOKEN_KEY, data.accessToken);
      setAccessToken(data.accessToken);
      return data.accessToken;
    } catch (error) {
      console.error('Backend auth error:', error);
      return null;
    }
  }, []);

  // Check premium status
  const checkPremiumStatus = useCallback(async () => {
    // If user is signed in with Supabase, check their subscription
    if (user) {
      try {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) return;

        const response = await fetch(`${API_URL}/subscriptions/status`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setIsPremium(data.isPremium || false);
        }
      } catch {
        // Ignore errors, default to not premium
      }
    }
  }, [user]);

  // Initialize auth
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);

      // Always set up device ID for backend auth
      const devId = getOrCreateDeviceId();
      setDeviceId(devId);

      // Try to authenticate with backend
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (storedToken) {
        // Verify token
        try {
          const response = await fetch(`${API_URL}/auth/verify`, {
            headers: {
              Authorization: `Bearer ${storedToken}`,
            },
          });

          if (response.ok) {
            setAccessToken(storedToken);
          } else {
            // Token invalid, get new one
            await authenticateWithBackend(devId);
          }
        } catch {
          // Network error, try to get new token
          await authenticateWithBackend(devId);
        }
      } else {
        // No token, get one
        await authenticateWithBackend(devId);
      }

      // If Supabase is configured, set up auth listener
      if (isSupabaseConfigured) {
        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            setSession(newSession);
            setUser(newSession?.user ?? null);

            // If user just signed in, sync with backend
            if (event === 'SIGNED_IN' && newSession?.user) {
              // You could call a backend endpoint here to link the Supabase user
              // with the device ID for premium features, etc.
            }
          }
        );

        setIsLoading(false);

        return () => {
          subscription.unsubscribe();
        };
      }

      setIsLoading(false);
    };

    initAuth();
  }, [getOrCreateDeviceId, authenticateWithBackend]);

  // Check premium status when user changes
  useEffect(() => {
    checkPremiumStatus();
  }, [user, checkPremiumStatus]);

  // Sign out
  const signOut = useCallback(async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }

    // Clear backend token but keep device ID
    localStorage.removeItem(TOKEN_KEY);
    setAccessToken(null);
    setUser(null);
    setSession(null);
    setIsPremium(false);

    // Get new backend token with device ID
    const devId = getOrCreateDeviceId();
    await authenticateWithBackend(devId);
  }, [getOrCreateDeviceId, authenticateWithBackend]);

  // Refresh session
  const refreshSession = useCallback(async () => {
    if (isSupabaseConfigured && session) {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Session refresh error:', error);
        return;
      }
      setSession(data.session);
      setUser(data.session?.user ?? null);
    }

    // Also refresh backend token
    const devId = getOrCreateDeviceId();
    await authenticateWithBackend(devId);
  }, [session, getOrCreateDeviceId, authenticateWithBackend]);

  const isAuthenticated = Boolean(user || accessToken);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated,
        isLoading,
        isPremium,
        deviceId,
        accessToken,
        signOut,
        refreshSession,
        showAuthModal,
        setShowAuthModal,
        authModalMode,
        setAuthModalMode,
      }}
    >
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
