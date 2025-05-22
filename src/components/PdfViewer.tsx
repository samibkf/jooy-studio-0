
import React, { useState, useEffect, useRef } from 'react';
import { Region } from '@/types/regions';
import RegionOverlay from './RegionOverlay';

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
  onCurrentSelectionTypeChange?: (type: string | null) => void;
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

  // Add data-region-id attribute to help with scrolling to selected regions
  return (
    <div ref={containerRef} className="relative h-full w-full overflow-auto bg-gray-100">
      {/* PDF Document Display */}
      <div className="pdf-container">
        {documentUrl && (
          <img 
            src={documentUrl} 
            alt="PDF Page" 
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top left'
            }}
          />
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
    </div>
  );
};

export default PdfViewer;
