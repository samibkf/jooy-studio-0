
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { Region } from '@/types/regions';
import RegionOverlay from './RegionOverlay';
import { Plus, RectangleHorizontal, TextCursor } from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PdfViewerProps {
  file: File | null;
  regions: Region[];
  onRegionCreate: (region: Omit<Region, 'id'>) => void;
  onRegionUpdate: (region: Region) => void;
  selectedRegionId: string | null;
  onRegionSelect: (regionId: string | null) => void;
  onRegionDelete: (regionId: string) => void;
  isSelectionMode: boolean;
  currentSelectionType: string | null;
  onCurrentSelectionTypeChange: (type: string | null) => void;
  documentId: string | null;
  onPageChange?: (page: number) => void;
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
  documentId,
  onPageChange
}) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.5);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPosition, setStartPosition] = useState<{ x: number; y: number } | null>(null);
  const [endPosition, setEndPosition] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfViewerRef = useRef<HTMLDivElement>(null);

  // Load regions for current page
  const currentPageRegions = regions.filter(region => region.page === currentPage);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      onPageChange?.(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (numPages && currentPage < numPages) {
      setCurrentPage(currentPage + 1);
      onPageChange?.(currentPage + 1);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= (numPages || 1)) {
      setCurrentPage(page);
      onPageChange?.(page);
    }
  };

  const handleScaleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setScale(parseFloat(event.target.value));
  };

  const startDrawing = (event: React.MouseEvent) => {
    if (!isSelectionMode || currentSelectionType === null || !containerRef.current || event.button !== 0) return; // Only left click
    
    setIsDrawing(true);
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    setStartPosition({
      x: (event.clientX - rect.left) / scale,
      y: (event.clientY - rect.top) / scale
    });
    
    setEndPosition({
      x: (event.clientX - rect.left) / scale,
      y: (event.clientY - rect.top) / scale
    });
  };

  const drawRectangle = (event: React.MouseEvent) => {
    if (!isDrawing || !containerRef.current) return;
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    setEndPosition({
      x: (event.clientX - rect.left) / scale,
      y: (event.clientY - rect.top) / scale
    });
  };

  const stopDrawing = () => {
    if (!isDrawing || !startPosition || !endPosition) return;
    setIsDrawing(false);

    const startX = Math.min(startPosition.x, endPosition.x);
    const startY = Math.min(startPosition.y, endPosition.y);
    const width = Math.abs(startPosition.x - endPosition.x);
    const height = Math.abs(startPosition.y - endPosition.y);

    // Validate that the region is not too small
    if (width < 10 || height < 10) {
      console.warn('Region is too small to be created.');
      setStartPosition(null);
      setEndPosition(null);
      return;
    }

    const newRegion: Omit<Region, 'id'> = {
      page: currentPage,
      x: startX,
      y: startY,
      width: width,
      height: height,
      type: currentSelectionType || 'text',
      name: 'Region ' + (regions.length + 1),
      description: null
    };

    onRegionCreate(newRegion);
    setStartPosition(null);
    setEndPosition(null);
  };

  const getOverlayStyle = (): React.CSSProperties => {
    if (!isDrawing || !startPosition || !endPosition) return { display: 'none' };

    const startX = Math.min(startPosition.x, endPosition.x);
    const startY = Math.min(startPosition.y, endPosition.y);
    const width = Math.abs(startPosition.x - endPosition.x);
    const height = Math.abs(startPosition.y - endPosition.y);

    return {
      position: 'absolute' as const,
      left: `${startX * scale}px`,
      top: `${startY * scale}px`,
      width: `${width * scale}px`,
      height: `${height * scale}px`,
      border: '2px dashed #2563eb',
      backgroundColor: 'rgba(37, 99, 235, 0.2)',
      pointerEvents: 'none' as const,
    };
  };

  const toggleSelectionMode = (type: string | null) => {
    if (isDrawing) {
      setIsDrawing(false);
      setStartPosition(null);
      setEndPosition(null);
    }
    onCurrentSelectionTypeChange(type);
  };

  const isRegionSelected = useCallback((regionId: string) => {
    return selectedRegionId === regionId;
  }, [selectedRegionId]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b">
        <div className="flex items-center space-x-2">
          <Button
            variant={currentSelectionType === 'text' ? 'default' : 'outline'}
            onClick={() => toggleSelectionMode('text')}
            disabled={isDrawing}
          >
            <TextCursor className="h-4 w-4 mr-2" />
            Text
          </Button>
          <Button
            variant={currentSelectionType === 'image' ? 'default' : 'outline'}
            onClick={() => toggleSelectionMode('image')}
            disabled={isDrawing}
          >
            <RectangleHorizontal className="h-4 w-4 mr-2" />
            Image
          </Button>
          <Button
            variant="ghost"
            onClick={() => toggleSelectionMode(null)}
            disabled={!isSelectionMode}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Region
          </Button>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Label htmlFor="scale" className="text-sm">
              Scale:
            </Label>
            <Input
              type="number"
              id="scale"
              value={scale}
              onChange={handleScaleChange}
              min="0.5"
              max="3"
              step="0.1"
              className="w-16 text-sm"
            />
          </div>
          <div>
            Page {currentPage} / {numPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={goToPrevPage} disabled={currentPage <= 1} size="icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-5 h-5"
              >
                <path
                  fillRule="evenodd"
                  d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                  clipRule="evenodd"
                />
              </svg>
            </Button>
            <Button onClick={goToNextPage} disabled={numPages ? currentPage >= numPages : true} size="icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-5 h-5"
              >
                <path
                  fillRule="evenodd"
                  d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                  clipRule="evenodd"
                />
              </svg>
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      {/* PDF Viewer */}
      <div
        className="flex-1 overflow-auto relative"
        ref={containerRef}
        onMouseDown={startDrawing}
        onMouseMove={drawRectangle}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      >
        <div
          ref={pdfViewerRef}
          style={{
            transformOrigin: 'top left',
            transform: `scale(${scale})`,
          }}
        >
          {file ? (
            <Document file={file} onLoadSuccess={onDocumentLoadSuccess}>
              <Page pageNumber={currentPage} renderTextLayer={false} renderAnnotationLayer={false} />
            </Document>
          ) : (
            <div className="flex items-center justify-center h-full">
              No PDF loaded
            </div>
          )}
        </div>

        {/* Drawing Overlay */}
        <div style={getOverlayStyle()} />

        {/* Region Overlays */}
        {file &&
          currentPageRegions.map((region) => (
            <RegionOverlay
              key={region.id}
              region={region}
              isSelected={isRegionSelected(region.id)}
              onSelect={() => onRegionSelect(region.id)}
              onUpdate={onRegionUpdate}
              scale={scale}
              documentId={documentId || ''}
            />
          ))}
      </div>
    </div>
  );
};

export default PdfViewer;
