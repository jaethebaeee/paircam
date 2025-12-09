import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { useAuth as useAuthHook } from '../hooks/useAuth';

// User type for auth
interface User {
  email?: string;
  username?: string;
  deviceId?: string;
}

interface AuthContextType {
  isPremium: boolean;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Use the real auth hook for device-based authentication
  const authState = useAuthHook();
  const [isPremium, setIsPremium] = useState(false);

  // Create user object from auth state
  const user: User | null = authState.deviceId ? {
    deviceId: authState.deviceId,
  } : null;

  // Sign out function that clears auth state
  const signOut = useCallback(() => {
    authState.logout();
    setIsPremium(false);
  }, [authState]);

  // Check premium status when authenticated (could be fetched from API)
  useEffect(() => {
    if (authState.isAuthenticated) {
      // TODO: Fetch premium status from backend API
      // For now, default to false - premium status should come from JWT or API
      setIsPremium(false);
    }
  }, [authState.isAuthenticated]);

  return (
    <AuthContext.Provider value={{
      isPremium,
      user,
      isAuthenticated: authState.isAuthenticated,
      isLoading: authState.isLoading,
      signOut,
    }}>
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

// Alias for useAuthContext - provides full auth state for components
export function useAuth() {
  return useAuthContext();
}
