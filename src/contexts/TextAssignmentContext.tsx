
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Region } from '@/types/regions';
import { parseTitledText } from '@/utils/textProcessing';

type TitledText = {
  title: string;
  content: string;
  assignedRegionId?: string;
};

type DocumentAssignments = {
  titledTexts: TitledText[];
  originalTexts: Record<string, string | null>;
};

type TextAssignmentContextType = {
  getCurrentDocumentTexts: (documentId: string) => TitledText[];
  setTitledTexts: (documentId: string, texts: TitledText[]) => void;
  assignTextsToRegions: (text: string, regions: Region[], documentId: string) => TitledText[];
  undoAllAssignments: (documentId: string) => void;
  undoRegionAssignment: (regionId: string, documentId: string) => void;
  assignTextToRegion: (textIndex: number, regionId: string, documentId: string) => void;
  getAssignedText: (regionId: string, documentId: string) => string | null;
  isRegionAssigned: (regionId: string, documentId: string) => boolean;
  resetAssignments: (documentId?: string) => void;
  getUnassignedRegions: (regions: Region[], documentId: string) => Region[];
  getUnassignedRegionsByPage: (regions: Region[], pageNumber: number, documentId: string) => Region[];
  selectRegionById: (regionId: string, callback: (regionId: string) => void) => void;
};

const LOCAL_STORAGE_KEY = 'textAssignmentsByDocument';

const TextAssignmentContext = createContext<TextAssignmentContextType | null>(null);

export const useTextAssignment = () => {
  const context = useContext(TextAssignmentContext);
  if (!context) {
    throw new Error('useTextAssignment must be used within a TextAssignmentProvider');
  }
  return context;
};

export const TextAssignmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [documentAssignments, setDocumentAssignments] = useState<Record<string, DocumentAssignments>>({});

  // Load state from localStorage on initial render
  useEffect(() => {
    const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        setDocumentAssignments(parsedState);
      } catch (error) {
        console.error('Error loading text assignments from localStorage:', error);
      }
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (Object.keys(documentAssignments).length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(documentAssignments));
    }
  }, [documentAssignments]);

  const getCurrentDocumentTexts = (documentId: string): TitledText[] => {
    return documentAssignments[documentId]?.titledTexts || [];
  };

  const setTitledTexts = (documentId: string, texts: TitledText[]) => {
    setDocumentAssignments(prev => ({
      ...prev,
      [documentId]: {
        ...prev[documentId],
        titledTexts: texts
      }
    }));
  };

  const resetAssignments = (documentId?: string) => {
    if (documentId) {
      setDocumentAssignments(prev => {
        const newState = { ...prev };
        delete newState[documentId];
        return newState;
      });
    } else {
      setDocumentAssignments({});
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  };

  const assignTextsToRegions = (text: string, regions: Region[], documentId: string): TitledText[] => {
    const parsedTexts = parseTitledText(text);
    const newTitledTexts = [...parsedTexts];
    const newOriginalTexts: Record<string, string | null> = {};
    
    // Store original descriptions for undo capability
    regions.forEach(region => {
      newOriginalTexts[region.id] = region.description;
    });
    
    setDocumentAssignments(prev => ({
      ...prev,
      [documentId]: {
        titledTexts: newTitledTexts,
        originalTexts: newOriginalTexts
      }
    }));
    
    // Return the texts for immediate use
    return newTitledTexts;
  };

  const undoAllAssignments = (documentId: string) => {
    setDocumentAssignments(prev => ({
      ...prev,
      [documentId]: {
        ...prev[documentId],
        titledTexts: (prev[documentId]?.titledTexts || []).map(text => ({ 
          ...text, 
          assignedRegionId: undefined 
        }))
      }
    }));
  };

  const undoRegionAssignment = (regionId: string, documentId: string) => {
    setDocumentAssignments(prev => ({
      ...prev,
      [documentId]: {
        ...prev[documentId],
        titledTexts: (prev[documentId]?.titledTexts || []).map(text => 
          text.assignedRegionId === regionId 
            ? { ...text, assignedRegionId: undefined } 
            : text
        )
      }
    }));
  };

  const assignTextToRegion = (textIndex: number, regionId: string, documentId: string) => {
    setDocumentAssignments(prev => ({
      ...prev,
      [documentId]: {
        ...prev[documentId],
        titledTexts: (prev[documentId]?.titledTexts || []).map((text, index) => 
          index === textIndex 
            ? { ...text, assignedRegionId: regionId } 
            : text
        )
      }
    }));
  };

  const getAssignedText = (regionId: string, documentId: string): string | null => {
    const assignedText = (documentAssignments[documentId]?.titledTexts || []).find(text => text.assignedRegionId === regionId);
    return assignedText ? assignedText.content : null;
  };

  const isRegionAssigned = (regionId: string, documentId: string): boolean => {
    return (documentAssignments[documentId]?.titledTexts || []).some(text => text.assignedRegionId === regionId);
  };

  // Get regions that don't have text assigned to them
  const getUnassignedRegions = (regions: Region[], documentId: string): Region[] => {
    return regions.filter(region => !isRegionAssigned(region.id, documentId));
  };
  
  // Get unassigned regions from a specific page
  const getUnassignedRegionsByPage = (regions: Region[], pageNumber: number, documentId: string): Region[] => {
    return regions.filter(region => 
      !isRegionAssigned(region.id, documentId) && region.page === pageNumber
    );
  };
  
  // Facilitate selecting a region when clicking on assigned text
  const selectRegionById = (regionId: string, callback: (regionId: string) => void) => {
    if (regionId) {
      callback(regionId);
    }
  };

  const value = {
    getCurrentDocumentTexts,
    setTitledTexts,
    assignTextsToRegions,
    undoAllAssignments,
    undoRegionAssignment,
    assignTextToRegion,
    getAssignedText,
    isRegionAssigned,
    resetAssignments,
    getUnassignedRegions,
    getUnassignedRegionsByPage,
    selectRegionById
  };

  return (
    <TextAssignmentContext.Provider value={value}>
      {children}
    </TextAssignmentContext.Provider>
  );
};
