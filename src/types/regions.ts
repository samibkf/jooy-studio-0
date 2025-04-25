
export interface Region {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'area';
  name: string;
  description: string;
}

export interface RegionMapping {
  documentName: string;
  documentId: string;
  regions: Region[];
}
