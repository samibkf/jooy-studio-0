
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://bohxienpthilrfwktokd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvaHhpZW5wdGhpbHJmd2t0b2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2OTc3OTcsImV4cCI6MjA2MTI3Mzc5N30.4UO_pFmDauRz6Km5wTr3VHM95_GwyWKc1-pxGO1mImg";

// Create Supabase client with enhanced storage configuration
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true, // Default to true, but can be overridden during signIn
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'pdf-viewer'
    }
  }
});

export const initializeStorage = async () => {
  try {
    console.log(`[${new Date().toISOString()}] Checking storage access...`);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log(`[${new Date().toISOString()}] No active session, skipping storage check.`);
      return false;
    }

    // Test access to the 'pdfs' bucket
    const { error: pdfsError } = await supabase.storage.from('pdfs').list('', { limit: 1 });
    if (pdfsError) {
      console.error(`[${new Date().toISOString()}] Could not access 'pdfs' bucket. It may not exist or permissions are incorrect.`, pdfsError);
      return false;
    }

    // Test access to the 'data' bucket
    const { error: dataError } = await supabase.storage.from('data').list('', { limit: 1 });
    if (dataError) {
      console.error(`[${new Date().toISOString()}] Could not access 'data' bucket. It may not exist or permissions are incorrect.`, dataError);
      return false;
    }

    console.log(`[${new Date().toISOString()}] Storage is initialized and buckets are accessible.`);
    return true;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Unexpected error during storage initialization:`, error);
    return false;
  }
};
