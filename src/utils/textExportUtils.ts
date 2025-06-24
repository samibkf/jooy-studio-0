
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

    // First, try to fetch from the new document_texts table
    const { data: newTexts, error: newTextsError } = await supabase
      .from('document_texts')
      .select('title, content, assigned_region_id, order_index, page')
      .eq('document_id', documentId)
      .order('page', { ascending: true })
      .order('order_index', { ascending: true });

    if (newTextsError) {
      console.error('Error fetching new document texts:', newTextsError);
    }

    console.log('New document texts found:', newTexts?.length || 0);

    // Also try to fetch from legacy text_assignments table for backward compatibility
    const { data: legacyTexts, error: legacyError } = await supabase
      .from('text_assignments')
      .select('text_content, text_title, region_id')
      .eq('document_id', documentId);

    if (legacyError) {
      console.error('Error fetching legacy texts:', legacyError);
    }

    console.log('Legacy assigned texts found:', legacyTexts?.length || 0);

    let processedTexts: string[] = [];

    // Process new document_texts data
    if (newTexts && newTexts.length > 0) {
      console.log('Processing new document_texts data');
      
      // Get region information for texts that have assigned_region_id
      const regionIds = newTexts
        .filter(text => text.assigned_region_id)
        .map(text => text.assigned_region_id);

      let regionMap = new Map();
      
      if (regionIds.length > 0) {
        const { data: regions, error: regionsError } = await supabase
          .from('document_regions')
          .select('id, name, page, x, y')
          .in('id', regionIds);

        if (regionsError) {
          console.error('Error fetching regions for new texts:', regionsError);
        } else if (regions) {
          regionMap = new Map(regions.map(region => [region.id, region]));
        }
      }

      // Process and sort new texts
      const newProcessedTexts = newTexts
        .map(text => {
          let content = text.content;
          
          // Clean up content - remove "---" separators and collapse multiple spaces
          content = content.replace(/---/g, '');
          content = content.replace(/ +/g, ' ').trim();
          
          return content;
        })
        .filter(text => text.length > 0);

      processedTexts = processedTexts.concat(newProcessedTexts);
    }

    // Process legacy text_assignments data if no new data found
    if (processedTexts.length === 0 && legacyTexts && legacyTexts.length > 0) {
      console.log('Processing legacy text_assignments data');
      
      // Get region information for legacy texts
      const regionIds = legacyTexts.map(text => text.region_id);
      const { data: regions, error: regionsError } = await supabase
        .from('document_regions')
        .select('id, name, page, x, y')
        .in('id', regionIds);

      if (regionsError) {
        console.error('Error fetching regions for legacy texts:', regionsError);
        throw regionsError;
      }

      if (!regions || regions.length === 0) {
        toast.error('No region information found');
        return;
      }

      // Create a map of region_id to region info
      const regionMap = new Map(regions.map(region => [region.id, region]));

      // Combine texts with their region information and sort
      const textsWithRegions = legacyTexts
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

      // Process and format the legacy text content
      const legacyProcessedTexts = textsWithRegions.map(item => {
        let text = item.text_content;
        
        // Only remove "---" separators and collapse multiple consecutive spaces
        text = text.replace(/---/g, '');
        text = text.replace(/ +/g, ' ').trim();
        
        return text;
      }).filter(text => text.length > 0);

      processedTexts = processedTexts.concat(legacyProcessedTexts);
    }

    if (processedTexts.length === 0) {
      toast.error('No assigned text content found in this document');
      return;
    }

    // Join all texts with double newlines to separate different sections
    const finalText = processedTexts.join('\n\n');

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
