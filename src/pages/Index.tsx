import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import PdfViewer from '@/components/PdfViewer';
import { toast } from 'sonner';
import DocumentList from '@/components/DocumentList';
import { useDocumentState } from '@/hooks/useDocumentState';
import { useDocumentManagement } from '@/hooks/useDocumentManagement';
import { useRegionManagement } from '@/hooks/useRegionManagement';
import { exportRegionMapping } from '@/utils/exportUtils';

const Index = () => {
  const [isDocumentListCollapsed, setIsDocumentListCollapsed] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    documents,
    setDocuments,
    selectedDocumentId,
    handleFileUpload: documentUpload,
    handleDocumentSelect: documentSelect,
    handleDocumentRename,
    handleDocumentDelete: documentDelete
  } = useDocumentManagement();

  const {
    currentSelectionType,
    setCurrentSelectionType,
    regionsCache,
    setRegionsCache,
    resetStates
  } = useDocumentState(selectedDocumentId);

  const selectedDocument = documents.find(doc => doc.id === selectedDocumentId);

  const {
    selectedRegionId,
    setSelectedRegionId,
    handleRegionCreate,
    handleRegionUpdate,
    handleRegionDelete
  } = useRegionManagement(selectedDocumentId, documents, setDocuments, regionsCache, setRegionsCache);
  
  useEffect(() => {
    if (selectedDocumentId && selectedDocument) {
      setRegionsCache(prev => ({
        ...prev,
        [selectedDocumentId]: [...selectedDocument.regions]
      }));
    }
  }, [selectedDocumentId, selectedDocument, setRegionsCache]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    documentUpload(files[0], resetStates, setRegionsCache);
    setIsDocumentListCollapsed(false);
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleDocumentSelect = (documentId: string) => {
    documentSelect(documentId, selectedDocumentId, selectedDocument, regionsCache, resetStates);
  };

  const handleDocumentDelete = (documentId: string) => {
    documentDelete(documentId, selectedDocumentId, setSelectedRegionId, setRegionsCache);
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
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
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
  );
};

export default Index;
