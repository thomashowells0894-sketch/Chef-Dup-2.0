import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { createSignedFetch } from './requestSigning';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('[Supabase] Missing required environment variables: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

const SUPABASE_TIMEOUT_MS = 15000; // 15 second request timeout

/**
 * Wraps the global fetch with an AbortController-based timeout
 * so that hung Supabase requests are cancelled after 15 seconds.
 */
const fetchWithTimeout = (url: RequestInfo, init?: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  // If the caller already provided a signal, we should not override it.
  // However Supabase JS does not normally set one, so we always attach ours.
  const timeout = setTimeout(() => controller.abort(), SUPABASE_TIMEOUT_MS);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timeout));
};

/**
 * SecureStore-backed storage adapter for Supabase Auth.
 * Replaces AsyncStorage so auth tokens (access_token, refresh_token)
 * are stored in iOS Keychain / Android Keystore instead of plain-text.
 *
 * SecureStore has a 2048-byte limit per item; Supabase sessions can exceed
 * this, so we chunk large values transparently.
 */
const CHUNK_SIZE = 1800; // leave headroom under 2048 limit

const SecureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    try {
      // Try single-chunk read first (common case)
      const value = await SecureStore.getItemAsync(key);
      if (value !== null) return value;

      // Check for chunked storage
      const chunk0 = await SecureStore.getItemAsync(`${key}_chunk_0`);
      if (chunk0 === null) return null;

      // Reassemble chunks
      const chunks: string[] = [chunk0];
      let i = 1;
      while (true) {
        const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`);
        if (chunk === null) break;
        chunks.push(chunk);
        i++;
      }
      return chunks.join('');
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (value.length <= CHUNK_SIZE) {
        // Single chunk — clean up any old chunks first
        await SecureStoreAdapter.removeItem(key);
        await SecureStore.setItemAsync(key, value);
      } else {
        // Remove old single-key value if any
        try { await SecureStore.deleteItemAsync(key); } catch {}

        // Write chunks
        const totalChunks = Math.ceil(value.length / CHUNK_SIZE);
        for (let i = 0; i < totalChunks; i++) {
          await SecureStore.setItemAsync(
            `${key}_chunk_${i}`,
            value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
          );
        }
        // Clean up leftover chunks from a previous longer value
        let j = totalChunks;
        while (true) {
          try {
            const old = await SecureStore.getItemAsync(`${key}_chunk_${j}`);
            if (old === null) break;
            await SecureStore.deleteItemAsync(`${key}_chunk_${j}`);
            j++;
          } catch { break; }
        }
      }
    } catch {
      // SecureStore not available (e.g. Expo Go on some devices) — silent fail
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {}
    // Also remove chunks
    let i = 0;
    while (true) {
      try {
        const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`);
        if (chunk === null) break;
        await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
        i++;
      } catch { break; }
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: createSignedFetch(fetchWithTimeout as any),
  },
});

// Auto-refresh session when app comes to foreground
AppState.addEventListener('change', (state: string) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
