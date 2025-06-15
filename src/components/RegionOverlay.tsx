import React, { useState, useRef, useEffect } from 'react';
import { Region } from '@/types/regions';
import { useTextAssignment } from '@/contexts/TextAssignmentContext';

interface RegionOverlayProps {
  region: Region;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (region: Region) => void;
  scale: number;
  documentId: string;
}

const RegionOverlay: React.FC<RegionOverlayProps> = ({
  region,
  isSelected,
  onSelect,
  onUpdate,
  scale,
  documentId
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: region.x, y: region.y });
  const containerRef = useRef<HTMLDivElement>(null);
  const { isRegionAssigned, isReady, isLoading } = useTextAssignment();

  const [hasText, setHasText] = useState(false);
  
  useEffect(() => {
    if (isReady && documentId) {
      const assigned = isRegionAssigned(region.id, documentId);
      setHasText(assigned);
    }
  }, [isReady, region.id, documentId, isRegionAssigned, isRegionAssigned]);

  useEffect(() => {
    setPosition({
      x: region.x,
      y: region.y
    });
  }, [region.x, region.y]);
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only handle left-click
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY
    });
    onSelect();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.stopPropagation();
    e.preventDefault(); // Prevent text selection

    const dx = (e.clientX - dragStart.x) / scale;
    const dy = (e.clientY - dragStart.y) / scale;

    const newX = position.x + dx;
    const newY = position.y + dy;

    setPosition({
      x: newX,
      y: newY
    });

    setDragStart({
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    // Only update if position has changed
    if (position.x !== region.x || position.y !== region.y) {
      onUpdate({
        ...region,
        x: position.x,
        y: position.y
      });
    }
  };

  const getBorderColor = () => {
    if (isSelected) {
      return hasText ? 'rgba(21, 128, 61, 0.95)' : 'rgba(37, 99, 235, 0.9)'; // Dark green for selected with text
    }
    return hasText ? 'rgba(34, 197, 94, 0.8)' : 'rgba(37, 99, 235, 0.8)';
  };
  
  const getBackgroundColor = () => {
    if (isSelected) {
      return hasText ? 'rgba(21, 128, 61, 0.25)' : 'rgba(37, 99, 235, 0.2)'; // Darker green background for selected with text
    }
    return hasText ? 'rgba(34, 197, 94, 0.1)' : 'rgba(37, 99, 235, 0.1)';
  };

  if (isLoading) {
    return (
      <div
        ref={containerRef}
        className={`absolute cursor-move ${isSelected ? 'z-20' : 'z-10'}`}
        style={{
          left: `${position.x * scale}px`,
          top: `${position.y * scale}px`,
          width: `${region.width * scale}px`,
          height: `${region.height * scale}px`,
          border: `${Math.max(1, (isSelected ? 3 : 2) * scale)}px solid rgba(156, 163, 175, 0.5)`,
          backgroundColor: 'rgba(156, 163, 175, 0.1)',
          boxSizing: 'border-box',
          touchAction: 'none',
          transformOrigin: 'top left',
        }}
        onClick={(e) => e.stopPropagation()}
        id={`region-${region.id}`}
      >
        <div
          className="absolute px-1 text-xs font-semibold"
          style={{
            backgroundColor: 'rgba(156, 163, 175, 0.5)',
            color: 'white',
            top: '3px',
            left: '3px',
            borderRadius: '2px',
            fontSize: `${Math.max(10, 12 * scale)}px`,
            padding: `${Math.max(1, 2 * scale)}px ${Math.max(2, 4 * scale)}px`
          }}
        >
          {region.name}
        </div>
      </div>
    );
  }
  
  const borderColor = getBorderColor();
  const bgColor = getBackgroundColor();
  const borderWidth = isSelected ? '3px' : '2px';

  return (
    <div
      ref={containerRef}
      className={`absolute cursor-move ${isSelected ? 'z-20' : 'z-10'}`}
      style={{
        left: `${position.x * scale}px`,
        top: `${position.y * scale}px`,
        width: `${region.width * scale}px`,
        height: `${region.height * scale}px`,
        border: `${Math.max(1, parseInt(borderWidth) * scale)}px solid ${borderColor}`,
        backgroundColor: bgColor,
        boxSizing: 'border-box',
        touchAction: 'none',
        transformOrigin: 'top left',
        // Add a data attribute for easy identification when scrolling
        ...(isSelected && { 'data-selected-region': 'true' })
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={(e) => e.stopPropagation()}
      id={`region-${region.id}`}
    >
      <div
        className="absolute px-1 text-xs font-semibold"
        style={{
          backgroundColor: hasText ? (isSelected ? 'rgba(21, 128, 61, 0.9)' : 'rgba(34, 197, 94, 0.8)') : 'rgba(37, 99, 235, 0.8)',
          color: 'white',
          top: '3px',
          left: '3px',
          borderRadius: '2px',
          fontSize: `${Math.max(10, 12 * scale)}px`,
          padding: `${Math.max(1, 2 * scale)}px ${Math.max(2, 4 * scale)}px`
        }}
      >
        {region.name}
      </div>
    </div>
  );
};

export default RegionOverlay;
