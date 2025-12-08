import { createClient, SupabaseClient, RealtimeChannel, User } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a singleton Supabase client
let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  // Return null if Supabase is not configured
  if (!supabaseUrl || !supabaseAnonKey) {
    if (import.meta.env.DEV) {
      console.warn('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }
    return null;
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }

  return supabaseInstance;
};

// Helper to check if Supabase is available
export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey);
};

// ============ GOOGLE AUTH ============

// Sign in with Google OAuth
export const signInWithGoogle = async (): Promise<{ error: Error | null }> => {
  const supabase = getSupabase();
  if (!supabase) {
    return { error: new Error('Supabase not configured') };
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  return { error: error ? new Error(error.message) : null };
};

// Sign out
export const signOut = async (): Promise<{ error: Error | null }> => {
  const supabase = getSupabase();
  if (!supabase) {
    return { error: new Error('Supabase not configured') };
  }

  const { error } = await supabase.auth.signOut();
  return { error: error ? new Error(error.message) : null };
};

// Get current user
export const getCurrentUser = async (): Promise<User | null> => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Subscribe to auth state changes
export const onAuthStateChange = (
  callback: (user: User | null) => void
): (() => void) | null => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      callback(session?.user ?? null);
    }
  );

  return () => subscription.unsubscribe();
};

// ============ REALTIME ============

// Realtime subscription helper for referral notifications
export const subscribeToReferralNotifications = (
  userId: string,
  onNewReferral: (data: { referredUsername: string; coinsEarned: number }) => void
): RealtimeChannel | null => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const channel = supabase
    .channel(`referral-notifications:${userId}`)
    .on(
      'broadcast',
      { event: 'new_referral' },
      (payload) => {
        onNewReferral(payload.payload as { referredUsername: string; coinsEarned: number });
      }
    )
    .subscribe();

  return channel;
};

// Unsubscribe helper
export const unsubscribeFromChannel = async (channel: RealtimeChannel): Promise<void> => {
  const supabase = getSupabase();
  if (supabase && channel) {
    await supabase.removeChannel(channel);
  }
};

export default getSupabase;
