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
  const [currentPage, setCurrentPage] = useState(1); // Add current page state

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
          
          // PRIORITIZE CACHE: Try to get PDF from cache FIRST
          let pdfFile: File | null = await pdfCacheService.getCachedPDF(doc.id);
          let fileFound = !!pdfFile;
          
          if (pdfFile) {
            console.log(`Using cached PDF for document ${doc.name}`);
          } else {
            console.log(`PDF not in cache for document ${doc.name}, downloading...`);
            
            // Try multiple paths to download the file
            const filePaths = [
              `${authState.user.id}/${doc.id}.pdf`,
              `${doc.user_id || authState.user.id}/${doc.id}.pdf`,
              `public/${doc.id}.pdf`
            ];

            // Try each path with direct download
            for (const path of filePaths) {
              if (fileFound) continue;
              
              console.log(`Attempting to download PDF file directly: ${path}`);
              try {
                const { data: fileData, error: downloadError } = await supabase.storage
                  .from('pdfs')
                  .download(path);

                if (!downloadError && fileData) {
                  pdfFile = new File([fileData], doc.name, { type: 'application/pdf' });
                  fileFound = true;
                  
                  // Cache the PDF for future use
                  await pdfCacheService.cachePDF(doc.id, pdfFile);
                  console.log(`Successfully loaded and cached document ${doc.name} from ${path}`);
                  break;
                }
              } catch (downloadError) {
                console.warn(`Direct download failed for ${path}:`, downloadError);
              }
            }
            
            // If direct download failed, try with signed URLs
            if (!fileFound) {
              for (const path of filePaths) {
                if (fileFound) continue;
                
                try {
                  console.log(`Trying signed URL for: ${path}`);
                  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                    .from('pdfs')
                    .createSignedUrl(path, 3600);

                  if (!signedUrlError && signedUrlData?.signedUrl) {
                    try {
                      const response = await fetch(signedUrlData.signedUrl);
                      if (response.ok) {
                        const blob = await response.blob();
                        pdfFile = new File([blob], doc.name, { type: 'application/pdf' });
                        fileFound = true;
                        
                        // Cache the PDF for future use
                        await pdfCacheService.cachePDF(doc.id, pdfFile);
                        console.log(`Successfully loaded and cached document ${doc.name} with signed URL from ${path}`);
                        break;
                      }
                    } catch (fetchError) {
                      console.warn(`Fetch from signed URL failed for ${path}:`, fetchError);
                    }
                  }
                } catch (signedUrlError) {
                  console.warn(`Failed to get signed URL for ${path}:`, signedUrlError);
                }
              }
            }
          }
          
          // Add the document with or without the file
          const documentData: DocumentData = {
            ...doc,
            file: pdfFile || new File([], doc.name, { type: 'application/pdf' }),
            regions: typedRegions,
            fileAvailable: fileFound,
            uploadRequired: !fileFound
          };
          
          validDocuments.push(documentData);
          newCache[doc.id] = typedRegions;
          
          if (!fileFound) {
            documentWithIssues++;
          }
          
        } catch (docError) {
          console.error('Error processing document:', docError);
        }
      }

      setDocuments(validDocuments);
      setRegionsCache(newCache);
      setDocumentsLoaded(true);
      
      console.log("Processed documents:", validDocuments.length, "Documents with issues:", documentWithIssues);
      
      if (documentWithIssues > 0 && isInitialLoad) {
        toast.warning(`${documentWithIssues} document(s) have PDF access issues. You may need to re-upload them.`, {
          duration: 8000
        });
      }
      
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
    const reuploadDocId = selectedDocumentId && selectedDocument?.uploadRequired ? selectedDocumentId : null;
    const documentId = reuploadDocId || uuidv4();
    
    try {
      // Make sure storage is initialized
      await initializeStorage();

      toast.loading('Uploading PDF file...', { id: 'pdf-upload' });
      
      const filePath = `${authState.user.id}/${documentId}.pdf`;
      console.log(`Uploading PDF to ${filePath}`);
      
      const { error: uploadError } = await supabase.storage
        .from('pdfs')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        toast.error('Failed to upload PDF file: ' + uploadError.message, { id: 'pdf-upload' });
        return;
      }
      
      // Cache the uploaded file
      await pdfCacheService.cachePDF(documentId, file);
      
      if (reuploadDocId) {
        // Update existing document
        setDocuments(prev => 
          prev.map(doc => 
            doc.id === reuploadDocId 
              ? { ...doc, file, fileAvailable: true, uploadRequired: false } 
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
          file,
          regions: [],
          fileAvailable: true
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
    
    if (docToSelect && !docToSelect.fileAvailable) {
      toast.warning(`PDF file for "${docToSelect.name}" is not available. You may need to re-upload it.`, {
        action: {
          label: "Re-upload",
          onClick: () => {
            setSelectedDocumentId(documentId);
            fileInputRef.current?.click();
          }
        }
      });
    }
    
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
    setCurrentPage(1); // Reset to page 1 when switching documents
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

      // First try to delete from storage
      const { error: storageError } = await supabase.storage
        .from('pdfs')
        .remove([`${authState.user.id}/${documentId}.pdf`]);

      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
        toast.error('Failed to delete document from storage');
        return;
      }

      // Then delete from database
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
      
      // First check cache again
      let pdfFile = await pdfCacheService.getCachedPDF(selectedDocumentId);
      
      if (pdfFile) {
        console.log('Found document in cache during retry');
        setDocuments(prev => 
          prev.map(d => 
            d.id === selectedDocumentId ? { ...d, file: pdfFile!, fileAvailable: true, uploadRequired: false } : d
          )
        );
        toast.success('Document loaded from cache', { id: 'retry-load' });
        return;
      }
      
      const filePath = `${authState.user.id}/${selectedDocumentId}.pdf`;
      
      // Try direct download first
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('pdfs')
        .download(filePath);
        
      if (downloadError || !fileData) {
        console.warn(`Direct retry download failed:`, downloadError);
        
        // Try with signed URL as fallback
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('pdfs')
          .createSignedUrl(filePath, 3600);
          
        if (signedUrlError || !signedUrlData?.signedUrl) {
          toast.error('PDF file still not accessible. Please try re-uploading.', { id: 'retry-load' });
          return;
        }
        
        const response = await fetch(signedUrlData.signedUrl);
        if (!response.ok) {
          toast.error('Failed to fetch PDF. Please try re-uploading.', { id: 'retry-load' });
          return;
        }
        
        const blob = await response.blob();
        pdfFile = new File([blob], doc.name, { type: 'application/pdf' });
      } else {
        // Direct download succeeded
        pdfFile = new File([fileData], doc.name, { type: 'application/pdf' });
      }
      
      // Cache the successfully loaded file
      await pdfCacheService.cachePDF(selectedDocumentId, pdfFile);
      
      // Update document with file
      setDocuments(prev => 
        prev.map(d => 
          d.id === selectedDocumentId ? { ...d, file: pdfFile!, fileAvailable: true, uploadRequired: false } : d
        )
      );
      
      toast.success('Document loaded successfully', { id: 'retry-load' });
    } catch (error) {
      console.error('Error retrying document load:', error);
      toast.error('Failed to reload document', { id: 'retry-load' });
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
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
          hasDocument={!!selectedDocument && selectedDocument.fileAvailable}
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
            ) : selectedDocument && !selectedDocument.fileAvailable ? (
              <div className="flex flex-col items-center justify-center h-full p-4">
                <Alert className="max-w-md mb-4 bg-amber-50 border-amber-300">
                  <AlertTitle className="text-amber-800">PDF File Not Available</AlertTitle>
                  <AlertDescription className="text-amber-700">
                    The PDF file for "{selectedDocument.name}" could not be accessed. 
                    This can happen when accessing your documents from a new device.
                  </AlertDescription>
                </Alert>
                
                <div className="flex gap-4 mt-4">
                  <Button 
                    onClick={handleRetryLoadDocument} 
                    variant="outline"
                    disabled={retryCount[selectedDocumentId] > 2}
                  >
                    Retry Loading
                  </Button>
                  
                  <Button onClick={() => fileInputRef.current?.click()}>
                    Re-upload PDF
                  </Button>
                </div>
                
                <p className="mt-8 text-sm text-muted-foreground max-w-md text-center">
                  All your region data is still available and will be reconnected when the PDF is uploaded again.
                </p>
              </div>
            ) : (
              <PdfViewer
                file={selectedDocument?.fileAvailable ? selectedDocument.file : null}
                regions={selectedDocument?.regions || []}
                onRegionCreate={handleRegionCreate}
                onRegionUpdate={handleRegionUpdate}
                selectedRegionId={selectedRegionId}
                onRegionSelect={setSelectedRegionId}
                onRegionDelete={handleRegionDelete}
                isSelectionMode={!!currentSelectionType}
                currentSelectionType={currentSelectionType}
                onCurrentSelectionTypeChange={setCurrentSelectionType}
                documentId={selectedDocumentId}
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
