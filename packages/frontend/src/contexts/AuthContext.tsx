import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface AuthContextType {
  isPremium: boolean;
  isLoading: boolean;
  userId: string | null;
  checkPremiumStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const checkPremiumStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setIsPremium(false);
        setIsLoading(false);
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3333';
      const response = await fetch(`${apiUrl}/subscriptions/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsPremium(data.isPremium || false);
        setUserId(data.userId || null);
      } else {
        setIsPremium(false);
      }
    } catch (error) {
      console.error('Failed to check premium status:', error);
      setIsPremium(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check premium status on mount
  useEffect(() => {
    checkPremiumStatus();
  }, [checkPremiumStatus]);

  // Listen for storage events (e.g., when token is set after payment)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'accessToken') {
        checkPremiumStatus();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [checkPremiumStatus]);

  return (
    <AuthContext.Provider value={{ isPremium, isLoading, userId, checkPremiumStatus }}>
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
