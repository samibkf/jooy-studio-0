
import { useState } from 'react';
import { Region } from '@/types/regions';

export const useDocumentState = (documentId: string | null) => {
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [currentSelectionType, setCurrentSelectionType] = useState<'area' | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Reset states when document changes
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
    resetStates
  };
};
