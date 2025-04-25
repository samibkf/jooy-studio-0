
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Region } from '@/types/regions';
import { X, PanelRight } from 'lucide-react';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetClose,
} from "@/components/ui/sheet";

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
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, 
    field: keyof Region
  ) => {
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

  const sidebarContent = (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Regions</h2>
      </div>
      
      {regions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No regions defined yet.</p>
          <p className="text-sm mt-2">Draw a region on the PDF to get started.</p>
        </div>
      ) : (
        <ScrollArea className="flex-1 max-h-[70vh]">
          <div className="space-y-3 pr-4">
            {regions.map((region) => (
              <div 
                key={region.id} 
                className={`p-4 rounded-md border cursor-pointer transition-colors ${
                  selectedRegion?.id === region.id 
                    ? 'border-primary bg-primary/5' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => onRegionSelect(region.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="font-medium truncate">{region.name || 'Unnamed Region'}</div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100"
                    onClick={(e) => {
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
      
      <Separator className="my-4" />
      
      {selectedRegion && (
        <div className="space-y-4">
          <h3 className="font-medium text-sm">Region Details</h3>
          
          <div className="space-y-2">
            <Label htmlFor="region-name" className="text-sm">Name</Label>
            <Input
              id="region-name"
              value={selectedRegion.name}
              onChange={(e) => handleChange(e, 'name')}
              placeholder="Region name"
              className="h-8"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm">Description</Label>
            <Textarea
              id="description"
              value={selectedRegion.description}
              onChange={(e) => handleChange(e, 'description')}
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
      )}
    </div>
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="icon"
          className="fixed right-4 top-20 z-50 shadow-md hover:bg-primary/10"
        >
          <PanelRight className="h-4 w-4" />
          <span className="sr-only">Open regions panel</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        className="w-[350px] sm:w-[450px] p-6 overflow-y-auto pointer-events-auto"
        onInteractOutside={(e) => {
          // Prevent closing the sheet when clicking outside
          e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          // Prevent closing the sheet when clicking outside
          e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          // Prevent closing the sheet with escape key
          e.preventDefault();
        }}
      >
        {sidebarContent}
        <SheetClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </SheetClose>
      </SheetContent>
    </Sheet>
  );
};

export default Sidebar;
