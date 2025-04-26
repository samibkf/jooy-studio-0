
import React from 'react';
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
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>, field: keyof Region) => {
    if (!selectedRegion) return;
    const updatedRegion = {
      ...selectedRegion,
      [field]: e.target.value
    };
    onRegionUpdate(updatedRegion);
  };

  return (
    <div className="h-full flex flex-col bg-background border-l">
      <div className="flex-1 p-4">
        <Textarea 
          value={selectedRegion?.description || ''} 
          onChange={e => handleChange(e, 'description')} 
          placeholder="Add a description..." 
          className="h-full resize-none" 
        />
      </div>
    </div>
  );
};

export default Sidebar;
