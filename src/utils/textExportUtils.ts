
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const exportDocumentTexts = async (documentId: string, documentName: string): Promise<void> => {
  try {
    console.log('Fetching assigned text content for document:', documentId);
    
    // Get the document information
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .select('user_id, name')
      .eq('id', documentId)
      .single();

    if (docError) {
      console.error('Error fetching document:', docError);
      throw docError;
    }

    if (!docData) {
      toast.error('Document not found');
      return;
    }

    console.log('Document owner user_id:', docData.user_id);
    
    // Check if current user is admin
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user?.id)
      .single();

    const isAdmin = profile?.role === 'admin';
    console.log('Current user is admin:', isAdmin);

    // Fetch assigned text content with region information
    // We need to do separate queries since there's no direct foreign key relationship
    const { data: assignedTexts, error: assignedError } = await supabase
      .from('text_assignments')
      .select('text_content, text_title, region_id')
      .eq('document_id', documentId);

    if (assignedError) {
      console.error('Error fetching assigned texts:', assignedError);
      throw assignedError;
    }

    console.log('Assigned texts found:', assignedTexts?.length || 0);

    if (!assignedTexts || assignedTexts.length === 0) {
      toast.error('No assigned text content found in this document');
      return;
    }

    // Get region information for all regions
    const regionIds = assignedTexts.map(text => text.region_id);
    const { data: regions, error: regionsError } = await supabase
      .from('document_regions')
      .select('id, name, page, x, y')
      .in('id', regionIds);

    if (regionsError) {
      console.error('Error fetching regions:', regionsError);
      throw regionsError;
    }

    if (!regions || regions.length === 0) {
      toast.error('No region information found');
      return;
    }

    // Create a map of region_id to region info
    const regionMap = new Map(regions.map(region => [region.id, region]));

    // Combine texts with their region information and sort
    const textsWithRegions = assignedTexts
      .map(text => {
        const region = regionMap.get(text.region_id);
        return {
          text_content: text.text_content,
          text_title: text.text_title,
          region: region
        };
      })
      .filter(item => item.region) // Only include items with valid region data
      .sort((a, b) => {
        const aRegion = a.region!;
        const bRegion = b.region!;
        
        // Parse region names like "1_1", "1_2", "2_1" etc.
        const aParts = aRegion.name.split('_').map(Number);
        const bParts = bRegion.name.split('_').map(Number);
        
        // First sort by page number (first part)
        if (aParts[0] !== bParts[0]) {
          return aParts[0] - bParts[0];
        }
        
        // Then sort by region number within page (second part)
        return (aParts[1] || 0) - (bParts[1] || 0);
      });

    // Process and format the text content
    const processedTexts = textsWithRegions.map(item => {
      let text = item.text_content;
      
      // Remove markdown formatting (asterisks, etc.)
      text = text.replace(/\*\*/g, '').replace(/\*/g, '');
      
      // Remove "---" separators
      text = text.replace(/---/g, '');
      
      // Split text into logical paragraphs/questions for better readability
      // Split on question marks followed by space/newline, or on double spaces, or explicit newlines
      const paragraphs = text
        .split(/\?\s+|\n\s*\n|\.\s{2,}/)
        .map(para => para.trim())
        .filter(para => para.length > 0)
        .map(para => {
          // Add back question mark if it was removed during split and the paragraph is a question
          if (para.includes('What') || para.includes('Which') || para.includes('How') || para.includes('Why')) {
            if (!para.endsWith('?') && !para.endsWith('.')) {
              para += '?';
            }
          }
          // Clean up extra whitespace
          return para.replace(/\s+/g, ' ').trim();
        });
      
      // Join paragraphs with newlines for proper formatting
      return paragraphs.join('\n');
    }).filter(text => text.length > 0);

    if (processedTexts.length === 0) {
      toast.error('No valid text content found after processing');
      return;
    }

    // Join all texts with single spaces to separate different regions
    const finalText = processedTexts.join(' ');

    // Create and download the text file
    const blob = new Blob([finalText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Create safe filename
    const safeDocName = documentName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `${safeDocName}_assigned_text.txt`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success(`Successfully exported ${processedTexts.length} assigned text sections`);
    console.log('Assigned text export completed successfully');
    
  } catch (error) {
    console.error('Error exporting assigned text content:', error);
    toast.error('Failed to export assigned text content');
  }
};
