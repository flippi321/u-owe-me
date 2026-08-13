import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';

import { fetchProfile, signInWithEmail, signOutUser, signUpWithEmail, type Profile } from '@/utils/auth';
import { supabase } from '@/utils/supabase';

// expo-router's static web export renders routes once in plain Node (no
// `window`), where AsyncStorage's web implementation would throw.
const isBrowser = typeof window !== 'undefined';

// zustand's `persist` middleware pulls in zustand/middleware.js, a
// single combined file that also contains the devtools middleware's
// `import.meta.env` reference. Metro bundles this as a classic script for
// web, and `import.meta` there is a hard syntax error that breaks the whole
// bundle — so persistence is hand-rolled here instead of using `persist`.
// This is only a cache for instant paint; the actual "stay logged in"
// behavior comes from Supabase's own session storage plus `initialize()`.
const CACHE_KEY = 'u-owe-me-auth-cache';

type Cache = { user: User | null; profile: Profile | null };

async function readCache(): Promise<Cache | null> {
  if (!isBrowser) return null;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Cache) : null;
  } catch {
    return null;
  }
}

async function writeCache(user: User | null, profile: Profile | null) {
  if (!isBrowser) return;
  try {
    if (!user) {
      await AsyncStorage.removeItem(CACHE_KEY);
    } else {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ user, profile }));
    }
  } catch {
    // best-effort cache only
  }
}

type RegisterParams = {
  email: string;
  password: string;
  fullName: string;
  username: string;
};

type AuthState = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  register: (params: RegisterParams) => Promise<{ error: string | null; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
};

let listenerAttached = false;

export const useAuthStore = create<AuthState>()((set) => ({
  session: null,
  user: null,
  profile: null,
  isInitialized: false,
  isLoading: false,
  error: null,

  initialize: async () => {
    const cached = await readCache();
    if (cached) set({ user: cached.user, profile: cached.profile });

    const { data } = await supabase.auth.getSession();
    set({ session: data.session, user: data.session?.user ?? null });

    if (data.session) {
      const { data: profile } = await fetchProfile(data.session.user.id);
      set({ profile });
      await writeCache(data.session.user, profile);
    } else {
      set({ profile: null });
      await writeCache(null, null);
    }

    if (!listenerAttached) {
      listenerAttached = true;
      supabase.auth.onAuthStateChange(async (_event, newSession) => {
        set({ session: newSession, user: newSession?.user ?? null });
        if (newSession) {
          const { data: profile } = await fetchProfile(newSession.user.id);
          set({ profile });
          await writeCache(newSession.user, profile);
        } else {
          set({ profile: null });
          await writeCache(null, null);
        }
      });
    }

    set({ isInitialized: true });
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    const { data, error } = await signInWithEmail(email, password);
    if (error || !data) {
      set({ isLoading: false, error });
      return { error };
    }

    const { data: profile } = await fetchProfile(data.user.id);
    set({ session: data.session, user: data.user, profile, isLoading: false, error: null });
    await writeCache(data.user, profile);
    return { error: null };
  },

  register: async (params) => {
    set({ isLoading: true, error: null });
    const { data, error } = await signUpWithEmail(params);
    if (error || !data) {
      set({ isLoading: false, error });
      return { error };
    }

    if (!data.session) {
      set({ isLoading: false, error: null });
      return { error: null, needsEmailConfirmation: true };
    }

    set({ session: data.session, user: data.user, profile: data.profile, isLoading: false, error: null });
    await writeCache(data.user, data.profile);
    return { error: null };
  },

  signOut: async () => {
    await signOutUser();
    set({ session: null, user: null, profile: null });
    await writeCache(null, null);
  },
}));
