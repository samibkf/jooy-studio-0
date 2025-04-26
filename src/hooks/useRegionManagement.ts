
import { useState } from 'react';
import { Region } from '@/types/regions';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { Document } from '@/types/documents';

export const useRegionManagement = (
  selectedDocumentId: string | null,
  setDocuments: (fn: (prev: Document[]) => Document[]) => void,
  regionsCache: Record<string, Region[]>,
  setRegionsCache: (fn: (prev: Record<string, Region[]>) => Record<string, Region[]>) => void
) => {
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);

  const handleRegionCreate = (regionData: Omit<Region, 'id'>) => {
    if (!selectedDocumentId) return;

    const newRegion: Region = {
      ...regionData,
      id: uuidv4()
    };

    setDocuments(prev =>
      prev.map(doc =>
        doc.id === selectedDocumentId
          ? { ...doc, regions: [...doc.regions, newRegion] }
          : doc
      )
    );
    
    setRegionsCache(prev => ({
      ...prev,
      [selectedDocumentId]: [...(prev[selectedDocumentId] || []), newRegion]
    }));
    
    setSelectedRegionId(newRegion.id);
    toast.success('Region created');
  };

  const handleRegionUpdate = (updatedRegion: Region) => {
    if (!selectedDocumentId) return;

    setDocuments(prev =>
      prev.map(doc =>
        doc.id === selectedDocumentId
          ? {
              ...doc,
              regions: doc.regions.map(region =>
                region.id === updatedRegion.id ? updatedRegion : region
              )
            }
          : doc
      )
    );
    
    setRegionsCache(prev => ({
      ...prev,
      [selectedDocumentId]: (prev[selectedDocumentId] || []).map(region =>
        region.id === updatedRegion.id ? updatedRegion : region
      )
    }));
  };

  const handleRegionDelete = (regionId: string) => {
    if (!selectedDocumentId) return;

    setDocuments(prev =>
      prev.map(doc =>
        doc.id === selectedDocumentId
          ? {
              ...doc,
              regions: doc.regions.filter(region => region.id !== regionId)
            }
          : doc
      )
    );
    
    setRegionsCache(prev => ({
      ...prev,
      [selectedDocumentId]: (prev[selectedDocumentId] || []).filter(region => region.id !== regionId)
    }));

    if (selectedRegionId === regionId) {
      setSelectedRegionId(null);
    }
    toast.success('Region deleted');
  };

  return {
    selectedRegionId,
    setSelectedRegionId,
    handleRegionCreate,
    handleRegionUpdate,
    handleRegionDelete
  };
};
