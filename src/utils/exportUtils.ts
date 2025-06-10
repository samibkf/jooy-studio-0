
import { RegionMapping } from '@/types/regions';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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

export const exportDocumentTexts = async (documentId: string, documentName: string): Promise<void> => {
  try {
    console.log(`Fetching text content for document: ${documentId}`);
    
    // Fetch text assignments for the given document ID
    const { data: textAssignments, error: assignmentsError } = await supabase
      .from('text_assignments')
      .select('text_content, region_id')
      .eq('document_id', documentId)
      .order('region_id');

    if (assignmentsError) {
      console.error('Error fetching text assignments:', assignmentsError);
      toast.error('Failed to fetch text assignments');
      return;
    }

    // Fetch document texts for the given document ID
    const { data: documentTexts, error: textsError } = await supabase
      .from('document_texts')
      .select('content, page')
      .eq('document_id', documentId)
      .order('page');

    if (textsError) {
      console.error('Error fetching document texts:', textsError);
      toast.error('Failed to fetch document texts');
      return;
    }

    console.log(`Found ${textAssignments?.length || 0} text assignments and ${documentTexts?.length || 0} document texts`);

    // Combine all text content
    const allTexts: string[] = [];

    // Add text assignments content
    if (textAssignments && textAssignments.length > 0) {
      console.log(`Processing ${textAssignments.length} text assignments`);
      textAssignments.forEach(assignment => {
        if (assignment.text_content) {
          // Clean and process the text content
          const cleanedContent = cleanTextContent(assignment.text_content);
          if (cleanedContent) {
            allTexts.push(cleanedContent);
          }
        }
      });
    }

    // Add document texts content
    if (documentTexts && documentTexts.length > 0) {
      console.log(`Processing ${documentTexts.length} document texts`);
      documentTexts.forEach(docText => {
        if (docText.content) {
          // Clean and process the text content
          const cleanedContent = cleanTextContent(docText.content);
          if (cleanedContent) {
            allTexts.push(cleanedContent);
          }
        }
      });
    }

    if (allTexts.length === 0) {
      toast.error('No text content found in this document after data consistency fix');
      return;
    }

    console.log(`Successfully processed ${allTexts.length} text sections`);

    // Join all texts with new lines between paragraphs
    const finalText = allTexts.join('\n\n');

    // Create text file
    const blob = new Blob([finalText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeDocName = documentName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `${safeDocName}_text.txt`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success(`Successfully exported text content from ${allTexts.length} sections`);
  } catch (error) {
    console.error('Error exporting document texts:', error);
    toast.error('Failed to export text content. Please try again.');
  }
};

const cleanTextContent = (content: string): string => {
  if (!content) return '';
  
  // Remove markdown formatting (asterisks, etc.)
  let cleaned = content.replace(/\*\*(.*?)\*\*/g, '$1'); // Remove **bold**
  cleaned = cleaned.replace(/\*(.*?)\*/g, '$1'); // Remove *italic*
  
  // Split into paragraphs and clean each one
  const paragraphs = cleaned
    .split('\n')
    .map(para => para.trim())
    .filter(para => para.length > 0);
  
  // Join paragraphs with single newlines
  return paragraphs.join('\n');
};
