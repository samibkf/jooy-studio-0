
import { useState, useEffect } from 'react';
import { Region } from '@/types/regions';

export const useDocumentState = (documentId: string | null) => {
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [currentSelectionType, setCurrentSelectionType] = useState<'area' | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [regionsCache, setRegionsCache] = useState<Record<string, Region[]>>({});

  // Reset states when document changes
  useEffect(() => {
    setSelectedRegionId(null);
    setCurrentSelectionType(null);
    setIsSelectionMode(false);
  }, [documentId]);

  const resetStates = () => {
    setSelectedRegionId(null);
    setCurrentSelectionType(null);
    setIsSelectionMode(false);
  };

  return {
    selectedRegionId,
    setSelectedRegionId,
    currentSelectionType,
    setCurrentSelectionType,
    isSelectionMode,
    setIsSelectionMode,
    regionsCache,
    setRegionsCache,
    resetStates
  };
};
