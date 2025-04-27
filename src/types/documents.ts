
import { Region } from './regions';

export interface Document {
  id: string;
  name: string;
  file: File;
  regions: Region[];
  created_at: string; // Add this line to resolve the TypeScript error
  user_id?: string;   // Optional user_id to match the Supabase documents table
}
