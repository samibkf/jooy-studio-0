import React, { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Header from '@/components/Header';
import PdfViewer from '@/components/PdfViewer';
import DocumentList from '@/components/DocumentList';
import { Region, RegionMapping } from '@/types/regions';
import { Document } from '@/types/documents';
import { exportRegionMapping } from '@/utils/exportUtils';
import { toast } from 'sonner';

const Index = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [currentSelectionType, setCurrentSelectionType] = useState<'area' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      file: file
    };

    setDocuments(prev => [...prev, newDocument]);
    setCurrentDocument(newDocument);
    setRegions([]);
    setSelectedRegionId(null);
    toast.success('Document uploaded successfully');
  };

  const handleDocumentDelete = (docId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== docId));
    if (currentDocument?.id === docId) {
      setCurrentDocument(null);
      setRegions([]);
      setSelectedRegionId(null);
    }
    toast.success('Document deleted');
  };

  const handleDocumentRename = (docId: string, newName: string) => {
    if (!newName.trim()) {
      toast.error('Document name cannot be empty');
      return;
    }

    setDocuments(prev =>
      prev.map(doc =>
        doc.id === docId ? { ...doc, name: newName.trim() } : doc
      )
    );
    toast.success('Document renamed');
  };

  const handleRegionCreate = (regionData: Omit<Region, 'id'>) => {
    const newRegion: Region = {
      ...regionData,
      id: uuidv4()
    };
    setRegions(prev => [...prev, newRegion]);
    setSelectedRegionId(newRegion.id);
    toast.success('Region created');
  };

  const handleRegionUpdate = (updatedRegion: Region) => {
    setRegions(prev => prev.map(region => region.id === updatedRegion.id ? updatedRegion : region));
  };

  const handleRegionDelete = (regionId: string) => {
    setRegions(prev => prev.filter(region => region.id !== regionId));
    if (selectedRegionId === regionId) {
      setSelectedRegionId(null);
    }
    toast.success('Region deleted');
  };

  const handleRegionSelect = (regionId: string | null) => {
    setSelectedRegionId(regionId);
  };

  const handleToggleSelectionMode = (mode: 'area' | null) => {
    setCurrentSelectionType(mode);
  };

  const handleExport = () => {
    if (!currentDocument) {
      toast.error('No PDF document loaded');
      return;
    }
    if (regions.length === 0) {
      toast.error('No regions defined');
      return;
    }

    const mapping: RegionMapping = {
      documentName: currentDocument.name,
      documentId: currentDocument.id,
      regions: regions
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
        hasDocument={!!currentDocument}
      />
      
      <div className="flex-1 relative">
        <PdfViewer
          file={currentDocument?.file || null}
          regions={regions}
          onRegionCreate={handleRegionCreate}
          onRegionUpdate={handleRegionUpdate}
          selectedRegionId={selectedRegionId}
          onRegionSelect={handleRegionSelect}
          onRegionDelete={handleRegionDelete}
          isSelectionMode={!!currentSelectionType}
          currentSelectionType={currentSelectionType}
          onCurrentSelectionTypeChange={handleToggleSelectionMode}
        />
        
        <DocumentList
          documents={documents}
          currentDocument={currentDocument}
          onDocumentSelect={setCurrentDocument}
          onDocumentDelete={handleDocumentDelete}
          onDocumentRename={handleDocumentRename}
        />
      </div>
    </div>
  );
};

export default Index;
