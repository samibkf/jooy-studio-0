
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
  SidebarProvider,
  Sidebar as SidebarComponent,
  SidebarContent,
  SidebarTrigger,
} from "@/components/ui/sidebar";

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
    <ScrollArea className="h-full">
      <div className="flex flex-col p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold tracking-tight">Regions</h2>
        </div>
        
        {regions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-2">
            <p className="text-sm">No regions defined yet.</p>
            <p className="text-xs">Draw a region on the PDF to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {regions.map((region) => (
              <div 
                key={region.id} 
                className={`group p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
                  selectedRegion?.id === region.id 
                    ? 'border-primary/50 bg-primary/5 shadow-sm' 
                    : 'border-border/50 hover:border-border hover:bg-accent/5'
                }`}
                onClick={() => onRegionSelect(region.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="font-medium truncate">{region.name || 'Unnamed Region'}</div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation(); 
                      handleDelete(region.id);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Page {region.page}, {region.type}
                </div>
              </div>
            ))}
          </div>
        )}
        
        <Separator className="my-2" />
        
        {selectedRegion && (
          <div className="space-y-5">
            <h3 className="font-semibold text-sm tracking-tight">Region Details</h3>
            
            <div className="space-y-2">
              <Label htmlFor="region-name" className="text-xs text-muted-foreground">Name</Label>
              <Input
                id="region-name"
                value={selectedRegion.name}
                onChange={(e) => handleChange(e, 'name')}
                placeholder="Region name"
                className="h-9"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs text-muted-foreground">Description</Label>
              <Textarea
                id="description"
                value={selectedRegion.description}
                onChange={(e) => handleChange(e, 'description')}
                placeholder="Optional description"
                rows={3}
                className="resize-none"
              />
            </div>
            
            <div className="text-xs space-y-1 text-muted-foreground">
              <div className="flex justify-between">
                <span>Page:</span>
                <span>{selectedRegion.page}</span>
              </div>
              <div className="flex justify-between">
                <span>Position:</span>
                <span>{Math.round(selectedRegion.x)}, {Math.round(selectedRegion.y)}</span>
              </div>
              <div className="flex justify-between">
                <span>Size:</span>
                <span>{Math.round(selectedRegion.width)} × {Math.round(selectedRegion.height)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );

  return (
    <SidebarProvider defaultOpen={false}>
      <SidebarComponent side="right" variant="floating">
        <SidebarContent>
          {sidebarContent}
        </SidebarContent>
      </SidebarComponent>
      <SidebarTrigger className="fixed right-4 top-20 z-50">
        <Button variant="secondary" size="icon">
          <PanelRight className="h-4 w-4" />
        </Button>
      </SidebarTrigger>
    </SidebarProvider>
  );
};

export default Sidebar;
