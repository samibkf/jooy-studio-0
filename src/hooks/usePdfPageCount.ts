
import { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

interface UsePdfPageCountProps {
  file: File | null;
}

export const usePdfPageCount = ({ file }: UsePdfPageCountProps) => {
  const [pageCount, setPageCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPageCount(0);
      setError(null);
      return;
    }

    const getPageCount = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
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
  }, [file]);

  return { pageCount, isLoading, error };
};
