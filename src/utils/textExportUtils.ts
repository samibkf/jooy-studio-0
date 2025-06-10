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
      
      // Remove "---" separators first
      text = text.replace(/---/g, '');
      
      // Remove only bold markdown formatting (**), but preserve single asterisks for questions
      text = text.replace(/\*\*/g, '');
      
      // Split text into sections - first by double newlines (natural paragraph breaks)
      const sections = text.split(/\n\s*\n/);
      
      const processedSections = sections.map(section => {
        section = section.trim();
        if (!section) return '';
        
        // Check if this section contains asterisk-wrapped questions
        const asteriskQuestionPattern = /\*([^*]+\?)\*/g;
        const hasAsteriskQuestions = asteriskQuestionPattern.test(section);
        
        if (hasAsteriskQuestions) {
          // Split by asterisk questions and process each part
          const parts = section.split(/(\*[^*]+\?\*)/);
          return parts.map(part => {
            if (part.match(/^\*[^*]+\?\*$/)) {
              // This is an asterisk-wrapped question - keep it as is
              return part;
            } else {
              // This is regular text - clean up whitespace and split long sentences
              return part.trim().replace(/\s+/g, ' ');
            }
          }).filter(part => part.length > 0).join('\n');
        } else {
          // No asterisk questions - process as regular paragraphs
          // Split on sentence endings followed by multiple spaces or question marks
          const sentences = section
            .split(/(\?\s+|\.\s{2,})/)
            .map(sentence => sentence.trim())
            .filter(sentence => sentence.length > 0)
            .map(sentence => {
              // Clean up extra whitespace
              sentence = sentence.replace(/\s+/g, ' ').trim();
              
              // Add back question mark if it was a question and doesn't end with punctuation
              if ((sentence.includes('What') || sentence.includes('Which') || sentence.includes('How') || sentence.includes('Why')) && 
                  !sentence.endsWith('?') && !sentence.endsWith('.')) {
                sentence += '?';
              }
              
              return sentence;
            });
          
          return sentences.join('\n');
        }
      }).filter(section => section.length > 0);
      
      return processedSections.join('\n');
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
