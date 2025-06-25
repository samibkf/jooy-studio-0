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
import RTLButtonIcon from './RTLButtonIcon';

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
            <p className="text-muted-foreground" dir={isRTL ? 'rtl' : 'ltr'}>{t('sidebar.loading')}</p>
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
      <div className={`flex items-center p-4 border-b ${isRTL ? 'rtl-justify-between' : 'ltr-justify-between'}`}>
        <h2 className="text-lg font-semibold" dir={isRTL ? 'rtl' : 'ltr'}>{t('sidebar.content_tools')}</h2>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setShowManualInsert(prev => !prev)}
          className={isRTL ? 'rtl-button-flex' : 'ltr-button-flex'}
        >
          <RTLButtonIcon>
            <SquarePen className="h-5 w-5" />
          </RTLButtonIcon>
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
            
            <div className={`flex items-center ${isRTL ? 'rtl-justify-between' : 'ltr-justify-between'}`}>
              <h3 className="text-lg font-medium" dir={isRTL ? 'rtl' : 'ltr'}>{selectedRegion.name || t('sidebar.unnamed_region')}</h3>
              <div className={`flex ${isRTL ? 'rtl-container-flex' : 'ltr-container-flex'}`}>
                {documentId && isRegionAssigned(selectedRegion.id, documentId) && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleUndoRegionText} 
                    className={`text-blue-600 hover:text-blue-800 ${isRTL ? 'rtl-button-flex' : 'ltr-button-flex'}`}
                  >
                    <RTLButtonIcon>
                      <Undo2 className="h-4 w-4" />
                    </RTLButtonIcon>
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDelete} 
                  className={`text-destructive hover:text-destructive ${isRTL ? 'rtl-button-flex' : 'ltr-button-flex'}`}
                >
                  <RTLButtonIcon>
                    <Trash2 className="h-4 w-4" />
                  </RTLButtonIcon>
                </Button>
              </div>
            </div>
            
            <label className="text-sm font-medium mb-1 mt-4" dir={isRTL ? 'rtl' : 'ltr'}>{t('sidebar.text_label')}</label>
            <Textarea 
              ref={textareaRef} 
              value={localDescription} 
              onChange={handleChange} 
              placeholder={t('sidebar.add_description')}
              className={`w-full min-h-0 h-24 resize-none ${
                documentId && isRegionAssigned(selectedRegion.id, documentId) ? 'border-green-500' : ''
              } ${isRTL ? 'text-right' : ''}`}
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </>
        )}
      </div>
      
      {!selectedRegion && (
        <div className="p-4 border-t text-center">
          <p className="text-sm text-muted-foreground" dir={isRTL ? 'rtl' : 'ltr'}>{t('sidebar.select_region')}</p>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
