
import React, { useState, useRef, useEffect } from 'react';
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
  
  // Update position when region changes
  useEffect(() => {
    setPosition({
      x: region.x,
      y: region.y
    });
  }, [region.x, region.y]);

  // Scroll region into view if it's selected and has the data-scroll-into-view attribute
  useEffect(() => {
    if (isSelected && containerRef.current && containerRef.current.hasAttribute('data-scroll-into-view')) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Remove the attribute after scrolling to prevent continuous scrolling
      containerRef.current.removeAttribute('data-scroll-into-view');
    }
  }, [isSelected]);
  
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

  // Set different border and background colors based on selection and text assignment status
  const getBorderColor = () => {
    if (isSelected) {
      return hasText ? 'rgba(148, 87, 235, 0.8)' : '#2563eb'; // Purple for selected with text, blue for selected without text
    }
    return hasText ? 'rgba(34, 197, 94, 0.8)' : 'rgba(37, 99, 235, 0.8)'; // Green for unselected with text, blue for unselected without text
  };

  const getBgColor = () => {
    if (isSelected) {
      return hasText ? 'rgba(148, 87, 235, 0.2)' : 'rgba(37, 99, 235, 0.2)'; // Light purple for selected with text, light blue for selected without text
    }
    return hasText ? 'rgba(34, 197, 94, 0.1)' : 'rgba(37, 99, 235, 0.1)'; // Light green for unselected with text, light blue for unselected without text
  };

  const borderColor = getBorderColor();
  const bgColor = getBgColor();
  const borderWidth = isSelected ? '3px' : '2px';

  return (
    <div
      ref={containerRef}
      className={`absolute cursor-move ${isSelected ? 'z-20' : 'z-10'}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${region.width}px`,
        height: `${region.height}px`,
        border: `${borderWidth} solid ${borderColor}`,
        backgroundColor: bgColor,
        boxSizing: 'border-box',
        touchAction: 'none',
        transformOrigin: 'top left',
        transform: `scale(${scale})`
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
          borderRadius: '2px',
          transform: `scale(${1/scale})`,
          transformOrigin: 'top left'
        }}
      >
        {region.name}
      </div>
    </div>
  );
};

export default RegionOverlay;
