
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import RTLButtonIcon from './RTLButtonIcon';
import { Region } from '@/types/regions';

interface TextInsertProps {
  regions: Region[];
  onRegionUpdate: (updatedRegion: Region) => void;
  selectedRegion: Region | null;
  onRegionSelect: (regionId: string) => void;
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
  const [isInserting, setIsInserting] = useState(false);

  useEffect(() => {
    setIsInserting(false); // Reset inserting state when props change
  }, [selectedRegion, currentPage]);

  const handleInsertClick = async () => {
    if (selectedRegion && currentPage) {
      setIsInserting(true);
      try {
        // Simulate insert operation - you'll need to implement the actual logic
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log(`Inserting to region ${selectedRegion.id} on page ${currentPage}`);
      } finally {
        setIsInserting(false);
      }
    }
  };

  return (
    <div>
      <Button
        onClick={handleInsertClick}
        className={`w-full gradient-bg-orange-purple ${isRTL ? 'rtl-button-flex' : 'ltr-button-flex'}`}
        disabled={!selectedRegion || !currentPage || isInserting}
      >
        <RTLButtonIcon>
          <Plus className="h-4 w-4" />
        </RTLButtonIcon>
        <span dir={isRTL ? 'rtl' : 'ltr'}>
          {isInserting ? t('sidebar.inserting') : `${t('sidebar.insert_to')} ${currentPage.toString()}`}
        </span>
      </Button>
    </div>
  );
};

export default TextInsert;
