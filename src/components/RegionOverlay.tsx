import React, { useState, useRef } from 'react';
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
  
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate({
      ...region,
      description: e.target.value
    });
  };

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
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
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

      const x = e.clientX - parentRect.left;
      const y = e.clientY - parentRect.top;
      
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
    <>
      {region.type === 'polygon' && region.points ? (
        <div
          className={`region-overlay ${isSelected ? 'selected' : ''}`}
          style={{
            left: region.x,
            top: region.y,
            width: region.width,
            height: region.height,
            background: 'none',
            border: 'none',
          }}
          onClick={onSelect}
        >
          <svg className="absolute top-0 left-0 w-full h-full">
            <path
              d={`M ${region.points.map(p => `${p.x},${p.y}`).join(' L ')} Z`}
              fill="rgba(155, 135, 245, 0.1)"
              stroke={isSelected ? '#7b66d9' : '#9b87f5'}
              strokeWidth="2"
            />
          </svg>
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
              <PopoverContent side="top" className="w-80">
                <div className="space-y-2">
                  <h4 className="font-medium">Region Description</h4>
                  <Textarea
                    placeholder="Add a description..."
                    value={region.description}
                    onChange={handleDescriptionChange}
                    rows={3}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs px-1 truncate">
            {region.name || 'Unnamed Region'}
          </div>
        </div>
      ) : region.type === 'circle' ? (
        <div
          className={`region-overlay ${isSelected ? 'selected' : ''} rounded-full`}
          style={{
            left: region.x,
            top: region.y,
            width: region.width,
            height: region.height,
          }}
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
                  <PopoverContent side="top" className="w-80">
                    <div className="space-y-2">
                      <h4 className="font-medium">Region Description</h4>
                      <Textarea
                        placeholder="Add a description..."
                        value={region.description}
                        onChange={handleDescriptionChange}
                        rows={3}
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
      ) : (
        <div
          className={`region-overlay ${isSelected ? 'selected' : ''}`}
          style={{
            left: region.x,
            top: region.y,
            width: region.width,
            height: region.height,
          }}
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
                  <PopoverContent side="top" className="w-80">
                    <div className="space-y-2">
                      <h4 className="font-medium">Region Description</h4>
                      <Textarea
                        placeholder="Add a description..."
                        value={region.description}
                        onChange={handleDescriptionChange}
                        rows={3}
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
      )}
    </>
  );
};

export default RegionOverlay;
