
import React, { useRef } from 'react';
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

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>, field: keyof Region) => {
    if (!selectedRegion) return;
    const updatedRegion = {
      ...selectedRegion,
      [field]: e.target.value
    };
    onRegionUpdate(updatedRegion);
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
            value={selectedRegion.description || ''} 
            onChange={e => handleChange(e, 'description')}
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
