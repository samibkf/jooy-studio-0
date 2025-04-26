
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
    // Stop propagation for all keyboard events to prevent backspace from deleting the region
    // and prevent arrow keys from scrolling the page
    e.stopPropagation();
  };

  // Initialize textarea height when region changes
  useEffect(() => {
    if (textareaRef.current && selectedRegion) {
      // Brief timeout to ensure content is rendered before measuring
      setTimeout(adjustTextareaHeight, 0);
    }
  }, [selectedRegion]);

  return (
    <div className="h-full flex flex-col bg-background border-l">
      <ScrollArea className="flex-1">
        <div className="p-4 pb-20"> {/* Add bottom padding to prevent toolbar overlap */}
          <Textarea 
            ref={textareaRef}
            value={selectedRegion?.description || ''} 
            onChange={e => handleChange(e, 'description')}
            onKeyDown={handleKeyDown}
            placeholder="Add a description..." 
            className="h-auto min-h-[80px] w-full resize-none" 
          />
        </div>
      </ScrollArea>
    </div>
  );
};

export default Sidebar;
