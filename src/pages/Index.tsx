
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthProvider';
import Header from '@/components/Header';
import DocumentList from '@/components/DocumentList';
import Sidebar from '@/components/Sidebar';
import PdfViewer from '@/components/PdfViewer';
import { Document } from '@/types/documents';
import { Region, RegionType } from '@/types/regions';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const Index = () => {
  const { authState, signOut } = useAuth();
  const navigate = useNavigate();
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [currentSelectionType, setCurrentSelectionType] = useState<RegionType | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setFileError(null);
    
    if (!file) return;

    // Verify the file has content
    if (file.size === 0) {
      setFileError("The PDF file is empty (0 bytes). Please upload a valid PDF.");
      toast.error("The PDF file is empty (0 bytes). Please upload a valid PDF.");
      return;
    }

    // Check if it's a PDF
    if (file.type !== 'application/pdf') {
      setFileError("Please upload a PDF document");
      toast.error("Please upload a PDF document");
      return;
    }

    try {
      // Try to read a small portion of the file to verify it's readable
      const fileSlice = file.slice(0, 5);
      await fileSlice.arrayBuffer();
      
      const newDocument: Document = {
        id: Math.random().toString(36).substring(7),
        name: file.name,
        file: file,
        regions: [],
        created_at: new Date().toISOString(),
        user_id: authState.user?.id,
      };

      setSelectedDocument(newDocument);
      toast.success(`${file.name} uploaded successfully`);
    } catch (error) {
      console.error("Error verifying PDF:", error);
      setFileError("Unable to read the PDF file. The file may be corrupted.");
      toast.error("Unable to read the PDF file. The file may be corrupted.");
    }
  };

  const handleDocumentSelect = (document: Document) => {
    setFileError(null);
    setSelectedDocument(document);
  };

  const handleRegionSelect = (regionId: string) => {
    setSelectedRegionId(regionId);
  };

  const handleRegionCreate = (newRegion: Region) => {
    if (!selectedDocument) return;

    setSelectedDocument((prevDocument) => {
      if (!prevDocument) return prevDocument;
      return {
        ...prevDocument,
        regions: [...prevDocument.regions, newRegion],
      };
    });
  };

  const handleRegionUpdate = (updatedRegion: Region) => {
    if (!selectedDocument) return;

    setSelectedDocument((prevDocument) => {
      if (!prevDocument) return prevDocument;
      return {
        ...prevDocument,
        regions: prevDocument.regions.map((region) =>
          region.id === updatedRegion.id ? updatedRegion : region
        ),
      };
    });
  };

  const handleRegionDelete = (regionId: string) => {
    if (!selectedDocument) return;

    setSelectedDocument((prevDocument) => {
      if (!prevDocument) return prevDocument;
      return {
        ...prevDocument,
        regions: prevDocument.regions.filter((region) => region.id !== regionId),
      };
    });
  };

  const handleRegionTypeSelect = (type: RegionType | null) => {
    setCurrentSelectionType(type);
    setIsSelectionMode(true);
  };

  const handleExportRegions = () => {
    if (!selectedDocument) {
      toast.error('No document selected to export.');
      return;
    }

    const dataStr = JSON.stringify(selectedDocument.regions, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `${selectedDocument.name.replace('.pdf', '')}_regions.json`;

    let linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
  };

  const selectedRegion = selectedDocument?.regions.find(region => region.id === selectedRegionId) || null;

  return (
    <div className="flex flex-col h-screen">
      <Header
        onUploadClick={() => document.getElementById('file-upload')?.click()}
        onExport={handleExportRegions}
        hasDocument={!!selectedDocument}
        user={authState.profile}
        onSignOut={signOut}
      />
      
      {!authState.session && (
        <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400">
          <p className="flex justify-between items-center">
            <span>Test admin login with: admin@jooy.io / j00yenjooy</span>
            <Link to="/auth" className="text-primary hover:underline">
              Go to Login Page
            </Link>
          </p>
        </div>
      )}

      {fileError && (
        <Alert variant="destructive" className="mx-4 mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{fileError}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          selectedRegion={selectedRegion}
          regions={selectedDocument?.regions || []}
          onRegionUpdate={handleRegionUpdate}
          onRegionDelete={handleRegionDelete}
          onRegionSelect={handleRegionSelect}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedDocument ? (
            <div className="flex-1 overflow-hidden">
              <PdfViewer
                file={selectedDocument.file}
                regions={selectedDocument.regions}
                selectedRegionId={selectedRegionId}
                onRegionSelect={handleRegionSelect}
                onRegionCreate={handleRegionCreate}
                onRegionUpdate={handleRegionUpdate}
                onRegionDelete={handleRegionDelete}
                isSelectionMode={isSelectionMode}
                currentSelectionType={currentSelectionType}
                onCurrentSelectionTypeChange={setCurrentSelectionType}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <DocumentList onDocumentSelect={handleDocumentSelect} />
              <input
                type="file"
                id="file-upload"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
