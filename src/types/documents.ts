
import { Region } from './regions';

export interface DocumentData {
  id: string;
  name: string;
  file: File;
  regions: Region[];
  user_id?: string; // Adding user_id property
}

// Keep the Document type as an alias for backward compatibility
export type Document = DocumentData;
