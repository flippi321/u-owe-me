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
  // handle_new_user() raises a unique-violation inside the same transaction
  // as the auth.users insert when the chosen username is taken, which GoTrue
  // surfaces as this generic message rather than the underlying Postgres error.
  if (/database error saving new user/i.test(message)) return 'That username is already taken.';
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
    options: { data: { full_name: fullName, username } },
  });

  if (error || !data.user) {
    return { data: null, error: mapAuthError(error ?? new Error('Registration failed.')) };
  }

  // The DB trigger creates the profile row (with this username) as part of
  // the same transaction as the auth.users insert, so it's guaranteed to
  // exist by the time signUp() resolves.
  if (!data.session) {
    return { data: { user: data.user, session: null, profile: null }, error: null };
  }

  const { data: profile, error: profileError } = await fetchProfile(data.user.id);
  if (profileError || !profile) {
    return { data: null, error: profileError ?? 'Could not load profile.' };
  }

  return { data: { user: data.user, session: data.session, profile }, error: null };
}

export async function signOutUser(): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signOut();
  return { error: error ? mapAuthError(error) : null };
}
