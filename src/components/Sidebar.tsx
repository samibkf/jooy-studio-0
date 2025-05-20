import React, { useRef, useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Trash2, Undo2 } from 'lucide-react';
import { Region } from '@/types/regions';
import { toast } from 'sonner';
import TextInsert from './TextInsert';
import DraggableText from './DraggableText';
import { useTextAssignment } from '@/contexts/TextAssignmentContext';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const { isRegionAssigned, undoRegionAssignment } = useTextAssignment();
  const [activeTab, setActiveTab] = useState<string>(selectedRegion ? 'edit' : 'insert');
  
  // Update local description when selected region changes
  useEffect(() => {
    setLocalDescription(selectedRegion?.description || '');
    setActiveTab(selectedRegion ? 'edit' : 'insert');
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

  return (
    <div className="h-full w-full flex flex-col bg-background border-l">
      <div className="flex flex-col flex-1 p-4 h-full">
        <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-2">
            {selectedRegion && <TabsTrigger value="edit">Edit Region</TabsTrigger>}
            <TabsTrigger value="insert">Insert Text</TabsTrigger>
          </TabsList>
          
          {selectedRegion && (
            <TabsContent value="edit" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">{selectedRegion.name || 'Unnamed Region'}</h3>
                <div className="flex space-x-2">
                  {isRegionAssigned(selectedRegion.id) && (
                    <Button
                      variant="outline" 
                      size="sm"
                      onClick={handleUndoRegionText}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Undo2 className="h-4 w-4 mr-1" />
                    </Button>
                  )}
                  <Button
                    variant="outline" 
                    size="sm"
                    onClick={handleDelete}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground mb-2">
                <p>Page: {selectedRegion.page}</p>
                <p>Type: {selectedRegion.type}</p>
              </div>

              <DraggableText region={selectedRegion} onRegionUpdate={onRegionUpdate} />
              
              <label className="text-sm font-medium mb-1">Description</label>
              <Textarea 
                ref={textareaRef}
                value={localDescription} 
                onChange={handleChange}
                placeholder="Add a description..." 
                className={`flex-1 w-full min-h-0 resize-none ${
                  isRegionAssigned(selectedRegion.id) ? 'border-green-500' : ''
                }`}
              />
              
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Other regions</h4>
                <div className="max-h-48 overflow-y-auto">
                  {regions.filter(r => r.id !== selectedRegion.id).map((region) => (
                    <div 
                      key={region.id}
                      onClick={() => onRegionSelect(region.id)}
                      className={`p-2 hover:bg-accent rounded-md cursor-pointer text-sm transition-colors ${
                        isRegionAssigned(region.id) ? 'border-l-4 border-green-500' : ''
                      }`}
                    >
                      {region.name || 'Unnamed Region'}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          )}
          
          <TabsContent value="insert">
            <TextInsert regions={regions} onRegionUpdate={onRegionUpdate} selectedRegion={selectedRegion} />
          </TabsContent>
        </Tabs>
      </div>
      
      {!selectedRegion && regions.length > 0 && (
        <div className="p-4 border-t">
          <h4 className="text-sm font-medium mb-2">Select a region</h4>
          <div className="max-h-40 overflow-y-auto">
            {regions.map((region) => (
              <div 
                key={region.id}
                onClick={() => onRegionSelect(region.id)}
                className={`p-2 hover:bg-accent rounded-md cursor-pointer text-sm transition-colors ${
                  isRegionAssigned(region.id) ? 'border-l-4 border-green-500' : ''
                }`}
              >
                {region.name || 'Unnamed Region'}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
