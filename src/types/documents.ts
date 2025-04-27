
import { Region } from './regions';

export interface Document {
  id: string;
  name: string;
  file: File;
  regions: Region[];
}
