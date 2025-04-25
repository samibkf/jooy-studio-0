import React, { useState, useRef, useEffect } from 'react';
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
  currentSelectionType: 'area' | 'polygon' | 'circle' | null;
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
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionRect, setSelectionRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [polygonPoints, setPolygonPoints] = useState<{ x: number; y: number }[]>([]);
  const [previewPoints, setPreviewPoints] = useState<{ x: number; y: number }[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const getNextRegionNumber = (pageNumber: number): number => {
    const pageRegions = regions.filter(region => region.page === pageNumber);
    return pageRegions.length === 0 ? 1 : Math.max(...pageRegions.map(r => parseInt(r.name.split('_')[1], 10)), 0) + 1;
  };

  const calculateSelectionRect = (start: { x: number; y: number }, end: { x: number; y: number }) => {
    if (currentSelectionType === 'circle') {
      const radius = Math.sqrt(
        Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
      );
      return {
        x: start.x - radius,
        y: start.y - radius,
        width: radius * 2,
        height: radius * 2,
        radius
      };
    }
    return {
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y)
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isSelectionMode || !containerRef.current || !currentSelectionType) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (!selectionStart) {
      console.log('Setting initial point:', { x, y });
      setSelectionStart({ x, y });
      if (currentSelectionType === 'polygon') {
        setPolygonPoints([{ x, y }]);
        setPreviewPoints([{ x, y }]);
      }
    } else {
      // Second click - complete the selection
      console.log('Completing selection');
      const nextNumber = getNextRegionNumber(currentPage + 1);
      const regionName = `${currentPage + 1}_${nextNumber}`;

      if (currentSelectionType === 'polygon') {
        const newRegion: Omit<Region, 'id'> = {
          page: currentPage + 1,
          x: Math.min(...polygonPoints.map(p => p.x)),
          y: Math.min(...polygonPoints.map(p => p.y)),
          width: Math.max(...polygonPoints.map(p => p.x)) - Math.min(...polygonPoints.map(p => p.x)),
          height: Math.max(...polygonPoints.map(p => p.y)) - Math.min(...polygonPoints.map(p => p.y)),
          type: 'polygon',
          name: regionName,
          description: '',
          points: [...polygonPoints, { x, y }]
        };
        onRegionCreate(newRegion);
      } else {
        const rect = calculateSelectionRect(selectionStart, { x, y });
        const newRegion: Omit<Region, 'id'> = {
          page: currentPage + 1,
          ...rect,
          type: currentSelectionType,
          name: regionName,
          description: '',
          ...(currentSelectionType === 'circle' ? { radius: (rect as any).radius } : {})
        };
        onRegionCreate(newRegion);
      }

      // Reset selection state
      setSelectionStart(null);
      setSelectionRect({ x: 0, y: 0, width: 0, height: 0 });
      setPolygonPoints([]);
      setPreviewPoints([]);
      setIsDrawing(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!selectionStart || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (currentSelectionType === 'polygon') {
      setPreviewPoints([...polygonPoints, { x, y }]);
    } else {
      const newRect = calculateSelectionRect(selectionStart, { x, y });
      setSelectionRect(newRect);
    }
  };

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
        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center space-x-2">
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
          className={`pdf-page relative mx-auto ${currentSelectionType ? 'cursor-crosshair' : ''}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
        >
          <canvas ref={canvasRef} className="absolute top-0 left-0" />
          
          {regions.map((region) => (
            <RegionOverlay
              key={region.id}
              region={region}
              isSelected={region.id === selectedRegionId}
              onSelect={() => onRegionSelect(region.id)}
              onUpdate={onRegionUpdate}
              scale={scale}
            />
          ))}
          
          {selectionStart && currentSelectionType !== 'polygon' && (
            <div 
              className={`region-selection ${currentSelectionType === 'circle' ? 'rounded-full' : ''}`}
              style={{
                left: selectionRect.x,
                top: selectionRect.y,
                width: selectionRect.width,
                height: selectionRect.height,
              }}
            />
          )}

          {selectionStart && currentSelectionType === 'polygon' && previewPoints.length > 0 && (
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
              <path
                d={`M ${previewPoints.map(p => `${p.x},${p.y}`).join(' L ')}`}
                fill="rgba(155, 135, 245, 0.1)"
                stroke="#9b87f5"
                strokeWidth="2"
                strokeDasharray="4"
              />
              {previewPoints.map((point, index) => (
                <circle
                  key={index}
                  cx={point.x}
                  cy={point.y}
                  r={4}
                  fill={index === 0 ? '#7b66d9' : '#9b87f5'}
                  stroke="white"
                  strokeWidth="2"
                />
              ))}
            </svg>
          )}
        </div>
      </div>
    </div>
  );
};

export default PdfViewer;
