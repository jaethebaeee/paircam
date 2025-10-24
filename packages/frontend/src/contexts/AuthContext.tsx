import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  isPremium: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshPremiumStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshPremiumStatus = async () => {
    if (!user) {
      setIsPremium(false);
      return;
    }
    
    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('omegle_access_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3333';
      
      const response = await fetch(`${apiUrl}/api/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsPremium(data.isPremium || false);
      } else {
        setIsPremium(false);
      }
    } catch (error) {
      console.error('Failed to check premium status:', error);
      setIsPremium(false);
    }
  };

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
      if (session?.user) {
        refreshPremiumStatus();
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        refreshPremiumStatus();
      } else {
        setIsPremium(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsPremium(false);
  };

  return (
    <AuthContext.Provider value={{ user, isPremium, isLoading, signOut, refreshPremiumStatus }}>
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

