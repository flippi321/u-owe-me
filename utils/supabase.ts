import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

// expo-router's static web export renders routes once in plain Node (no
// `window`), where AsyncStorage's web implementation would throw. Only use
// real persistence in an actual browser/React Native runtime.
const isBrowser = typeof window !== 'undefined'

const noopStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
}

// supabase-js's realtime client references the global `WebSocket` at
// construction time even though this app never uses realtime features.
// Node 20's SSR render pass has no such global (added in Node 22) and would
// otherwise crash expo-router's static export. A harmless stub avoids that.
if (!isBrowser && typeof globalThis.WebSocket === 'undefined') {
  class NoopWebSocket {
    close() {}
    send() {}
  }
  // @ts-expect-error - minimal stub for SSR only, never actually connects
  globalThis.WebSocket = NoopWebSocket
}

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_KEY!,
  {
    auth: {
      storage: isBrowser ? AsyncStorage : noopStorage,
      autoRefreshToken: isBrowser,
      persistSession: isBrowser,
      detectSessionInUrl: false,
    },
  })