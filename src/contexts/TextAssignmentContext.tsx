import React, { createContext, useContext, useState, useEffect } from 'react';
import { Region } from '@/types/regions';
import { parseTitledText } from '@/utils/textProcessing';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthProvider';

export type TitledText = {
  id: string;
  title: string;
  content: string;
  assignedRegionId?: string;
  page: number;
};

interface TextAssignmentContextType {
  documentTexts: Map<string, TitledText[]>;
  getCurrentDocumentTexts: (documentId: string, page?: number) => TitledText[];
  assignTextsToRegions: (text: string, regions: Region[], documentId: string, page: number) => Promise<TitledText[] | undefined>;
  replaceAllContentForPage: (text: string, regions: Region[], documentId: string, page: number) => Promise<TitledText[] | undefined>;
  assignTextToRegion: (text: TitledText, regionId: string, documentId: string) => void;
  undoRegionAssignment: (regionId: string, documentId: string) => void;
  isRegionAssigned: (regionId: string, documentId: string) => boolean;
  getUnassignedRegionsByPage: (regions: Region[], page: number, documentId: string) => Region[];
  undoAllAssignments: (documentId: string, page: number) => void;
  deleteDocumentText: (documentId: string, textId: string) => Promise<void>;
  isLoading: boolean;
  isReady: boolean;
}

export const TextAssignmentContext = createContext<TextAssignmentContextType | undefined>(undefined);

export const TextAssignmentProvider = ({ children }: { children: React.ReactNode }) => {
  const [documentTexts, setDocumentTexts] = useState<Map<string, TitledText[]>>(new Map());
  const { authState } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      if (authState.user) {
        const { data: initialDocuments, error: initialError } = await supabase
          .from('documents')
          .select('id');

        if (initialError) {
          console.error("Error fetching initial documents:", initialError);
        } else if (initialDocuments) {
          for (const doc of initialDocuments) {
            await fetchDocumentTexts(doc.id);
          }
        }
      }
      setIsLoading(false);
      setIsReady(true);
    };

    fetchInitialData();
  }, [authState.user]);

  const getCurrentDocumentTexts = (documentId: string, page?: number): TitledText[] => {
    const texts = documentTexts.get(documentId) || [];
    return page !== undefined ? texts.filter(text => text.page === page) : texts;
  };

  const fetchDocumentTexts = async (documentId: string) => {
    if (!authState.user) {
      console.error("User not authenticated");
      return;
    }

    const { data, error } = await supabase
      .from('document_texts')
      .select('*, document_regions(id, name, description)')
      .eq('document_id', documentId)
      .order('id', { ascending: true });

    if (error) {
      console.error("Error fetching document texts:", error);
      return;
    }

    const titledTexts: TitledText[] = data.map(item => ({
      id: item.id,
      title: item.title,
      content: item.content,
      assignedRegionId: (item as any).assigned_region_id || undefined,
      page: item.page,
    }));

    setDocumentTexts(prev => {
      const newMap = new Map(prev);
      newMap.set(documentId, titledTexts);
      return newMap;
    });
  };

  const assignTextsToRegions = async (text: string, regions: Region[], documentId: string, page: number): Promise<TitledText[] | undefined> => {
    if (!authState.user) {
      console.error("User not authenticated");
      return;
    }

    const titledTexts = parseTitledText(text, page);

    const { data, error } = await supabase
      .from('document_texts')
      .insert(titledTexts.map(t => ({
        document_id: documentId,
        title: t.title,
        content: t.content,
        page: t.page,
        user_id: authState.user.id
      })))
      .select('*');

    if (error) {
      console.error("Error saving document texts:", error);
      return;
    }

    const savedTitledTexts: TitledText[] = data.map(item => ({
      id: item.id,
      title: item.title,
      content: item.content,
      assignedRegionId: (item as any).assigned_region_id || undefined,
      page: item.page,
    }));

    setDocumentTexts(prev => {
      const newMap = new Map(prev);
      const existingTexts = newMap.get(documentId) || [];
      newMap.set(documentId, [...existingTexts, ...savedTitledTexts]);
      return newMap;
    });

    return savedTitledTexts;
  };

  const replaceAllContentForPage = async (text: string, regions: Region[], documentId: string, page: number): Promise<TitledText[] | undefined> => {
    if (!authState.user) {
      console.error("User not authenticated");
      return;
    }
  
    const titledTexts = parseTitledText(text, page);
  
    const { error: deleteError } = await supabase
      .from('document_texts')
      .delete()
      .eq('document_id', documentId)
      .eq('page', page);
  
    if (deleteError) {
      console.error("Error deleting existing document texts:", deleteError);
      return;
    }
  
    const { data, error: insertError } = await supabase
      .from('document_texts')
      .insert(titledTexts.map(t => ({
        document_id: documentId,
        title: t.title,
        content: t.content,
        page: t.page,
        user_id: authState.user.id,
      })))
      .select('*');
  
    if (insertError) {
      console.error("Error saving new document texts:", insertError);
      return;
    }
  
    const savedTitledTexts: TitledText[] = data.map(item => ({
      id: item.id,
      title: item.title,
      content: item.content,
      assignedRegionId: (item as any).assigned_region_id || undefined,
      page: item.page,
    }));
  
    setDocumentTexts(prev => {
      const newMap = new Map(prev);
      const otherPageTexts = (prev.get(documentId) || []).filter(t => t.page !== page);
      newMap.set(documentId, [...otherPageTexts, ...savedTitledTexts]);
      return newMap;
    });
  
    return savedTitledTexts;
  };
  
  const assignTextToRegion = (text: TitledText, regionId: string, documentId: string) => {
    setDocumentTexts(prev => {
      const newMap = new Map(prev);
      const texts = newMap.get(documentId) || [];
      const updatedTexts = texts.map(t => {
        if (t.id === text.id) {
          return { ...t, assignedRegionId: regionId };
        } else if (t.assignedRegionId === regionId) {
          return { ...t, assignedRegionId: undefined };
        }
        return t;
      });
      newMap.set(documentId, updatedTexts);
      return newMap;
    });

    supabase
      .from('document_texts')
      .update({ assigned_region_id: regionId })
      .eq('id', text.id)
      .then(({ error }) => {
        if (error) {
          console.error("Error updating document text:", error);
          // Revert if fails
          fetchDocumentTexts(documentId);
        }
      });
  };
  
  const undoRegionAssignment = (regionId: string, documentId: string) => {
    setDocumentTexts(prev => {
      const newMap = new Map(prev);
      const texts = newMap.get(documentId) || [];
      const updatedTexts = texts.map(t => {
        if (t.assignedRegionId === regionId) {
          return { ...t, assignedRegionId: undefined };
        }
        return t;
      });
      newMap.set(documentId, updatedTexts);
      return newMap;
    });

    supabase
      .from('document_texts')
      .update({ assigned_region_id: null })
      .eq('assigned_region_id', regionId)
      .eq('document_id', documentId)
      .then(({ error }) => {
        if (error) {
          console.error("Error updating document text:", error);
          fetchDocumentTexts(documentId);
        }
      });
  };
  
  const isRegionAssigned = (regionId: string, documentId: string): boolean => {
    const texts = documentTexts.get(documentId) || [];
    return texts.some(text => text.assignedRegionId === regionId);
  };

  const getUnassignedRegionsByPage = (regions: Region[], page: number, documentId: string): Region[] => {
    const assignedRegionIds = new Set((documentTexts.get(documentId) || [])
      .filter(text => text.page === page && text.assignedRegionId)
      .map(text => text.assignedRegionId));

    return regions.filter(region => region.page === page && !assignedRegionIds.has(region.id));
  };
  
  const undoAllAssignments = (documentId: string, page: number) => {
    setDocumentTexts(prev => {
      const newMap = new Map(prev);
      const texts = newMap.get(documentId) || [];
      const updatedTexts = texts.map(t => t.page === page ? { ...t, assignedRegionId: undefined } : t);
      newMap.set(documentId, updatedTexts);
      return newMap;
    });
  
    supabase
      .from('document_texts')
      .update({ assigned_region_id: null })
      .eq('document_id', documentId)
      .eq('page', page)
      .then(({ error }) => {
        if (error) {
          console.error("Error updating document text:", error);
          fetchDocumentTexts(documentId);
        }
      });
  };

  const deleteDocumentText = async (documentId: string, textId: string) => {
    if (!authState.user) {
      throw new Error("User not authenticated");
    }

    const { error } = await supabase
      .from('document_texts')
      .delete()
      .match({ document_id: documentId, id: textId });

    if (error) {
      console.error('Error deleting document text:', error);
      throw error;
    }

    setDocumentTexts(prev => {
      const newMap = new Map(prev);
      const texts = newMap.get(documentId) || [];
      const updatedTexts = texts.filter(t => t.id !== textId);
      newMap.set(documentId, updatedTexts);
      return newMap;
    });
  };

  const value = {
    documentTexts,
    getCurrentDocumentTexts,
    assignTextsToRegions,
    replaceAllContentForPage,
    assignTextToRegion,
    undoRegionAssignment,
    isRegionAssigned,
    getUnassignedRegionsByPage,
    undoAllAssignments,
    deleteDocumentText,
    isLoading,
    isReady,
  };

  return (
    <TextAssignmentContext.Provider value={value}>
      {children}
    </TextAssignmentContext.Provider>
  );
};

export const useTextAssignment = () => {
  const context = useContext(TextAssignmentContext);
  if (!context) {
    throw new Error('useTextAssignment must be used within a TextAssignmentProvider');
  }
  return context;
};
