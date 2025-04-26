
import { useState } from 'react';
import { Document } from '@/types/documents';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { Region } from '@/types/regions';

export const useDocumentManagement = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  const handleFileUpload = (file: File, resetStates: () => void, setRegionsCache: (fn: (prev: Record<string, Region[]>) => Record<string, Region[]>) => void) => {
    if (file.type !== 'application/pdf') {
      toast.error('Please select a PDF file');
      return;
    }

    const newDocumentId = uuidv4();
    const newDocument: Document = {
      id: newDocumentId,
      name: file.name,
      file,
      regions: []
    };

    setDocuments(prev => [...prev, newDocument]);
    setSelectedDocumentId(newDocumentId);
    resetStates();
    
    // Initialize empty regions array in the cache for this new document
    setRegionsCache(prev => ({
      ...prev,
      [newDocumentId]: []
    }));
    
    toast.success('Document added successfully');
  };

  const handleDocumentSelect = (
    documentId: string, 
    selectedDocumentId: string | null, 
    selectedDocument: Document | undefined,
    regionsCache: Record<string, Region[]>,
    resetStates: () => void
  ) => {
    if (selectedDocumentId === documentId) return;
    
    if (selectedDocumentId && selectedDocument) {
      setDocuments(prev => 
        prev.map(doc => 
          doc.id === selectedDocumentId 
            ? { ...doc, regions: regionsCache[selectedDocumentId] || [] } 
            : doc
        )
      );
    }
    
    setSelectedDocumentId(documentId);
    resetStates();
  };

  const handleDocumentRename = (documentId: string, newName: string) => {
    setDocuments(prev =>
      prev.map(doc =>
        doc.id === documentId ? { ...doc, name: newName } : doc
      )
    );
  };

  const handleDocumentDelete = (
    documentId: string, 
    selectedDocumentId: string | null,
    setSelectedRegionId: (id: string | null) => void,
    setRegionsCache: (fn: (prev: Record<string, Region[]>) => Record<string, Region[]>) => void
  ) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    
    setRegionsCache(prev => {
      const newCache = { ...prev };
      delete newCache[documentId];
      return newCache;
    });
    
    if (selectedDocumentId === documentId) {
      setSelectedDocumentId(null);
      setSelectedRegionId(null);
    }
  };

  return {
    documents,
    selectedDocumentId,
    handleFileUpload,
    handleDocumentSelect,
    handleDocumentRename,
    handleDocumentDelete
  };
};
