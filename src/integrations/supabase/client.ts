
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://bohxienpthilrfwktokd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvaHhpZW5wdGhpbHJmd2t0b2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2OTc3OTcsImV4cCI6MjA2MTI3Mzc5N30.4UO_pFmDauRz6Km5wTr3VHM95_GwyWKc1-pxGO1mImg";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

export const initializeStorage = async () => {
  try {
    console.log('Checking PDF storage initialization');
    
    // First check if the pdfs bucket exists directly with a specific bucket check
    const { data: bucket, error: bucketError } = await supabase.storage.getBucket('pdfs');
    
    if (bucketError) {
      console.error('Error checking pdfs bucket:', bucketError);
      if (bucketError.message) console.error('Bucket error message:', bucketError.message);
      
      // Check if the error is because the bucket doesn't exist
      if (bucketError.message && bucketError.message.includes('does not exist')) {
        console.error('PDF storage bucket does not exist. It should have been created by the SQL migration.');
        return false;
      }
      
      return false;
    }
    
    if (!bucket) {
      console.error('PDF storage bucket not found unexpectedly');
      return false;
    }
    
    console.log('PDF bucket found:', bucket.name);
    
    // Bucket exists, now check if we can list its contents
    // This is a good test to see if we have proper access
    try {
      console.log('Checking access permissions for PDF bucket...');
      const { data: fileList, error: listError } = await supabase.storage
        .from('pdfs')
        .list();
        
      if (listError) {
        console.error('Bucket exists but cannot list contents:', listError);
        // Log more specific error details
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
