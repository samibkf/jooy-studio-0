import React, { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocumentProxy } from 'pdfjs-dist';
import { Region } from '@/types/regions';
import RegionOverlay from './RegionOverlay';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, MousePointer, Copy } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { TooltipProvider, TooltipTrigger, TooltipContent, Tooltip } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PdfViewerProps {
  documentId: string | null;
  regions: Region[];
  onRegionCreate: (region: Omit<Region, 'id'>) => void;
  onRegionUpdate: (region: Region) => void;
  selectedRegionId: string | null;
  onRegionSelect: (regionId: string | null) => void;
  onRegionDelete: (regionId: string) => void;
  isSelectionMode: boolean;
  currentSelectionType: 'area' | null;
  onCurrentSelectionTypeChange: (type: 'area' | null) => void;
  onPageChange?: (page: number) => void;
}

const PdfViewer: React.FC<PdfViewerProps> = ({
  documentId,
  regions,
  onRegionCreate,
  onRegionUpdate,
  selectedRegionId,
  onRegionSelect,
  onRegionDelete,
  isSelectionMode,
  currentSelectionType,
  onCurrentSelectionTypeChange,
  onPageChange
}) => {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({
    x: 0,
    y: 0
  });
  const [selectionRect, setSelectionRect] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0
  });
  const [selectionPoint, setSelectionPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isDoubleClickMode, setIsDoubleClickMode] = useState(false);
  const [preventCreateRegion, setPreventCreateRegion] = useState(false);
  const [isTemporarilyBlocked, setIsTemporarilyBlocked] = useState(false);
  const [creationTimeoutId, setCreationTimeoutId] = useState<number | null>(null);
  const [isCopyingPage, setIsCopyingPage] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageInputValue, setPageInputValue] = useState('');
  
  const getNextRegionNumber = (pageNumber: number): number => {
    const pageRegions = regions.filter(region => region.page === pageNumber);
    if (pageRegions.length === 0) {
      return 1;
    }
    const regionNumbers = pageRegions.map(region => {
      const parts = region.name.split('_');
      return parts.length > 1 ? parseInt(parts[1], 10) : 0;
    }).filter(num => !isNaN(num));
    return Math.max(...regionNumbers, 0) + 1;
  };
  
  // Track loading state and error for fetching PDF
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Use effect to fetch PDF via stream when the documentId changes
  useEffect(() => {
    if (!documentId) return;
    setLoading(true);
    setLoadError(null);
    const fetchAndLoadPdf = async () => {
      try {
        const res = await fetch(`/functions/v1/stream-pdf?document_id=${documentId}`, {
          headers: {
            // Additional anti-caching (helps prevent download-detection)
            'Cache-Control': 'no-store'
          }
        });
        if (!res.ok) {
          setLoadError('Failed to fetch PDF');
          setLoading(false);
          return;
        }
        // As ArrayBuffer
        const arrayBuffer = await res.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdfDocument = await loadingTask.promise;
        setPdf(pdfDocument);
        setTotalPages(pdfDocument.numPages);
        setCurrentPage(1);
        toast.success(`PDF loaded with ${pdfDocument.numPages} pages`);
      } catch (error) {
        setLoadError('Failed to load PDF');
        toast.error('Failed to load PDF');
        setPdf(null);
      }
      setLoading(false);
    };
    fetchAndLoadPdf();
  }, [documentId]);
  
  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
    const renderPage = async () => {
      try {
        const page = await pdf.getPage(currentPage); // currentPage is now 1-based, matching PDF.js expectation
        const viewport = page.getViewport({
          scale
        });
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
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedRegionId && document.activeElement instanceof HTMLElement && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
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
  
  const createRegion = (rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => {
    if (rect.width > 10 && rect.height > 10) {
      const nextNumber = getNextRegionNumber(currentPage); // currentPage is now 1-based
      const regionName = `${currentPage}_${nextNumber}`;
      const newRegion: Omit<Region, 'id'> = {
        page: currentPage, // Use currentPage directly (1-based)
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
    if (!isSelectionMode && !isDoubleClickMode || !containerRef.current || isTemporarilyBlocked) return;
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
      setSelectionRect({
        x: 0,
        y: 0,
        width: 0,
        height: 0
      });
      setSelectionPoint(null);
      setIsSelecting(false);
      setIsDoubleClickMode(false);
      
      // Create region outside of the render flow
      createRegion(currentRect);
    } else {
      setSelectionPoint({
        x,
        y
      });
      setSelectionRect({
        x,
        y,
        width: 0,
        height: 0
      });
      setIsSelecting(true);
    }
  };
  
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!containerRef.current || isTemporarilyBlocked) return;
    if (isSelectionMode) {
      setIsDoubleClickMode(false);
      setSelectionPoint(null);
      setSelectionRect({
        x: 0,
        y: 0,
        width: 0,
        height: 0
      });
      setIsSelecting(false);
      onCurrentSelectionTypeChange(null);
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDoubleClickMode(true);
    setSelectionPoint({
      x,
      y
    });
    setSelectionRect({
      x,
      y,
      width: 0,
      height: 0
    });
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
    if (currentPage < totalPages) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      onPageChange?.(newPage); // Pass 1-based page number
      window.getSelection()?.removeAllRanges();
      setSelectionPoint(null);
      setSelectionRect({
        x: 0,
        y: 0,
        width: 0,
        height: 0
      });
      setIsSelecting(false);
      setPreventCreateRegion(false);
      setIsDoubleClickMode(false);
    }
  };
  
  const handlePrevPage = () => {
    if (currentPage > 1) { // Changed from 0 to 1
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      onPageChange?.(newPage); // Pass 1-based page number
      window.getSelection()?.removeAllRanges();
      setSelectionPoint(null);
      setSelectionRect({
        x: 0,
        y: 0,
        width: 0,
        height: 0
      });
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
      setSelectionRect({
        x: 0,
        y: 0,
        width: 0,
        height: 0
      });
      setIsSelecting(false);
    }
  };
  
  // Function to copy the current page as an image to clipboard
  const copyPageToClipboard = async () => {
    if (!canvasRef.current) {
      toast.error('Canvas not available');
      return;
    }
    
    try {
      setIsCopyingPage(true);
      
      // Simply copy the current PDF page without any regions or annotations
      // Get the canvas element that contains the PDF page
      const canvas = canvasRef.current;
      
      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else toast.error('Failed to create image blob');
        }, 'image/png');
      });
      
      // Create ClipboardItem and write to clipboard
      const clipboardItem = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([clipboardItem]);
      
      toast.success('Page copied to clipboard');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Failed to copy page: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsCopyingPage(false);
    }
  };
  
  useEffect(() => {
    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [selectionPoint]);
  
  const pageRegions = regions.filter(region => region.page === currentPage); // currentPage is now 1-based
  
  useEffect(() => {
    setPreventCreateRegion(false);
  }, [currentPage]);
  
  const handleGoToPage = () => {
    const pageNum = parseInt(pageInputValue);
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum); // Use 1-based page number directly
      onPageChange?.(pageNum); // Pass 1-based page number
      setPageInputValue('');
      // Clear selection state when changing pages
      setSelectionPoint(null);
      setSelectionRect({ x: 0, y: 0, width: 0, height: 0 });
      setIsSelecting(false);
      setPreventCreateRegion(false);
      setIsDoubleClickMode(false);
    } else {
      toast.error(`Please enter a page number between 1 and ${totalPages}`);
    }
  };

  const handlePageInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleGoToPage();
    }
  };

  if (!documentId) {
    return <div className="flex flex-col items-center justify-center h-[calc(100vh-72px)] bg-muted">
        <div className="text-center p-10">
          <h2 className="font-bold mb-2 text-3xl">Welcome to Jooy Studio</h2>
          <p className="text-muted-foreground text-lg">Interactive Books Start Here</p>
        </div>
      </div>;
  }
  
  if (loading) {
    return <div className="flex flex-col items-center justify-center h-[calc(100vh-72px)]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      <span className="mt-3">Loading PDF...</span>
    </div>
  }
  if (loadError) {
    return <div className="flex flex-col items-center justify-center h-[calc(100vh-72px)]">
      <span className="text-destructive">{loadError}</span>
    </div>
  }

  return <div className="flex flex-col h-full w-full">
      <div className="bg-white border-b border-gray-200 p-2 w-full sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-[1200px] mx-auto">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Toggle pressed={currentSelectionType === 'area'} onPressedChange={() => onCurrentSelectionTypeChange(currentSelectionType === 'area' ? null : 'area')} aria-label="Toggle area selection tool" className={`${currentSelectionType === 'area' ? 'bg-blue-100 ring-2 ring-primary' : ''}`}>
                      <MousePointer className="h-4 w-4" />
                      <span className="sr-only">Area Selection</span>
                    </Toggle>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Draw custom area regions</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={copyPageToClipboard} 
                      disabled={isCopyingPage || !canvasRef.current}
                      className="h-9 w-9"
                    >
                      <Copy className="h-4 w-4" />
                      <span className="sr-only">Copy Page</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy page as image</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="flex items-center space-x-4">
              <Button variant="outline" size="icon" onClick={handlePrevPage} disabled={currentPage <= 1}>
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Previous page</span>
              </Button>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm min-w-[100px] text-center">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={pageInputValue}
                    onChange={(e) => setPageInputValue(e.target.value)}
                    onKeyPress={handlePageInputKeyPress}
                    placeholder="Go to..."
                    className="w-20 px-2 py-1 text-xs border rounded text-center"
                  />
                  <Button variant="outline" size="sm" onClick={handleGoToPage} disabled={!pageInputValue.trim()}>
                    Go
                  </Button>
                </div>
              </div>
              
              <Button variant="outline" size="icon" onClick={handleNextPage} disabled={currentPage >= totalPages}>
                <ArrowRight className="h-4 w-4" />
                <span className="sr-only">Next page</span>
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={scale <= 0.5}>
                -
              </Button>
              <span className="text-sm w-16 text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={scale >= 3}>
                +
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <ScrollArea className="flex-1 w-full h-[calc(100%-72px)]">
        <div className="flex justify-center p-4">
          <div ref={containerRef} className={`pdf-page relative ${currentSelectionType === 'area' || isDoubleClickMode ? 'cursor-crosshair' : ''}`} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onDoubleClick={handleDoubleClick}>
            <canvas ref={canvasRef} style={{
            display: 'block'
          }} />
            
            {pageRegions.map(region => 
              <RegionOverlay 
                key={region.id} 
                region={region} 
                isSelected={region.id === selectedRegionId} 
                onSelect={() => onRegionSelect(region.id)} 
                onUpdate={onRegionUpdate} 
                scale={scale} 
                documentId={documentId || ''}
              />
            )}
            
            {isSelecting && <div className="region-selection" style={{
            left: selectionRect.x,
            top: selectionRect.y,
            width: selectionRect.width,
            height: selectionRect.height,
            position: 'absolute',
            border: '2px solid #2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            pointerEvents: 'none'
          }} />}
          </div>
        </div>
      </ScrollArea>
    </div>;
};

export default PdfViewer;
