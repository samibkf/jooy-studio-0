import React, { useState, useEffect } from 'react';
import { useDocumentState } from '@/contexts/DocumentContext';
import PdfViewer from '@/components/PdfViewer';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { toast } from 'sonner';
import { useRouter } from 'next/router';

interface IndexProps {}

const Index = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [currentSelectionType, setCurrentSelectionType] = useState<'area' | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  const {
    regions,
    selectedRegionId,
    createRegion,
    updateRegion,
    selectRegion,
    deleteRegion,
    loading,
    clearDocument
  } = useDocumentState(documentId);

  const router = useRouter();

  useEffect(() => {
    const fileId = router.query.fileId as string | undefined;
    if (fileId) {
      setDocumentId(fileId);
    }
  }, [router.query]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    clearDocument();
    const newDocumentId = generateId();
    setDocumentId(newDocumentId);
    router.push(`/?fileId=${newDocumentId}`);
    toast.success('Document loaded');
  };

  const generateId = (): string => {
    return Math.random().toString(36).substring(2, 15);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <PdfViewer
              file={selectedFile}
              regions={regions}
              onRegionCreate={createRegion}
              onRegionUpdate={updateRegion}
              selectedRegionId={selectedRegionId}
              onRegionSelect={selectRegion}
              onRegionDelete={deleteRegion}
              isSelectionMode={currentSelectionType === 'area'}
              currentSelectionType={currentSelectionType}
              onCurrentSelectionTypeChange={setCurrentSelectionType}
              documentId={documentId}
              onPageChange={setCurrentPage}
            />
          </div>
          <Sidebar
            selectedRegion={regions.find(r => r.id === selectedRegionId) || null}
            regions={regions}
            onRegionUpdate={updateRegion}
            onRegionDelete={deleteRegion}
            onRegionSelect={selectRegion}
            documentId={documentId}
            currentPage={currentPage}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
