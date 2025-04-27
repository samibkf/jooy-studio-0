
import React, { useRef, useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { Region } from '@/types/regions';
import { toast } from 'sonner';

interface SidebarProps {
  selectedRegion: Region | null;
  regions: Region[];
  onRegionUpdate: (updatedRegion: Region) => void;
  onRegionDelete: (regionId: string) => void;
  onRegionSelect: (regionId: string) => void;
}

const Sidebar = ({
  selectedRegion,
  regions,
  onRegionUpdate,
  onRegionDelete,
  onRegionSelect
}: SidebarProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localDescription, setLocalDescription] = useState<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Update local description when selected region changes
  useEffect(() => {
    setLocalDescription(selectedRegion?.description || '');
  }, [selectedRegion?.id, selectedRegion?.description]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDescription = e.target.value;
    setLocalDescription(newDescription);
    
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout to save after 1 second of no typing
    saveTimeoutRef.current = setTimeout(() => {
      if (selectedRegion) {
        onRegionUpdate({
          ...selectedRegion,
          description: newDescription || null
        });
        toast.success('Description saved', {
          duration: 2000
        });
      }
    }, 1000);
  };

  const handleDelete = () => {
    if (!selectedRegion) return;
    
    if (confirm('Are you sure you want to delete this region?')) {
      onRegionDelete(selectedRegion.id);
      toast.success('Region deleted');
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="h-full w-full flex flex-col bg-background border-l">
      {selectedRegion ? (
        <div className="flex flex-col flex-1 p-4 h-full">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium">{selectedRegion.name || 'Unnamed Region'}</h3>
            <Button
              variant="outline" 
              size="sm"
              onClick={handleDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground mb-2">
            <p>Page: {selectedRegion.page}</p>
            <p>Type: {selectedRegion.type}</p>
          </div>
          
          <label className="text-sm font-medium mb-1">Description</label>
          <Textarea 
            ref={textareaRef}
            value={localDescription} 
            onChange={handleChange}
            placeholder="Add a description..." 
            className="flex-1 w-full min-h-0 resize-none"
          />
          
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Other regions</h4>
            <div className="max-h-48 overflow-y-auto">
              {regions.filter(r => r.id !== selectedRegion.id).map((region) => (
                <div 
                  key={region.id}
                  onClick={() => onRegionSelect(region.id)}
                  className="p-2 hover:bg-accent rounded-md cursor-pointer text-sm transition-colors"
                >
                  {region.name || 'Unnamed Region'}
                </div>
              ))}
            </div>
          </div>
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
