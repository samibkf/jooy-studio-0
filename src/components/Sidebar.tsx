
import React, { useRef, useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { Region } from '@/types/regions';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const { t, isRTL } = useLanguage();
  
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
        toast.success(t('document.descriptionSaved'), {
          duration: 2000
        });
      }
    }, 1000);
  };

  const handleDelete = () => {
    if (!selectedRegion) return;
    
    if (confirm(t('document.confirmDelete'))) {
      onRegionDelete(selectedRegion.id);
      toast.success(t('document.regionDeleted'));
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

  // Class that applies proper border based on RTL
  const borderClass = isRTL ? "border-r" : "border-l";

  return (
    <div className={`h-full w-full flex flex-col bg-background ${borderClass}`}>
      {selectedRegion ? (
        <div className="flex flex-col flex-1 p-4 h-full">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium">{selectedRegion.name || t('document.unnamedRegion')}</h3>
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
            <p>{t('document.page')}: {selectedRegion.page}</p>
            <p>{t('document.type')}: {selectedRegion.type}</p>
          </div>
          
          <label className="text-sm font-medium mb-1">{t('sidebar.description')}</label>
          <Textarea 
            ref={textareaRef}
            value={localDescription} 
            onChange={handleChange}
            placeholder={t('sidebar.addDescription')} 
            className="flex-1 w-full min-h-0 resize-none"
            dir="auto" // Allow the textarea to auto-detect direction based on content
          />
          
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">{t('sidebar.otherRegions')}</h4>
            <div className="max-h-48 overflow-y-auto">
              {regions.filter(r => r.id !== selectedRegion.id).map((region) => (
                <div 
                  key={region.id}
                  onClick={() => onRegionSelect(region.id)}
                  className="p-2 hover:bg-accent rounded-md cursor-pointer text-sm transition-colors"
                >
                  {region.name || t('document.unnamedRegion')}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-4 text-muted-foreground">
          <p>{t('sidebar.selectRegion')}</p>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
