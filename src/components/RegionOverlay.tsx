
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

  // Track assignment state with more reliable checking
  const [hasText, setHasText] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState(0);
  
  useEffect(() => {
    if (isReady && !isLoading && documentId) {
      const now = Date.now();
      // Only check every 500ms to prevent excessive checking
      if (now - lastCheckTime > 500) {
        console.log(`🔍 Checking assignment for region ${region.id} (${region.name})`);
        
        const assigned = isRegionAssigned(region.id, documentId);
        console.log(`📍 Region ${region.id} assignment: ${assigned}`);
        
        setHasText(assigned);
        setLastCheckTime(now);
      }
    }
  }, [isReady, isLoading, region.id, documentId, isRegionAssigned, lastCheckTime]);

  // Update position when region changes
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

  // Enhanced color logic with better contrast
  const getBorderColor = () => {
    if (!isReady || isLoading) {
      return 'rgba(156, 163, 175, 0.5)'; // Gray while loading
    }
    
    if (isSelected) {
      return hasText ? 'rgba(15, 118, 110, 1)' : 'rgba(29, 78, 216, 1)'; // Teal or blue for selected
    }
    return hasText ? 'rgba(34, 197, 94, 0.8)' : 'rgba(59, 130, 246, 0.8)'; // Green or blue
  };
  
  const getBackgroundColor = () => {
    if (!isReady || isLoading) {
      return 'rgba(156, 163, 175, 0.1)'; // Gray while loading
    }
    
    if (isSelected) {
      return hasText ? 'rgba(15, 118, 110, 0.25)' : 'rgba(29, 78, 216, 0.2)'; // Teal or blue for selected
    }
    return hasText ? 'rgba(34, 197, 94, 0.1)' : 'rgba(59, 130, 246, 0.1)'; // Green or blue
  };

  const getLabelBackgroundColor = () => {
    if (!isReady || isLoading) {
      return 'rgba(156, 163, 175, 0.8)'; // Gray while loading
    }
    
    return hasText ? 
      (isSelected ? 'rgba(15, 118, 110, 0.9)' : 'rgba(34, 197, 94, 0.9)') : 
      'rgba(59, 130, 246, 0.9)';
  };

  // Show loading state while context is initializing
  if (!isReady || isLoading) {
    return (
      <div
        ref={containerRef}
        className={`absolute cursor-move ${isSelected ? 'z-20' : 'z-10'}`}
        style={{
          left: `${position.x * scale}px`,
          top: `${position.y * scale}px`,
          width: `${region.width * scale}px`,
          height: `${region.height * scale}px`,
          border: `${Math.max(1, (isSelected ? 3 : 2) * scale)}px solid ${getBorderColor()}`,
          backgroundColor: getBackgroundColor(),
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
            backgroundColor: getLabelBackgroundColor(),
            color: 'white',
            top: '3px',
            left: '3px',
            borderRadius: '2px',
            fontSize: `${Math.max(10, 12 * scale)}px`,
            padding: `${Math.max(1, 2 * scale)}px ${Math.max(2, 4 * scale)}px`
          }}
        >
          Loading...
        </div>
      </div>
    );
  }
  
  const borderColor = getBorderColor();
  const bgColor = getBackgroundColor();
  const labelBgColor = getLabelBackgroundColor();
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
        transition: 'border-color 0.2s ease, background-color 0.2s ease',
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
          backgroundColor: labelBgColor,
          color: 'white',
          top: '3px',
          left: '3px',
          borderRadius: '2px',
          fontSize: `${Math.max(10, 12 * scale)}px`,
          padding: `${Math.max(1, 2 * scale)}px ${Math.max(2, 4 * scale)}px`,
          transition: 'background-color 0.2s ease'
        }}
      >
        {region.name} {hasText && '✓'}
      </div>
    </div>
  );
};

export default RegionOverlay;
