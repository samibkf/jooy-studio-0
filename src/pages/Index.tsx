
import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import PdfViewer from '@/components/PdfViewer';
import { Region } from '@/types/regions';
import { DocumentData } from '@/types/documents';
import { exportRegionMapping } from '@/utils/exportUtils';
import { toast } from 'sonner';
import DocumentList from '@/components/DocumentList';
import { useDocumentState } from '@/hooks/useDocumentState';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [isDocumentListCollapsed, setIsDocumentListCollapsed] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    selectedRegionId,
    setSelectedRegionId,
    currentSelectionType,
    setCurrentSelectionType,
    regionsCache,
    setRegionsCache,
    resetStates
  } = useDocumentState(selectedDocumentId);

  const selectedDocument = documents.find(doc => doc.id === selectedDocumentId);
  
  const { authState, signOut } = useAuth(); // Correctly destructure signOut from useAuth
  const navigate = useNavigate();

  useEffect(() => {
    console.log('User profile loaded in Index:', authState.profile);

    if (!authState.user) return;
    
    const loadDocuments = async () => {
      setIsLoading(true);
      try {
        console.log("Loading documents for user:", authState.user.id);
        const { data: dbDocuments, error } = await supabase
          .from('documents')
          .select('*')
          .eq('user_id', authState.user.id);

        if (error) {
          console.error("Error loading documents:", error);
          toast.error('Failed to load documents: ' + error.message);
          return;
        }

        console.log("Documents loaded:", dbDocuments);
        const documentsWithRegions = await Promise.all(
          dbDocuments.map(async (doc) => {
            try {
              const { data: regions, error: regionsError } = await supabase
                .from('document_regions')
                .select('*')
                .eq('document_id', doc.id);

              if (regionsError) {
                console.error(`Error loading regions for document ${doc.name}:`, regionsError);
                toast.error(`Failed to load regions for document ${doc.name}`);
                return null;
              }

              console.log(`Regions for document ${doc.id}:`, regions);
              const { data: fileData, error: fileError } = await supabase.storage
                .from('pdfs')
                .createSignedUrl(`${authState.user.id}/${doc.id}.pdf`, 3600);

              if (fileError) {
                console.error(`Error getting signed URL for document ${doc.name}:`, fileError);
                toast.error(`Failed to access PDF for ${doc.name}`);
                return null;
              }

              if (fileData?.signedUrl) {
                try {
                  const response = await fetch(fileData.signedUrl);
                  if (!response.ok) {
                    throw new Error(`Failed to fetch PDF: ${response.status}`);
                  }
                  const blob = await response.blob();
                  const file = new File([blob], doc.name, { type: 'application/pdf' });

                  return {
                    ...doc,
                    file,
                    regions: (regions || []).map(r => ({
                      id: r.id,
                      page: r.page,
                      x: r.x,
                      y: r.y,
                      width: r.width,
                      height: r.height,
                      type: r.type,
                      name: r.name,
                      description: r.description,
                      document_id: r.document_id,
                      user_id: r.user_id,
                      created_at: r.created_at
                    }))
                  };
                } catch (fetchError) {
                  console.error('Error fetching PDF file:', fetchError);
                  toast.error(`Failed to fetch PDF for ${doc.name}`);
                  return null;
                }
              }
              return null;
            } catch (docError) {
              console.error('Error processing document:', docError);
              return null;
            }
          })
        );

        const validDocuments = documentsWithRegions.filter(Boolean) as DocumentData[];
        setDocuments(validDocuments);
        
        const newCache: Record<string, Region[]> = {};
        validDocuments.forEach(doc => {
          newCache[doc.id] = doc.regions;
        });
        setRegionsCache(newCache);
      } catch (loadError) {
        console.error('Error loading documents:', loadError);
        toast.error('Failed to load documents');
      } finally {
        setIsLoading(false);
      }
    };

    loadDocuments();
  }, [authState.user]);

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !authState.user) return;
    
    const file = files[0];
    if (file.type !== 'application/pdf') {
      toast.error('Please select a PDF file');
      return;
    }

    try {
      const documentId = uuidv4();
      const { error: uploadError } = await supabase.storage
        .from('pdfs')
        .upload(`${authState.user.id}/${documentId}.pdf`, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          id: documentId,
          name: file.name,
          user_id: authState.user.id
        });

      if (dbError) throw dbError;

      const newDocument: DocumentData = {
        id: documentId,
        name: file.name,
        file,
        regions: []
      };

      setDocuments(prev => [...prev, newDocument]);
      setSelectedDocumentId(documentId);
      resetStates();
      setIsDocumentListCollapsed(false);
      toast.success('Document added successfully');
      
      setRegionsCache(prev => ({
        ...prev,
        [documentId]: []
      }));
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    }
  };

  const handleDocumentSelect = (documentId: string) => {
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

  const handleDocumentDelete = async (documentId: string) => {
    if (!authState.user) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('pdfs')
        .remove([`${authState.user.id}/${documentId}.pdf`]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId)
        .eq('user_id', authState.user.id);

      if (dbError) throw dbError;

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

      toast.success('Document deleted successfully');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const handleRegionCreate = async (regionData: Omit<Region, 'id'>) => {
    if (!selectedDocumentId || !authState.user) return;

    const newRegion: Region = {
      ...regionData,
      id: uuidv4(),
      description: regionData.description || null // Ensure null for empty descriptions
    };

    try {
      // Update UI first for immediate feedback
      setRegionsCache(prev => ({
        ...prev,
        [selectedDocumentId]: [...(prev[selectedDocumentId] || []), newRegion]
      }));
      
      setDocuments(prev =>
        prev.map(doc =>
          doc.id === selectedDocumentId
            ? { ...doc, regions: [...doc.regions, newRegion] }
            : doc
        )
      );
      
      setSelectedRegionId(newRegion.id);

      // Then update database
      const { error } = await supabase
        .from('document_regions')
        .insert({
          id: newRegion.id,
          document_id: selectedDocumentId,
          user_id: authState.user.id,
          page: newRegion.page,
          x: newRegion.x,
          y: newRegion.y,
          width: newRegion.width,
          height: newRegion.height,
          type: newRegion.type,
          name: newRegion.name,
          description: newRegion.description
        });

      if (error) {
        console.error('Error creating region:', error);
        toast.error('Failed to create region: ' + error.message);
        
        // Revert UI changes on error
        setRegionsCache(prev => ({
          ...prev,
          [selectedDocumentId]: (prev[selectedDocumentId] || []).filter(r => r.id !== newRegion.id)
        }));
        
        setDocuments(prev =>
          prev.map(doc =>
            doc.id === selectedDocumentId
              ? { ...doc, regions: doc.regions.filter(r => r.id !== newRegion.id) }
              : doc
          )
        );
      } else {
        toast.success('Region created');
      }
    } catch (error) {
      console.error('Error creating region:', error);
      toast.error('Failed to create region');
    }
  };

  const handleRegionUpdate = async (updatedRegion: Region) => {
    if (!selectedDocumentId || !authState.user) return;

    try {
      console.log('Updating region:', updatedRegion);
      
      // Update UI first for immediate feedback
      setDocuments(prev =>
        prev.map(doc =>
          doc.id === selectedDocumentId
            ? {
                ...doc,
                regions: doc.regions.map(region =>
                  region.id === updatedRegion.id ? updatedRegion : region
                )
              }
            : doc
        )
      );
      
      setRegionsCache(prev => ({
        ...prev,
        [selectedDocumentId]: (prev[selectedDocumentId] || []).map(region =>
          region.id === updatedRegion.id ? updatedRegion : region
        )
      }));

      // Then update database, making sure description is null if empty
      const updatePayload = {
        page: updatedRegion.page,
        x: updatedRegion.x,
        y: updatedRegion.y,
        width: updatedRegion.width,
        height: updatedRegion.height,
        type: updatedRegion.type,
        name: updatedRegion.name,
        description: updatedRegion.description || null // Ensure null for empty descriptions
      };

      const { error } = await supabase
        .from('document_regions')
        .update(updatePayload)
        .eq('id', updatedRegion.id)
        .eq('user_id', authState.user.id);

      if (error) {
        console.error('Supabase error updating region:', error);
        toast.error('Failed to update region: ' + error.message);
        
        // Refresh regions from database on error
        const { data: freshRegions, error: regionsError } = await supabase
          .from('document_regions')
          .select('*')
          .eq('document_id', selectedDocumentId);
          
        if (!regionsError && freshRegions) {
          const typedRegions: Region[] = freshRegions.map(r => ({
            id: r.id,
            page: r.page,
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height,
            type: r.type,
            name: r.name,
            description: r.description,
            document_id: r.document_id,
            user_id: r.user_id,
            created_at: r.created_at
          }));

          setDocuments(prev =>
            prev.map(doc =>
              doc.id === selectedDocumentId
                ? { ...doc, regions: typedRegions }
                : doc
            )
          );
          
          setRegionsCache(prev => ({
            ...prev,
            [selectedDocumentId]: typedRegions
          }));
        }
      }
    } catch (error) {
      console.error('Error updating region:', error);
      toast.error('Failed to update region');
    }
  };

  const handleRegionDelete = async (regionId: string) => {
    if (!selectedDocumentId || !authState.user) return;

    try {
      const { error } = await supabase
        .from('document_regions')
        .delete()
        .eq('id', regionId)
        .eq('user_id', authState.user.id);

      if (error) throw error;

      setDocuments(prev =>
        prev.map(doc =>
          doc.id === selectedDocumentId
            ? {
                ...doc,
                regions: doc.regions.filter(region => region.id !== regionId)
              }
            : doc
        )
      );
      
      setRegionsCache(prev => ({
        ...prev,
        [selectedDocumentId]: (prev[selectedDocumentId] || []).filter(
          region => region.id !== regionId
        )
      }));

      if (selectedRegionId === regionId) {
        setSelectedRegionId(null);
      }
      toast.success('Region deleted');
    } catch (error) {
      console.error('Error deleting region:', error);
      toast.error('Failed to delete region');
    }
  };

  const handleExport = () => {
    if (!selectedDocument) {
      toast.error('No document selected');
      return;
    }

    if (selectedDocument.regions.length === 0) {
      toast.error('No regions defined');
      return;
    }

    const mapping = {
      documentName: selectedDocument.name,
      documentId: selectedDocument.id,
      regions: selectedDocument.regions
    };

    exportRegionMapping(mapping);
    toast.success('Data exported successfully');
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="application/pdf"
          className="hidden"
        />
        
        <Header
          onUploadClick={handleFileUpload}
          onExport={handleExport}
          hasDocument={!!selectedDocument}
          user={authState.profile}
          onSignOut={signOut}
        />
        
        <div className="flex flex-1 overflow-hidden">
          <DocumentList
            documents={documents}
            selectedDocumentId={selectedDocumentId}
            onDocumentSelect={handleDocumentSelect}
            onDocumentRename={handleDocumentRename}
            onDocumentDelete={handleDocumentDelete}
            isCollapsed={isDocumentListCollapsed}
            onCollapsedChange={setIsDocumentListCollapsed}
          />

          <div className="flex-1 overflow-hidden relative">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                <span className="ml-3">Loading documents...</span>
              </div>
            ) : (
              <PdfViewer
                file={selectedDocument?.file || null}
                regions={selectedDocument?.regions || []}
                onRegionCreate={handleRegionCreate}
                onRegionUpdate={handleRegionUpdate}
                selectedRegionId={selectedRegionId}
                onRegionSelect={setSelectedRegionId}
                onRegionDelete={handleRegionDelete}
                isSelectionMode={!!currentSelectionType}
                currentSelectionType={currentSelectionType}
                onCurrentSelectionTypeChange={setCurrentSelectionType}
              />
            )}
          </div>
          
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="fixed z-20 top-20 bg-background shadow-md border rounded-full"
              style={{ right: isSidebarCollapsed ? '16px' : '310px' }}
              onClick={toggleSidebar}
            >
              {isSidebarCollapsed ? <ChevronLeft /> : <ChevronRight />}
            </Button>
            
            <div className={`transition-all duration-300 ${isSidebarCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-[300px]'}`}>
              <div className="h-full">
                <Sidebar
                  selectedRegion={selectedDocument?.regions.find(r => r.id === selectedRegionId) || null}
                  regions={selectedDocument?.regions || []}
                  onRegionUpdate={handleRegionUpdate}
                  onRegionDelete={handleRegionDelete}
                  onRegionSelect={setSelectedRegionId}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Index;
