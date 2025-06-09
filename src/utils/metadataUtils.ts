
// Legacy metadata utilities - kept for backward compatibility
// New projects should use useDocumentMetadata hook instead

import { supabase } from '@/integrations/supabase/client';
import { Region } from '@/types/regions';
import { DocumentData } from '@/types/documents';

export interface DocumentMetadata {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  regions: Region[];
  textAssignments: Array<{
    regionId: string;
    textTitle: string;
    textContent: string;
    assignedAt: string;
  }>;
  documentTexts: Array<{
    id: string;
    title: string;
    content: string;
    page: number;
    assignedRegionId?: string;
  }>;
}

// Legacy function - use useDocumentMetadata hook instead
export const generateMetadata = async (
  document: DocumentData,
  documentId: string,
  userId: string
): Promise<DocumentMetadata> => {
  console.warn('generateMetadata is deprecated. Use useDocumentMetadata hook instead.');
  
  // Get text assignments
  const { data: textAssignments } = await supabase
    .from('text_assignments')
    .select('*')
    .eq('document_id', documentId)
    .eq('user_id', userId);

  // Get document texts
  const { data: documentTexts } = await supabase
    .from('document_texts')
    .select('*')
    .eq('document_id', documentId)
    .eq('user_id', userId);

  return {
    id: documentId,
    name: document.name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    regions: document.regions || [],
    textAssignments: (textAssignments || []).map(ta => ({
      regionId: ta.region_id,
      textTitle: ta.text_title,
      textContent: ta.text_content,
      assignedAt: ta.created_at
    })),
    documentTexts: (documentTexts || []).map(dt => ({
      id: dt.id,
      title: dt.title,
      content: dt.content,
      page: dt.page,
      assignedRegionId: undefined
    }))
  };
};

// Legacy function - use useDocumentMetadata hook instead
export const uploadMetadata = async (
  documentId: string,
  metadata: DocumentMetadata,
  userId: string
): Promise<boolean> => {
  console.warn('uploadMetadata is deprecated. Use useDocumentMetadata hook instead.');
  
  try {
    const metadataJson = JSON.stringify(metadata, null, 2);
    // Store metadata directly in bucket root using document ID only
    const fileName = `${documentId}.json`;

    const { error } = await supabase.storage
      .from('data')
      .upload(fileName, new Blob([metadataJson], { type: 'application/json' }), {
        upsert: true
      });

    if (error) {
      console.error('Error uploading metadata:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in uploadMetadata:', error);
    return false;
  }
};

// Legacy function - use useDocumentMetadata hook instead
export const updateMetadata = async (
  documentId: string,
  updates: Partial<DocumentMetadata>,
  userId: string
): Promise<boolean> => {
  console.warn('updateMetadata is deprecated. Use useDocumentMetadata hook instead.');
  
  try {
    // Store metadata directly in bucket root using document ID only
    const fileName = `${documentId}.json`;
    
    const { data: existingData } = await supabase.storage
      .from('data')
      .download(fileName);

    let currentMetadata: DocumentMetadata;

    if (existingData) {
      const text = await existingData.text();
      currentMetadata = JSON.parse(text);
    } else {
      currentMetadata = {
        id: documentId,
        name: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        regions: [],
        textAssignments: [],
        documentTexts: []
      };
    }

    const updatedMetadata: DocumentMetadata = {
      ...currentMetadata,
      ...updates,
      updatedAt: new Date().toISOString(),
      version: currentMetadata.version + 1
    };

    return await uploadMetadata(documentId, updatedMetadata, userId);
  } catch (error) {
    console.error('Error updating metadata:', error);
    return false;
  }
};

// Legacy function - use useDocumentMetadata hook instead
export const deleteMetadata = async (documentId: string, userId: string): Promise<boolean> => {
  console.warn('deleteMetadata is deprecated. Use useDocumentMetadata hook instead.');
  
  try {
    // Store metadata directly in bucket root using document ID only
    const fileName = `${documentId}.json`;
    
    const { error } = await supabase.storage
      .from('data')
      .remove([fileName]);

    if (error) {
      console.error('Error deleting metadata:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteMetadata:', error);
    return false;
  }
};
