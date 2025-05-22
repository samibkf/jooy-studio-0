
import React, { useState, useEffect, useRef } from 'react';
import { Region } from '@/types/regions';
import RegionOverlay from './RegionOverlay';

interface PdfViewerProps {
  documentUrl: string;
  regions: Region[];
  selectedRegion: Region | null;
  onRegionSelect: (regionId: string) => void;
  onRegionUpdate: (region: Region) => void;
  onRegionCreate: (region: Region) => void;
  onRegionDelete: (regionId: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  scale: number;
  onScaleChange: (scale: number) => void;
}

const PdfViewer: React.FC<PdfViewerProps> = ({
  documentUrl,
  regions,
  selectedRegion,
  onRegionSelect,
  onRegionUpdate,
  onRegionCreate,
  onRegionDelete,
  currentPage,
  totalPages,
  onPageChange,
  scale,
  onScaleChange
}) => {
  // Find all regions for the current page
  const regionsForCurrentPage = regions.filter(region => region.page === currentPage);

  // Add data-region-id attribute to help with scrolling to selected regions
  return (
    <div className="relative h-full w-full overflow-auto bg-gray-100">
      {/* PDF Document Display */}
      <div className="pdf-container">
        <img 
          src={documentUrl} 
          alt="PDF Page" 
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left'
          }}
        />
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
