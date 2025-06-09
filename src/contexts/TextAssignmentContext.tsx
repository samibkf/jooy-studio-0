import React, { createContext, useContext, useState, useEffect } from 'react';
import { Region } from '@/types/regions';
import { parseTitledText } from '@/utils/textProcessing';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthProvider';
import { toast } from 'sonner';

type TitledText = {
  title: string;
  content: string;
  assignedRegionId?: string;
  page?: number;
};

type DocumentAssignments = {
  titledTexts: TitledText[];
  originalTexts: Record<string, string | null>;
};

type TextAssignmentContextType = {
  getCurrentDocumentTexts: (documentId: string) => TitledText[];
  getCurrentPageTexts: (documentId: string, pageNumber: number) => TitledText[];
  setTitledTexts: (documentId: string, texts: TitledText[]) => void;
  assignTextsToRegions: (text: string, regions: Region[], documentId: string, currentPage: number) => Promise<TitledText[]>;
  undoAllAssignments: (documentId: string) => void;
  undoRegionAssignment: (regionId: string, documentId: string) => void;
  assignTextToRegion: (textIndex: number, regionId: string, documentId: string) => void;
  getAssignedText: (regionId: string, documentId: string) => string | null;
  isRegionAssigned: (regionId: string, documentId: string) => boolean;
  resetAssignments: (documentId?: string) => void;
  getUnassignedRegions: (regions: Region[], documentId: string) => Region[];
  getUnassignedRegionsByPage: (regions: Region[], pageNumber: number, documentId: string) => Region[];
  selectRegionById: (regionId: string, callback: (regionId: string) => void) => void;
  refreshAssignments: (documentId: string) => Promise<void>;
  isLoading: boolean;
  isReady: boolean;
};

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

  // Enhanced error handling wrapper
  const withErrorHandling = async <T,>(operation: () => Promise<T>, operationName: string): Promise<T | null> => {
    try {
      const result = await operation();
      console.log(`✅ ${operationName} completed successfully`);
      return result;
    } catch (error) {
      console.error(`❌ ${operationName} failed:`, error);
      toast.error(`Failed to ${operationName.toLowerCase()}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  };

  // Load document texts with enhanced error handling and page validation
  const loadDocumentTextsFromDatabase = async (documentId: string) => {
    if (!authState.user) {
      console.log('No user authenticated, skipping database load');
      return [];
    }
    
    const result = await withErrorHandling(async () => {
      console.log(`📥 Loading document texts for document: ${documentId}`);
      
      const { data: texts, error } = await supabase
        .from('document_texts')
        .select('*')
        .eq('user_id', authState.user.id)
        .eq('document_id', documentId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!texts || texts.length === 0) {
        console.log(`📭 No document texts found for document: ${documentId}`);
        return [];
      }

      // Convert database texts to TitledText format with page validation
      const titledTexts = texts.map(text => ({
        title: text.title,
        content: text.content,
        page: text.page && text.page > 0 ? text.page : 1 // Ensure valid page number
      }));

      console.log(`📚 Loaded ${titledTexts.length} texts, pages: ${[...new Set(titledTexts.map(t => t.page))].sort().join(', ')}`);
      return titledTexts;
      
    }, 'Load document texts');

    return result || [];
  };

  // Enhanced save with transaction-like behavior
  const saveDocumentTextsToDatabase = async (documentId: string, texts: TitledText[]) => {
    if (!authState.user) {
      console.error('❌ Cannot save document texts: no user logged in');
      return false;
    }
    
    const result = await withErrorHandling(async () => {
      console.log(`💾 Saving ${texts.length} document texts for document: ${documentId}`);
      
      // Validate texts before saving
      const validTexts = texts.filter(text => {
        if (!text.title || !text.content) {
          console.warn('⚠️ Skipping text with missing title or content:', text);
          return false;
        }
        if (!text.page || text.page < 1) {
          console.warn('⚠️ Fixing invalid page number for text:', text.title);
          text.page = 1;
        }
        return true;
      });

      if (validTexts.length !== texts.length) {
        console.warn(`⚠️ Filtered out ${texts.length - validTexts.length} invalid texts`);
      }

      // Delete existing texts for this document
      const { error: deleteError } = await supabase
        .from('document_texts')
        .delete()
        .eq('user_id', authState.user.id)
        .eq('document_id', documentId);

      if (deleteError) throw deleteError;

      // Insert new texts if any exist
      if (validTexts.length > 0) {
        const textsToInsert = validTexts.map(text => ({
          user_id: authState.user.id,
          document_id: documentId,
          title: text.title,
          content: text.content,
          page: text.page || 1
        }));

        const { error: insertError } = await supabase
          .from('document_texts')
          .insert(textsToInsert);

        if (insertError) throw insertError;
      }

      console.log(`✅ Saved ${validTexts.length} texts to database`);
      return true;
    }, 'Save document texts');

    return result !== null;
  };

  // Enhanced assignment loading with better state synchronization
  const loadAssignmentsFromDatabase = async () => {
    if (!authState.user) {
      console.log('No user found, skipping database load');
      return {};
    }
    
    const result = await withErrorHandling(async () => {
      console.log(`📥 Loading text assignments for user: ${authState.user.id}`);
      
      const { data: assignments, error } = await supabase
        .from('text_assignments')
        .select('*')
        .eq('user_id', authState.user.id);

      if (error) throw error;

      if (!assignments || assignments.length === 0) {
        console.log('📭 No text assignments found');
        return {};
      }

      // Group assignments by document
      const assignmentsByDocument: Record<string, DocumentAssignments> = {};
      
      // Get all unique document IDs
      const documentIds = [...new Set(assignments.map(a => a.document_id))];
      console.log(`📋 Found assignments for ${documentIds.length} documents`);
      
      // Load document texts and merge with assignments
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

        console.log(`📄 Document ${docId}: ${titledTexts.length} texts, ${documentAssignments.length} assignments`);
      }

      return assignmentsByDocument;
      
    }, 'Load assignments from database');

    return result || {};
  };

  // Enhanced assignment saving with retry logic
  const saveAssignmentToDatabase = async (documentId: string, regionId: string, title: string, content: string, retryCount = 0) => {
    if (!authState.user) {
      console.error('❌ Cannot save assignment: no user logged in');
      return false;
    }
    
    const result = await withErrorHandling(async () => {
      console.log(`💾 Saving assignment: region ${regionId} <- "${title}"`);
      
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

      if (error) throw error;
      
      console.log(`✅ Assignment saved successfully`);
      return true;
    }, `Save assignment (attempt ${retryCount + 1})`);

    // Retry logic for failed saves
    if (result === null && retryCount < 2) {
      console.log(`🔄 Retrying assignment save in 1 second...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return saveAssignmentToDatabase(documentId, regionId, title, content, retryCount + 1);
    }

    return result !== null;
  };

  // Enhanced assignment removal
  const removeAssignmentFromDatabase = async (documentId: string, regionId: string) => {
    if (!authState.user) {
      console.error('❌ Cannot remove assignment: no user logged in');
      return false;
    }
    
    const result = await withErrorHandling(async () => {
      console.log(`🗑️ Removing assignment for region: ${regionId}`);
      
      const { error } = await supabase
        .from('text_assignments')
        .delete()
        .eq('user_id', authState.user.id)
        .eq('document_id', documentId)
        .eq('region_id', regionId);

      if (error) throw error;
      
      console.log(`✅ Assignment removed successfully`);
      return true;
    }, 'Remove assignment');

    return result !== null;
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
      console.log('🚀 Initializing text assignments...');
      
      // Load from database with enhanced error handling
      const dbAssignments = await loadAssignmentsFromDatabase();
      
      setDocumentAssignments(dbAssignments);
      
      console.log('✅ Text assignment context initialization complete');
      
    } catch (error) {
      console.error('❌ Error initializing assignments:', error);
      setDocumentAssignments({});
    } finally {
      setIsLoading(false);
      setIsReady(true);
    }
  };

  // Initialize when user changes or on mount
  useEffect(() => {
    console.log('👤 Auth state changed, user:', authState.user?.id || 'none');
    initializeAssignments();
  }, [authState.user]);

  // Enhanced refresh function for data recovery
  const refreshAssignments = async (documentId: string) => {
    if (!authState.user || !documentId) return;

    console.log(`🔄 Refreshing assignments for document: ${documentId}`);
    setIsLoading(true);

    try {
      // Reload texts and assignments for this specific document
      const documentTexts = await loadDocumentTextsFromDatabase(documentId);
      
      const { data: assignments, error } = await supabase
        .from('text_assignments')
        .select('*')
        .eq('user_id', authState.user.id)
        .eq('document_id', documentId);

      if (error) throw error;

      // Merge texts with assignments
      const titledTexts = documentTexts.map(text => {
        const assignment = assignments?.find(
          a => a.text_title === text.title && a.text_content === text.content
        );
        return {
          ...text,
          assignedRegionId: assignment?.region_id
        };
      });

      // Update state for this document
      setDocumentAssignments(prev => ({
        ...prev,
        [documentId]: {
          titledTexts,
          originalTexts: prev[documentId]?.originalTexts || {}
        }
      }));

      console.log(`✅ Refreshed ${titledTexts.length} texts for document ${documentId}`);
      toast.success('Data refreshed successfully');

    } catch (error) {
      console.error('❌ Error refreshing assignments:', error);
      toast.error('Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  };

  // New function to get texts filtered by page
  const getCurrentPageTexts = (documentId: string, pageNumber: number): TitledText[] => {
    const allTexts = documentAssignments[documentId]?.titledTexts || [];
    const pageTexts = allTexts.filter(text => text.page === pageNumber);
    console.log(`📄 Getting texts for document ${documentId}, page ${pageNumber}: ${pageTexts.length} texts found`);
    return pageTexts;
  };

  const setTitledTexts = (documentId: string, texts: TitledText[]) => {
    console.log(`📝 Setting texts for document ${documentId}: ${texts.length} texts`);
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
      console.log(`🔄 Resetting assignments for document: ${documentId}`);
      
      if (authState.user) {
        await withErrorHandling(async () => {
          // Remove assignments
          const { error: assignmentError } = await supabase
            .from('text_assignments')
            .delete()
            .eq('user_id', authState.user.id)
            .eq('document_id', documentId);
          
          if (assignmentError) throw assignmentError;

          // Remove document texts
          const { error: textsError } = await supabase
            .from('document_texts')
            .delete()
            .eq('user_id', authState.user.id)
            .eq('document_id', documentId);
          
          if (textsError) throw textsError;
          
          return true;
        }, 'Reset document assignments');
      }
      
      // Remove from local state
      setDocumentAssignments(prev => {
        const newState = { ...prev };
        delete newState[documentId];
        return newState;
      });
    } else {
      console.log('🔄 Resetting all assignments');
      
      if (authState.user) {
        await withErrorHandling(async () => {
          // Remove all assignments
          const { error: assignmentError } = await supabase
            .from('text_assignments')
            .delete()
            .eq('user_id', authState.user.id);
          
          if (assignmentError) throw assignmentError;

          // Remove all document texts
          const { error: textsError } = await supabase
            .from('document_texts')
            .delete()
            .eq('user_id', authState.user.id);
          
          if (textsError) throw textsError;
          
          return true;
        }, 'Reset all assignments');
      }
      
      setDocumentAssignments({});
    }
  };

  const assignTextsToRegions = async (text: string, regions: Region[], documentId: string, currentPage: number): Promise<TitledText[]> => {
    console.log(`📝 Processing text for document ${documentId}, page ${currentPage}`);
    
    const parsedTexts = parseTitledText(text);
    // Ensure ALL texts get the correct page number
    const newTitledTexts = parsedTexts.map(text => ({ 
      ...text, 
      page: currentPage // Use the current page from PDF viewer
    }));

    console.log(`📋 Created ${newTitledTexts.length} texts for page ${currentPage}`);

    // Store original descriptions for undo capability
    const newOriginalTexts: Record<string, string | null> = {};
    regions.forEach(region => {
      newOriginalTexts[region.id] = region.description;
    });

    // Save all texts (existing + new) to database
    const existingTexts = documentAssignments[documentId]?.titledTexts || [];
    const allTexts = [...existingTexts, ...newTitledTexts];
    
    const saveSuccess = await saveDocumentTextsToDatabase(documentId, allTexts);
    
    if (!saveSuccess) {
      console.error('❌ Failed to save texts to database');
      toast.error('Failed to save texts. Please try again.');
      return [];
    }
    
    // Update local state
    setDocumentAssignments(prev => ({
      ...prev,
      [documentId]: {
        titledTexts: allTexts,
        originalTexts: newOriginalTexts
      }
    }));
    
    console.log(`✅ Successfully processed ${newTitledTexts.length} texts for page ${currentPage}`);
    return newTitledTexts;
  };

  const undoAllAssignments = async (documentId: string) => {
    console.log(`↩️ Undoing all assignments for document: ${documentId}`);
    
    // Remove all assignments for this document from database
    if (authState.user) {
      const result = await withErrorHandling(async () => {
        const { error } = await supabase
          .from('text_assignments')
          .delete()
          .eq('user_id', authState.user.id)
          .eq('document_id', documentId);
        
        if (error) throw error;
        return true;
      }, 'Remove all assignments');

      if (result) {
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
        toast.success('All assignments undone');
      }
    }
  };

  const undoRegionAssignment = async (regionId: string, documentId: string) => {
    console.log(`↩️ Undoing assignment for region ${regionId} in document ${documentId}`);
    
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
      console.log(`✅ Successfully undid assignment for region ${regionId}`);
      toast.success('Text assignment undone');
    } else {
      console.error('❌ Failed to remove assignment from database');
      toast.error('Failed to undo assignment. Please try again.');
    }
  };

  const assignTextToRegion = async (textIndex: number, regionId: string, documentId: string) => {
    console.log(`🔗 Assigning text ${textIndex} to region ${regionId} in document ${documentId}`);
    
    const currentTexts = documentAssignments[documentId]?.titledTexts || [];
    const textToAssign = currentTexts[textIndex];
    
    if (!textToAssign) {
      console.error('❌ Text to assign not found at index:', textIndex);
      toast.error('Text not found. Please refresh and try again.');
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
      console.log(`✅ Successfully assigned text "${textToAssign.title}" to region ${regionId}`);
      toast.success(`Assigned "${textToAssign.title}" to region`);
    } else {
      console.error('❌ Failed to save assignment to database');
      toast.error('Failed to assign text. Please try again.');
    }
  };

  const getAssignedText = (regionId: string, documentId: string): string | null => {
    const assignedText = (documentAssignments[documentId]?.titledTexts || []).find(text => text.assignedRegionId === regionId);
    return assignedText ? assignedText.content : null;
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
    getCurrentPageTexts,
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
    refreshAssignments,
    isLoading,
    isReady
  };

  return (
    <TextAssignmentContext.Provider value={value}>
      {children}
    </TextAssignmentContext.Provider>
  );
};
