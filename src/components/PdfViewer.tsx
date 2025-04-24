
import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
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
  currentSelectionType: 'text' | 'image' | 'area' | null;
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
  const [textSelectionEnabled, setTextSelectionEnabled] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const textSelectionTimeoutRef = useRef<number | null>(null);
  
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
    if (!pdf || !canvasRef.current || !textLayerRef.current) return;
    
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

        // Clear the text layer before rendering new content
        const textLayer = textLayerRef.current!;
        textLayer.innerHTML = '';
        textLayer.style.width = `${viewport.width}px`;
        textLayer.style.height = `${viewport.height}px`;

        const textContent = await page.getTextContent();
        
        // Create a separate div for each text item to improve selection
        textContent.items.forEach((item: any) => {
          const tx = pdfjsLib.Util.transform(
            viewport.transform,
            item.transform
          );
          
          const style = textContent.styles[item.fontName];
          const fontSize = Math.sqrt((tx[2] * tx[2]) + (tx[3] * tx[3]));
          
          const textSpan = document.createElement('span');
          textSpan.textContent = item.str;
          textSpan.style.left = `${tx[4]}px`;
          textSpan.style.top = `${tx[5]}px`;
          textSpan.style.fontSize = `${fontSize}px`;
          textSpan.style.fontFamily = style.fontFamily;
          textSpan.style.transform = `scaleX(${item.width / item.str.length / fontSize})`;
          textSpan.dataset.line = item.dir;
          
          textLayer.appendChild(textSpan);
        });
        
        const operatorList = await page.getOperatorList();
        const imageItems = operatorList.fnArray.reduce((acc, fn, i) => {
          if (fn === 93) {
            const imgName = operatorList.argsArray[i][0];
            acc.push(imgName);
          }
          return acc;
        }, [] as string[]);

        console.log(`Found ${imageItems.length} images on page ${currentPage + 1}`);
        
      } catch (error) {
        console.error('Error rendering page:', error);
        toast.error('Failed to render page');
      }
    };
    
    renderPage();
  }, [pdf, currentPage, scale]);
  
  useEffect(() => {
    // Enable or disable text selection based on the current selection type
    setTextSelectionEnabled(currentSelectionType === 'text');
    
    // Clean up any ongoing text selection when changing tools
    if (textSelectionTimeoutRef.current) {
      window.clearTimeout(textSelectionTimeoutRef.current);
      textSelectionTimeoutRef.current = null;
    }
  }, [currentSelectionType]);
  
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
      const newRegion: Omit<Region, 'id'> = {
        page: currentPage,
        x: selectionRect.x,
        y: selectionRect.y,
        width: selectionRect.width,
        height: selectionRect.height,
        type: currentSelectionType as 'text' | 'image' | 'area',
        name: `Region ${regions.length + 1}`,
        audioPath: '',
        description: ''
      };
      
      onRegionCreate(newRegion);
      setSelectionRect({ x: 0, y: 0, width: 0, height: 0 });
    }
  };

  const handleTextSelection = useCallback(() => {
    if (currentSelectionType !== 'text' || !containerRef.current || !textLayerRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    try {
      const range = selection.getRangeAt(0);
      
      // Check if selection is within the text layer
      if (!textLayerRef.current.contains(range.commonAncestorContainer)) {
        return;
      }
      
      const rects = range.getClientRects();
      if (rects.length === 0) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      
      let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
      
      Array.from(rects).forEach(rect => {
        minX = Math.min(minX, rect.left);
        minY = Math.min(minY, rect.top);
        maxX = Math.max(maxX, rect.right);
        maxY = Math.max(maxY, rect.bottom);
      });
      
      const x = minX - containerRect.left;
      const y = minY - containerRect.top;
      const width = maxX - minX;
      const height = maxY - minY;
      
      if (width > 5 && height > 5) {
        const selectionText = selection.toString().trim();
        
        // Only create regions for non-empty text selections
        if (selectionText) {
          const newRegion: Omit<Region, 'id'> = {
            page: currentPage,
            x,
            y,
            width,
            height,
            type: 'text' as const,
            name: `Text Region ${regions.length + 1}`,
            audioPath: '',
            description: selectionText
          };
          
          onRegionCreate(newRegion);
        }
      }
    } catch (error) {
      console.error('Error processing text selection:', error);
      toast.error('Failed to process text selection');
    }
    
    // Clear the selection
    selection?.removeAllRanges();
  }, [currentSelectionType, currentPage, regions.length, onRegionCreate]);

  const handleImageSelection = useCallback((e: React.MouseEvent) => {
    if (currentSelectionType !== 'image' || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const DEFAULT_IMAGE_SIZE = 100;
    
    const newRegion: Omit<Region, 'id'> = {
      page: currentPage,
      x,
      y,
      width: DEFAULT_IMAGE_SIZE,
      height: DEFAULT_IMAGE_SIZE,
      type: 'image',
      name: `Image Region ${regions.length + 1}`,
      audioPath: '',
      description: 'Image selection'
    };
    
    onRegionCreate(newRegion);
    toast.info('Image region created. Resize it to fit the image precisely.');
  }, [currentSelectionType, currentPage, regions.length, onRegionCreate]);

  useEffect(() => {
    if (currentSelectionType === 'text' && textLayerRef.current) {
      // Use mouseup for text selection to wait for the selection to be complete
      const handleMouseUp = () => {
        // Add a slight delay to ensure the selection is complete
        if (textSelectionTimeoutRef.current) {
          window.clearTimeout(textSelectionTimeoutRef.current);
        }
        
        // Delay to allow the browser to complete the selection process
        textSelectionTimeoutRef.current = window.setTimeout(() => {
          handleTextSelection();
        }, 100) as unknown as number;
      };
      
      textLayerRef.current.addEventListener('mouseup', handleMouseUp);
      return () => {
        if (textLayerRef.current) {
          textLayerRef.current.removeEventListener('mouseup', handleMouseUp);
        }
        
        if (textSelectionTimeoutRef.current) {
          window.clearTimeout(textSelectionTimeoutRef.current);
        }
      };
    }
  }, [currentSelectionType, handleTextSelection]);

  useEffect(() => {
    if (currentSelectionType === 'image' && containerRef.current) {
      containerRef.current.addEventListener('click', handleImageSelection as unknown as EventListener);
      
      return () => {
        if (containerRef.current) {
          containerRef.current.removeEventListener('click', handleImageSelection as unknown as EventListener);
        }
      };
    }
  }, [currentSelectionType, handleImageSelection]);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
      // Clear any existing selections when changing pages
      window.getSelection()?.removeAllRanges();
    }
  }, [currentPage, totalPages]);

  const handlePrevPage = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
      // Clear any existing selections when changing pages
      window.getSelection()?.removeAllRanges();
    }
  }, [currentPage]);

  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.1, 3.0));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.1, 0.5));
  }, []);

  const pageRegions = regions.filter(region => region.page === currentPage);
  
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
          className={`pdf-page relative mx-auto ${isSelectionMode && currentSelectionType === 'area' ? 'cursor-crosshair' : 
                                               isSelectionMode && currentSelectionType === 'text' ? 'cursor-text' : 
                                               isSelectionMode && currentSelectionType === 'image' ? 'cursor-cell' : ''}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <canvas ref={canvasRef} className="absolute top-0 left-0" />
          
          <div 
            ref={textLayerRef} 
            className={`absolute top-0 left-0 text-layer ${textSelectionEnabled ? 'pointer-events-auto' : 'pointer-events-none'}`}
          ></div>
          
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
