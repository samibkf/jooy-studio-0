import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Region } from '@/types/regions';
import { X } from 'lucide-react';

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
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: keyof Region) => {
    if (!selectedRegion) return;
    const updatedRegion = {
      ...selectedRegion,
      [field]: e.target.value
    };
    onRegionUpdate(updatedRegion);
  };

  const handleDelete = (regionId: string) => {
    onRegionDelete(regionId);
    toast.success('Region deleted');
  };

  return (
    <div className="h-full flex flex-col bg-background border-l">
      <div className="flex-none p-4 border-b">
        <h2 className="font-semibold text-base">Regions</h2>
      </div>
      
      {regions.length === 0 ? (
        <div className="flex-none text-center text-gray-500 px-4 py-[55px]">
          <p>No regions defined yet.</p>
          <p className="text-sm mt-2">Draw a region on the PDF to get started.</p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-3 p-4">
            {regions.map(region => (
              <div 
                key={region.id} 
                className={`p-4 rounded-md border cursor-pointer transition-colors group ${
                  selectedRegion?.id === region.id ? 'border-primary bg-primary/5' : 'border-gray-200 hover:bg-gray-50'
                }`} 
                onClick={() => onRegionSelect(region.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="font-medium truncate">{region.name || 'Unnamed Region'}</div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100" 
                    onClick={e => {
                      e.stopPropagation();
                      handleDelete(region.id);
                    }}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Page {region.page}, {region.type}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
      
      <Separator className="flex-none" />
      
      {selectedRegion && (
        <ScrollArea className="flex-none p-4 max-h-[300px]">
          <div className="space-y-4">
            <h3 className="font-medium text-sm">Region Details</h3>
            
            <div className="space-y-2">
              <Label htmlFor="region-name" className="text-sm">Name</Label>
              <Input 
                id="region-name" 
                value={selectedRegion.name} 
                onChange={e => handleChange(e, 'name')} 
                placeholder="Region name" 
                className="h-8" 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm">Description</Label>
              <Textarea 
                id="description" 
                value={selectedRegion.description} 
                onChange={e => handleChange(e, 'description')} 
                placeholder="Optional description" 
                className="resize-none" 
                rows={3} 
              />
            </div>
            
            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              <div>Page: {selectedRegion.page}</div>
              <div>Position: {Math.round(selectedRegion.x)}, {Math.round(selectedRegion.y)}</div>
              <div>Size: {Math.round(selectedRegion.width)} × {Math.round(selectedRegion.height)}</div>
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default Sidebar;
