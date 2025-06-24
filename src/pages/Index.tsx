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
import { decryptData } from '@/utils/crypto';
import { DocumentSettingsDialog } from '@/components/DocumentSettingsDialog';
import { useLanguage } from '@/contexts/LanguageContext';

const Index = () => {
  // ... keep existing code (state declarations and useDocumentState hook) the same

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
  const [isDrmDialogOpen, setIsDrmDialogOpen] = useState(false);
  const [documentVersion, setDocumentVersion] = useState(0);

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
  const { isRTL } = useLanguage();
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

  // ... keep existing code (loadDocuments function) the same

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
            id: doc.id,
            name: doc.name,
            user_id: doc.user_id || undefined,
            regions: typedRegions,
            is_private: doc.is_private,
            drm_protected_pages: doc.drm_protected_pages as (boolean | number[] | null),
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

  // ... keep existing code (handleFileUpload, handleFileChange, handleDocumentSelect, handleDocumentRename, handleDocumentDelete) the same

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length || !authState.user) return;

    // Wait for profile to be loaded before proceeding with upload
    if (!authState.profile) {
      toast.info('Your profile is loading, please try uploading again in a moment.');
      if (e.target) e.target.value = ''; // Clear the file input
      return;
    }

    const file = files[0];
    if (file.type !== 'application/pdf') {
      toast.error('Please select a PDF file');
      return;
    }
    
    const fileSizeLimit = 20 * 1024 * 1024; // 20MB
    if (file.size > fileSizeLimit) {
      toast.error(`File is too large. Maximum size is ${fileSizeLimit / 1024 / 1024}MB.`);
      return;
    }

    let documentId: string;
    try {
      documentId = await generateUniqueDocumentId(authState.user.id);
      console.log('Generated unique document ID:', documentId);
    } catch (error) {
      console.error('Failed to generate unique document ID:', error);
      toast.error('Failed to generate document ID. Please try again.');
      return;
    }
    
    try {
      const storageReady = await initializeStorage();
      if (!storageReady) {
        toast.error("Storage system is not available. Please try again later.", {
          id: "storage-error"
        });
        return;
      }

      toast.loading('Uploading PDF file...', { id: 'pdf-upload' });
      
      // Use flat path for backward compatibility (RLS policies allow this for document owners)
      const filePath = `${documentId}.pdf`;
      console.log(`Uploading PDF to storage path: ${filePath}`);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pdfs')
        .upload(filePath, file, { upsert: false }); // Set upsert to false to avoid accidental replacement

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        toast.error('Failed to upload PDF file: ' + uploadError.message, { id: 'pdf-upload' });
        return;
      }

      console.log('PDF uploaded successfully to storage:', uploadData);

      // This logic now only handles new document creation.
      console.log('Creating new document. Auth state profile:', authState.profile);
      const isSubscriber = !!authState.profile?.plan_id;
      console.log(`Is user a subscriber? ${isSubscriber}. Plan ID: ${authState.profile?.plan_id}`);
      const newDocument: DocumentData = {
        id: documentId,
        name: file.name,
        regions: [],
        is_private: isSubscriber,
        drm_protected_pages: null,
      };
      
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          id: newDocument.id,
          name: newDocument.name,
          user_id: authState.user.id,
          is_private: newDocument.is_private,
          drm_protected_pages: newDocument.drm_protected_pages
        });

      if (dbError) {
        console.error('Database insert error:', dbError);
        toast.error('Failed to save document information: ' + dbError.message, { id: 'pdf-upload' });
        
        console.log(`Rolling back storage upload for: ${filePath}`);
        await supabase.storage.from('pdfs').remove([filePath]);
        console.log(`Storage rollback complete.`);
        
        return;
      }

      setDocuments(prev => [...prev, newDocument]);
      setSelectedDocumentId(documentId);
      resetStates();
      setIsDocumentListCollapsed(false);
      
      toast.success('Document added successfully', { id: 'pdf-upload' });
      
      setRegionsCache(prev => ({ ...prev, [documentId]: [] }));

      setTimeout(syncMetadata, 1000);
    } catch (error) {
      console.error('Error uploading document:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast.error(`Failed to upload document: ${errorMessage}`, { id: 'pdf-upload' });
    } finally {
      if (e.target) e.target.value = '';
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

      // Try to delete from both possible storage paths for backward compatibility
      const pathsToTry = [
        `${documentId}.pdf`, // Flat path
        `${authState.user.id}/${documentId}.pdf` // User-specific path
      ];

      let storageDeleteSuccess = false;
      for (const path of pathsToTry) {
        console.log(`Trying to delete storage path: ${path}`);
        const { error: storageError } = await supabase.storage
          .from('pdfs')
          .remove([path]);

        if (!storageError) {
          console.log(`Successfully deleted storage path: ${path}`);
          storageDeleteSuccess = true;
          break;
        } else {
          console.log(`Failed to delete path ${path}:`, storageError);
        }
      }

      if (!storageDeleteSuccess) {
        console.warn('No storage files found to delete, but continuing with database cleanup');
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
  
  const handleVisibilityToggle = async () => {
    if (!selectedDocument || !authState.user) return;

    const newIsPrivate = !selectedDocument.is_private;
    
    // Subscriber check
    if (newIsPrivate && !authState.profile?.plan_id) {
        toast.error('You must be a subscriber to make documents private.');
        return;
    }

    try {
      const { error } = await supabase
        .from('documents')
        .update({ is_private: newIsPrivate })
        .eq('id', selectedDocument.id)
        .eq('user_id', authState.user.id);
        
      if (error) throw error;
      
      setDocuments(prev =>
        prev.map(doc =>
          doc.id === selectedDocument.id ? { ...doc, is_private: newIsPrivate } : doc
        )
      );

      toast.success(`Document is now ${newIsPrivate ? 'private' : 'public'}.`);
      
      // Trigger immediate metadata sync
      setTimeout(syncMetadata, 100);

    } catch(error) {
        console.error('Error toggling visibility:', error);
        toast.error('Failed to update visibility.');
    }
  };

  const handleDocumentSettingsUpdate = async (updates: Partial<Pick<DocumentData, 'drm_protected_pages'>>) => {
    if (!selectedDocumentId || !authState.user) return;

    try {
      const { error } = await supabase
        .from('documents')
        .update(updates)
        .eq('id', selectedDocumentId)
        .eq('user_id', authState.user.id);

      if (error) throw error;

      setDocuments(prev =>
        prev.map(doc =>
          doc.id === selectedDocumentId ? { ...doc, ...updates } : doc
        )
      );

      toast.success('DRM settings updated.');

      // Trigger immediate metadata sync
      setTimeout(syncMetadata, 100);
    } catch (error) {
      console.error('Error updating DRM settings:', error);
      toast.error('Failed to update DRM settings.');
    }
  };

  // ... keep existing code (handleRegionCreate, handleRegionUpdate, handleRegionDelete, handleExport) the same

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

  // ... keep existing code (QR export functions, retry functions, other handlers) the same

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
    if (!selectedDocument || !authState.user || !authState.session) {
      toast.error('No valid document selected or user not authenticated');
      return;
    }
    if (pageCount === 0) {
      toast.error('Unable to determine page count for this document');
      return;
    }
    setIsPDFQRExporting(true);

    try {
      toast.loading('Fetching PDF data...', { id: 'pdf-qr-export' });

      const supabaseUrl = 'https://bohxienpthilrfwktokd.supabase.co';
      const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvaHhpZW5wdGhpbHJmd2t0b2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2OTc3OTcsImV4cCI6MjA2MTI3Mzc5N30.4UO_pFmDauRz6Km5wTr3VHM95_GwyWKc1-pxGO1mImg';
      const functionUrl = `${supabaseUrl}/functions/v1/stream-pdf?document_id=${selectedDocument.id}&user_id=${authState.user.id}`;
      
      const headers = {
        'Cache-Control': 'no-store',
        'Authorization': `Bearer ${authState.session.access_token}`,
        'apikey': anonKey,
      };

      const response = await fetch(functionUrl, { headers });
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF for QR code embedding. Status: ${response.status}`);
      }

      toast.loading('Decrypting PDF data...', { id: 'pdf-qr-export' });
      const encryptedData = await response.arrayBuffer();
      const keyB64 = response.headers.get('X-Encryption-Key');
      const ivB64 = response.headers.get('X-Encryption-IV');

      if (!keyB64 || !ivB64) {
        throw new Error('Encryption key or IV not found in response headers.');
      }
      
      const decryptedData = await decryptData(encryptedData, keyB64, ivB64);

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

      // Pass decrypted data to embedQRCodeIntoPDF
      const modifiedPdfBytes = await embedQRCodeIntoPDF(
        decryptedData,
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
  
  // Get the correct chevron icon based on sidebar state and RTL direction
  const getSidebarChevronIcon = () => {
    if (isSidebarCollapsed) {
      // Sidebar is collapsed, show expand icon
      return isRTL ? ChevronRight : ChevronLeft;
    } else {
      // Sidebar is expanded, show collapse icon
      return isRTL ? ChevronLeft : ChevronRight;
    }
  };

  const ChevronIcon = getSidebarChevronIcon();
  
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
                key={`${selectedDocumentId}-${documentVersion}`}
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
                isPrivate={selectedDocument?.is_private ?? false}
                onVisibilityChange={handleVisibilityToggle}
                onDrmSettingsClick={() => setIsDrmDialogOpen(true)}
              />
            )}
          </div>
          
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="fixed z-20 top-20 bg-background shadow-md border rounded-full sidebar-toggle-rtl"
              style={{ [isRTL ? 'left' : 'right']: isSidebarCollapsed ? '16px' : '390px' }}
              onClick={toggleSidebar}
            >
              <ChevronIcon className="h-4 w-4" />
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
        <DocumentSettingsDialog
          open={isDrmDialogOpen}
          onOpenChange={setIsDrmDialogOpen}
          document={selectedDocument || null}
          user={authState.profile}
          pageCount={pageCount}
          onUpdate={handleDocumentSettingsUpdate}
        />
      </div>
    </ProtectedRoute>
  );
};

export default Index;
