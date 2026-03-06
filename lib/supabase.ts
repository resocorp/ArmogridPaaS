import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? supabaseAnonKey;

// Client for browser/client-side operations
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Load admin settings by keys and return as a key→value map.
 * Centralises the repeated pattern of querying admin_settings + converting rows.
 */
export async function loadAdminSettings(keys: string[]): Promise<Record<string, string>> {
  const { data } = await supabaseAdmin
    .from('admin_settings')
    .select('key, value')
    .in('key', keys);

  const settings: Record<string, string> = {};
  data?.forEach((s: { key: string; value: string }) => {
    settings[s.key] = s.value;
  });
  return settings;
}
