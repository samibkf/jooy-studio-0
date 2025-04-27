
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://bohxienpthilrfwktokd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvaHhpZW5wdGhpbHJmd2t0b2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2OTc3OTcsImV4cCI6MjA2MTI3Mzc5N30.4UO_pFmDauRz6Km5wTr3VHM95_GwyWKc1-pxGO1mImg";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export const createBucket = async () => {
  try {
    console.log('Checking if "pdfs" storage bucket exists...');
    // Check if bucket already exists
    const { data: existingBucket, error: checkError } = await supabase.storage.getBucket('pdfs');
    
    if (checkError) {
      // If error is not "bucket not found", it's a different error
      if (!checkError.message.includes('not found')) {
        console.error('Error checking bucket:', checkError);
        return false;
      }
      
      console.log('Bucket does not exist, creating it now...');
      // Create the bucket if it doesn't exist
      const { data: bucketData, error: createError } = await supabase.storage.createBucket('pdfs', {
        public: true, // Make bucket public
        fileSizeLimit: 10485760, // 10MB file size limit
      });
      
      if (createError) {
        console.error('Error creating bucket:', createError);
        return false;
      }
      
      console.log('Bucket created successfully:', bucketData);
      return true;
    }
    
    console.log('Bucket already exists:', existingBucket);
    return true;
  } catch (error) {
    console.error('Unexpected error during bucket creation:', error);
    return false;
  }
};

export const initializeStorage = async () => {
  try {
    console.log('Checking PDF storage initialization');
    
    // First ensure the bucket exists
    const bucketCreated = await createBucket();
    if (!bucketCreated) {
      console.error('Failed to ensure PDF bucket exists');
      return false;
    }
    
    // Now check if we can access the bucket
    const { data: bucket, error: bucketError } = await supabase.storage.getBucket('pdfs');
    
    if (bucketError) {
      console.error('Error checking pdfs bucket:', bucketError);
      if (bucketError.message) console.error('Bucket error message:', bucketError.message);
      return false;
    }
    
    if (!bucket) {
      console.error('PDF storage bucket not found unexpectedly');
      return false;
    }
    
    console.log('PDF bucket found:', bucket.name);
    
    // Test file listing to verify RLS permissions
    try {
      console.log('Testing storage bucket access permissions...');
      const { data: fileList, error: listError } = await supabase.storage
        .from('pdfs')
        .list();
        
      if (listError) {
        console.error('Bucket exists but cannot list contents:', listError);
        if (listError.message) console.error('List error message:', listError.message);
        return false;
      }
      
      console.log('PDF storage bucket exists and is accessible, file count:', fileList?.length || 0);
      return true;
    } catch (listError) {
      console.error('Error while trying to list bucket contents:', listError);
      return false;
    }
  } catch (error) {
    console.error('Unexpected error during PDF storage initialization:', error);
    return false;
  }
};
