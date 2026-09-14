import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Supabase Client — database access for Anonimus backend
//
// Uses the service-role key for server-side operations.
// NEVER expose the service-role key to the frontend.
// ============================================================================

let supabaseInstance: SupabaseClient | null = null;

/**
 * Get or create the Supabase client instance.
 * Uses the service-role key for full database access.
 */
export function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env['SUPABASE_URL'];
  const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Supabase credentials not configured. ' +
      'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.'
    );
  }

  supabaseInstance = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseInstance;
}

/**
 * Check if Supabase is configured.
 */
export function isSupabaseConfigured(): boolean {
  return !!(process.env['SUPABASE_URL'] && process.env['SUPABASE_SERVICE_ROLE_KEY']);
}

/**
 * Test the Supabase connection.
 */
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    const { error } = await client.from('campaigns').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}
