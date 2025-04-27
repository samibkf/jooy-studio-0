import { Region } from './regions';

export interface DocumentData {
  id: string;
  name: string;
  file: File;
  regions: Region[];
}

// Keep the Document type as an alias for backward compatibility
export type Document = DocumentData;
