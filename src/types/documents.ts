
import { Region } from './regions';

export interface DocumentData {
  id: string;
  name: string;
  regions: Region[];
  user_id?: string;
  lastAttemptedAccess?: Date;
  is_private: boolean;
  drm_protected_pages: boolean | number[] | null;
  // Removed: fileAvailable, file, uploadRequired
}

// Keep the Document type as an alias for backward compatibility
export type Document = DocumentData;
