import { Region } from './regions';

export interface DocumentData {
  id: string;
  name: string;
  regions: Region[];
  user_id?: string;
  lastAttemptedAccess?: Date;
  // Removed: fileAvailable, file, uploadRequired
}

// Keep the Document type as an alias for backward compatibility
export type Document = DocumentData;
