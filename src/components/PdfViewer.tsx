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
  const [textLayerVisible, setTextLayerVisible] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const selectionTimeoutRef = useRef<number | null>(null);
  
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
        
        if (textLayerRef.current) {
          textLayerRef.current.innerHTML = '';
          textLayerRef.current.style.width = `${viewport.width}px`;
          textLayerRef.current.style.height = `${viewport.height}px`;
          
          if (debugMode) {
            textLayerRef.current.classList.add('text-layer-debug');
          } else {
            textLayerRef.current.classList.remove('text-layer-debug');
          }
        }
        
        await page.render({
          canvasContext,
          viewport
        }).promise;
        
        if (textLayerRef.current) {
          try {
            const textContent = await page.getTextContent();
            
            textContent.items.forEach((item: any) => {
              const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
              
              const fontSize = Math.sqrt((tx[2] * tx[2]) + (tx[3] * tx[3]));
              
              const textSpan = document.createElement('span');
              textSpan.textContent = item.str;
              textSpan.style.left = `${tx[4]}px`;
              textSpan.style.top = `${tx[5] - fontSize}px`;
              textSpan.style.fontSize = `${fontSize}px`;
              textSpan.style.fontFamily = 'sans-serif';
              textSpan.style.position = 'absolute';
              textSpan.classList.add('text-item');
              textSpan.dataset.text = item.str;
              
              textLayerRef.current!.appendChild(textSpan);
            });
            
            setTextLayerVisible(true);
            
            toggleTextSelectionMode(currentSelectionType === 'text');
          } catch (error) {
            console.error('Error rendering text layer:', error);
            toast.error('Failed to render text layer');
          }
        }
      } catch (error) {
        console.error('Error rendering page:', error);
        toast.error('Failed to render page');
      }
    };
    
    renderPage();
  }, [pdf, currentPage, scale, debugMode, currentSelectionType]);
  
  const toggleTextSelectionMode = useCallback((enabled: boolean) => {
    if (!textLayerRef.current) return;
    
    if (enabled) {
      textLayerRef.current.classList.add('text-selection-enabled');
      textLayerRef.current.classList.remove('text-selection-disabled');
      
      document.addEventListener('mouseup', handleTextSelection);
    } else {
      textLayerRef.current.classList.remove('text-selection-enabled');
      textLayerRef.current.classList.add('text-selection-disabled');
      
      document.removeEventListener('mouseup', handleTextSelection);
      
      window.getSelection()?.removeAllRanges();
    }
  }, []);
  
  useEffect(() => {
    toggleTextSelectionMode(currentSelectionType === 'text');
    
    return () => {
      document.removeEventListener('mouseup', handleTextSelection);
    };
  }, [currentSelectionType, toggleTextSelectionMode]);
  
  const handleTextSelection = useCallback((e: MouseEvent) => {
    if (selectionTimeoutRef.current) {
      window.clearTimeout(selectionTimeoutRef.current);
    }
    
    selectionTimeoutRef.current = window.setTimeout(() => {
      if (currentSelectionType !== 'text' || !containerRef.current || !textLayerRef.current) {
        return;
      }
      
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        return;
      }
      
      try {
        const range = selection.getRangeAt(0);
        
        if (!textLayerRef.current.contains(range.commonAncestorContainer)) {
          return;
        }
        
        const rects = range.getClientRects();
        if (rects.length === 0) {
          return;
        }
        
        const selectedText = selection.toString().trim();
        if (!selectedText) {
          return;
        }
        
        console.log("Selected text:", selectedText);
        
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
        
        if (width > 5 && height > 5 && selectedText) {
          const nextNumber = getNextRegionNumber(currentPage);
          const regionName = `${currentPage + 1}_${nextNumber}`;
          
          const newRegion: Omit<Region, 'id'> = {
            page: currentPage,
            x,
            y,
            width,
            height,
            type: 'text',
            name: regionName,
            audioPath: '',
            description: selectedText
          };
          
          onRegionCreate(newRegion);
          toast.success('Text region created');
          
          window.getSelection()?.removeAllRanges();
        }
      } catch (error) {
        console.error('Error processing text selection:', error);
      }
    }, 100);
  }, [currentPage, currentSelectionType, onRegionCreate, getNextRegionNumber]);
  
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
    
    if (selectionRect.width > 10 && selectionRect.height > 10 && currentSelectionType === 'area') {
      const nextNumber = getNextRegionNumber(currentPage);
      const regionName = `${currentPage + 1}_${nextNumber}`;
      
      const newRegion: Omit<Region, 'id'> = {
        page: currentPage,
        x: selectionRect.x,
        y: selectionRect.y,
        width: selectionRect.width,
        height: selectionRect.height,
        type: 'area',
        name: regionName,
        audioPath: '',
        description: ''
      };
      
      onRegionCreate(newRegion);
      toast.success('Area region created');
      
      setSelectionRect({ x: 0, y: 0, width: 0, height: 0 });
    }
  };
  
  const handleImageClick = (e: React.MouseEvent) => {
    if (currentSelectionType !== 'image' || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const DEFAULT_IMAGE_SIZE = 100;
    const nextNumber = getNextRegionNumber(currentPage);
    const regionName = `${currentPage + 1}_${nextNumber}`;
    
    const newRegion: Omit<Region, 'id'> = {
      page: currentPage,
      x,
      y,
      width: DEFAULT_IMAGE_SIZE,
      height: DEFAULT_IMAGE_SIZE,
      type: 'image',
      name: regionName,
      audioPath: '',
      description: 'Image selection'
    };
    
    onRegionCreate(newRegion);
    toast.info('Image region created. Resize it to fit the image precisely.');
  };
  
  const toggleDebugMode = () => {
    setDebugMode(!debugMode);
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
          {process.env.NODE_ENV === 'development' && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleDebugMode}
              className="ml-2"
            >
              {debugMode ? 'Debug: ON' : 'Debug: OFF'}
            </Button>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4">
        <div 
          ref={containerRef}
          className={`pdf-page relative mx-auto ${
            currentSelectionType === 'area' ? 'cursor-crosshair' : 
            currentSelectionType === 'text' ? 'cursor-text' : 
            currentSelectionType === 'image' ? 'cursor-cell' : ''
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={currentSelectionType === 'image' ? handleImageClick : undefined}
        >
          <canvas ref={canvasRef} className="absolute top-0 left-0" />
          
          <div 
            ref={textLayerRef} 
            className={`text-layer ${
              textLayerVisible ? 'visible' : 'hidden'
            } ${
              currentSelectionType === 'text' 
                ? 'text-selection-enabled' 
                : 'text-selection-disabled'
            } ${
              debugMode ? 'debug' : ''
            }`}
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
