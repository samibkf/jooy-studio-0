import React, { useState, useRef } from 'react';
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

const Index = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [currentSelectionType, setCurrentSelectionType] = useState<'area' | null>(null);
  const [isDocumentListCollapsed, setIsDocumentListCollapsed] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedDocument = documents.find(doc => doc.id === selectedDocumentId);

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (file.type !== 'application/pdf') {
      toast.error('Please select a PDF file');
      return;
    }

    const newDocument: Document = {
      id: uuidv4(),
      name: file.name,
      file,
      regions: []
    };

    setDocuments(prev => [...prev, newDocument]);
    setSelectedDocumentId(newDocument.id);
    setSelectedRegionId(null);
    setIsDocumentListCollapsed(false);
    toast.success('Document added successfully');
  };

  const handleDocumentRename = (documentId: string, newName: string) => {
    setDocuments(prev =>
      prev.map(doc =>
        doc.id === documentId ? { ...doc, name: newName } : doc
      )
    );
  };

  const handleDocumentDelete = (documentId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    if (selectedDocumentId === documentId) {
      setSelectedDocumentId(null);
      setSelectedRegionId(null);
    }
  };

  const handleRegionCreate = (regionData: Omit<Region, 'id'>) => {
    if (!selectedDocumentId) return;

    const newRegion: Region = {
      ...regionData,
      id: uuidv4()
    };

    setDocuments(prev =>
      prev.map(doc =>
        doc.id === selectedDocumentId
          ? { ...doc, regions: [...doc.regions, newRegion] }
          : doc
      )
    );
    setSelectedRegionId(newRegion.id);
    toast.success('Region created');
  };

  const handleRegionUpdate = (updatedRegion: Region) => {
    if (!selectedDocumentId) return;

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
  };

  const handleRegionDelete = (regionId: string) => {
    if (!selectedDocumentId) return;

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

    if (selectedRegionId === regionId) {
      setSelectedRegionId(null);
    }
    toast.success('Region deleted');
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
          onDocumentSelect={setSelectedDocumentId}
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
        
        {/* Right sidebar container with fixed position button */}
        <div className="relative">
          {/* Fixed toggle button that's always visible regardless of sidebar state */}
          <Button
            variant="ghost"
            size="icon"
            className="fixed z-20 top-20 bg-background shadow-md border rounded-full"
            style={{ right: isSidebarCollapsed ? '16px' : '310px' }}
            onClick={toggleSidebar}
          >
            {isSidebarCollapsed ? <ChevronLeft /> : <ChevronRight />}
          </Button>
          
          {/* Sidebar content */}
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
