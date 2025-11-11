/**
 * Shared Supabase client configured for service-role access.
 */

import { createClient } from '@supabase/supabase-js';
import { env, assertRequiredEnv } from '../env.js';

assertRequiredEnv();

export const supabase = createClient(env.supabase.url, env.supabase.serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'zcash-meme-backend',
    },
  },
});

export async function withSupabase(fn) {
  return fn(supabase);
}

