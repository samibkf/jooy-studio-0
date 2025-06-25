
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface CompactPageNavigationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const CompactPageNavigation: React.FC<CompactPageNavigationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const { t, isRTL } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(currentPage.toString());

  useEffect(() => {
    setInputValue(currentPage.toString());
  }, [currentPage]);

  const handlePageSubmit = () => {
    const pageNum = parseInt(inputValue);
    if (pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
    } else {
      setInputValue(currentPage.toString());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePageSubmit();
    } else if (e.key === 'Escape') {
      setInputValue(currentPage.toString());
      setIsEditing(false);
    }
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 icon-button-center light-button-forced gradient-border-orange-purple"
        onClick={handlePrevious}
        disabled={currentPage <= 1}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-1 text-sm">
        {isEditing ? (
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handlePageSubmit}
            onKeyDown={handleKeyDown}
            className="h-8 w-12 text-center text-sm p-1"
            autoFocus
            type="number"
            min="1"
            max={totalPages}
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="h-8 px-2 text-center hover:bg-accent rounded border min-w-[3rem] text-sm font-medium"
          >
            {currentPage}
          </button>
        )}
        <span className="text-muted-foreground" dir={isRTL ? 'rtl' : 'ltr'}>
          {t('nav.of')} {totalPages}
        </span>
      </div>

      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 icon-button-center light-button-forced gradient-border-orange-purple"
        onClick={handleNext}
        disabled={currentPage >= totalPages}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default CompactPageNavigation;
