import React, { useState, useCallback, useRef, useEffect } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import PdfViewer from '@/components/PdfViewer';
import { DocumentData } from '@/types/documents';
import { Region } from '@/types/regions';
import { useTextAssignment } from '@/contexts/TextAssignmentContext';
import { useAuth } from '@/contexts/AuthProvider';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { exportToCSV } from '@/utils/exportUtils';
import { useDocumentState } from '@/hooks/useDocumentState';
import { useMetadataSync } from '@/hooks/useMetadataSync';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { pdfCacheService } from '@/services/pdfCacheService';
import { generateUniqueDocumentId } from '@/utils/documentIdUtils';
import { uploadMetadata, updateMetadata, deleteMetadata, generateMetadata } from '@/utils/metadataUtils';

const Index = () => {
  const [document, setDocument] = useState<DocumentData | null>(null);
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const pdfViewerRef = useRef<any>(null);
  const { setTitledTexts, resetAssignments, getCurrentDocumentTexts } = useTextAssignment();
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const {
    selectedRegionId,
    setSelectedRegionId,
    currentSelectionType,
    setCurrentSelectionType,
    isSelectionMode,
    setIsSelectionMode,
    regionsCache,
    setRegionsCache,
    resetStates
  } = useDocumentState(document?.id || null);
  
  // Fix the useMetadataSync hook call - pass the correct props object
  useMetadataSync({
    documentId: document?.id || null,
    regions: regionsCache[document?.id || ''] || [],
    documentName: document?.name
  });

  // Load documents on user authentication
  useEffect(() => {
    const loadDocuments = async () => {
      if (authState.user) {
        try {
          const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('user_id', authState.user.id);

          if (error) {
            console.error("Error fetching documents:", error);
            toast.error("Failed to load documents.");
            return;
          }

          if (data && data.length > 0) {
            const documentsWithFileAvailability = await Promise.all(
              data.map(async (doc) => {
                try {
                  // Check if the PDF file exists in storage
                  const { data: fileData } = await supabase.storage
                    .from('pdfs')
                    .getPublicUrl(`${doc.id}.pdf`);

                  if (!fileData?.publicUrl) {
                    console.warn(`File not found in storage for document ${doc.id}`);
                    return {
                      ...doc,
                      fileAvailable: false,
                      uploadRequired: true,
                      lastAttemptedAccess: new Date(),
                    };
                  }

                  // Check if the file is cached - use correct method name
                  const cachedFile = await pdfCacheService.getCachedPDF(doc.id);
                  if (!cachedFile) {
                    return {
                      ...doc,
                      fileAvailable: true,
                      uploadRequired: true,
                      lastAttemptedAccess: new Date(),
                    };
                  }

                  return {
                    ...doc,
                    fileAvailable: true,
                    uploadRequired: false,
                    lastAttemptedAccess: new Date(),
                  };
                } catch (fileCheckError) {
                  console.error(`Error checking file availability for document ${doc.id}:`, fileCheckError);
                  return {
                    ...doc,
                    fileAvailable: false,
                    uploadRequired: true,
                    lastAttemptedAccess: new Date(),
                  };
                }
              })
            );

            const typedDocuments = documentsWithFileAvailability.map(doc => ({
              id: doc.id,
              name: doc.name,
              file: null, // No File object available at this stage
              regions: [], // Regions will be loaded separately
              user_id: doc.user_id,
              fileAvailable: doc.fileAvailable,
              uploadRequired: doc.uploadRequired,
              lastAttemptedAccess: doc.lastAttemptedAccess,
            })) as DocumentData[];

            setDocuments(typedDocuments);

            // Select the first document if available
            if (typedDocuments.length > 0) {
              setDocument(typedDocuments[0]);
            }
          } else {
            setDocuments([]);
            setDocument(null);
          }
        } catch (error) {
          console.error("Unexpected error loading documents:", error);
          toast.error("Failed to load documents due to an unexpected error.");
        }
      }
    };

    loadDocuments();
  }, [authState.user]);

  // Load regions when document changes
  useEffect(() => {
    const loadRegions = async () => {
      if (document?.id) {
        try {
          const { data: regions, error } = await supabase
            .from('document_regions')
            .select('*')
            .eq('document_id', document.id);

          if (error) {
            console.error("Error fetching regions:", error);
            toast.error("Failed to load regions for this document.");
            return;
          }

          // Convert generic objects to Region type
          const typedRegions = regions?.map(region => ({
            id: region.id,
            document_id: region.document_id,
            user_id: region.user_id,
            page: region.page,
            name: region.name,
            description: region.description,
            type: region.type,
            x: region.x,
            y: region.y,
            width: region.width,
            height: region.height,
            created_at: region.created_at,
          })) as Region[];

          setRegionsCache(prev => ({ ...prev, [document.id]: typedRegions }));
        } catch (error) {
          console.error("Unexpected error loading regions:", error);
          toast.error("Failed to load regions due to an unexpected error.");
        }
      } else {
        setRegionsCache({});
      }
    };

    loadRegions();
  }, [document?.id]);

  const handleDocumentSelect = (doc: DocumentData) => {
    console.log(`Selected document: ${doc.name} (ID: ${doc.id})`);
    setDocument(doc);
    resetStates();
  };

  const handleUploadClick = () => {
    setIsUploadModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsUploadModalOpen(false);
    setUploadError(null); // Clear any previous upload errors
  };

  const handleFileUpload = async (file: File, documentName: string) => {
    if (!authState.user) {
      console.error('User not authenticated.');
      toast.error('You must be logged in to upload files.');
      setIsUploadModalOpen(false);
      return;
    }

    setIsUploadModalOpen(false); // Close the modal immediately

    try {
      // Generate a unique document ID
      const documentId = await generateUniqueDocumentId(authState.user.id);

      // Optimistically update the UI
      const newDocument: DocumentData = {
        id: documentId,
        name: documentName,
        file: file,
        regions: [],
        user_id: authState.user.id,
        fileAvailable: true, // Assume file is available
        uploadRequired: false, // No re-upload required
        lastAttemptedAccess: new Date(), // Track the last access attempt
      };

      setDocuments(prevDocuments => [...prevDocuments, newDocument]);
      setDocument(newDocument);

      // Upload metadata first - pass the document ID as string
      await uploadMetadata(documentId, authState.user.id, documentId);

      // Upload the PDF file
      const { error: uploadError } = await supabase.storage
        .from('pdfs')
        .upload(`${documentId}.pdf`, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("Error uploading PDF to storage:", uploadError);
        setUploadError("Failed to upload the PDF file. Please try again.");

        // Revert the UI update on failure
        setDocuments(prevDocuments => prevDocuments.filter(doc => doc.id !== documentId));
        setDocument(null);

        // Delete metadata on failure
        await deleteMetadata(documentId, authState.user.id);

        toast.error("Failed to upload the PDF file. Please try again.");
        return;
      }

      // Store the document in the database
      const { error: dbError } = await supabase
        .from('documents')
        .insert([
          { id: documentId, name: documentName, user_id: authState.user.id }
        ]);

      if (dbError) {
        console.error("Error saving document metadata to database:", dbError);
        setUploadError("Failed to save document metadata. Please try again.");

        // Revert the UI update on failure
        setDocuments(prevDocuments => prevDocuments.filter(doc => doc.id !== documentId));
        setDocument(null);

        // Delete file and metadata on failure
        await supabase.storage.from('pdfs').remove([`${documentId}.pdf`]);
        await deleteMetadata(documentId, authState.user.id);

        toast.error("Failed to save document metadata. Please try again.");
        return;
      }

      // Generate initial metadata - pass the document object as first parameter
      await generateMetadata(newDocument, authState.user.id, documentId);

      toast.success(`${documentName} uploaded successfully!`);
    } catch (error) {
      console.error("Unexpected error during file upload:", error);
      setUploadError("An unexpected error occurred during file upload. Please try again.");

      // Generate a new documentId for error handling (since it might not be defined in catch block)
      const errorDocumentId = await generateUniqueDocumentId(authState.user.id);
      
      // Revert the UI update on failure
      setDocuments(prevDocuments => prevDocuments.filter(doc => doc.id !== errorDocumentId));
      setDocument(null);

      // Delete file and metadata on failure
      await supabase.storage.from('pdfs').remove([`${errorDocumentId}.pdf`]);
      await deleteMetadata(errorDocumentId, authState.user.id);

      toast.error("An unexpected error occurred during file upload. Please try again.");
    }
  };

  const handleExport = useCallback(async () => {
    if (!document) {
      toast.error("No document selected.");
      return;
    }

    try {
      const regions = regionsCache[document.id] || [];
      const texts = getCurrentDocumentTexts(document.id);

      // Prepare data for CSV export
      const csvData = regions.map(region => {
        const assignedText = texts.find(text => text.assignedRegionId === region.id);
        return {
          regionId: region.id,
          regionName: region.name,
          regionDescription: region.description || '',
          textTitle: assignedText?.title || '',
          textContent: assignedText?.content || ''
        };
      });

      // Export to CSV
      exportToCSV(csvData, document.name);
      toast.success("Data exported to CSV successfully!");
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error("Failed to export data.");
    }
  }, [document, regionsCache, getCurrentDocumentTexts]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      resetAssignments();
      navigate('/auth');
      toast.success('Signed out successfully!');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out.');
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleRegionSelect = (regionId: string) => {
    setSelectedRegionId(regionId);
  };

  const handleRegionCreate = (region: Omit<Region, 'id'>) => {
    // Implementation for creating a new region
    console.log('Creating region:', region);
  };

  const handleRegionUpdate = (region: Region) => {
    // Implementation for updating a region
    console.log('Updating region:', region);
  };

  const handleRegionDelete = (regionId: string) => {
    // Implementation for deleting a region
    console.log('Deleting region:', regionId);
  };

  const handlePageChange = (page: number) => {
    console.log('Page changed to:', page);
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen">
        <Header
          onUploadClick={handleUploadClick}
          onExport={handleExport}
          hasDocument={!!document}
          user={authState.profile}
          onSignOut={handleSignOut}
        />

        {uploadError && (
          <Alert variant="destructive">
            <AlertTitle>Upload Error</AlertTitle>
            <AlertDescription>{uploadError}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-grow">
          <Sidebar
            selectedRegion={regionsCache[document?.id || '']?.find(r => r.id === selectedRegionId) || null}
            regions={regionsCache[document?.id || ''] || []}
            onRegionUpdate={handleRegionUpdate}
            onRegionDelete={handleRegionDelete}
            onRegionSelect={handleRegionSelect}
            documentId={document?.id || null}
            currentPage={1}
          />

          <div className="flex-grow flex items-center justify-center">
            {document ? (
              <PdfViewer
                file={document.file}
                regions={regionsCache[document.id] || []}
                onRegionCreate={handleRegionCreate}
                onRegionUpdate={handleRegionUpdate}
                selectedRegionId={selectedRegionId}
                onRegionSelect={handleRegionSelect}
                onRegionDelete={handleRegionDelete}
                isSelectionMode={isSelectionMode}
                currentSelectionType={currentSelectionType}
                onCurrentSelectionTypeChange={setCurrentSelectionType}
                documentId={document.id}
                onPageChange={handlePageChange}
              />
            ) : (
              <div className="text-gray-500">No document selected. Please upload or select a document.</div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Index;
