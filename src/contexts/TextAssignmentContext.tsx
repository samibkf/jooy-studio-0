
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
  assignTextsToRegions: (text: string, regions: Region[], documentId: string) => Promise<TitledText[]>;
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

  // Load all document texts from database
  const loadDocumentTextsFromDatabase = async (documentId: string) => {
    if (!authState.user) {
      return [];
    }
    
    try {
      console.log('Loading document texts from database for document:', documentId);
      
      const { data: texts, error } = await supabase
        .from('document_texts')
        .select('*')
        .eq('user_id', authState.user.id)
        .eq('document_id', documentId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading document texts from database:', error);
        throw error;
      }

      if (!texts || texts.length === 0) {
        console.log('No document texts found in database for document:', documentId);
        return [];
      }

      // Convert database texts to TitledText format
      const titledTexts = texts.map(text => ({
        title: text.title,
        content: text.content
      }));

      console.log(`Successfully loaded ${titledTexts.length} document texts from database`);
      return titledTexts;
      
    } catch (error) {
      console.error('Error loading document texts from database:', error);
      return [];
    }
  };

  // Save document texts to database
  const saveDocumentTextsToDatabase = async (documentId: string, texts: TitledText[]) => {
    if (!authState.user) {
      console.error('Cannot save document texts: no user logged in');
      return false;
    }
    
    try {
      console.log(`Saving ${texts.length} document texts to database for document:`, documentId);
      
      // First, delete existing texts for this document
      const { error: deleteError } = await supabase
        .from('document_texts')
        .delete()
        .eq('user_id', authState.user.id)
        .eq('document_id', documentId);

      if (deleteError) {
        console.error('Error deleting existing document texts:', deleteError);
        return false;
      }

      // Then insert new texts
      if (texts.length > 0) {
        const textsToInsert = texts.map(text => ({
          user_id: authState.user.id,
          document_id: documentId,
          title: text.title,
          content: text.content
        }));

        const { error: insertError } = await supabase
          .from('document_texts')
          .insert(textsToInsert);

        if (insertError) {
          console.error('Error inserting document texts:', insertError);
          return false;
        }
      }

      console.log(`Successfully saved ${texts.length} document texts to database`);
      return true;
    } catch (error) {
      console.error('Error saving document texts to database:', error);
      return false;
    }
  };

  // Load assignments from database
  const loadAssignmentsFromDatabase = async () => {
    if (!authState.user) {
      console.log('No user found, skipping database load');
      return {};
    }
    
    try {
      console.log('Loading text assignments from database for user:', authState.user.id);
      
      const { data: assignments, error } = await supabase
        .from('text_assignments')
        .select('*')
        .eq('user_id', authState.user.id);

      if (error) {
        console.error('Error loading text assignments from database:', error);
        throw error;
      }

      if (!assignments || assignments.length === 0) {
        console.log('No text assignments found in database');
        return {};
      }

      // Group assignments by document
      const assignmentsByDocument: Record<string, DocumentAssignments> = {};
      
      // First, get all unique document IDs from assignments
      const documentIds = [...new Set(assignments.map(a => a.document_id))];
      
      // Load document texts for each document and merge with assignments
      for (const docId of documentIds) {
        const documentTexts = await loadDocumentTextsFromDatabase(docId);
        const documentAssignments = assignments.filter(a => a.document_id === docId);
        
        // Create titled texts with assignment info
        const titledTexts = documentTexts.map(text => {
          const assignment = documentAssignments.find(
            a => a.text_title === text.title && a.text_content === text.content
          );
          return {
            ...text,
            assignedRegionId: assignment?.region_id
          };
        });
        
        assignmentsByDocument[docId] = {
          titledTexts,
          originalTexts: {}
        };
      }

      console.log('Successfully loaded text assignments from database:', assignmentsByDocument);
      return assignmentsByDocument;
      
    } catch (error) {
      console.error('Error loading assignments from database:', error);
      return {};
    }
  };

  // Save assignment to database
  const saveAssignmentToDatabase = async (documentId: string, regionId: string, title: string, content: string) => {
    if (!authState.user) {
      console.error('Cannot save assignment: no user logged in');
      return false;
    }
    
    try {
      console.log(`Saving assignment for region ${regionId} to database`);
      
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
        return false;
      } else {
        console.log(`Successfully saved assignment for region ${regionId} to database`);
        return true;
      }
    } catch (error) {
      console.error('Error saving assignment to database:', error);
      return false;
    }
  };

  // Remove assignment from database
  const removeAssignmentFromDatabase = async (documentId: string, regionId: string) => {
    if (!authState.user) {
      console.error('Cannot remove assignment: no user logged in');
      return false;
    }
    
    try {
      console.log(`Removing assignment for region ${regionId} from database`);
      
      const { error } = await supabase
        .from('text_assignments')
        .delete()
        .eq('user_id', authState.user.id)
        .eq('document_id', documentId)
        .eq('region_id', regionId);

      if (error) {
        console.error('Error removing assignment from database:', error);
        return false;
      } else {
        console.log(`Successfully removed assignment for region ${regionId} from database`);
        return true;
      }
    } catch (error) {
      console.error('Error removing assignment from database:', error);
      return false;
    }
  };

  // Migrate localStorage data to database
  const migrateLocalStorageToDatabase = async () => {
    if (!authState.user) return;

    try {
      const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!savedState) return;

      const parsedState = JSON.parse(savedState);
      if (typeof parsedState !== 'object' || parsedState === null) return;

      console.log('Migrating localStorage data to database...');
      
      for (const [docId, assignment] of Object.entries(parsedState)) {
        if (assignment && typeof assignment === 'object') {
          const typedAssignment = assignment as DocumentAssignments;
          if (Array.isArray(typedAssignment.titledTexts)) {
            // Save all texts to document_texts table
            await saveDocumentTextsToDatabase(docId, typedAssignment.titledTexts);
            
            // Save assignments to text_assignments table
            for (const text of typedAssignment.titledTexts) {
              if (text.assignedRegionId) {
                await saveAssignmentToDatabase(docId, text.assignedRegionId, text.title, text.content);
              }
            }
          }
        }
      }
      
      console.log('Migration completed, clearing localStorage');
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (error) {
      console.error('Error migrating localStorage data:', error);
    }
  };

  // Initialize state from database
  const initializeAssignments = async () => {
    if (!authState.user) {
      console.log('No user logged in, setting ready state');
      setDocumentAssignments({});
      setIsLoading(false);
      setIsReady(true);
      return;
    }

    try {
      setIsLoading(true);
      console.log('Initializing text assignments...');
      
      // First, try to migrate any localStorage data
      await migrateLocalStorageToDatabase();
      
      // Load from database
      const dbAssignments = await loadAssignmentsFromDatabase();
      
      // Set the assignments
      setDocumentAssignments(dbAssignments);
      
      console.log('Text assignment context initialization complete');
      
    } catch (error) {
      console.error('Error initializing assignments:', error);
      // Fallback to empty state on error
      setDocumentAssignments({});
    } finally {
      setIsLoading(false);
      setIsReady(true);
    }
  };

  // Initialize when user changes or on mount
  useEffect(() => {
    console.log('Auth state changed, user:', authState.user?.id || 'none');
    initializeAssignments();
  }, [authState.user]);

  const getCurrentDocumentTexts = (documentId: string): TitledText[] => {
    const result = documentAssignments[documentId]?.titledTexts || [];
    console.log(`Getting texts for document ${documentId}:`, result.length, 'texts found');
    return result;
  };

  const setTitledTexts = (documentId: string, texts: TitledText[]) => {
    console.log(`Setting texts for document ${documentId}:`, texts.length, 'texts');
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
          // Remove assignments
          const { error: assignmentError } = await supabase
            .from('text_assignments')
            .delete()
            .eq('user_id', authState.user.id)
            .eq('document_id', documentId);
          
          if (assignmentError) {
            console.error('Error removing assignments from database:', assignmentError);
          }

          // Remove document texts
          const { error: textsError } = await supabase
            .from('document_texts')
            .delete()
            .eq('user_id', authState.user.id)
            .eq('document_id', documentId);
          
          if (textsError) {
            console.error('Error removing document texts from database:', textsError);
          }
        } catch (error) {
          console.error('Error removing data from database:', error);
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
          // Remove all assignments
          const { error: assignmentError } = await supabase
            .from('text_assignments')
            .delete()
            .eq('user_id', authState.user.id);
          
          if (assignmentError) {
            console.error('Error removing all assignments from database:', assignmentError);
          }

          // Remove all document texts
          const { error: textsError } = await supabase
            .from('document_texts')
            .delete()
            .eq('user_id', authState.user.id);
          
          if (textsError) {
            console.error('Error removing all document texts from database:', textsError);
          }
        } catch (error) {
          console.error('Error removing all data from database:', error);
        }
      }
      
      // Remove from local state
      setDocumentAssignments({});
    }
  };

  const assignTextsToRegions = async (text: string, regions: Region[], documentId: string): Promise<TitledText[]> => {
    console.log(`Assigning texts to regions for document ${documentId}`);
    const parsedTexts = parseTitledText(text);
    const newTitledTexts = [...parsedTexts];
    const newOriginalTexts: Record<string, string | null> = {};
    
    // Store original descriptions for undo capability
    regions.forEach(region => {
      newOriginalTexts[region.id] = region.description;
    });

    // Save texts to database
    await saveDocumentTextsToDatabase(documentId, newTitledTexts);
    
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
    
    // Remove from database first
    const success = await removeAssignmentFromDatabase(documentId, regionId);
    
    if (success) {
      // Update local state only if database operation succeeded
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
    }
  };

  const assignTextToRegion = async (textIndex: number, regionId: string, documentId: string) => {
    console.log(`Assigning text ${textIndex} to region ${regionId} in document ${documentId}`);
    
    const currentTexts = documentAssignments[documentId]?.titledTexts || [];
    const textToAssign = currentTexts[textIndex];
    
    if (!textToAssign) {
      console.error('Text to assign not found');
      return;
    }

    // Save to database first
    const success = await saveAssignmentToDatabase(documentId, regionId, textToAssign.title, textToAssign.content);
    
    if (success) {
      // Update local state only if database operation succeeded
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
      console.log(`Successfully assigned text ${textIndex} to region ${regionId}`);
    } else {
      console.error('Failed to save assignment to database');
    }
  };

  const getAssignedText = (regionId: string, documentId: string): string | null => {
    const assignedText = (documentAssignments[documentId]?.titledTexts || []).find(text => text.assignedRegionId === regionId);
    const result = assignedText ? assignedText.content : null;
    return result;
  };

  const isRegionAssigned = (regionId: string, documentId: string): boolean => {
    const assigned = (documentAssignments[documentId]?.titledTexts || []).some(text => text.assignedRegionId === regionId);
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
