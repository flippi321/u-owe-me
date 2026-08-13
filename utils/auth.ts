import type { Session, User } from '@supabase/supabase-js';

import { supabase } from './supabase';

// Mirrors the `profiles` table in db_structure.sql.
export type Profile = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

type Result<T> = { data: T; error: null } | { data: null; error: string };

function mapAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (/invalid login credentials/i.test(message)) return 'Incorrect email or password.';
  if (/user already registered/i.test(message)) return 'An account with this email already exists.';
  if (message) return message;
  return 'Something went wrong. Please try again.';
}

export async function signInWithEmail(email: string, password: string): Promise<Result<{ session: Session; user: User }>> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) {
    return { data: null, error: mapAuthError(error ?? new Error('Login failed.')) };
  }
  return { data: { session: data.session, user: data.user }, error: null };
}

export async function fetchProfile(userId: string): Promise<Result<Profile>> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error || !data) {
    return { data: null, error: mapAuthError(error ?? new Error('Profile not found.')) };
  }
  return { data: data as Profile, error: null };
}

type SignUpParams = {
  email: string;
  password: string;
  fullName: string;
  username: string;
};

export async function signUpWithEmail(
  params: SignUpParams
): Promise<Result<{ user: User; session: Session | null; profile: Profile | null }>> {
  const { email, password, fullName, username } = params;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error || !data.user) {
    return { data: null, error: mapAuthError(error ?? new Error('Registration failed.')) };
  }

  // The DB trigger auto-creates a profile with a username derived from the
  // email. Overwrite it with the username the user actually chose — only
  // possible once we have an authenticated session (RLS: auth.uid() = id).
  if (!data.session) {
    return { data: { user: data.user, session: null, profile: null }, error: null };
  }

  const { data: profile, error: updateError } = await supabase
    .from('profiles')
    .update({ username })
    .eq('id', data.user.id)
    .select()
    .single();

  if (updateError || !profile) {
    if ((updateError as { code?: string } | null)?.code === '23505') {
      return { data: null, error: 'That username is already taken.' };
    }
    return { data: null, error: mapAuthError(updateError ?? new Error('Could not set username.')) };
  }

  return { data: { user: data.user, session: data.session, profile: profile as Profile }, error: null };
}

export async function signOutUser(): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signOut();
  return { error: error ? mapAuthError(error) : null };
}
