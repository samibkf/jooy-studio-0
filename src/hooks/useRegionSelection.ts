
import { useState, useRef, useEffect } from 'react';
import { Region, RegionType } from '@/types/regions';

interface UseRegionSelectionProps {
  onRegionCreate: (region: Region) => void;
  currentPage: number;
  currentSelectionType: RegionType | null;
}

export const useRegionSelection = ({ onRegionCreate, currentPage, currentSelectionType }: UseRegionSelectionProps) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selectionRect, setSelectionRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [selectionPoint, setSelectionPoint] = useState<{ x: number, y: number } | null>(null);
  const [isDoubleClickMode, setIsDoubleClickMode] = useState(false);
  const [isTemporarilyBlocked, setIsTemporarilyBlocked] = useState(false);
  const [creationTimeoutId, setCreationTimeoutId] = useState<number | null>(null);

  const getNextRegionNumber = (pageNumber: number): number => {
    const parts = String(pageNumber).split('_');
    return parts.length > 1 ? parseInt(parts[1], 10) + 1 : 1;
  };

  const createRegion = (rect: { x: number, y: number, width: number, height: number }) => {
    if (rect.width > 10 && rect.height > 10) {
      const nextNumber = getNextRegionNumber(currentPage + 1);
      const regionName = `${currentPage + 1}_${nextNumber}`;
      
      const newRegion: Region = {
        id: Math.random().toString(36).substring(7),
        page: currentPage + 1,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        type: currentSelectionType || 'area',
        name: regionName,
        description: null
      };
      
      onRegionCreate(newRegion);
      
      setIsTemporarilyBlocked(true);
      const timeoutId = window.setTimeout(() => {
        setIsTemporarilyBlocked(false);
      }, 500);
      
      setCreationTimeoutId(timeoutId);
    }
  };

  useEffect(() => {
    return () => {
      if (creationTimeoutId !== null) {
        window.clearTimeout(creationTimeoutId);
      }
    };
  }, [creationTimeoutId]);

  return {
    isSelecting,
    setIsSelecting,
    selectionStart,
    setSelectionStart,
    selectionRect,
    setSelectionRect,
    selectionPoint,
    setSelectionPoint,
    isDoubleClickMode,
    setIsDoubleClickMode,
    isTemporarilyBlocked,
    createRegion
  };
};
