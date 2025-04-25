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
  
  const [selectionStart, setSelectionStart] = useState<{ x: number, y: number } | null>(null);
  const [currentMousePosition, setCurrentMousePosition] = useState<{ x: number, y: number } | null>(null);
  const [selectionRect, setSelectionRect] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<{ x: number; y: number }[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

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

  const createRectangleRegion = (startPoint: { x: number, y: number }, endPoint: { x: number, y: number }) => {
    const x = Math.min(startPoint.x, endPoint.x);
    const y = Math.min(startPoint.y, endPoint.y);
    const width = Math.abs(startPoint.x - endPoint.x);
    const height = Math.abs(startPoint.y - endPoint.y);
    
    if (width < 10 || height < 10) return; // Minimum size check
    
    const nextNumber = getNextRegionNumber(currentPage + 1);
    const regionName = `${currentPage + 1}_${nextNumber}`;
    
    const newRegion: Omit<Region, 'id'> = {
      page: currentPage + 1,
      x,
      y,
      width,
      height,
      type: 'area',
      name: regionName,
      description: ''
    };
    
    onRegionCreate(newRegion);
    toast.success('Rectangle region created');
  };

  const createCircleRegion = (centerPoint: { x: number, y: number }, radiusPoint: { x: number, y: number }) => {
    const radius = Math.sqrt(
      Math.pow(radiusPoint.x - centerPoint.x, 2) + Math.pow(radiusPoint.y - centerPoint.y, 2)
    );
    
    if (radius < 10) return; // Minimum size check
    
    const nextNumber = getNextRegionNumber(currentPage + 1);
    const regionName = `${currentPage + 1}_${nextNumber}`;
    
    const newRegion: Omit<Region, 'id'> = {
      page: currentPage + 1,
      x: centerPoint.x - radius,
      y: centerPoint.y - radius,
      width: radius * 2,
      height: radius * 2,
      type: 'circle',
      name: regionName,
      description: '',
      radius
    };
    
    onRegionCreate(newRegion);
    toast.success('Circle region created');
  };

  const createPolygonRegion = (points: { x: number, y: number }[]) => {
    if (points.length < 3) return; // Minimum points check
    
    const xPoints = points.map(p => p.x);
    const yPoints = points.map(p => p.y);
    const minX = Math.min(...xPoints);
    const maxX = Math.max(...xPoints);
    const minY = Math.min(...yPoints);
    const maxY = Math.max(...yPoints);
    
    const nextNumber = getNextRegionNumber(currentPage + 1);
    const regionName = `${currentPage + 1}_${nextNumber}`;
    
    const newRegion: Omit<Region, 'id'> = {
      page: currentPage + 1,
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      type: 'polygon',
      name: regionName,
      description: '',
      points: [...points]
    };
    
    onRegionCreate(newRegion);
    toast.success('Polygon region created');
  };

  const resetSelectionState = () => {
    setSelectionStart(null);
    setCurrentMousePosition(null);
    setSelectionRect(null);
    setPolygonPoints([]);
    setIsDrawing(false);
  };

  useEffect(() => {
    resetSelectionState();
  }, [isSelectionMode, currentSelectionType]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isSelectionMode || !containerRef.current || !currentSelectionType) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (currentSelectionType === 'polygon') {
      const newPoint = { x, y };
      
      if (polygonPoints.length > 2) {
        const firstPoint = polygonPoints[0];
        const distanceToFirst = Math.sqrt(
          Math.pow(x - firstPoint.x, 2) + Math.pow(y - firstPoint.y, 2)
        );
        
        if (distanceToFirst < 20) {
          createPolygonRegion([...polygonPoints]);
          setPolygonPoints([]);
          return;
        }
      }
      
      setPolygonPoints(prev => [...prev, newPoint]);
    } else if (currentSelectionType === 'area' || currentSelectionType === 'circle') {
      setSelectionStart({ x, y });
      setCurrentMousePosition({ x, y });
      setIsDrawing(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || !isSelectionMode) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setCurrentMousePosition({ x, y });
    
    if (isDrawing && selectionStart && currentSelectionType === 'area') {
      setSelectionRect({
        x: Math.min(x, selectionStart.x),
        y: Math.min(y, selectionStart.y),
        width: Math.abs(x - selectionStart.x),
        height: Math.abs(y - selectionStart.y)
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isSelectionMode || !containerRef.current || !currentSelectionType) return;
    
    if (isDrawing) {
      if (currentSelectionType === 'area' && selectionRect) {
        createRectangleRegion(
          { x: selectionRect.x, y: selectionRect.y },
          { x: selectionRect.x + selectionRect.width, y: selectionRect.y + selectionRect.height }
        );
      } else if (currentSelectionType === 'circle' && selectionStart && currentMousePosition) {
        createCircleRegion(selectionStart, currentMousePosition);
      }
      
      resetSelectionState();
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
      resetSelectionState();
    }
  };
  
  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
      resetSelectionState();
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
          className={`pdf-page relative mx-auto ${
            currentSelectionType ? 'cursor-crosshair' : ''
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{ position: 'relative' }}
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
          
          <svg 
            ref={svgRef} 
            className="absolute top-0 left-0 w-full h-full pointer-events-none" 
            style={{ zIndex: 20 }}
          >
            {currentSelectionType === 'polygon' && polygonPoints.length > 0 && (
              <>
                <polyline
                  points={polygonPoints.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="#9b87f5"
                  strokeWidth="2"
                  strokeDasharray="4"
                />
                {polygonPoints.map((point, index) => (
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
                {polygonPoints.length > 0 && currentMousePosition && (
                  <line
                    x1={polygonPoints[polygonPoints.length - 1].x}
                    y1={polygonPoints[polygonPoints.length - 1].y}
                    x2={currentMousePosition.x}
                    y2={currentMousePosition.y}
                    stroke="#9b87f5"
                    strokeWidth="2"
                    strokeDasharray="4"
                  />
                )}
              </>
            )}
            
            {currentSelectionType === 'area' && isDrawing && selectionStart && currentMousePosition && (
              <rect
                x={Math.min(selectionStart.x, currentMousePosition.x)}
                y={Math.min(selectionStart.y, currentMousePosition.y)}
                width={Math.abs(currentMousePosition.x - selectionStart.x)}
                height={Math.abs(currentMousePosition.y - selectionStart.y)}
                fill="rgba(155, 135, 245, 0.3)"
                stroke="#9b87f5"
                strokeWidth="2"
                strokeDasharray="4"
              />
            )}
            
            {currentSelectionType === 'circle' && isDrawing && selectionStart && currentMousePosition && (
              <circle
                cx={selectionStart.x}
                cy={selectionStart.y}
                r={Math.sqrt(
                  Math.pow(currentMousePosition.x - selectionStart.x, 2) + 
                  Math.pow(currentMousePosition.y - selectionStart.y, 2)
                )}
                fill="rgba(155, 135, 245, 0.3)"
                stroke="#9b87f5"
                strokeWidth="2"
                strokeDasharray="4"
              />
            )}
          </svg>
        </div>
      </div>
    </div>
  );
};

export default PdfViewer;
