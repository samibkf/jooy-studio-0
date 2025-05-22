
import React, { useState, useEffect, useRef } from 'react';
import { Region } from '@/types/regions';
import RegionOverlay from './RegionOverlay';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PdfViewerProps {
  file: File | null;
  regions: Region[];
  selectedRegionId?: string | null;
  onRegionSelect: (regionId: string) => void;
  onRegionUpdate: (region: Region) => void;
  onRegionCreate: (region: Region) => void;
  onRegionDelete: (regionId: string) => void;
  isSelectionMode?: boolean;
  currentSelectionType?: string | null;
  onCurrentSelectionTypeChange?: React.Dispatch<React.SetStateAction<string | null>>;
}

const PdfViewer: React.FC<PdfViewerProps> = ({
  file,
  regions,
  selectedRegionId,
  onRegionSelect,
  onRegionUpdate,
  onRegionCreate,
  onRegionDelete,
  isSelectionMode,
  currentSelectionType,
  onCurrentSelectionTypeChange
}) => {
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [scale, setScale] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate URL for the file when it changes
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setDocumentUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setDocumentUrl(null);
    }
  }, [file]);

  // Find all regions for the current page
  const regionsForCurrentPage = regions.filter(region => region.page === currentPage);
  const selectedRegion = selectedRegionId ? regions.find(r => r.id === selectedRegionId) : null;

  // Handle zoom in
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 2));
  };

  // Handle zoom out
  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.5));
  };

  // Handle page navigation
  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  // Handle drawing mode
  const toggleSelectionMode = () => {
    if (onCurrentSelectionTypeChange) {
      onCurrentSelectionTypeChange(currentSelectionType ? null : 'area');
    }
  };

  // Mouse events for drawing regions
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isSelectionMode || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentPos({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    setCurrentPos({ x, y });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentSelectionType) return;
    
    setIsDrawing(false);
    
    // Calculate region dimensions
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);
    
    // Only create region if it has some size
    if (width > 10 && height > 10) {
      const x = Math.min(startPos.x, currentPos.x);
      const y = Math.min(startPos.y, currentPos.y);
      
      onRegionCreate({
        page: currentPage,
        x,
        y,
        width,
        height,
        type: currentSelectionType,
        name: `${currentPage}_${regionsForCurrentPage.length + 1}`,
        description: null,
        document_id: '', // This will be set by the parent component
        user_id: '', // This will be set by the parent component
        created_at: new Date().toISOString()
      });
      
      // Exit selection mode after creating a region
      if (onCurrentSelectionTypeChange) {
        onCurrentSelectionTypeChange(null);
      }
    }
  };

  // Add data-region-id attribute to help with scrolling to selected regions
  return (
    <div className="flex flex-col h-full w-full bg-gray-100">
      {/* Toolbar */}
      <div className="bg-white border-b p-2 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm">{Math.round(scale * 100)}%</span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={scale >= 2}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          
          <Button
            variant={isSelectionMode ? "default" : "outline"}
            size="sm"
            onClick={toggleSelectionMode}
            className="ml-4"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Region
          </Button>
        </div>
      </div>
      
      {/* PDF Content Area */}
      <div 
        ref={containerRef} 
        className="relative flex-1 overflow-auto"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* PDF Document Display */}
        <div className="pdf-container">
          {documentUrl ? (
            <img 
              src={documentUrl} 
              alt="PDF Page" 
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'top left'
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p>No document selected</p>
            </div>
          )}
        </div>
        
        {/* Region Overlays */}
        {regionsForCurrentPage.map(region => (
          <div key={region.id} data-region-id={region.id}>
            <RegionOverlay
              region={region}
              isSelected={selectedRegion?.id === region.id}
              onSelect={() => onRegionSelect(region.id)}
              onUpdate={onRegionUpdate}
              scale={scale}
            />
          </div>
        ))}
        
        {/* Drawing overlay */}
        {isDrawing && isSelectionMode && (
          <div
            className="absolute border-2 border-blue-500 bg-blue-100 bg-opacity-30 pointer-events-none"
            style={{
              left: Math.min(startPos.x, currentPos.x) * scale,
              top: Math.min(startPos.y, currentPos.y) * scale,
              width: Math.abs(currentPos.x - startPos.x) * scale,
              height: Math.abs(currentPos.y - startPos.y) * scale
            }}
          />
        )}
      </div>
    </div>
  );
};

export default PdfViewer;
