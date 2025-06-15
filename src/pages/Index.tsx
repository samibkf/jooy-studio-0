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
import { supabase, initializeStorage } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { pdfCacheService } from '@/services/pdfCacheService';
import { generateUniqueDocumentId } from '@/utils/documentIdUtils';
import { useDocumentMetadata } from '@/hooks/useDocumentMetadata';
import { deleteMetadata } from '@/utils/metadataUtils';
import { usePdfPageCount } from '@/hooks/usePdfPageCount';
import { generateBulkQRCodes, exportQRCodesAsZip } from '@/utils/qrCodeUtils';
import { 
  generateTransparentBulkQRCodes, 
  embedQRCodeIntoPDF, 
  downloadPDFWithQRCodes 
} from '@/utils/pdfQrEmbedding';

const Index = () => {
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [isDocumentListCollapsed, setIsDocumentListCollapsed] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState<Record<string, number>>({});
  const [storageInitialized, setStorageInitialized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [documentsLoaded, setDocumentsLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isQRExporting, setIsQRExporting] = useState(false);
  const [isPDFQRExporting, setIsPDFQRExporting] = useState(false);
  const [qrCorner, setQrCorner] = useState<'top-left' | 'top-right'>('top-left');

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
  const navigate = useNavigate();

  // Fix 1: Get PDF page count by fetching PDF via Edge Function
  const { pageCount } = usePdfPageCount({
    documentId: selectedDocument ? selectedDocument.id : null,
  });

  // Initialize metadata management for selected document
  const { syncMetadata } = useDocumentMetadata({
    documentId: selectedDocumentId,
    documentData: selectedDocument,
    autoSync: true,
    syncInterval: 2000
  });

  const loadDocuments = async () => {
    if (documentsLoaded && !isInitialLoad) {
      console.log('Documents already loaded, skipping reload');
      return;
    }

    setIsLoading(true);
    try {
      console.log("Loading documents for user:", authState.user.id);
      
      // Initialize storage to ensure bucket exists
      const storageReady = await initializeStorage();
      setStorageInitialized(storageReady);
      
      if (!storageReady) {
        toast.warning("Storage system is not fully initialized. Document access may be limited.", {
          duration: 10000,
          id: "storage-initialization-warning"
        });
      }
      
      const { data: dbDocuments, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', authState.user.id);

      if (error) {
        console.error("Error loading documents:", error);
        toast.error('Failed to load documents: ' + error.message);
        setIsLoading(false);
        return;
      }

      console.log("Documents loaded from database:", dbDocuments);
      
      if (!dbDocuments || dbDocuments.length === 0) {
        console.log("No documents found for user");
        setDocumentsLoaded(true);
        setIsLoading(false);
        return;
      }
      
      const validDocuments: DocumentData[] = [];
      const newCache: Record<string, Region[]> = {};
      let documentWithIssues = 0;
      
      for (const doc of dbDocuments) {
        try {
          // First get the regions for this document
          const { data: regions, error: regionsError } = await supabase
            .from('document_regions')
            .select('*')
            .eq('document_id', doc.id);

          if (regionsError) {
            console.error(`Error loading regions for document ${doc.name}:`, regionsError);
            toast.error(`Failed to load regions for document ${doc.name}`);
            continue;
          }

          const typedRegions = (regions || []).map(r => ({
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
          
          // Add the document with or without the file
          const documentData: DocumentData = {
            ...doc,
            regions: typedRegions,
          };
          
          validDocuments.push(documentData);
          newCache[doc.id] = typedRegions;
          
        } catch (docError) {
          console.error('Error processing document:', docError);
        }
      }

      setDocuments(validDocuments);
      setRegionsCache(newCache);
      setDocumentsLoaded(true);
      
      console.log("Processed documents:", validDocuments.length, "Documents with issues:", documentWithIssues);
      
      // Clean expired cache entries in the background
      pdfCacheService.clearExpiredCache().catch(console.error);
      
    } catch (loadError) {
      console.error('Error loading documents:', loadError);
      toast.error('Failed to load documents');
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  };

  useEffect(() => {
    console.log('User profile loaded in Index:', authState.profile);

    if (!authState.user) return;
    
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
    
    // Check if we're re-uploading an existing document
    const reuploadDocId = selectedDocumentId;
    
    // Generate new 5-letter ID for new documents
    let documentId = reuploadDocId;
    if (!reuploadDocId) {
      try {
        documentId = await generateUniqueDocumentId(authState.user.id);
        console.log('Generated unique document ID:', documentId);
      } catch (error) {
        console.error('Failed to generate unique document ID:', error);
        toast.error('Failed to generate document ID');
        return;
      }
    }
    
    try {
      // Make sure storage is initialized
      await initializeStorage();

      toast.loading('Uploading PDF file...', { id: 'pdf-upload' });
      
      // Store PDF in bucket root with 5-letter ID
      const filePath = `${documentId}.pdf`;
      console.log(`Uploading PDF to ${filePath}`);
      
      const { error: uploadError } = await supabase.storage
        .from('pdfs')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        toast.error('Failed to upload PDF file: ' + uploadError.message, { id: 'pdf-upload' });
        return;
      }
      
      if (reuploadDocId) {
        // Update existing document
        setDocuments(prev => 
          prev.map(doc => 
            doc.id === reuploadDocId 
              ? { ...doc } 
              : doc
          )
        );
        
        toast.success('Document PDF re-uploaded successfully', { id: 'pdf-upload' });
      } else {
        // Create new document in database
        const { error: dbError } = await supabase
          .from('documents')
          .insert({
            id: documentId,
            name: file.name,
            user_id: authState.user.id
          });

        if (dbError) {
          console.error('Database insert error:', dbError);
          toast.error('Failed to save document information: ' + dbError.message, { id: 'pdf-upload' });
          return;
        }

        const newDocument: DocumentData = {
          id: documentId,
          name: file.name,
          regions: [],
        };

        setDocuments(prev => [...prev, newDocument]);
        setSelectedDocumentId(documentId);
        resetStates();
        setIsDocumentListCollapsed(false);
        
        toast.success('Document added successfully', { id: 'pdf-upload' });
        
        setRegionsCache(prev => ({
          ...prev,
          [documentId]: []
        }));

        // Trigger metadata sync for the new document
        setTimeout(() => {
          syncMetadata();
        }, 1000);
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document', { id: 'pdf-upload' });
    }
    
    // Clear file input
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleDocumentSelect = (documentId: string) => {
    if (selectedDocumentId === documentId) return;
    
    const docToSelect = documents.find(doc => doc.id === documentId);
    
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

  const handleDocumentRename = async (documentId: string, newName: string) => {
    if (!authState.user) return;
    
    try {
      console.log('Attempting to rename document:', documentId, 'to:', newName);
      
      const { error: updateError } = await supabase
        .from('documents')
        .update({ name: newName })
        .eq('id', documentId)
        .eq('user_id', authState.user.id);

      if (updateError) {
        console.error('Error renaming document:', updateError);
        toast.error('Failed to rename document');
        return;
      }

      setDocuments(prev =>
        prev.map(doc =>
          doc.id === documentId ? { ...doc, name: newName } : doc
        )
      );
      
      toast.success('Document renamed successfully');
    } catch (error) {
      console.error('Error in handleDocumentRename:', error);
      toast.error('Failed to rename document');
    }
  };

  const handleDocumentDelete = async (documentId: string) => {
    if (!authState.user) return;

    try {
      console.log('Attempting to delete document:', documentId);

      // Delete PDF from bucket root
      const { error: storageError } = await supabase.storage
        .from('pdfs')
        .remove([`${documentId}.pdf`]);

      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
        toast.error('Failed to delete document from storage');
        return;
      }

      // Delete metadata file
      await deleteMetadata(documentId, authState.user.id);

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId)
        .eq('user_id', authState.user.id);

      if (dbError) {
        console.error('Error deleting document from database:', dbError);
        toast.error('Failed to delete document');
        return;
      }

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
      console.error('Error in handleDocumentDelete:', error);
      toast.error('Failed to delete document');
    }
  };

  const handleRegionCreate = async (regionData: Omit<Region, 'id'>) => {
    if (!selectedDocumentId || !authState.user) return;

    const newRegion: Region = {
      ...regionData,
      id: uuidv4(),
      description: regionData.description || null
    };

    try {
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
        
        // Trigger metadata sync
        setTimeout(syncMetadata, 500);
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

      const updatePayload = {
        page: updatedRegion.page,
        x: updatedRegion.x,
        y: updatedRegion.y,
        width: updatedRegion.width,
        height: updatedRegion.height,
        type: updatedRegion.type,
        name: updatedRegion.name,
        description: updatedRegion.description || null
      };

      const { error } = await supabase
        .from('document_regions')
        .update(updatePayload)
        .eq('id', updatedRegion.id)
        .eq('user_id', authState.user.id);

      if (error) {
        console.error('Supabase error updating region:', error);
        toast.error('Failed to update region: ' + error.message);
        
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
      } else {
        // Trigger metadata sync
        setTimeout(syncMetadata, 500);
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

      // Trigger metadata sync
      setTimeout(syncMetadata, 500);

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

  const fetchPdfArrayBuffer = async (documentId: string): Promise<ArrayBuffer> => {
    const response = await fetch(`/functions/v1/stream-pdf?document_id=${documentId}`, {
      headers: { 'Cache-Control': 'no-store' },
    });
    if (!response.ok) throw new Error('Failed to fetch PDF');
    return await response.arrayBuffer();
  };

  // Refactor: update to fetch ArrayBuffer for QR export/embedding
  const handleQRExport = async () => {
    if (!selectedDocument) {
      toast.error('No valid document selected');
      return;
    }
    if (pageCount === 0) {
      toast.error('Unable to determine page count for this document');
      return;
    }
    setIsQRExporting(true);

    try {
      toast.loading('Generating QR codes...', { id: 'qr-export' });

      // Generate QR codes for all pages
      const qrCodes = await generateBulkQRCodes(
        selectedDocument.id,
        pageCount,
        (progress) => {
          toast.loading(`Generating QR codes... ${Math.round(progress)}%`, { id: 'qr-export' });
        }
      );
      toast.loading('Creating ZIP file...', { id: 'qr-export' });
      await exportQRCodesAsZip(qrCodes, selectedDocument.name);
      toast.success(`Successfully exported ${qrCodes.length} QR codes`, { id: 'qr-export' });
    } catch (error) {
      console.error('Error exporting QR codes:', error);
      toast.error(
        'Failed to export QR codes: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
        { id: 'qr-export' }
      );
    } finally {
      setIsQRExporting(false);
    }
  };

  const handlePDFQRExport = async (corner: 'top-left' | 'top-right') => {
    if (!selectedDocument) {
      toast.error('No valid document selected');
      return;
    }
    if (pageCount === 0) {
      toast.error('Unable to determine page count for this document');
      return;
    }
    setIsPDFQRExporting(true);

    try {
      toast.loading('Generating transparent QR codes...', { id: 'pdf-qr-export' });

      // Generate transparent QR codes for all pages
      const qrCodes = await generateTransparentBulkQRCodes(
        selectedDocument.id,
        pageCount,
        (progress) => {
          toast.loading(
            `Generating QR codes... ${Math.round(progress)}%`,
            { id: 'pdf-qr-export' }
          );
        }
      );

      toast.loading('Embedding QR codes into PDF...', { id: 'pdf-qr-export' });

      // *** Refactor: Fetch PDF as arrayBuffer using stream-pdf ***
      const arrayBuffer = await fetchPdfArrayBuffer(selectedDocument.id);

      // Pass arrayBuffer to embedQRCodeIntoPDF
      const modifiedPdfBytes = await embedQRCodeIntoPDF(
        arrayBuffer,
        qrCodes,
        corner
      );

      toast.loading('Preparing download...', { id: 'pdf-qr-export' });
      await downloadPDFWithQRCodes(modifiedPdfBytes, selectedDocument.name);
      toast.success(
        `Successfully created PDF with ${qrCodes.length} embedded QR codes`,
        { id: 'pdf-qr-export' }
      );
    } catch (error) {
      console.error('Error creating PDF with QR codes:', error);
      toast.error(
        'Failed to create PDF with QR codes: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
        { id: 'pdf-qr-export' }
      );
    } finally {
      setIsPDFQRExporting(false);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleRetryLoadDocument = async () => {
    if (!selectedDocumentId || !authState.user) return;
    
    toast.loading('Retrying document access...', { id: 'retry-load' });
    
    try {
      // Update retry count
      setRetryCount(prev => ({
        ...prev,
        [selectedDocumentId]: (prev[selectedDocumentId] || 0) + 1
      }));
      
      const doc = documents.find(d => d.id === selectedDocumentId);
      if (!doc) {
        toast.error('Document not found', { id: 'retry-load' });
        return;
      }
      
      toast.success('Document loaded successfully', { id: 'retry-load' });
    } catch (error) {
      console.error('Error retrying document load:', error);
      toast.error('Failed to reload document', { id: 'retry-load' });
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page); // page is now consistently 1-based from PdfViewer
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
          onQRExport={handleQRExport}
          onPDFQRExport={handlePDFQRExport}
          hasDocument={!!selectedDocument}
          isQRExporting={isQRExporting}
          isPDFQRExporting={isPDFQRExporting}
          qrCorner={qrCorner}
          onQRCornerChange={setQrCorner}
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
                documentId={selectedDocumentId}
                regions={selectedDocument?.regions || []}
                onRegionCreate={handleRegionCreate}
                onRegionUpdate={handleRegionUpdate}
                selectedRegionId={selectedRegionId}
                onRegionSelect={setSelectedRegionId}
                onRegionDelete={handleRegionDelete}
                isSelectionMode={!!currentSelectionType}
                currentSelectionType={currentSelectionType}
                onCurrentSelectionTypeChange={setCurrentSelectionType}
                onPageChange={handlePageChange}
              />
            )}
          </div>
          
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="fixed z-20 top-20 bg-background shadow-md border rounded-full"
              style={{ right: isSidebarCollapsed ? '16px' : '390px' }}
              onClick={toggleSidebar}
            >
              {isSidebarCollapsed ? <ChevronLeft /> : <ChevronRight />}
            </Button>
            
            <div className={`transition-all duration-300 ${isSidebarCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-[400px]'}`}>
              <div className="h-full">
                <Sidebar
                  selectedRegion={selectedDocument?.regions.find(r => r.id === selectedRegionId) || null}
                  regions={selectedDocument?.regions || []}
                  onRegionUpdate={handleRegionUpdate}
                  onRegionDelete={handleRegionDelete}
                  onRegionSelect={setSelectedRegionId}
                  documentId={selectedDocumentId}
                  currentPage={currentPage}
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
