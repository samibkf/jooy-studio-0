
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Region } from '@/types/regions';
import { parseTitledText } from '@/utils/textProcessing';

type TitledText = {
  title: string;
  content: string;
  assignedRegionId?: string;
};

type TextAssignmentContextType = {
  titledTexts: TitledText[];
  originalTexts: Record<string, string | null>;
  setTitledTexts: React.Dispatch<React.SetStateAction<TitledText[]>>;
  assignTextsToRegions: (text: string, regions: Region[]) => TitledText[];
  undoAllAssignments: () => void;
  undoRegionAssignment: (regionId: string) => void;
  assignTextToRegion: (textIndex: number, regionId: string) => void;
  getAssignedText: (regionId: string) => string | null;
  isRegionAssigned: (regionId: string) => boolean;
  resetAssignments: () => void;
};

const LOCAL_STORAGE_KEY = 'textAssignments';

const TextAssignmentContext = createContext<TextAssignmentContextType | null>(null);

export const useTextAssignment = () => {
  const context = useContext(TextAssignmentContext);
  if (!context) {
    throw new Error('useTextAssignment must be used within a TextAssignmentProvider');
  }
  return context;
};

export const TextAssignmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [titledTexts, setTitledTexts] = useState<TitledText[]>([]);
  const [originalTexts, setOriginalTexts] = useState<Record<string, string | null>>({});

  // Load state from localStorage on initial render
  useEffect(() => {
    const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedState) {
      try {
        const { titledTexts: savedTitledTexts, originalTexts: savedOriginalTexts } = JSON.parse(savedState);
        setTitledTexts(savedTitledTexts);
        setOriginalTexts(savedOriginalTexts);
      } catch (error) {
        console.error('Error loading text assignments from localStorage:', error);
      }
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (titledTexts.length > 0 || Object.keys(originalTexts).length > 0) {
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({ titledTexts, originalTexts })
      );
    }
  }, [titledTexts, originalTexts]);

  const resetAssignments = () => {
    setTitledTexts([]);
    setOriginalTexts({});
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  const assignTextsToRegions = (text: string, regions: Region[]): TitledText[] => {
    const parsedTexts = parseTitledText(text);
    const newTitledTexts = [...parsedTexts];
    const newOriginalTexts: Record<string, string | null> = {};
    
    // Store original descriptions for undo capability
    regions.forEach(region => {
      newOriginalTexts[region.id] = region.description;
    });
    
    setOriginalTexts(newOriginalTexts);
    setTitledTexts(newTitledTexts);
    
    // Return the texts for immediate use
    return newTitledTexts;
  };

  const undoAllAssignments = () => {
    setTitledTexts(prevTexts => 
      prevTexts.map(text => ({ ...text, assignedRegionId: undefined }))
    );
  };

  const undoRegionAssignment = (regionId: string) => {
    setTitledTexts(prevTexts => 
      prevTexts.map(text => 
        text.assignedRegionId === regionId 
          ? { ...text, assignedRegionId: undefined } 
          : text
      )
    );
  };

  const assignTextToRegion = (textIndex: number, regionId: string) => {
    setTitledTexts(prevTexts => {
      // First, check if any other text is already assigned to this region
      // If so, unassign it
      const updatedTexts = prevTexts.map(text => 
        text.assignedRegionId === regionId
          ? { ...text, assignedRegionId: undefined }
          : text
      );
      
      // Now assign the new text to the region
      return updatedTexts.map((text, index) => 
        index === textIndex 
          ? { ...text, assignedRegionId: regionId } 
          : text
      );
    });
  };

  const getAssignedText = (regionId: string): string | null => {
    const assignedText = titledTexts.find(text => text.assignedRegionId === regionId);
    if (assignedText) {
      // Return plain text without markdown formatting
      return assignedText.content
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/---/g, ' ')
        .replace(/\n/g, ' ')
        .trim();
    }
    return null;
  };

  const isRegionAssigned = (regionId: string): boolean => {
    return titledTexts.some(text => text.assignedRegionId === regionId);
  };

  const value = {
    titledTexts,
    originalTexts,
    setTitledTexts,
    assignTextsToRegions,
    undoAllAssignments,
    undoRegionAssignment,
    assignTextToRegion,
    getAssignedText,
    isRegionAssigned,
    resetAssignments
  };

  return (
    <TextAssignmentContext.Provider value={value}>
      {children}
    </TextAssignmentContext.Provider>
  );
};
