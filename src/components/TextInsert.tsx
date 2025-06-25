import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import RTLButtonIcon from './RTLButtonIcon';

interface TextInsertProps {
  selectedText: string;
  selectedPage: number | null;
  onInsert: (page: number) => Promise<void>;
}

const TextInsert: React.FC<TextInsertProps> = ({ selectedText, selectedPage, onInsert }) => {
  const { t, isRTL } = useLanguage();
  const [isInserting, setIsInserting] = useState(false);

  useEffect(() => {
    setIsInserting(false); // Reset inserting state when props change
  }, [selectedText, selectedPage]);

  const handleInsertClick = async () => {
    if (selectedText && selectedPage) {
      setIsInserting(true);
      try {
        await onInsert(selectedPage);
      } finally {
        setIsInserting(false);
      }
    }
  };

  return (
    
      
        
          
            <Button
              onClick={handleInsertClick}
              className={`w-full gradient-bg-orange-purple ${isRTL ? 'rtl-button-flex' : 'ltr-button-flex'}`}
              disabled={!selectedText.trim() || !selectedPage || isInserting}
            >
              <RTLButtonIcon>
                <Plus className="h-4 w-4" />
              </RTLButtonIcon>
              <span dir={isRTL ? 'rtl' : 'ltr'}>
                {isInserting ? t('sidebar.inserting') : `${t('sidebar.insert_to')} ${selectedPage.toString()}`}
              </span>
            </Button>
          
        
      
    
  );
};

export default TextInsert;
