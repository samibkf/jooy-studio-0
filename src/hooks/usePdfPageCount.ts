
import { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { useAuth } from '@/contexts/AuthProvider';

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
        // Include user ID in the request
        const url = `/functions/v1/stream-pdf?document_id=${documentId}&user_id=${authState.user.id}`;
        const resp = await fetch(url, {
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
  }, [documentId, authState.user]);

  return { pageCount, isLoading, error };
};
