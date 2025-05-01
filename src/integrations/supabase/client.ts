
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

export const createBucket = async () => {
  try {
    console.log(`[${new Date().toISOString()}] Creating or checking "pdfs" storage bucket...`);
    
    // Get the current session to ensure we're authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error(`[${new Date().toISOString()}] No active session found`);
      return false;
    }

    try {
      // Check if bucket already exists
      const { data: existingBucket, error: checkError } = await supabase.storage.getBucket('pdfs');
      
      if (checkError) {
        // If error is not related to "bucket not found", log it but continue
        if (!checkError.message.includes('not found')) {
          console.warn(`[${new Date().toISOString()}] Warning checking bucket:`, checkError);
        }
        
        console.log(`[${new Date().toISOString()}] Bucket does not exist or not accessible, trying to create it...`);
        
        // Try to create the bucket
        const { data: bucketData, error: createError } = await supabase.storage.createBucket('pdfs', {
          public: false, // Make bucket private for security
          fileSizeLimit: 20971520, // 20MB file size limit
          allowedMimeTypes: ['application/pdf']
        });
        
        if (createError) {
          console.error(`[${new Date().toISOString()}] Error creating bucket:`, createError);
          return false;
        }
        
        console.log(`[${new Date().toISOString()}] Bucket created successfully:`, bucketData);
      } else {
        console.log(`[${new Date().toISOString()}] Bucket already exists:`, existingBucket);
      }
      
      // Update bucket settings to ensure proper configuration
      const { data: updatedBucket, error: updateError } = await supabase.storage.updateBucket('pdfs', {
        public: false,
        fileSizeLimit: 20971520, // 20MB
        allowedMimeTypes: ['application/pdf']
      });
      
      if (updateError) {
        console.warn(`[${new Date().toISOString()}] Warning updating bucket settings:`, updateError);
      } else {
        console.log(`[${new Date().toISOString()}] Bucket settings updated:`, updatedBucket);
      }
      
      return true;
    } catch (bucketError) {
      console.error(`[${new Date().toISOString()}] Error with bucket operations:`, bucketError);
      return false;
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Unexpected error during bucket creation:`, error);
    return false;
  }
};

export const initializeStorage = async () => {
  try {
    console.log(`[${new Date().toISOString()}] Initializing PDF storage...`);
    
    // First ensure we have an active session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error(`[${new Date().toISOString()}] No active session found during storage initialization`);
      return false;
    }
    
    // Ensure the bucket exists
    const bucketCreated = await createBucket();
    if (!bucketCreated) {
      console.warn(`[${new Date().toISOString()}] Warning: Failed to ensure PDF bucket exists`);
    }
    
    // Test if we can access the bucket anyway
    try {
      console.log(`[${new Date().toISOString()}] Testing storage bucket access permissions...`);
      const { data: fileList, error: listError } = await supabase.storage
        .from('pdfs')
        .list(session.user.id);
        
      if (listError) {
        console.warn(`[${new Date().toISOString()}] Bucket exists but cannot list contents:`, listError);
        // Continue anyway as this might be an RLS permission issue but files may still be accessible
      } else {
        console.log(`[${new Date().toISOString()}] PDF storage bucket exists and is accessible, file count:`, fileList?.length || 0);
      }
      
      return true;
    } catch (listError) {
      console.warn(`[${new Date().toISOString()}] Warning while trying to list bucket contents:`, listError);
      return true; // Return true anyway to continue with the application
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Unexpected error during PDF storage initialization:`, error);
    return false;
  }
};
