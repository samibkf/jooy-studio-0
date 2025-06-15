import { Region } from './regions';

export interface DocumentData {
  id: string;
  name: string;
  regions: Region[];
  user_id?: string;
  lastAttemptedAccess?: Date;
}

// Keep the Document type as an alias for backward compatibility
export type Document = DocumentData;
