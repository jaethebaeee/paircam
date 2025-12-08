import { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { getCurrentUser, onAuthStateChange, signOut } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

interface LinkedAccount {
  google: boolean;
  email?: string;
  avatarUrl?: string;
}

interface UseGoogleAccountReturn {
  googleUser: User | null;
  linkedAccount: LinkedAccount | null;
  isLoading: boolean;
  error: string | null;
  fetchLinkedAccounts: () => Promise<void>;
  unlinkGoogle: () => Promise<void>;
  signOutGoogle: () => Promise<void>;
}

export function useGoogleAccount(): UseGoogleAccountReturn {
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [linkedAccount, setLinkedAccount] = useState<LinkedAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch linked accounts from backend
  const fetchLinkedAccounts = useCallback(async () => {
    try {
      const token = localStorage.getItem('paircam_access_token');
      if (!token) return;

      const response = await fetch(`${API_URL}/auth/linked-accounts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLinkedAccount(data);
      }
    } catch (err) {
      console.error('Failed to fetch linked accounts:', err);
    }
  }, []);

  // Unlink Google account
  const unlinkGoogle = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('paircam_access_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_URL}/auth/unlink-account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ provider: 'google' }),
      });

      if (!response.ok) {
        throw new Error('Failed to unlink account');
      }

      // Sign out of Supabase too
      await signOut();
      setGoogleUser(null);
      setLinkedAccount((prev) => prev ? { ...prev, google: false } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlink');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sign out of Google (Supabase session only, keep link)
  const signOutGoogle = useCallback(async () => {
    await signOut();
    setGoogleUser(null);
  }, []);

  // Initialize
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        // Check Supabase session
        const user = await getCurrentUser();
        setGoogleUser(user);

        // Fetch linked accounts
        await fetchLinkedAccounts();
      } catch (err) {
        console.error('Init error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    init();

    // Listen for auth state changes
    const unsubscribe = onAuthStateChange((user) => {
      setGoogleUser(user);
      if (user) {
        fetchLinkedAccounts();
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [fetchLinkedAccounts]);

  return {
    googleUser,
    linkedAccount,
    isLoading,
    error,
    fetchLinkedAccounts,
    unlinkGoogle,
    signOutGoogle,
  };
}
