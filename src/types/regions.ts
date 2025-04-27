
export type RegionType = 'header' | 'footer' | 'body' | 'table' | 'image' | 'signature';

export interface Region {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: RegionType;  // Updated to use the RegionType type
  name: string;
  description: string | null;  // Added null to match DB
  created_at?: string;         // Added optional field from DB
  document_id?: string;        // Added optional field from DB
  user_id?: string;            // Added optional field from DB
}

export interface RegionMapping {
  documentName: string;
  documentId: string;
  regions: Region[];
}
