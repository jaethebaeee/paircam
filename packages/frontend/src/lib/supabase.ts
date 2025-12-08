import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Auth features will be disabled.');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export async function signInWithGoogle() {
  if (!supabase) {
    console.error('Supabase not configured');
    return { error: new Error('Supabase not configured') };
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  return { data, error };
}

export async function signOut() {
  if (!supabase) return { error: new Error('Supabase not configured') };
  return supabase.auth.signOut();
}

export async function getSession() {
  if (!supabase) return { data: { session: null }, error: null };
  return supabase.auth.getSession();
}

export async function getUser() {
  if (!supabase) return { data: { user: null }, error: null };
  return supabase.auth.getUser();
}
