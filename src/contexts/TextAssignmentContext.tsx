
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Region } from '@/types/regions';
import { parseTitledText } from '@/utils/textProcessing';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthProvider';

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
  const { authState } = useAuth();

  // Load assignments from database
  const loadAssignmentsFromDatabase = async () => {
    if (!authState.user) return;
    
    try {
      console.log('Loading text assignments from database...');
      
      const { data: assignments, error } = await supabase
        .from('text_assignments')
        .select('*')
        .eq('user_id', authState.user.id);

      if (error) {
        console.error('Error loading text assignments from database:', error);
        return;
      }

      if (!assignments || assignments.length === 0) {
        console.log('No text assignments found in database');
        return;
      }

      // Group assignments by document
      const assignmentsByDocument: Record<string, DocumentAssignments> = {};
      
      assignments.forEach(assignment => {
        const docId = assignment.document_id;
        
        if (!assignmentsByDocument[docId]) {
          assignmentsByDocument[docId] = {
            titledTexts: [],
            originalTexts: {}
          };
        }
        
        // Add this assignment as a titled text
        assignmentsByDocument[docId].titledTexts.push({
          title: assignment.text_title,
          content: assignment.text_content,
          assignedRegionId: assignment.region_id
        });
      });

      setDocumentAssignments(assignmentsByDocument);
      console.log('Successfully loaded text assignments from database:', assignmentsByDocument);
      
    } catch (error) {
      console.error('Error loading assignments from database:', error);
    }
  };

  // Save assignment to database
  const saveAssignmentToDatabase = async (documentId: string, regionId: string, title: string, content: string) => {
    if (!authState.user) return;
    
    try {
      const { error } = await supabase
        .from('text_assignments')
        .upsert({
          user_id: authState.user.id,
          document_id: documentId,
          region_id: regionId,
          text_title: title,
          text_content: content,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error saving assignment to database:', error);
      } else {
        console.log(`Saved assignment for region ${regionId} to database`);
      }
    } catch (error) {
      console.error('Error saving assignment to database:', error);
    }
  };

  // Remove assignment from database
  const removeAssignmentFromDatabase = async (documentId: string, regionId: string) => {
    if (!authState.user) return;
    
    try {
      const { error } = await supabase
        .from('text_assignments')
        .delete()
        .eq('user_id', authState.user.id)
        .eq('document_id', documentId)
        .eq('region_id', regionId);

      if (error) {
        console.error('Error removing assignment from database:', error);
      } else {
        console.log(`Removed assignment for region ${regionId} from database`);
      }
    } catch (error) {
      console.error('Error removing assignment from database:', error);
    }
  };

  // Initialize state from database and localStorage
  const initializeAssignments = async () => {
    try {
      setIsLoading(true);
      
      // Load from database first (primary source)
      if (authState.user) {
        await loadAssignmentsFromDatabase();
      }
      
      // Fallback to localStorage if no database data
      if (Object.keys(documentAssignments).length === 0) {
        const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedState) {
          try {
            const parsedState = JSON.parse(savedState);
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
                  }
                }
              });
              
              setDocumentAssignments(validatedState);
              console.log('Loaded assignments from localStorage as fallback:', validatedState);
            }
          } catch (parseError) {
            console.error('Error parsing assignments from localStorage:', parseError);
          }
        }
      }
      
      setIsLoading(false);
      setIsReady(true);
      console.log('Text assignment context is now ready');
    } catch (error) {
      console.error('Error initializing assignments:', error);
      setIsLoading(false);
      setIsReady(true);
    }
  };

  // Initialize when user changes or on mount
  useEffect(() => {
    if (authState.user) {
      initializeAssignments();
    } else if (authState.user === null) {
      // User is not logged in, clear assignments
      setDocumentAssignments({});
      setIsLoading(false);
      setIsReady(true);
    }
  }, [authState.user]);

  // Save to localStorage as backup (when ready and have data)
  useEffect(() => {
    if (!isReady) return;
    
    try {
      const dataToSave = JSON.stringify(documentAssignments);
      localStorage.setItem(LOCAL_STORAGE_KEY, dataToSave);
      console.log('Saved text assignments to localStorage as backup');
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

  const resetAssignments = async (documentId?: string) => {
    if (documentId) {
      console.log(`Resetting assignments for document: ${documentId}`);
      
      // Remove from database
      if (authState.user) {
        try {
          const { error } = await supabase
            .from('text_assignments')
            .delete()
            .eq('user_id', authState.user.id)
            .eq('document_id', documentId);
          
          if (error) {
            console.error('Error removing assignments from database:', error);
          }
        } catch (error) {
          console.error('Error removing assignments from database:', error);
        }
      }
      
      // Remove from local state
      setDocumentAssignments(prev => {
        const newState = { ...prev };
        delete newState[documentId];
        return newState;
      });
    } else {
      console.log('Resetting all assignments');
      
      // Remove from database
      if (authState.user) {
        try {
          const { error } = await supabase
            .from('text_assignments')
            .delete()
            .eq('user_id', authState.user.id);
          
          if (error) {
            console.error('Error removing all assignments from database:', error);
          }
        } catch (error) {
          console.error('Error removing all assignments from database:', error);
        }
      }
      
      // Remove from local state and storage
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

  const undoAllAssignments = async (documentId: string) => {
    console.log(`Undoing all assignments for document: ${documentId}`);
    
    // Remove all assignments for this document from database
    if (authState.user) {
      try {
        const { error } = await supabase
          .from('text_assignments')
          .delete()
          .eq('user_id', authState.user.id)
          .eq('document_id', documentId);
        
        if (error) {
          console.error('Error removing assignments from database:', error);
        }
      } catch (error) {
        console.error('Error removing assignments from database:', error);
      }
    }
    
    // Update local state
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

  const undoRegionAssignment = async (regionId: string, documentId: string) => {
    console.log(`Undoing assignment for region ${regionId} in document ${documentId}`);
    
    // Remove from database
    await removeAssignmentFromDatabase(documentId, regionId);
    
    // Update local state
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

  const assignTextToRegion = async (textIndex: number, regionId: string, documentId: string) => {
    console.log(`Assigning text ${textIndex} to region ${regionId} in document ${documentId}`);
    
    const currentTexts = documentAssignments[documentId]?.titledTexts || [];
    const textToAssign = currentTexts[textIndex];
    
    if (textToAssign) {
      // Save to database
      await saveAssignmentToDatabase(documentId, regionId, textToAssign.title, textToAssign.content);
    }
    
    // Update local state
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
