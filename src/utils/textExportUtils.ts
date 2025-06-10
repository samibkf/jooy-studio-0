
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const exportDocumentTexts = async (documentId: string, documentName: string): Promise<void> => {
  try {
    console.log('Fetching text content for document:', documentId);
    
    // Fetch text content from text_assignments table
    const { data: textAssignments, error: assignmentsError } = await supabase
      .from('text_assignments')
      .select('text_content')
      .eq('document_id', documentId);

    if (assignmentsError) {
      console.error('Error fetching text assignments:', assignmentsError);
      throw assignmentsError;
    }

    // Fetch text content from document_texts table
    const { data: documentTexts, error: textsError } = await supabase
      .from('document_texts')
      .select('content')
      .eq('document_id', documentId);

    if (textsError) {
      console.error('Error fetching document texts:', textsError);
      throw textsError;
    }

    console.log('Text assignments found:', textAssignments?.length || 0);
    console.log('Document texts found:', documentTexts?.length || 0);

    // Combine all text content
    const allTexts: string[] = [];
    
    // Add text from assignments
    if (textAssignments && textAssignments.length > 0) {
      textAssignments.forEach(assignment => {
        if (assignment.text_content && assignment.text_content.trim()) {
          allTexts.push(assignment.text_content.trim());
        }
      });
    }

    // Add text from document texts
    if (documentTexts && documentTexts.length > 0) {
      documentTexts.forEach(text => {
        if (text.content && text.content.trim()) {
          allTexts.push(text.content.trim());
        }
      });
    }

    if (allTexts.length === 0) {
      toast.error('No text content found in this document');
      return;
    }

    // Process and clean the text
    const processedTexts = allTexts.map(text => {
      // Remove markdown formatting (asterisks, etc.)
      let cleanText = text.replace(/\*\*/g, '').replace(/\*/g, '');
      
      // Clean up extra whitespace and normalize line breaks
      cleanText = cleanText.replace(/\s+/g, ' ').trim();
      
      return cleanText;
    }).filter(text => text.length > 0);

    // Join all paragraphs with single newlines
    const finalText = processedTexts.join('\n\n');

    // Create and download the text file
    const blob = new Blob([finalText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Create safe filename
    const safeDocName = documentName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `${safeDocName}_text.txt`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success(`Successfully exported ${processedTexts.length} text sections`);
    console.log('Text export completed successfully');
    
  } catch (error) {
    console.error('Error exporting text content:', error);
    toast.error('Failed to export text content');
  }
};
