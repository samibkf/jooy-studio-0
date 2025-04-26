import React, { useState, useRef, useEffect } from 'react';
import { Region } from '@/types/regions';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { StickyNote } from 'lucide-react';

interface RegionOverlayProps {
  region: Region;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updatedRegion: Region) => void;
  scale: number;
}

const RegionOverlay: React.FC<RegionOverlayProps> = ({
  region,
  isSelected,
  onSelect,
  onUpdate,
  scale,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizing, setResizing] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const scaledStyle = {
    left: region.x * scale,
    top: region.y * scale,
    width: region.width * scale,
    height: region.height * scale,
  };

  // Stop propagation for any textarea interaction
  const handleTextAreaInteraction = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
  };

  // Allow keyboard navigation in textarea while preventing page events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    
    // For arrow keys, only stop propagation but allow default behavior within textarea
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.nativeEvent.stopImmediatePropagation();
    }
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    onUpdate({
      ...region,
      description: e.target.value
    });
  };

  // Add a global keyboard event handler for textarea
  useEffect(() => {
    const manageTextareaKeyEvents = (e: KeyboardEvent) => {
      if (document.activeElement === textareaRef.current && 
          ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.key)) {
        // Stop propagation to prevent page scrolling
        e.stopPropagation();
        
        // Only prevent default at the edge of textarea content to allow internal navigation
        if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && 
            (textareaRef.current.selectionStart === textareaRef.current.value.length ||
             textareaRef.current.selectionStart === 0)) {
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', manageTextareaKeyEvents, { capture: true });
    
    return () => {
      window.removeEventListener('keydown', manageTextareaKeyEvents, { capture: true });
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();

    const target = e.target as HTMLElement;
    if (target.classList.contains('resize-handle')) {
      setResizing(target.dataset.direction || null);
    } else {
      setIsDragging(true);
    }
    
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isDragging && !resizing) return;
    
    if (isDragging) {
      const deltaX = (e.clientX - dragStart.x) / scale;
      const deltaY = (e.clientY - dragStart.y) / scale;
      
      const updatedRegion = {
        ...region,
        x: region.x + deltaX,
        y: region.y + deltaY
      };
      
      onUpdate(updatedRegion);
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (resizing && overlayRef.current) {
      const parentRect = overlayRef.current.parentElement?.getBoundingClientRect();
      if (!parentRect) return;

      const x = (e.clientX - parentRect.left) / scale;
      const y = (e.clientY - parentRect.top) / scale;
      
      let updatedRegion = { ...region };

      switch (resizing) {
        case 'n':
          updatedRegion = {
            ...region,
            y: y,
            height: region.height + (region.y - y)
          };
          break;
        case 's':
          updatedRegion = {
            ...region,
            height: y - region.y
          };
          break;
        case 'e':
          updatedRegion = {
            ...region,
            width: x - region.x
          };
          break;
        case 'w':
          updatedRegion = {
            ...region,
            x: x,
            width: region.width + (region.x - x)
          };
          break;
        case 'ne':
          updatedRegion = {
            ...region,
            y: y,
            height: region.height + (region.y - y),
            width: x - region.x
          };
          break;
        case 'nw':
          updatedRegion = {
            ...region,
            x: x,
            y: y,
            width: region.width + (region.x - x),
            height: region.height + (region.y - y)
          };
          break;
        case 'se':
          updatedRegion = {
            ...region,
            width: x - region.x,
            height: y - region.y
          };
          break;
        case 'sw':
          updatedRegion = {
            ...region,
            x: x,
            width: region.width + (region.x - x),
            height: y - region.y
          };
          break;
      }
      
      if (updatedRegion.width > 10 && updatedRegion.height > 10) {
        onUpdate(updatedRegion);
      }
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
    setResizing(null);
  };
  
  React.useEffect(() => {
    if (isDragging || resizing) {
      window.addEventListener('mousemove', handleMouseMove as any);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove as any);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, resizing]);
  
  return (
    <div
      ref={overlayRef}
      className={`region-overlay ${isSelected ? 'selected' : ''}`}
      style={scaledStyle}
      onClick={onSelect}
      onMouseDown={handleMouseDown}
    >
      {isSelected && (
        <>
          <div className="resize-handle n" data-direction="n" />
          <div className="resize-handle s" data-direction="s" />
          <div className="resize-handle e" data-direction="e" />
          <div className="resize-handle w" data-direction="w" />
          <div className="resize-handle ne" data-direction="ne" />
          <div className="resize-handle nw" data-direction="nw" />
          <div className="resize-handle se" data-direction="se" />
          <div className="resize-handle sw" data-direction="sw" />
          
          <div className="absolute -top-8 right-0 flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8 bg-yellow-400 hover:bg-yellow-500"
                >
                  <StickyNote 
                    className="h-6 w-6" 
                    color="#10B981"
                    strokeWidth={2}
                  />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="top" className="w-80 max-h-[300px] overflow-auto" onClick={handleTextAreaInteraction}>
                <div className="space-y-2">
                  <h4 className="font-medium">Region Description</h4>
                  <Textarea
                    ref={textareaRef}
                    placeholder="Add a description..."
                    value={region.description}
                    onChange={handleDescriptionChange}
                    onMouseDown={handleTextAreaInteraction}
                    onDoubleClick={handleTextAreaInteraction}
                    onKeyDown={handleKeyDown}
                    rows={5}
                    className="min-h-[100px]"
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs px-1 truncate">
        {region.name || 'Unnamed Region'}
      </div>
    </div>
  );
};

export default RegionOverlay;
