
export interface Region {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'text' | 'image' | 'area';
  name: string;
  audioPath: string;
  description: string;
}

export interface RegionMapping {
  documentName: string;
  documentId: string;
  regions: Region[];
}
