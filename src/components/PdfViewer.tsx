import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocumentProxy } from 'pdfjs-dist';
import { Region } from '@/types/regions';
import RegionOverlay from './RegionOverlay';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PdfViewerProps {
  file: File | null;
  regions: Region[];
  onRegionCreate: (region: Omit<Region, 'id'>) => void;
  onRegionUpdate: (region: Region) => void;
  selectedRegionId: string | null;
  onRegionSelect: (regionId: string | null) => void;
  isSelectionMode: boolean;
  currentSelectionType: 'area' | null;
}

const PdfViewer: React.FC<PdfViewerProps> = ({
  file,
  regions,
  onRegionCreate,
  onRegionUpdate,
  selectedRegionId,
  onRegionSelect,
  isSelectionMode,
  currentSelectionType,
}) => {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selectionRect, setSelectionRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getNextRegionNumber = (pageNumber: number): number => {
    const pageRegions = regions.filter(region => region.page === pageNumber);
    
    if (pageRegions.length === 0) {
      return 1;
    }
    
    const regionNumbers = pageRegions
      .map(region => {
        const parts = region.name.split('_');
        return parts.length > 1 ? parseInt(parts[1], 10) : 0;
      })
      .filter(num => !isNaN(num));
    
    return Math.max(...regionNumbers, 0) + 1;
  };

  useEffect(() => {
    if (!file) return;
    
    const loadPdf = async () => {
      try {
        const fileArrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: fileArrayBuffer });
        const pdfDocument = await loadingTask.promise;
        
        setPdf(pdfDocument);
        setTotalPages(pdfDocument.numPages);
        setCurrentPage(0);
        
        toast.success(`PDF loaded with ${pdfDocument.numPages} pages`);
      } catch (error) {
        console.error('Error loading PDF:', error);
        toast.error('Failed to load PDF');
      }
    };
    
    loadPdf();
  }, [file]);
  
  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
    
    const renderPage = async () => {
      try {
        const page = await pdf.getPage(currentPage + 1);
        const viewport = page.getViewport({ scale });
        
        const canvas = canvasRef.current!;
        const canvasContext = canvas.getContext('2d');
        
        if (!canvasContext) return;
        
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
  }, [pdf, currentPage, scale]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isSelectionMode || !containerRef.current || currentSelectionType !== 'area') return;
    
    setIsSelecting(true);
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setSelectionStart({ x, y });
    setSelectionRect({ x, y, width: 0, height: 0 });
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setSelectionRect({
      x: Math.min(x, selectionStart.x),
      y: Math.min(y, selectionStart.y),
      width: Math.abs(x - selectionStart.x),
      height: Math.abs(y - selectionStart.y)
    });
  };
  
  const handleMouseUp = () => {
    if (!isSelecting) return;
    
    setIsSelecting(false);
    
    if (selectionRect.width > 10 && selectionRect.height > 10) {
      const nextNumber = getNextRegionNumber(currentPage + 1);
      const regionName = `${currentPage + 1}_${nextNumber}`;
      
      const newRegion: Omit<Region, 'id'> = {
        page: currentPage + 1,
        x: selectionRect.x,
        y: selectionRect.y,
        width: selectionRect.width,
        height: selectionRect.height,
        type: 'area',
        name: regionName,
        description: ''
      };
      
      onRegionCreate(newRegion);
      toast.success('Area region created');
      
      setSelectionRect({ x: 0, y: 0, width: 0, height: 0 });
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
      window.getSelection()?.removeAllRanges();
    }
  };
  
  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
      window.getSelection()?.removeAllRanges();
    }
  };
  
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 3.0));
  };
  
  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.5));
  };

  const pageRegions = regions.filter(region => region.page === currentPage + 1);

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-72px)] bg-muted">
        <div className="text-center p-10">
          <h2 className="text-2xl font-bold mb-2">No PDF Document Loaded</h2>
          <p className="text-muted-foreground">
            Please upload a PDF document to get started
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-[calc(100vh-72px)] bg-muted">
      <div className="bg-white border-b border-gray-200 p-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePrevPage}
            disabled={currentPage <= 0}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {currentPage + 1} of {totalPages}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleNextPage}
            disabled={currentPage >= totalPages - 1}
          >
            Next
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
          >
            -
          </Button>
          <span className="text-sm w-16 text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleZoomIn}
            disabled={scale >= 3}
          >
            +
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4">
        <div 
          ref={containerRef}
          className={`pdf-page relative mx-auto ${
            currentSelectionType === 'area' ? 'cursor-crosshair' : ''
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <canvas ref={canvasRef} className="absolute top-0 left-0" />
          
          {pageRegions.map((region) => (
            <RegionOverlay
              key={region.id}
              region={region}
              isSelected={region.id === selectedRegionId}
              onSelect={() => onRegionSelect(region.id)}
              onUpdate={onRegionUpdate}
              scale={scale}
            />
          ))}
          
          {isSelecting && (
            <div 
              className="region-selection"
              style={{
                left: selectionRect.x,
                top: selectionRect.y,
                width: selectionRect.width,
                height: selectionRect.height
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PdfViewer;
