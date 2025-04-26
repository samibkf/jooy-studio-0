
import React, { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import PdfViewer from '@/components/PdfViewer';
import { Region } from '@/types/regions';
import { Document } from '@/types/documents';
import { exportRegionMapping } from '@/utils/exportUtils';
import { toast } from 'sonner';
import DocumentList from '@/components/DocumentList';
import { ResizablePanelGroup, ResizablePanel } from '@/components/ui/resizable';

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
      
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <DocumentList
            documents={documents}
            selectedDocumentId={selectedDocumentId}
            onDocumentSelect={setSelectedDocumentId}
            onDocumentRename={handleDocumentRename}
            onDocumentDelete={handleDocumentDelete}
            isCollapsed={isDocumentListCollapsed}
            onCollapsedChange={setIsDocumentListCollapsed}
          />

          <ResizablePanel defaultSize={75} minSize={30}>
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
          </ResizablePanel>
          
          <Sidebar
            selectedRegion={selectedDocument?.regions.find(r => r.id === selectedRegionId) || null}
            regions={selectedDocument?.regions || []}
            onRegionUpdate={handleRegionUpdate}
            onRegionDelete={handleRegionDelete}
            onRegionSelect={setSelectedRegionId}
          />
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default Index;
