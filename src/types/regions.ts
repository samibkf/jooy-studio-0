export interface Region {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'area' | 'polygon' | 'circle';
  name: string;
  description: string;
  points?: { x: number; y: number }[]; // For polygon
  radius?: number; // For circle
}

export interface RegionMapping {
  documentName: string;
  documentId: string;
  regions: Region[];
}
