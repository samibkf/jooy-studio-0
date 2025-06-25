import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Region } from '@/types/regions';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

interface TextInsertProps {
  regions: Region[];
  onRegionUpdate: (region: Region) => void;
  selectedRegion: Region | null;
  onRegionSelect: (regionId: string | null) => void;
  documentId: string | null;
  currentPage: number;
  showManualInsert: boolean;
}

const TextInsert: React.FC<TextInsertProps> = ({
  regions,
  onRegionUpdate,
  selectedRegion,
  onRegionSelect,
  documentId,
  currentPage,
  showManualInsert
}) => {
  const { t, isRTL } = useLanguage();
  const [aiGenerating, setAiGenerating] = useState(false);
  const [manualText, setManualText] = useState('');
  const [targetPage, setTargetPage] = useState(currentPage);
  const [isManualInserting, setIsManualInserting] = useState(false);

  const handleManualInsert = async () => {
    if (!manualText.trim()) {
      toast.error(t('sidebar.text_required'));
      return;
    }

    if (targetPage < 1) {
      toast.error(t('sidebar.invalid_page_number'));
      return;
    }

    setIsManualInserting(true);
    try {
      const newRegion: Omit<Region, 'id'> = {
        page: targetPage,
        x: 100,
        y: 100,
        width: 200,
        height: 50,
        type: 'text',
        name: `text_${Date.now()}`,
        description: manualText,
      };

      // Simulate region update with the new text
      if (selectedRegion) {
        const updatedRegion = { ...selectedRegion, description: manualText };
        onRegionUpdate(updatedRegion);
        onRegionSelect(null);
        toast.success(t('sidebar.text_updated'));
      } else {
        // Handle case where no region is selected
        toast.error(t('sidebar.no_region_selected'));
      }
    } catch (error) {
      console.error('Error during manual insert:', error);
      toast.error(t('sidebar.insert_failed'));
    } finally {
      setIsManualInserting(false);
    }
  };

  return (
    <div className="space-y-4">
      

      {showManualInsert && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">{t('sidebar.manual_insert')}</h3>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="manual-text">{t('sidebar.text_content')}</Label>
            <Textarea
              id="manual-text"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder={t('sidebar.enter_text_placeholder')}
              className="min-h-[80px] text-sm"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="page-number">{t('sidebar.page_number')}</Label>
            <div className="flex gap-2">
              <Input
                id="page-number"
                type="number"
                value={targetPage}
                onChange={(e) => setTargetPage(Number(e.target.value))}
                min={1}
                className="flex-1"
              />
              <Button
                onClick={handleManualInsert}
                disabled={!manualText.trim() || targetPage < 1 || isManualInserting}
                className="gradient-bg-orange-purple shrink-0"
              >
                {isManualInserting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-white"></div>
                    {t('sidebar.inserting')}
                  </div>
                ) : (
                  t('sidebar.insert_to_page')
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TextInsert;
