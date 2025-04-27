
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://bohxienpthilrfwktokd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvaHhpZW5wdGhpbHJmd2t0b2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2OTc3OTcsImV4cCI6MjA2MTI3Mzc5N30.4UO_pFmDauRz6Km5wTr3VHM95_GwyWKc1-pxGO1mImg";

// Create Supabase client with enhanced storage configuration
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
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

export const createBucket = async () => {
  try {
    console.log(`[${new Date().toISOString()}] Checking if "pdfs" storage bucket exists...`);
    
    // Get the current session to ensure we're authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error(`[${new Date().toISOString()}] No active session found`);
      return false;
    }
    
    // Check if bucket already exists
    const { data: existingBucket, error: checkError } = await supabase.storage.getBucket('pdfs');
    
    if (checkError) {
      // If error is not "bucket not found", it's a different error
      if (!checkError.message.includes('not found')) {
        console.error(`[${new Date().toISOString()}] Error checking bucket:`, checkError);
        return false;
      }
      
      console.log(`[${new Date().toISOString()}] Bucket does not exist, creating it now...`);
      // Create the bucket if it doesn't exist
      const { data: bucketData, error: createError } = await supabase.storage.createBucket('pdfs', {
        public: false, // Make bucket private for security
        fileSizeLimit: 10485760, // 10MB file size limit
        allowedMimeTypes: ['application/pdf']
      });
      
      if (createError) {
        console.error(`[${new Date().toISOString()}] Error creating bucket:`, createError);
        return false;
      }
      
      console.log(`[${new Date().toISOString()}] Bucket created successfully:`, bucketData);
      return true;
    }
    
    console.log(`[${new Date().toISOString()}] Bucket already exists:`, existingBucket);
    return true;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Unexpected error during bucket creation:`, error);
    return false;
  }
};

export const initializeStorage = async () => {
  try {
    console.log(`[${new Date().toISOString()}] Checking PDF storage initialization`);
    
    // First ensure we have an active session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error(`[${new Date().toISOString()}] No active session found during storage initialization`);
      return false;
    }
    
    // Ensure the bucket exists
    const bucketCreated = await createBucket();
    if (!bucketCreated) {
      console.error(`[${new Date().toISOString()}] Failed to ensure PDF bucket exists`);
      return false;
    }
    
    // Now check if we can access the bucket
    const { data: bucket, error: bucketError } = await supabase.storage.getBucket('pdfs');
    
    if (bucketError) {
      console.error(`[${new Date().toISOString()}] Error checking pdfs bucket:`, bucketError);
      return false;
    }
    
    if (!bucket) {
      console.error(`[${new Date().toISOString()}] PDF storage bucket not found unexpectedly`);
      return false;
    }
    
    console.log(`[${new Date().toISOString()}] PDF bucket configuration:`, bucket);
    
    // Test file listing to verify RLS permissions
    try {
      console.log(`[${new Date().toISOString()}] Testing storage bucket access permissions...`);
      const { data: fileList, error: listError } = await supabase.storage
        .from('pdfs')
        .list(session.user.id);
        
      if (listError) {
        console.error(`[${new Date().toISOString()}] Bucket exists but cannot list contents:`, listError);
        return false;
      }
      
      console.log(`[${new Date().toISOString()}] PDF storage bucket exists and is accessible, file count:`, fileList?.length || 0);
      return true;
    } catch (listError) {
      console.error(`[${new Date().toISOString()}] Error while trying to list bucket contents:`, listError);
      return false;
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Unexpected error during PDF storage initialization:`, error);
    return false;
  }
};

