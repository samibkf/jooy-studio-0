
import { Region } from '@/types/regions';

export const getUnassignedRegionsByPage = (
  regions: Region[], 
  pageNumber: number, 
  documentId: string
): Region[] => {
  // Filter regions by page and return those that don't have descriptions (unassigned)
  return regions.filter(region => 
    region.page === pageNumber && !region.description
  );
};

export const getRegionsByPage = (regions: Region[], pageNumber: number): Region[] => {
  return regions.filter(region => region.page === pageNumber);
};

export const isRegionOnPage = (region: Region, pageNumber: number): boolean => {
  return region.page === pageNumber;
};
