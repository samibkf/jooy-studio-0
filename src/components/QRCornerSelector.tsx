
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

interface QRCornerSelectorProps {
  value: 'top-left' | 'top-right';
  onChange: (corner: 'top-left' | 'top-right') => void;
  disabled?: boolean;
}

const QRCornerSelector = ({ value, onChange, disabled = false }: QRCornerSelectorProps) => {
  const getDisplayText = (corner: 'top-left' | 'top-right') => {
    return corner === 'top-left' ? 'Top Left' : 'Top Right';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="flex items-center gap-1 text-xs h-8"
        >
          {getDisplayText(value)}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        <DropdownMenuItem
          onClick={() => onChange('top-left')}
          className={value === 'top-left' ? 'bg-accent' : ''}
        >
          Top Left
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onChange('top-right')}
          className={value === 'top-right' ? 'bg-accent' : ''}
        >
          Top Right
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default QRCornerSelector;
