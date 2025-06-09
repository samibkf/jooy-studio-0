
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { updateMetadata } from '@/utils/metadataUtils';
import { Region } from '@/types/regions';

interface UseMetadataSyncProps {
  documentId: string | null;
  regions: Region[];
  documentName?: string;
}

export const useMetadataSync = ({ documentId, regions, documentName }: UseMetadataSyncProps) => {
  const { authState } = useAuth();

  useEffect(() => {
    if (!documentId || !authState.user) return;

    const syncMetadata = async () => {
      try {
        await updateMetadata(documentId, {
          regions,
          name: documentName
        }, authState.user.id);
        console.log('Metadata synced for document:', documentId);
      } catch (error) {
        console.error('Failed to sync metadata:', error);
      }
    };

    // Debounce metadata updates to avoid too frequent writes
    const timeoutId = setTimeout(syncMetadata, 2000);

    return () => clearTimeout(timeoutId);
  }, [documentId, regions, documentName, authState.user]);
};
