
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

// Generate metadata object from document data
export const generateMetadata = async (
  document: DocumentData,
  documentId: string,
  userId: string
): Promise<DocumentMetadata> => {
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
      assignedRegionId: undefined // Will be populated by text assignment context
    }))
  };
};

// Upload metadata to Supabase storage
export const uploadMetadata = async (
  documentId: string,
  metadata: DocumentMetadata,
  userId: string
): Promise<boolean> => {
  try {
    const metadataJson = JSON.stringify(metadata, null, 2);
    const fileName = `${userId}/${documentId}.json`;

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

// Update metadata file when document changes
export const updateMetadata = async (
  documentId: string,
  updates: Partial<DocumentMetadata>,
  userId: string
): Promise<boolean> => {
  try {
    // First, try to download existing metadata
    const fileName = `${userId}/${documentId}.json`;
    
    const { data: existingData } = await supabase.storage
      .from('data')
      .download(fileName);

    let currentMetadata: DocumentMetadata;

    if (existingData) {
      const text = await existingData.text();
      currentMetadata = JSON.parse(text);
    } else {
      // Create new metadata if it doesn't exist
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

    // Merge updates
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

// Delete metadata file
export const deleteMetadata = async (documentId: string, userId: string): Promise<boolean> => {
  try {
    const fileName = `${userId}/${documentId}.json`;
    
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
