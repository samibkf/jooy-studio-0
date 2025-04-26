
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
    
    // Adjust textarea height
    adjustTextareaHeight();
  };

  // Function to adjust the textarea height
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.max(80, textareaRef.current.scrollHeight);
      textareaRef.current.style.height = `${newHeight}px`;
      setTextHeight(newHeight);
    }
  };

  // Handle keyboard events to prevent propagation but allow textarea functionality
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Only stop propagation but don't prevent default for arrow keys in the textarea
    // This allows the arrow keys to work within the textarea
    e.stopPropagation();
    
    // For arrow keys, use stronger prevention methods if they would scroll the page
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      // This prevents the event from bubbling up
      e.nativeEvent.stopImmediatePropagation();
      
      // Don't call preventDefault here as it would block arrow key functionality in textarea
    }
  };

  // Prevent mouse wheel events from propagating when cursor is in textarea
  const handleWheel = (e: React.WheelEvent) => {
    // Stop wheel events when textarea is focused
    if (document.activeElement === textareaRef.current) {
      e.stopPropagation();
    }
  };

  // Initialize textarea height when region changes
  useEffect(() => {
    if (textareaRef.current && selectedRegion) {
      // Brief timeout to ensure content is rendered before measuring
      setTimeout(adjustTextareaHeight, 0);
    }
  }, [selectedRegion]);

  // Add a global keyboard event handler to manage arrow keys behavior
  useEffect(() => {
    const preventArrowScrollPage = (e: KeyboardEvent) => {
      if (document.activeElement === textareaRef.current && 
          ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.key)) {
        
        // Only prevent default browser scrolling behavior on page level
        // while still allowing the textarea to handle the keys internally
        if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && 
            (textareaRef.current.selectionStart === textareaRef.current.value.length ||
             textareaRef.current.selectionStart === 0)) {
          e.preventDefault();
        }
        
        // Always stop propagation to prevent other handlers from interfering
        e.stopPropagation();
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
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="p-4 pb-20">
          <Textarea 
            ref={textareaRef}
            value={selectedRegion?.description || ''} 
            onChange={e => handleChange(e, 'description')}
            onKeyDown={handleKeyDown}
            onWheel={handleWheel}
            placeholder="Add a description..." 
            className="h-auto min-h-[80px] w-full resize-none" 
          />
        </div>
      </ScrollArea>
    </div>
  );
};

export default Sidebar;
