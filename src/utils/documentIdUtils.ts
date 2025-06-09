
import { supabase } from '@/integrations/supabase/client';

// Generate a random 5-letter uppercase ID
export const generateDocumentId = (): string => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return result;
};

// Check if a document ID already exists in the database
export const isDocumentIdUnique = async (id: string, userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error checking document ID uniqueness:', error);
      return false;
    }

    return !data || data.length === 0;
  } catch (error) {
    console.error('Error in isDocumentIdUnique:', error);
    return false;
  }
};

// Generate a unique 5-letter document ID
export const generateUniqueDocumentId = async (userId: string): Promise<string> => {
  let attempts = 0;
  const maxAttempts = 100; // Prevent infinite loops

  while (attempts < maxAttempts) {
    const id = generateDocumentId();
    const isUnique = await isDocumentIdUnique(id, userId);
    
    if (isUnique) {
      return id;
    }
    
    attempts++;
  }

  throw new Error('Unable to generate unique document ID after maximum attempts');
};

// Validate if a string is a valid 5-letter document ID
export const isValidDocumentId = (id: string): boolean => {
  return /^[A-Z]{5}$/.test(id);
};
