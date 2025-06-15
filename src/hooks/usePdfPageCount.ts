
import { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

interface UsePdfPageCountProps {
  documentId: string | null;
}

export const usePdfPageCount = ({ documentId }: UsePdfPageCountProps) => {
  const [pageCount, setPageCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) {
      setPageCount(0);
      setError(null);
      return;
    }

    const getPageCount = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch PDF via edge function as ArrayBuffer
        const resp = await fetch(`/functions/v1/stream-pdf?document_id=${documentId}`, {
          headers: { 'Cache-Control': 'no-store' },
        });
        if (!resp.ok) throw new Error('Failed to fetch PDF');
        const arrayBuffer = await resp.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        setPageCount(pdf.numPages);
      } catch (err) {
        console.error('Error getting PDF page count:', err);
        setError('Failed to read PDF file');
        setPageCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    getPageCount();
  }, [documentId]);

  return { pageCount, isLoading, error };
};
