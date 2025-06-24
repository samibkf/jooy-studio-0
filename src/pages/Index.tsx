import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';
import { DocumentList } from '@/components/DocumentList';
import { PdfViewer } from '@/components/PdfViewer';
import { Header } from '@/components/Header';
import { TTSRequestModal } from '@/components/TTSRequestModal';
import { Sidebar } from '@/components/Sidebar';
import { CompactPageNavigation } from '@/components/CompactPageNavigation';
import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

interface Document {
  id: string;
  name: string;
  file_url: string;
  regions: Region[];
}

interface Region {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page_number: number;
  description: string | null;
}

const IndexPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [ttsRequestModalOpen, setTtsRequestModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/sign-in');
    } else {
      fetchDocuments();
    }
  }, [isAuthenticated, router]);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/documents');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      console.error("Could not fetch documents:", error);
      toast.error("Failed to load documents.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDocumentSelect = (documentId: string) => {
    const selected = documents.find(doc => doc.id === documentId);
    setSelectedDocument(selected || null);
    setCurrentPage(1);
  };

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsLoading(true);
    try {
      if (!event.target.files) {
        console.error("No file selected");
        return;
      }

      const file = event.target.files[0];
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`File upload failed with status: ${response.status}`);
      }

      toast.success("Document uploaded successfully!");
      fetchDocuments();
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error("Failed to upload document.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocumentRename = async (documentId: string, newName: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newName }),
      });

      if (!response.ok) {
        throw new Error(`Failed to rename document: ${response.status}`);
      }

      toast.success("Document renamed successfully!");
      fetchDocuments();
    } catch (error) {
      console.error("Error renaming document:", error);
      toast.error("Failed to rename document.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocumentDelete = async (documentId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete document: ${response.status}`);
      }

      toast.success("Document deleted successfully!");
      fetchDocuments();
      setSelectedDocument(null);
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegionCreate = async (newRegion: Omit<Region, 'id'>) => {
    setIsLoading(true);
    try {
      if (!selectedDocument) {
        console.error("No document selected to add region to.");
        return;
      }

      const response = await fetch(`/api/documents/${selectedDocument.id}/regions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRegion),
      });

      if (!response.ok) {
        throw new Error(`Failed to create region: ${response.status}`);
      }

      const createdRegion = await response.json();

      setDocuments(prevDocuments =>
        prevDocuments.map(doc =>
          doc.id === selectedDocument.id
            ? { ...doc, regions: [...(doc.regions || []), createdRegion] }
            : doc
        )
      );

      setSelectedDocument(prevDocument =>
        prevDocument ? { ...prevDocument, regions: [...(prevDocument.regions || []), createdRegion] } : null
      );

      toast.success("Region created successfully!");
    } catch (error) {
      console.error("Error creating region:", error);
      toast.error("Failed to create region.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegionUpdate = async (updatedRegion: Region) => {
    setIsLoading(true);
    try {
      if (!selectedDocument) {
        console.error("No document selected to update region in.");
        return;
      }

      const response = await fetch(`/api/documents/${selectedDocument.id}/regions/${updatedRegion.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedRegion),
      });

      if (!response.ok) {
        throw new Error(`Failed to update region: ${response.status}`);
      }

      setDocuments(prevDocuments =>
        prevDocuments.map(doc =>
          doc.id === selectedDocument.id
            ? {
              ...doc,
              regions: doc.regions.map(region =>
                region.id === updatedRegion.id ? updatedRegion : region
              ),
            }
            : doc
        )
      );

      setSelectedDocument(prevDocument =>
        prevDocument
          ? {
            ...prevDocument,
            regions: prevDocument.regions.map(region =>
              region.id === updatedRegion.id ? updatedRegion : region
            ),
          }
          : null
      );

      toast.success("Region updated successfully!");
    } catch (error) {
      console.error("Error updating region:", error);
      toast.error("Failed to update region.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegionDelete = async (regionId: string) => {
    setIsLoading(true);
    try {
      if (!selectedDocument) {
        console.error("No document selected to delete region from.");
        return;
      }

      const response = await fetch(`/api/documents/${selectedDocument.id}/regions/${regionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete region: ${response.status}`);
      }

      setDocuments(prevDocuments =>
        prevDocuments.map(doc =>
          doc.id === selectedDocument.id
            ? { ...doc, regions: doc.regions.filter(region => region.id !== regionId) }
            : doc
        )
      );

      setSelectedDocument(prevDocument =>
        prevDocument
          ? { ...prevDocument, regions: prevDocument.regions.filter(region => region.id !== regionId) }
          : null
      );

      setSelectedRegionId(null);
      toast.success("Region deleted successfully!");
    } catch (error) {
      console.error("Error deleting region:", error);
      toast.error("Failed to delete region.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    // Placeholder for export functionality
    toast.info("Export functionality not implemented yet.");
  };

  const handleTTSSubmit = () => {
    // Placeholder for TTS request submission
    toast.info("TTS request submission not implemented yet.");
    setTtsRequestModalOpen(false);
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Simplified sidebar toggle positioning - no RTL conditionals
  const getSidebarTogglePosition = () => {
    return { right: isSidebarCollapsed ? '16px' : '390px' };
  };

  return (
    <div className="min-h-screen flex w-full">
      <SidebarProvider>
        <div className="flex w-full">
          {/* Documents sidebar - always on left */}
          <DocumentList
            documents={documents}
            selectedDocument={selectedDocument}
            onDocumentSelect={handleDocumentSelect}
            onDocumentUpload={handleDocumentUpload}
            onDocumentRename={handleDocumentRename}
            onDocumentDelete={handleDocumentDelete}
            isLoading={isLoading}
            className="flex-shrink-0"
          />

          {/* Main content area */}
          <SidebarInset className="flex-1 relative">
            <div className="flex flex-col h-screen">
              <Header
                selectedDocument={selectedDocument}
                onExport={handleExport}
                onTTSRequest={handleTTSRequest}
                currentPage={currentPage}
                totalPages={totalPages}
                regions={selectedDocument?.regions || []}
              />

              <div className="flex-1 flex flex-col overflow-hidden">
                {isAuthenticated ? (
                  <>
                    {selectedDocument && selectedDocument.file_url ? (
                      <div className="flex-1 relative">
                        <PdfViewer
                          fileUrl={selectedDocument.file_url}
                          regions={selectedDocument.regions}
                          selectedRegionId={selectedRegionId}
                          onRegionCreate={handleRegionCreate}
                          onRegionUpdate={handleRegionUpdate}
                          onRegionSelect={setSelectedRegionId}
                          onRegionDelete={handleRegionDelete}
                          onPageChange={setCurrentPage}
                          documentId={selectedDocument.id}
                          onTotalPagesChange={setTotalPages}
                        />
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 bg-background rounded-lg border shadow-lg p-2">
                          <CompactPageNavigation
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center space-y-4">
                          <h1 className={`text-4xl font-bold text-primary ${isRTL ? 'rtl-text' : ''}`}>
                            {t('pdf.welcome_title')}
                          </h1>
                          <p className={`text-xl text-muted-foreground ${isRTL ? 'rtl-text' : ''}`}>
                            {t('pdf.welcome_subtitle')}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <p className={`text-muted-foreground ${isRTL ? 'rtl-text' : ''}`}>
                      {t('pdf.login_required')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Content Tools sidebar toggle - always on right */}
            <Button
              variant="ghost"
              size="icon"
              className="fixed z-20 top-24 bg-background shadow-md border rounded-full transition-all duration-300"
              style={getSidebarTogglePosition()}
              onClick={toggleSidebar}
            >
              {isSidebarCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>

            {/* Content Tools sidebar - always on right */}
            {!isSidebarCollapsed && (
              <div className="fixed right-0 top-0 h-full z-10 transition-all duration-300">
                <div className="h-full">
                  <Sidebar
                    selectedRegion={selectedDocument?.regions.find(r => r.id === selectedRegionId) || null}
                    regions={selectedDocument?.regions || []} 
                    onRegionUpdate={handleRegionUpdate}
                    onRegionDelete={handleRegionDelete}
                    onRegionSelect={setSelectedRegionId}
                    documentId={selectedDocument?.id || null}
                    currentPage={currentPage}
                  />
                </div>
              </div>
            )}

            {ttsRequestModalOpen && (
              <TTSRequestModal
                onClose={() => setTtsRequestModalOpen(false)}
                documents={documents}
                onSubmit={handleTTSSubmit}
              />
            )}
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default IndexPage;
