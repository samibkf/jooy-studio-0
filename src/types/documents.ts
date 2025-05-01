
import { Region } from './regions';

export interface DocumentData {
  id: string;
  name: string;
  file: File;
  regions: Region[];
  user_id?: string;
  fileAvailable: boolean; // Indicates if the PDF file is actually available
  uploadRequired?: boolean; // Flag to indicate if the document needs to be re-uploaded
  lastAttemptedAccess?: Date; // Track when we last tried to access the file
}

// Keep the Document type as an alias for backward compatibility
export type Document = DocumentData;
