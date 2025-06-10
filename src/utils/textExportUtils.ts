
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

    // Fetch assigned text content by joining text_assignments with document_regions
    // This ensures we only get assigned texts and can order them properly by region names
    const { data: assignedTexts, error: assignedError } = await supabase
      .from('text_assignments')
      .select(`
        text_content,
        text_title,
        document_regions!inner(name, page, x, y)
      `)
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

    // Sort by region names to get proper order (1_1, 1_2, 2_1, 2_2, etc.)
    const sortedTexts = assignedTexts.sort((a, b) => {
      const aRegion = a.document_regions;
      const bRegion = b.document_regions;
      
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
    const processedTexts = sortedTexts.map(item => {
      let text = item.text_content;
      
      // Remove markdown formatting (asterisks, etc.)
      text = text.replace(/\*\*/g, '').replace(/\*/g, '');
      
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

    // Join all texts with double newlines to separate different regions
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
