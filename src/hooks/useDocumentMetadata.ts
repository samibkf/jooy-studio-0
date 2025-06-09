
import { useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Region } from '@/types/regions';
import { DocumentData } from '@/types/documents';

interface DocumentMetadata {
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

    // Get text assignments
    const { data: textAssignments } = await supabase
      .from('text_assignments')
      .select('*')
      .eq('document_id', docId)
      .eq('user_id', authState.user.id);

    // Get document texts
    const { data: documentTexts } = await supabase
      .from('document_texts')
      .select('*')
      .eq('document_id', docId)
      .eq('user_id', authState.user.id);

    return {
      id: docId,
      name: docData.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      regions: docData.regions || [],
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
