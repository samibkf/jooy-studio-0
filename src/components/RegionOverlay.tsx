
import React, { useState, useRef } from 'react';
import { Region } from '@/types/regions';
import { useTextAssignment } from '@/contexts/TextAssignmentContext';

interface RegionOverlayProps {
  region: Region;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (region: Region) => void;
  scale: number;
}

const RegionOverlay: React.FC<RegionOverlayProps> = ({
  region,
  isSelected,
  onSelect,
  onUpdate,
  scale
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: region.x, y: region.y });
  const containerRef = useRef<HTMLDivElement>(null);
  const { isRegionAssigned } = useTextAssignment();

  const hasText = isRegionAssigned(region.id);
  
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

  // Set correct border and background colors based on selection and assignment
  const borderColor = isSelected ? '#2563eb' : hasText ? 'rgba(34, 197, 94, 0.8)' : 'rgba(37, 99, 235, 0.8)';
  const bgColor = isSelected ? 'rgba(37, 99, 235, 0.2)' : hasText ? 'rgba(34, 197, 94, 0.1)' : 'rgba(37, 99, 235, 0.1)';
  const borderWidth = isSelected ? '3px' : '2px';

  // Update the DOM element position when the region coordinates change
  React.useEffect(() => {
    setPosition({
      x: region.x,
      y: region.y
    });
  }, [region.x, region.y]);

  return (
    <div
      ref={containerRef}
      className={`absolute cursor-move ${isSelected ? 'z-20' : 'z-10'}`}
      style={{
        left: position.x,
        top: position.y,
        width: region.width,
        height: region.height,
        border: `${borderWidth} solid ${borderColor}`,
        backgroundColor: bgColor,
        boxSizing: 'border-box',
        touchAction: 'none'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="absolute px-1 text-xs font-semibold"
        style={{
          backgroundColor: hasText ? 'rgba(34, 197, 94, 0.8)' : 'rgba(37, 99, 235, 0.8)',
          color: 'white',
          top: '3px',
          left: '3px',
          borderRadius: '2px'
        }}
      >
        {region.name}
      </div>
    </div>
  );
};

export default RegionOverlay;
