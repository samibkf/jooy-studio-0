
import { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocumentProxy } from 'pdfjs-dist';
import { toast } from 'sonner';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface UsePdfLoaderProps {
  file: File | null;
  canvasContext: CanvasRenderingContext2D | null;
  currentPage: number;
  scale: number;
}

export const usePdfLoader = ({ file, canvasContext, currentPage, scale }: UsePdfLoaderProps) => {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return;
    
    const loadPdf = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        
        // Validate file size
        if (!file.size || file.size === 0) {
          throw new Error("The PDF file is empty (0 bytes). Please select a valid PDF file.");
        }
        
        // Additional validation - check file type
        if (file.type !== 'application/pdf') {
          throw new Error("Invalid file format. Please select a PDF document.");
        }
        
        console.log("Loading PDF file:", file.name, "Size:", file.size, "bytes");
        
        // Read file as ArrayBuffer
        const fileArrayBuffer = await file.arrayBuffer();
        
        // Check PDF signature in the first few bytes
        const uint8Array = new Uint8Array(fileArrayBuffer).slice(0, 5);
        const signature = new TextDecoder().decode(uint8Array);
        if (!signature.startsWith('%PDF')) {
          throw new Error("Invalid PDF format. The file does not appear to be a valid PDF.");
        }
        
        // Load PDF document
        const loadingTask = pdfjsLib.getDocument({ data: fileArrayBuffer });
        const pdfDocument = await loadingTask.promise;
        
        setPdf(pdfDocument);
        setTotalPages(pdfDocument.numPages);
        
        toast.success(`PDF loaded with ${pdfDocument.numPages} pages`);
        console.log(`PDF successfully loaded with ${pdfDocument.numPages} pages`);
      } catch (error) {
        console.error('Error loading PDF:', error);
        let errorMessage = "Failed to load PDF";
        
        if (error instanceof Error) {
          errorMessage += `: ${error.message}`;
        }
        
        setLoadError(errorMessage);
        toast.error(errorMessage);
        setPdf(null);
        setTotalPages(0);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPdf();
    
    return () => {
      if (pdf) {
        pdf.destroy().catch(e => console.error('Error destroying PDF document:', e));
      }
    };
  }, [file]);

  useEffect(() => {
    if (!pdf || !canvasContext) return;
    
    const renderPage = async () => {
      try {
        const page = await pdf.getPage(currentPage + 1);
        const viewport = page.getViewport({ scale });
        
        const canvas = canvasContext.canvas;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({
          canvasContext,
          viewport
        }).promise;
      } catch (error) {
        console.error('Error rendering page:', error);
        toast.error('Failed to render page');
      }
    };
    
    renderPage();
  }, [pdf, currentPage, scale, canvasContext]);

  return {
    pdf,
    totalPages,
    isLoading,
    loadError
  };
};
