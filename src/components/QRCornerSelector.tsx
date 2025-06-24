import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CornerDownLeft, CornerDownRight, Settings } from 'lucide-react';

interface QRCornerSelectorProps {
  value: 'top-left' | 'top-right';
  onChange: (corner: 'top-left' | 'top-right') => void;
  disabled?: boolean;
}

const QRCornerSelector = ({ value, onChange, disabled = false }: QRCornerSelectorProps) => {
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
            className="w-full justify-start"
            onClick={() => onChange('top-left')}
          >
            <CornerDownLeft className="h-4 w-4 mr-2" />
            QR on Left
          </Button>
          <Button
            variant={value === 'top-right' ? 'default' : 'ghost'}
            size="sm"
            className="w-full justify-start"
            onClick={() => onChange('top-right')}
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