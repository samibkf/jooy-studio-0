import React, { useRef, useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Trash2, Undo2 } from 'lucide-react';
import { Region } from '@/types/regions';
import { toast } from 'sonner';
import TextInsert from './TextInsert';
import { useTextAssignment } from '@/contexts/TextAssignmentContext';
import { Separator } from '@/components/ui/separator';

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
  const {
    isRegionAssigned,
    undoRegionAssignment
  } = useTextAssignment();

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
  const handleUndoRegionText = () => {
    if (!selectedRegion) return;
    undoRegionAssignment(selectedRegion.id);
    onRegionUpdate({
      ...selectedRegion,
      description: null
    });
    setLocalDescription('');
    toast.success('Text assignment undone');
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);
  return <div className="h-full w-full flex flex-col bg-background border-l" style={{
    width: '400px'
  }}>
      <div className="flex flex-col flex-1 p-4 h-full overflow-y-auto px-[24px] py-[8px] rounded-none">
        {/* Text Insert Section - Always visible */}
        <TextInsert regions={regions} onRegionUpdate={onRegionUpdate} selectedRegion={selectedRegion} onRegionSelect={onRegionSelect} />
        
        {/* Selected Region Info - Only visible when a region is selected */}
        {selectedRegion && <>
            <Separator className="my-4" />
            
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">{selectedRegion.name || 'Unnamed Region'}</h3>
              <div className="flex space-x-2">
                {isRegionAssigned(selectedRegion.id) && <Button variant="outline" size="sm" onClick={handleUndoRegionText} className="text-blue-600 hover:text-blue-800">
                    <Undo2 className="h-4 w-4" />
                  </Button>}
                <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <label className="text-sm font-medium mb-1 mt-4">Text:</label>
            <Textarea ref={textareaRef} value={localDescription} onChange={handleChange} placeholder="Add a description..." className={`w-full min-h-0 h-40 resize-none ${isRegionAssigned(selectedRegion.id) ? 'border-green-500' : ''}`} />
          </>}
      </div>
      
      {/* Select Region Message - Visible when no region is selected */}
      {!selectedRegion && regions.length > 0 && <div className="p-4 border-t text-center">
          <p className="text-sm text-muted-foreground">Select a region to edit its details</p>
        </div>}
    </div>;
};

export default Sidebar;
