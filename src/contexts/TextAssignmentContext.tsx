
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
  isLoading: boolean;
  isReady: boolean;
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
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);

  // Initialize state from localStorage synchronously
  const initializeFromStorage = () => {
    try {
      console.log('Initializing text assignments from localStorage...');
      const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
      
      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState);
          console.log('Raw localStorage data:', parsedState);
          
          // Validate the structure
          if (typeof parsedState === 'object' && parsedState !== null) {
            const validatedState: Record<string, DocumentAssignments> = {};
            
            Object.entries(parsedState).forEach(([docId, assignment]) => {
              if (assignment && typeof assignment === 'object') {
                const typedAssignment = assignment as DocumentAssignments;
                if (Array.isArray(typedAssignment.titledTexts)) {
                  validatedState[docId] = {
                    titledTexts: typedAssignment.titledTexts.map(text => ({
                      title: text.title || '',
                      content: text.content || '',
                      assignedRegionId: text.assignedRegionId
                    })),
                    originalTexts: typedAssignment.originalTexts || {}
                  };
                  console.log(`Loaded assignments for document ${docId}:`, validatedState[docId]);
                }
              }
            });
            
            setDocumentAssignments(validatedState);
            console.log('Successfully loaded text assignments:', validatedState);
          }
        } catch (parseError) {
          console.error('Error parsing text assignments from localStorage:', parseError);
          // Don't clear corrupted data immediately, let user know
          console.warn('Corrupted data detected, but keeping it for recovery');
        }
      } else {
        console.log('No existing text assignments found in localStorage');
      }
    } catch (error) {
      console.error('Error loading text assignments:', error);
    }
  };

  // Load state from localStorage on initial render
  useEffect(() => {
    const loadStoredData = async () => {
      setIsLoading(true);
      
      // Initialize synchronously first
      initializeFromStorage();
      
      // Add a small delay to ensure DOM is ready, then mark as ready
      await new Promise(resolve => setTimeout(resolve, 50));
      
      setIsLoading(false);
      setIsReady(true);
      console.log('Text assignment context is now ready');
    };

    loadStoredData();
  }, []);

  // Save state to localStorage whenever it changes (but only when ready)
  useEffect(() => {
    if (!isReady) return;
    
    try {
      const dataToSave = JSON.stringify(documentAssignments);
      localStorage.setItem(LOCAL_STORAGE_KEY, dataToSave);
      console.log('Saved text assignments to localStorage:', documentAssignments);
    } catch (error) {
      console.error('Error saving text assignments to localStorage:', error);
    }
  }, [documentAssignments, isReady]);

  const getCurrentDocumentTexts = (documentId: string): TitledText[] => {
    const result = documentAssignments[documentId]?.titledTexts || [];
    console.log(`Getting texts for document ${documentId}:`, result);
    return result;
  };

  const setTitledTexts = (documentId: string, texts: TitledText[]) => {
    console.log(`Setting texts for document ${documentId}:`, texts);
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
      console.log(`Resetting assignments for document: ${documentId}`);
      setDocumentAssignments(prev => {
        const newState = { ...prev };
        delete newState[documentId];
        return newState;
      });
    } else {
      console.log('Resetting all assignments');
      setDocumentAssignments({});
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  };

  const assignTextsToRegions = (text: string, regions: Region[], documentId: string): TitledText[] => {
    console.log(`Assigning texts to regions for document ${documentId}`);
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
    
    console.log(`Processed ${newTitledTexts.length} texts for document ${documentId}`);
    return newTitledTexts;
  };

  const undoAllAssignments = (documentId: string) => {
    console.log(`Undoing all assignments for document: ${documentId}`);
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
    console.log(`Undoing assignment for region ${regionId} in document ${documentId}`);
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
    console.log(`Assigning text ${textIndex} to region ${regionId} in document ${documentId}`);
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
    const result = assignedText ? assignedText.content : null;
    console.log(`Getting assigned text for region ${regionId}:`, result ? 'found' : 'not found');
    return result;
  };

  const isRegionAssigned = (regionId: string, documentId: string): boolean => {
    const assigned = (documentAssignments[documentId]?.titledTexts || []).some(text => text.assignedRegionId === regionId);
    console.log(`Checking if region ${regionId} is assigned: ${assigned}`);
    return assigned;
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
    selectRegionById,
    isLoading,
    isReady
  };

  return (
    <TextAssignmentContext.Provider value={value}>
      {children}
    </TextAssignmentContext.Provider>
  );
};
