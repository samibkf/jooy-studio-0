
import React, { useEffect, useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Region } from '@/types/regions';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SidebarProps {
  selectedRegion: Region | null;
  regions: Region[];
  onRegionUpdate: (updatedRegion: Region) => void;
  onRegionDelete: (regionId: string) => void;
  onRegionSelect: (regionId: string) => void;
}

const Sidebar = ({
  selectedRegion,
  onRegionUpdate
}: SidebarProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [textHeight, setTextHeight] = useState<number>(80);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>, field: keyof Region) => {
    if (!selectedRegion) return;
    const updatedRegion = {
      ...selectedRegion,
      [field]: e.target.value
    };
    onRegionUpdate(updatedRegion);
  };

  // Handle keyboard events to prevent propagation but allow textarea functionality
  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    
    // For arrow keys, prevent default only if they would scroll the page
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      // This prevents the event from bubbling up
      e.nativeEvent.stopImmediatePropagation();
    }
  };

  // Prevent mouse wheel events from propagating when cursor is in textarea
  const handleWheel = (e: React.WheelEvent) => {
    // Stop wheel events when textarea is focused
    if (document.activeElement === textareaRef.current) {
      e.stopPropagation();
    }
  };

  // Add a global keyboard event handler to manage arrow keys behavior
  useEffect(() => {
    const preventArrowScrollPage = (e: KeyboardEvent) => {
      if (document.activeElement === textareaRef.current && 
          ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.key)) {
        
        // Stop propagation to prevent other handlers from interfering
        e.stopPropagation();
        
        // Don't prevent default for arrow keys within the textarea
        // This allows normal navigation within the text
      }
    };

    // Using capture phase to intercept events before they reach other handlers
    window.addEventListener('keydown', preventArrowScrollPage, { capture: true });
    
    return () => {
      window.removeEventListener('keydown', preventArrowScrollPage, { capture: true });
    };
  }, []);

  return (
    <div className="h-full flex flex-col bg-background border-l">
      <div className="flex-1 p-4 overflow-hidden">
        {selectedRegion && (
          <Textarea 
            ref={textareaRef}
            value={selectedRegion?.description || ''} 
            onChange={e => handleChange(e, 'description')}
            onKeyDown={handleKeyDown}
            onWheel={handleWheel}
            placeholder="Add a description..." 
            className="h-full w-full min-h-[calc(100%-16px)]" 
            style={{height: 'calc(100% - 16px)'}}
          />
        )}
      </div>
    </div>
  );
};

export default Sidebar;
