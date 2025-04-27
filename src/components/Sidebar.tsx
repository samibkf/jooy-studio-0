
import React, { useRef, useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save, Trash2 } from 'lucide-react';
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
  const [isDirty, setIsDirty] = useState(false);
  
  // Update local description when selected region changes
  useEffect(() => {
    // Handle null description gracefully
    setLocalDescription(selectedRegion?.description || '');
    setIsDirty(false);
  }, [selectedRegion?.id, selectedRegion?.description]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalDescription(e.target.value);
    setIsDirty(true);
  };
  
  const handleSave = () => {
    if (!selectedRegion) return;
    
    // Only update if the description has actually changed
    if (isDirty) {
      onRegionUpdate({
        ...selectedRegion,
        description: localDescription || null // Send null for empty strings
      });
      setIsDirty(false);
      toast.success('Region description saved');
    }
  };

  const handleDelete = () => {
    if (!selectedRegion) return;
    
    // Confirm before deleting
    if (confirm('Are you sure you want to delete this region?')) {
      onRegionDelete(selectedRegion.id);
      toast.success('Region deleted');
    }
  };

  // Prevent keyboard events from interfering with page scrolling
  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    
    // Save on Ctrl+S or Cmd+S
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-background border-l">
      {selectedRegion ? (
        <div className="flex flex-col flex-1 p-4 h-full">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium">{selectedRegion.name || 'Unnamed Region'}</h3>
            <div className="flex gap-2">
              <Button
                variant="outline" 
                size="sm"
                onClick={handleDelete}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleSave}
                disabled={!isDirty}
              >
                <Save className="h-4 w-4 mr-1" /> Save
              </Button>
            </div>
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
            onKeyDown={handleKeyDown}
            placeholder="Add a description..." 
            className="flex-1 w-full min-h-0 resize-none"
          />
          
          {isDirty && (
            <div className="text-xs text-muted-foreground mt-2">
              *Press Save or Ctrl+S to save your changes
            </div>
          )}
          
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
