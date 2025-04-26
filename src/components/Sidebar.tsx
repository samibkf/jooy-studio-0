
import React, { useRef, useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Region } from '@/types/regions';

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
  const [localDescription, setLocalDescription] = useState<string>('');
  
  // Update local description when selected region changes
  useEffect(() => {
    // Handle null description gracefully
    setLocalDescription(selectedRegion?.description || '');
  }, [selectedRegion?.id, selectedRegion?.description]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalDescription(e.target.value);
  };
  
  const handleBlur = () => {
    if (!selectedRegion) return;
    
    // Only update if the description has actually changed
    if (localDescription !== selectedRegion.description) {
      onRegionUpdate({
        ...selectedRegion,
        description: localDescription
      });
    }
  };

  // Prevent keyboard events from interfering with page scrolling
  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="h-full w-full flex flex-col bg-background border-l">
      {selectedRegion ? (
        <div className="flex flex-col flex-1 p-4 h-full">
          <Textarea 
            ref={textareaRef}
            value={localDescription} 
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="Add a description..." 
            className="flex-1 w-full min-h-0"
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-4 text-muted-foreground">
          <p>Select a region to view or edit its description</p>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
