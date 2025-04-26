
import { RegionMapping } from '@/types/regions';

export const exportRegionMapping = (mapping: RegionMapping): void => {
  // Create a sorted copy of the regions array
  const sortedRegions = [...mapping.regions].sort((a, b) => a.page - b.page);
  
  // Create the mapping with sorted regions
  const sortedMapping = {
    ...mapping,
    regions: sortedRegions
  };

  // Create a JSON blob
  const jsonString = JSON.stringify(sortedMapping, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  
  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${mapping.documentName.replace(/\s+/g, '_')}_mapping.json`;
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  
  // Clean up
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

