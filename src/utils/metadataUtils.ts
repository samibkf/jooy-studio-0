// Legacy metadata utilities - kept for backward compatibility
// New projects should use useDocumentMetadata hook instead

import { supabase } from '@/integrations/supabase/client';
import { Region } from '@/types/regions';
import { DocumentData } from '@/types/documents';

export interface DocumentMetadata {
  documentName: string;
  documentId: string;
  drmProtectedPages: boolean | number[];
  regions: Array<{
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
    type: string;
    name: string;
    description: string[];
  }>;
  isPrivate: boolean;
}

// Legacy function - use useDocumentMetadata hook instead
export const generateMetadata = async (
  document: DocumentData,
  documentId: string,
  userId: string
): Promise<DocumentMetadata> => {
  console.warn('generateMetadata is deprecated. Use useDocumentMetadata hook instead.');
  
  // Process regions to include only essential fields and ensure proper ordering
  const processedRegions = (document.regions || []).map(region => {
    // Convert description to array format if it's a string
    let descriptionArray: string[] = [];
    if (region.description) {
      if (typeof region.description === 'string') {
        // Split by commas and clean up each paragraph
        descriptionArray = region.description
          .split(',')
          .map(para => para.trim())
          .filter(para => para.length > 0);
      } else if (Array.isArray(region.description)) {
        descriptionArray = region.description;
      }
    }

    return {
      page: region.page,
      x: region.x,
      y: region.y,
      width: region.width,
      height: region.height,
      type: region.type,
      name: region.name,
      description: descriptionArray
    };
  });

  // Sort regions: first by page number, then by region name
  const sortedRegions = (document.regions || []).sort((a, b) => {
    // First sort by page number
    if (a.page !== b.page) {
      return a.page - b.page;
    }
    
    // If on the same page, sort by region name (assuming format like "1_1", "1_2", etc.)
    const aNumber = parseInt(a.name.split('_')[1]) || 0;
    const bNumber = parseInt(b.name.split('_')[1]) || 0;
    return aNumber - bNumber;
  });

  return {
    documentName: document.name,
    documentId: documentId,
    drmProtectedPages: document.drm_protected_pages || [],
    isPrivate: document.is_private,
    regions: sortedRegions.map(r => ({
        page: r.page,
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        type: r.type,
        name: r.name,
        description: Array.isArray(r.description) ? r.description : (r.description || "").split(',').map(s => s.trim()).filter(Boolean),
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
        documentName: '',
        documentId: documentId,
        drmProtectedPages: [],
        regions: [],
        isPrivate: false,
      };
    }

    const updatedMetadata: DocumentMetadata = {
      ...currentMetadata,
      ...updates
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
