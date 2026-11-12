import Storage from 'expo-sqlite/kv-store';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isCloudConfigured } from './config';
import { t } from '../../i18n/index.ts';

let client: SupabaseClient | null = null;

/**
 * Oppretter Supabase-klienten første gang den trengs. Lastes først da, slik at appen
 * ikke berøres når familiedeling er av.
 */
export function getClient(): SupabaseClient {
  if (!isCloudConfigured) throw new Error(t('lib.cloudOff'));
  if (client) return client;
  /* eslint-disable @typescript-eslint/no-require-imports */
  require('react-native-url-polyfill/auto');
  const { createClient } =
    require('@supabase/supabase-js') as typeof import('@supabase/supabase-js');
  /* eslint-enable @typescript-eslint/no-require-imports */
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: {
        getItem: (k: string) => Storage.getItemAsync(k),
        setItem: (k: string, v: string) => Storage.setItemAsync(k, v),
        removeItem: async (k: string) => {
          await Storage.removeItemAsync(k);
        },
      },
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}
