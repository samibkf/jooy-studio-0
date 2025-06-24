
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CornerDownLeft, CornerDownRight, Settings } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface QRCornerSelectorProps {
  value: 'top-left' | 'top-right';
  onChange: (corner: 'top-left' | 'top-right') => void;
  disabled?: boolean;
}

const QRCornerSelector = ({ value, onChange, disabled = false }: QRCornerSelectorProps) => {
  const { isRTL } = useLanguage();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          disabled={disabled}
          className="h-10 w-10"
          title="QR Position"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-2" align="end">
        <div className="space-y-1">
          <Button
            variant={value === 'top-left' ? 'default' : 'ghost'}
            size="sm"
            className="w-full justify-start rtl-button-icons"
            onClick={() => onChange('top-left')}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <CornerDownLeft className="h-4 w-4 mr-2" />
            QR on Left
          </Button>
          <Button
            variant={value === 'top-right' ? 'default' : 'ghost'}
            size="sm"
            className="w-full justify-start rtl-button-icons"
            onClick={() => onChange('top-right')}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <CornerDownRight className="h-4 w-4 mr-2" />
            QR on Right
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default QRCornerSelector;
