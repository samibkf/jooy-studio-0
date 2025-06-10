import { useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Region } from '@/types/regions';
import { DocumentData } from '@/types/documents';

interface DocumentMetadata {
  documentName: string;
  documentId: string;
  drmProtectedPages: number[];
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
}

interface UseDocumentMetadataProps {
  documentId: string | null;
  documentData?: DocumentData;
  autoSync?: boolean;
  syncInterval?: number;
}

export const useDocumentMetadata = ({
  documentId,
  documentData,
  autoSync = true,
  syncInterval = 2000
}: UseDocumentMetadataProps) => {
  const { authState } = useAuth();

  const generateMetadata = useCallback(async (
    docId: string,
    docData: DocumentData
  ): Promise<DocumentMetadata> => {
    if (!authState.user) throw new Error('User not authenticated');

    // Process regions to include only essential fields and ensure proper ordering
    const processedRegions = (docData.regions || []).map(region => {
      // Convert description to array format if it's a string
      let descriptionArray: string[] = [];
      if (region.description) {
        if (typeof region.description === 'string') {
          // Split by paragraph separators (double newlines, or other common separators)
          descriptionArray = region.description
            .split(/\n\n+|\r\n\r\n+/)  // Split by double newlines
            .map(para => para.trim())
            .filter(para => para.length > 0)
            .map(para => para.replace(/\n/g, ' ').trim()); // Clean up single newlines within paragraphs
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
    const sortedRegions = processedRegions.sort((a, b) => {
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
      documentName: docData.name,
      documentId: docId,
      drmProtectedPages: [], // Initialize as empty array - can be populated based on document data if needed
      regions: sortedRegions
    };
  }, [authState.user]);

  const uploadMetadata = useCallback(async (
    docId: string,
    metadata: DocumentMetadata
  ): Promise<boolean> => {
    if (!authState.user) return false;

    try {
      const metadataJson = JSON.stringify(metadata, null, 2);
      // Store metadata directly in bucket root using document ID only
      const fileName = `${docId}.json`;

      const { error } = await supabase.storage
        .from('data')
        .upload(fileName, new Blob([metadataJson], { type: 'application/json' }), {
          upsert: true
        });

      if (error) {
        console.error('Error uploading metadata:', error);
        return false;
      }

      console.log(`Metadata synced for document: ${docId}`);
      return true;
    } catch (error) {
      console.error('Error in uploadMetadata:', error);
      return false;
    }
  }, [authState.user]);

  const syncMetadata = useCallback(async () => {
    if (!documentId || !documentData || !authState.user) return;

    try {
      const metadata = await generateMetadata(documentId, documentData);
      await uploadMetadata(documentId, metadata);
    } catch (error) {
      console.error('Failed to sync metadata:', error);
    }
  }, [documentId, documentData, authState.user, generateMetadata, uploadMetadata]);

  // Auto-sync metadata when document data changes
  useEffect(() => {
    if (!autoSync || !documentId || !documentData || !authState.user) return;

    // Debounce metadata updates to avoid too frequent writes
    const timeoutId = setTimeout(syncMetadata, syncInterval);

    return () => clearTimeout(timeoutId);
  }, [autoSync, documentId, documentData, authState.user, syncMetadata, syncInterval]);

  return {
    syncMetadata,
    generateMetadata,
    uploadMetadata
  };
};
