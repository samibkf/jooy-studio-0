
import React, { useRef, useState, useEffect, useContext } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Trash2, Undo2, SquarePen } from 'lucide-react';
import { Region } from '@/types/regions';
import { toast } from 'sonner';
import TextInsert from './TextInsert';
import { TextAssignmentContext } from '@/contexts/TextAssignmentContext';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/contexts/LanguageContext';

interface SidebarProps {
  selectedRegion: Region | null;
  regions: Region[];
  onRegionUpdate: (updatedRegion: Region) => void;
  onRegionDelete: (regionId: string) => void;
  onRegionSelect: (regionId: string) => void;
  documentId: string | null;
  currentPage: number;
}

const Sidebar = ({
  selectedRegion,
  regions,
  onRegionUpdate,
  onRegionDelete,
  onRegionSelect,
  documentId,
  currentPage
}: SidebarProps) => {
  const { t, isRTL } = useLanguage();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localDescription, setLocalDescription] = useState<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const [showManualInsert, setShowManualInsert] = useState(false);
  
  const textAssignmentContext = useContext(TextAssignmentContext);
  
  if (!textAssignmentContext) {
    console.error('TextAssignmentContext is not available');
    return (
      <div className="h-full w-full flex flex-col bg-background border-l" style={{ width: '400px' }}>
        <div className="flex flex-col flex-1 p-4 h-full overflow-y-auto px-[24px] py-[8px] rounded-none">
          <div className="flex items-center justify-center h-full">
            <p className={`text-muted-foreground ${isRTL ? 'rtl-text' : ''}`}>{t('sidebar.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  const { isRegionAssigned, undoRegionAssignment } = textAssignmentContext;

  useEffect(() => {
    setLocalDescription(selectedRegion?.description || '');
  }, [selectedRegion?.id, selectedRegion?.description]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDescription = e.target.value;
    setLocalDescription(newDescription);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (selectedRegion) {
        onRegionUpdate({
          ...selectedRegion,
          description: newDescription || null
        });
        toast.success(t('sidebar.description_saved'), {
          duration: 2000
        });
      }
    }, 1000);
  };

  const handleDelete = () => {
    if (!selectedRegion) return;
    if (confirm(t('sidebar.delete_region_confirm'))) {
      onRegionDelete(selectedRegion.id);
      toast.success(t('sidebar.region_deleted'));
    }
  };

  const handleUndoRegionText = () => {
    if (!selectedRegion || !documentId) return;
    undoRegionAssignment(selectedRegion.id, documentId);
    onRegionUpdate({
      ...selectedRegion,
      description: null
    });
    setLocalDescription('');
    toast.success(t('sidebar.text_assignment_undone'));
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="h-full w-full flex flex-col bg-background border-l" style={{
      width: '400px'
    }}>
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className={`text-lg font-semibold ${isRTL ? 'rtl-text' : ''}`}>{t('sidebar.content_tools')}</h2>
        <Button variant="ghost" size="icon" onClick={() => setShowManualInsert(prev => !prev)}>
          <SquarePen className="h-5 w-5" />
          <span className="sr-only">{t('sidebar.toggle_manual_input')}</span>
        </Button>
      </div>

      <div className="flex flex-col flex-1 p-4 h-full overflow-y-auto">
        <TextInsert 
          regions={regions} 
          onRegionUpdate={onRegionUpdate} 
          selectedRegion={selectedRegion} 
          onRegionSelect={onRegionSelect}
          documentId={documentId}
          currentPage={currentPage}
          showManualInsert={showManualInsert}
        />
        
        {selectedRegion && (
          <>
            <Separator className="my-4" />
            
            <div className="flex justify-between items-center">
              <h3 className={`text-lg font-medium ${isRTL ? 'rtl-text' : ''}`}>{selectedRegion.name || t('sidebar.unnamed_region')}</h3>
              <div className="flex gap-2">
                {documentId && isRegionAssigned(selectedRegion.id, documentId) && (
                  <Button variant="outline" size="sm" onClick={handleUndoRegionText} className="text-blue-600 hover:text-blue-800">
                    <Undo2 className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <label className={`text-sm font-medium mb-1 mt-4 ${isRTL ? 'rtl-text' : ''}`}>{t('sidebar.text_label')}</label>
            <Textarea 
              ref={textareaRef} 
              value={localDescription} 
              onChange={handleChange} 
              placeholder={t('sidebar.add_description')}
              className={`w-full min-h-0 h-24 resize-none ${
                documentId && isRegionAssigned(selectedRegion.id, documentId) ? 'border-green-500' : ''
              } ${isRTL ? 'rtl-text' : ''}`}
            />
          </>
        )}
      </div>
      
      {!selectedRegion && (
        <div className="p-4 border-t text-center">
          <p className={`text-sm text-muted-foreground ${isRTL ? 'rtl-text' : ''}`}>{t('sidebar.select_region')}</p>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
