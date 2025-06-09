
import React, { createContext, useContext } from 'react';
import { Region } from '@/types/regions';

interface DocumentContextType {
  regions: Region[];
  selectedRegionId: string | null;
  createRegion: (region: Omit<Region, 'id'>) => void;
  updateRegion: (region: Region) => void;
  selectRegion: (regionId: string | null) => void;
  deleteRegion: (regionId: string) => void;
  loading: boolean;
  clearDocument: () => void;
}

const DocumentContext = createContext<DocumentContextType | null>(null);

export const useDocumentState = (documentId: string | null) => {
  // For now, return a simple implementation using local state
  const [regions, setRegions] = React.useState<Region[]>([]);
  const [selectedRegionId, setSelectedRegionId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const createRegion = (region: Omit<Region, 'id'>) => {
    const newRegion: Region = {
      ...region,
      id: Math.random().toString(36).substring(2, 15)
    };
    setRegions(prev => [...prev, newRegion]);
  };

  const updateRegion = (updatedRegion: Region) => {
    setRegions(prev => prev.map(region => 
      region.id === updatedRegion.id ? updatedRegion : region
    ));
  };

  const selectRegion = (regionId: string | null) => {
    setSelectedRegionId(regionId);
  };

  const deleteRegion = (regionId: string) => {
    setRegions(prev => prev.filter(region => region.id !== regionId));
    if (selectedRegionId === regionId) {
      setSelectedRegionId(null);
    }
  };

  const clearDocument = () => {
    setRegions([]);
    setSelectedRegionId(null);
  };

  return {
    regions,
    selectedRegionId,
    createRegion,
    updateRegion,
    selectRegion,
    deleteRegion,
    loading,
    clearDocument
  };
};
