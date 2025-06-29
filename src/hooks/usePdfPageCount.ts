
import { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { useAuth } from '@/contexts/AuthProvider';
import { pdfCacheService } from '@/services/pdfCacheService';

interface UsePdfPageCountProps {
  documentId: string | null;
}

export const usePdfPageCount = ({ documentId }: UsePdfPageCountProps) => {
  const { authState } = useAuth();
  const [pageCount, setPageCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId || !authState.user) {
      setPageCount(0);
      setError(null);
      return;
    }

    const getPageCount = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const cachedPdf = await pdfCacheService.getCachedPDF(documentId);
        let pdfData: ArrayBuffer;

        if (cachedPdf) {
          pdfData = cachedPdf;
        } else {
          // Updated to use new edge function endpoint with 'id' parameter
          const url = `https://bohxienpthilrfwktokd.supabase.co/functions/v1/stream-pdf?id=${documentId}`;
          const resp = await fetch(url, {
            headers: { 
              'Cache-Control': 'no-store',
              'Authorization': `Bearer ${authState.session?.access_token}`,
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvaHhpZW5wdGhpbHJmd2t0b2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2OTc3OTcsImV4cCI6MjA2MTI3Mzc5N30.4UO_pFmDauRz6Km5wTr3VHM95_GwyWKc1-pxGO1mImg'
            },
          });
          if (!resp.ok) throw new Error('Failed to fetch PDF');
          
          // No more encryption - directly use response data
          pdfData = await resp.arrayBuffer();
          await pdfCacheService.cachePDF(documentId, pdfData);
        }

        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        setPageCount(pdf.numPages);
      } catch (err) {
        console.error('Error getting PDF page count:', err);
        setError(err instanceof Error ? err.message : 'Failed to read PDF file');
        setPageCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    getPageCount();
  }, [documentId, authState.user, authState.session]);

  return { pageCount, isLoading, error };
};
