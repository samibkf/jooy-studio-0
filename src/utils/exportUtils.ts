
import { RegionMapping } from '@/types/regions';

export const exportRegionMapping = (mapping: RegionMapping): void => {
  // Create a JSON blob
  const jsonString = JSON.stringify(mapping, null, 2);
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
