
import React, { useState, useRef, useEffect } from 'react';
import { Region, RegionType } from '@/types/regions';
import RegionOverlay from './RegionOverlay';
import { ScrollArea } from '@/components/ui/scroll-area';
import PdfToolbar from './PdfToolbar';
import { usePdfLoader } from '@/hooks/usePdfLoader';
import { useRegionSelection } from '@/hooks/useRegionSelection';

interface PdfViewerProps {
  file: File | null;
  regions: Region[];
  onRegionCreate: (region: Region) => void;
  onRegionUpdate: (region: Region) => void;
  selectedRegionId: string | null;
  onRegionSelect: (regionId: string | null) => void;
  onRegionDelete: (regionId: string) => void;
  isSelectionMode: boolean;
  currentSelectionType: RegionType | null;
  onCurrentSelectionTypeChange: (type: RegionType | null) => void;
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
  const [currentPage, setCurrentPage] = useState(0);
  const [scale, setScale] = useState(1.0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { pdf, totalPages, isLoading, loadError } = usePdfLoader({
    file,
    canvasContext: canvasRef.current?.getContext('2d') || null,
    currentPage,
    scale
  });

  const {
    isSelecting,
    setIsSelecting,
    selectionRect,
    setSelectionRect,
    selectionPoint,
    setSelectionPoint,
    isDoubleClickMode,
    setIsDoubleClickMode,
    isTemporarilyBlocked,
    createRegion
  } = useRegionSelection({
    onRegionCreate,
    currentPage,
    currentSelectionType
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && 
          selectedRegionId && 
          document.activeElement instanceof HTMLElement && 
          !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        onRegionDelete(selectedRegionId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRegionId, onRegionDelete]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((!isSelectionMode && !isDoubleClickMode) || !containerRef.current || isTemporarilyBlocked) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (selectionPoint) {
      createRegion(selectionRect);
      setSelectionRect({ x: 0, y: 0, width: 0, height: 0 });
      setSelectionPoint(null);
      setIsSelecting(false);
      setIsDoubleClickMode(false);
    } else {
      setSelectionPoint({ x, y });
      setSelectionRect({ x, y, width: 0, height: 0 });
      setIsSelecting(true);
    }
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

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 3.0));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.5));
  const handleNextPage = () => currentPage < totalPages - 1 && setCurrentPage(prev => prev + 1);
  const handlePrevPage = () => currentPage > 0 && setCurrentPage(prev => prev - 1);

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-72px)] bg-muted">
        <div className="text-center p-10">
          <h2 className="text-2xl font-bold mb

-2">No PDF Document Loaded</h2>
          <p className="text-muted-foreground">
            Please upload a PDF document to get started
          </p>
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-72px)] bg-muted">
        <div className="text-center p-10">
          <h2 className="text-2xl font-bold mb-2">Loading PDF...</h2>
          <p className="text-muted-foreground">
            Please wait while the document is being loaded
          </p>
        </div>
      </div>
    );
  }
  
  if (loadError || !pdf) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-72px)] bg-muted">
        <div className="text-center p-10">
          <h2 className="text-2xl font-bold mb-2 text-red-600">Error Loading PDF</h2>
          <p className="text-muted-foreground mb-4">
            {loadError || "There was a problem loading the PDF document"}
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Make sure the file is a valid PDF and not empty or corrupted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      <PdfToolbar
        currentPage={currentPage}
        totalPages={totalPages}
        scale={scale}
        currentSelectionType={currentSelectionType}
        onPrevPage={handlePrevPage}
        onNextPage={handleNextPage}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onSelectionTypeChange={onCurrentSelectionTypeChange}
      />
      
      <ScrollArea className="flex-1 w-full h-[calc(100%-72px)]">
        <div className="flex justify-center p-4">
          <div 
            ref={containerRef}
            className={`pdf-page relative ${
              currentSelectionType === 'area' || isDoubleClickMode ? 'cursor-crosshair' : ''
            }`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onDoubleClick={handleDoubleClick}
          >
            <canvas ref={canvasRef} style={{ display: 'block' }} />
            
            {regions
              .filter(region => region.page === currentPage + 1)
              .map((region) => (
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
