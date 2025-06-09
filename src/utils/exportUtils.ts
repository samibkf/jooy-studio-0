
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

    // Sort regions first by page number, then by region name
    const sortedRegions = [...processedRegions].sort((a, b) => {
      // First sort by page number
      if (a.page !== b.page) {
        return a.page - b.page;
      }
      
      // If on the same page, sort by region name (assuming format like "1_1", "1_2", etc.)
      const aNumber = parseInt(a.name.split('_')[1]) || 0;
      const bNumber = parseInt(b.name.split('_')[1]) || 0;
      return aNumber - bNumber;
    });
    
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

// Add the missing exportToCSV function
export const exportToCSV = (data: any[], filename: string): void => {
  try {
    if (!data || data.length === 0) {
      toast.error('No data to export');
      return;
    }

    // Get headers from the first object
    const headers = Object.keys(data[0]);
    
    // Create CSV content
    const csvContent = [
      headers.join(','), // Header row
      ...data.map(row => 
        headers.map(header => {
          const value = row[header] || '';
          // Escape quotes and wrap in quotes if contains comma or quote
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      )
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_export.csv`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('CSV exported successfully!');
  } catch (error) {
    console.error('Error exporting CSV:', error);
    toast.error('Failed to export CSV');
  }
};
