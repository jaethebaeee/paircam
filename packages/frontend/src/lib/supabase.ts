import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

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
