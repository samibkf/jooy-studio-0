
import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import PdfViewer from '@/components/PdfViewer';
import { Region } from '@/types/regions';
import { Document } from '@/types/documents';
import { exportRegionMapping } from '@/utils/exportUtils';
import { toast } from 'sonner';
import DocumentList from '@/components/DocumentList';
import { useDocumentState } from '@/hooks/useDocumentState';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [isDocumentListCollapsed, setIsDocumentListCollapsed] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
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
  
  const { authState, signOut } = useAuth();

  useEffect(() => {
    if (!authState.user) return;
    
    const loadDocuments = async () => {
      const { data: dbDocuments, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', authState.user.id);

      if (error) {
        toast.error('Failed to load documents');
        return;
      }

      const documentsWithRegions = await Promise.all(
        dbDocuments.map(async (doc) => {
          const { data: regions, error: regionsError } = await supabase
            .from('document_regions')
            .select('*')
            .eq('document_id', doc.id);

          if (regionsError) {
            toast.error(`Failed to load regions for document ${doc.name}`);
            return null;
          }

          const { data: fileData } = await supabase.storage
            .from('pdfs')
            .createSignedUrl(`${authState.user.id}/${doc.id}.pdf`, 3600);

          if (fileData?.signedUrl) {
            const response = await fetch(fileData.signedUrl);
            const blob = await response.blob();
            const file = new File([blob], doc.name, { type: 'application/pdf' });

            return {
              ...doc,
              file,
              regions: regions || []
            };
          }
          return null;
        })
      );

      const validDocuments = documentsWithRegions.filter(Boolean) as Document[];
      setDocuments(validDocuments);
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

      const newDocument: Document = {
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
      id: uuidv4()
    };

    try {
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

      if (error) throw error;

      setDocuments(prev =>
        prev.map(doc =>
          doc.id === selectedDocumentId
            ? { ...doc, regions: [...doc.regions, newRegion] }
            : doc
        )
      );
      
      setRegionsCache(prev => ({
        ...prev,
        [selectedDocumentId]: [...(prev[selectedDocumentId] || []), newRegion]
      }));
      
      setSelectedRegionId(newRegion.id);
      toast.success('Region created');
    } catch (error) {
      console.error('Error creating region:', error);
      toast.error('Failed to create region');
    }
  };

  const handleRegionUpdate = async (updatedRegion: Region) => {
    if (!selectedDocumentId || !authState.user) return;

    try {
      console.log('Updating region:', updatedRegion);
      
      // First update the local state for immediate UI feedback
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

      // Then send the update to Supabase
      const { error } = await supabase
        .from('document_regions')
        .update({
          page: updatedRegion.page,
          x: updatedRegion.x,
          y: updatedRegion.y,
          width: updatedRegion.width,
          height: updatedRegion.height,
          type: updatedRegion.type,
          name: updatedRegion.name,
          description: updatedRegion.description
        })
        .eq('id', updatedRegion.id)
        .eq('user_id', authState.user.id);

      if (error) {
        console.error('Supabase error updating region:', error);
        toast.error('Failed to update region');
        
        // If Supabase update fails, we should revert our local state change
        // But we need the original region data to do that properly
        // For now, we'll just reload the document to get fresh data
        const { data: freshRegions, error: regionsError } = await supabase
          .from('document_regions')
          .select('*')
          .eq('document_id', selectedDocumentId);
          
        if (!regionsError && freshRegions) {
          setDocuments(prev =>
            prev.map(doc =>
              doc.id === selectedDocumentId
                ? { ...doc, regions: freshRegions }
                : doc
            )
          );
          
          setRegionsCache(prev => ({
            ...prev,
            [selectedDocumentId]: freshRegions
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
