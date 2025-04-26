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
    <div className="h-full flex flex-col bg-background border-l">
      {selectedRegion && (
        <div className="flex-1 p-4">
          <div className="h-full w-full">
            <Textarea 
              ref={textareaRef}
              value={selectedRegion?.description || ''} 
              onChange={e => handleChange(e, 'description')}
              onKeyDown={handleKeyDown}
              placeholder="Add a description..." 
              className="w-full h-full resize-none overflow-y-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
