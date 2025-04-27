
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://bohxienpthilrfwktokd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvaHhpZW5wdGhpbHJmd2t0b2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2OTc3OTcsImV4cCI6MjA2MTI3Mzc5N30.4UO_pFmDauRz6Km5wTr3VHM95_GwyWKc1-pxGO1mImg";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

export const initializeStorage = async () => {
  try {
    console.log('Starting PDF storage initialization check');
    
    // First check if we can access existing buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Error accessing storage buckets:', bucketsError);
      return false;
    }
    
    // Check if pdfs bucket exists
    const pdfsBucket = buckets?.find(b => b.name === 'pdfs');
    
    if (pdfsBucket) {
      console.log('PDF storage bucket exists and is accessible');
      return true;
    }
    
    console.log('PDF storage bucket not found or not accessible');
    return false;
  } catch (error) {
    console.error('Unexpected error during PDF storage initialization:', error);
    return false;
  }
};

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
