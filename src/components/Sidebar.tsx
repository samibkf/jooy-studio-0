
import React, { useEffect, useRef } from 'react';
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
    
    // Adjust textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  // Initialize textarea height when region changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [selectedRegion]);

  return (
    <div className="h-full flex flex-col bg-background border-l">
      <div className="flex-1 p-4">
        <Textarea 
          ref={textareaRef}
          value={selectedRegion?.description || ''} 
          onChange={e => handleChange(e, 'description')} 
          placeholder="Add a description..." 
          className="h-auto min-h-[80px] resize-none" 
        />
      </div>
    </div>
  );
};

export default Sidebar;
