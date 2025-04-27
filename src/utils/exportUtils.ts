
import { RegionMapping } from '@/types/regions';
import { toast } from 'sonner';

export const exportRegionMapping = (mapping: RegionMapping): void => {
  try {
    // Validate input data
    if (!mapping || !mapping.documentName || !mapping.documentId || !Array.isArray(mapping.regions)) {
      toast.error('Invalid data for export');
      console.error('Invalid export data:', mapping);
      return;
    }

    if (mapping.regions.length === 0) {
      toast.error('No regions to export');
      return;
    }
    
    // Create a deep copy of regions and process their descriptions
    const processedRegions = mapping.regions.map(region => ({
      ...region,
      // Ensure description is always an array of strings for consistency
      description: region.description 
        ? region.description
            .split('\n')
            .filter(para => para.trim()) // Remove empty paragraphs
            .map(para => para.trim())
        : []
    }));

    // Create a sorted copy of the regions array
    const sortedRegions = [...processedRegions].sort((a, b) => a.page - b.page);
    
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
    const safeDocName = mapping.documentName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `${safeDocName}_mapping.json`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Notify success
    toast.success(`Successfully exported ${sortedRegions.length} regions`);
  } catch (error) {
    console.error('Error exporting data:', error);
    toast.error('Failed to export data. Please try again.');
  }
};
