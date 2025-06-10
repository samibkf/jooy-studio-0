
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
        // Transform regions to match the new metadata format
        const processedRegions = regions.map(region => {
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

        await updateMetadata(documentId, {
          regions: sortedRegions,
          documentName: documentName
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
