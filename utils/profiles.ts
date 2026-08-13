import type { Profile } from './auth';
import { supabase } from './supabase';

export async function fetchAllProfiles(): Promise<{ data: Profile[] | null; error: string | null }> {
  const { data, error } = await supabase.from('profiles').select('*').order('username', { ascending: true });
  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as Profile[], error: null };
}
