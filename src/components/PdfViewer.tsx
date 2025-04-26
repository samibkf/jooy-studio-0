
import React, { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocumentProxy } from 'pdfjs-dist';
import { Region } from '@/types/regions';
import RegionOverlay from './RegionOverlay';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, MousePointer } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { TooltipProvider, TooltipTrigger, TooltipContent, Tooltip } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PdfViewerProps {
  file: File | null;
  regions: Region[];
  onRegionCreate: (region: Omit<Region, 'id'>) => void;
  onRegionUpdate: (region: Region) => void;
  selectedRegionId: string | null;
  onRegionSelect: (regionId: string | null) => void;
  onRegionDelete: (regionId: string) => void;
  isSelectionMode: boolean;
  currentSelectionType: 'area' | null;
  onCurrentSelectionTypeChange: (type: 'area' | null) => void;
}

const PdfViewer: React.FC<PdfViewerProps> = ({
  file,
  regions,
  onRegionCreate,
  onRegionUpdate,
  selectedRegionId,
  onRegionSelect,
  onRegionDelete,
  isSelectionMode,
  currentSelectionType,
  onCurrentSelectionTypeChange,
}) => {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selectionRect, setSelectionRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [selectionPoint, setSelectionPoint] = useState<{ x: number, y: number } | null>(null);
  const [isDoubleClickMode, setIsDoubleClickMode] = useState(false);
  const [preventCreateRegion, setPreventCreateRegion] = useState(false);
  const [isTemporarilyBlocked, setIsTemporarilyBlocked] = useState(false);
  const [creationTimeoutId, setCreationTimeoutId] = useState<number | null>(null);
  
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && 
          selectedRegionId && 
          document.activeElement instanceof HTMLElement && 
          !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        onRegionDelete(selectedRegionId);
        toast.success('Region deleted');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRegionId, onRegionDelete]);

  // Clear the timeout when component unmounts
  useEffect(() => {
    return () => {
      if (creationTimeoutId !== null) {
        window.clearTimeout(creationTimeoutId);
      }
    };
  }, [creationTimeoutId]);

  const createRegion = (rect: { x: number, y: number, width: number, height: number }) => {
    if (rect.width > 10 && rect.height > 10) {
      const nextNumber = getNextRegionNumber(currentPage + 1);
      const regionName = `${currentPage + 1}_${nextNumber}`;
      
      const newRegion: Omit<Region, 'id'> = {
        page: currentPage + 1,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        type: 'area',
        name: regionName,
        description: ''
      };
      
      // Create region
      onRegionCreate(newRegion);
      
      // Block further region creation temporarily
      setIsTemporarilyBlocked(true);
      const timeoutId = window.setTimeout(() => {
        setIsTemporarilyBlocked(false);
      }, 500);
      
      setCreationTimeoutId(timeoutId);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((!isSelectionMode && !isDoubleClickMode) || !containerRef.current || isTemporarilyBlocked) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (selectionPoint) {
      const currentRect = {
        x: selectionRect.x,
        y: selectionRect.y,
        width: selectionRect.width,
        height: selectionRect.height
      };
      
      // Reset selection
      setSelectionRect({ x: 0, y: 0, width: 0, height: 0 });
      setSelectionPoint(null);
      setIsSelecting(false);
      setIsDoubleClickMode(false);
      
      // Create region outside of the render flow
      createRegion(currentRect);
    } else {
      setSelectionPoint({ x, y });
      setSelectionRect({ x, y, width: 0, height: 0 });
      setIsSelecting(true);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!containerRef.current || isTemporarilyBlocked) return;
    
    if (isSelectionMode) {
      setIsDoubleClickMode(false);
      setSelectionPoint(null);
      setSelectionRect({ x: 0, y: 0, width: 0, height: 0 });
      setIsSelecting(false);
      onCurrentSelectionTypeChange(null);
      return;
    }
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDoubleClickMode(true);
    setSelectionPoint({ x, y });
    setSelectionRect({ x, y, width: 0, height: 0 });
    setIsSelecting(true);
    onCurrentSelectionTypeChange('area');
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || !containerRef.current || !selectionPoint) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setSelectionRect({
      x: Math.min(x, selectionPoint.x),
      y: Math.min(y, selectionPoint.y),
      width: Math.abs(x - selectionPoint.x),
      height: Math.abs(y - selectionPoint.y)
    });
  };
  
  const handleMouseUp = () => {
    return;
  };

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
      window.getSelection()?.removeAllRanges();
      setSelectionPoint(null);
      setSelectionRect({ x: 0, y: 0, width: 0, height: 0 });
      setIsSelecting(false);
      setPreventCreateRegion(false);
      setIsDoubleClickMode(false);
    }
  };
  
  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
      window.getSelection()?.removeAllRanges();
      setSelectionPoint(null);
      setSelectionRect({ x: 0, y: 0, width: 0, height: 0 });
      setIsSelecting(false);
      setPreventCreateRegion(false);
      setIsDoubleClickMode(false);
    }
  };
  
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 3.0));
  };
  
  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.5));
  };

  const handleEscKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && selectionPoint) {
      setSelectionPoint(null);
      setSelectionRect({ x: 0, y: 0, width: 0, height: 0 });
      setIsSelecting(false);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [selectionPoint]);

  const pageRegions = regions.filter(region => region.page === currentPage + 1);

  useEffect(() => {
    setPreventCreateRegion(false);
  }, [currentPage]);

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
    <div className="flex flex-col h-full w-full">
      <div className="bg-white border-b border-gray-200 p-2 w-full sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-[1200px] mx-auto">
          <div className="flex items-center space-x-6">
            <div className="flex items-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Toggle
                      pressed={currentSelectionType === 'area'}
                      onPressedChange={() => onCurrentSelectionTypeChange(currentSelectionType === 'area' ? null : 'area')}
                      aria-label="Toggle area selection tool"
                      className={`${currentSelectionType === 'area' ? 'bg-blue-100 ring-2 ring-primary' : ''}`}
                    >
                      <MousePointer className="h-4 w-4" />
                      <span className="sr-only">Area Selection</span>
                    </Toggle>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Draw custom area regions</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="icon"
                onClick={handlePrevPage}
                disabled={currentPage <= 0}
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Previous page</span>
              </Button>
              <span className="text-sm min-w-[100px] text-center">
                Page {currentPage + 1} of {totalPages}
              </span>
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleNextPage}
                disabled={currentPage >= totalPages - 1}
              >
                <ArrowRight className="h-4 w-4" />
                <span className="sr-only">Next page</span>
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
        </div>
      </div>
      
      <ScrollArea className="flex-1 w-full h-[calc(100%-72px)]">
        <div className="flex justify-center p-4">
          <div 
            ref={containerRef}
            className={`pdf-page relative ${
              currentSelectionType === 'area' || isDoubleClickMode ? 'cursor-crosshair' : ''
            }`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleClick}
          >
            <canvas ref={canvasRef} style={{ display: 'block' }} />
            
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
                  height: selectionRect.height,
                  position: 'absolute',
                  border: '2px solid #2563eb',
                  backgroundColor: 'rgba(37, 99, 235, 0.1)',
                  pointerEvents: 'none'
                }}
              />
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default PdfViewer;
