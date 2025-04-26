
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

  // Prevent event propagation for keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Stop event bubbling for all keyboard events
    e.stopPropagation();
    
    // For arrow keys, we want to make sure they only control the textarea
    // and don't affect page scrolling
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      // Let the default behavior happen inside the textarea
      // but prevent it from affecting the parent containers
      e.nativeEvent.stopImmediatePropagation();
    }
  };

  // Prevent mouse wheel events from propagating when cursor is in textarea
  const handleWheel = (e: React.WheelEvent) => {
    // Only stop propagation if the textarea is focused
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

  // Prevent the page from scrolling when arrow keys are pressed in the textarea
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement === textareaRef.current && 
          ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
    };
  }, []);

  return (
    <div className="h-full flex flex-col bg-background border-l">
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="p-4 pb-20"> {/* Add bottom padding to prevent toolbar overlap */}
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
