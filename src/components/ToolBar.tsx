
import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Toggle } from '@/components/ui/toggle';
import { Text, Image, MousePointer } from 'lucide-react';

interface ToolbarProps {
  isSelectionMode: boolean;
  onToggleSelectionMode: (mode: 'text' | 'image' | 'area' | null) => void;
  currentSelectionType: 'text' | 'image' | 'area' | null;
}

const Toolbar: React.FC<ToolbarProps> = ({
  isSelectionMode,
  onToggleSelectionMode,
  currentSelectionType
}) => {
  return (
    <div className="bg-white border-r border-gray-200 p-4 flex flex-col gap-2 h-full">
      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            pressed={currentSelectionType === 'text'}
            onPressedChange={() => onToggleSelectionMode(currentSelectionType === 'text' ? null : 'text')}
            aria-label="Toggle text selection tool"
            className="w-full"
          >
            <Text className="h-4 w-4 mr-2" />
            Text Selection
          </Toggle>
        </TooltipTrigger>
        <TooltipContent>
          <p>Select text regions in the PDF</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            pressed={currentSelectionType === 'image'}
            onPressedChange={() => onToggleSelectionMode(currentSelectionType === 'image' ? null : 'image')}
            aria-label="Toggle image selection tool"
            className="w-full"
          >
            <Image className="h-4 w-4 mr-2" />
            Image Selection
          </Toggle>
        </TooltipTrigger>
        <TooltipContent>
          <p>Select image regions in the PDF</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            pressed={currentSelectionType === 'area'}
            onPressedChange={() => onToggleSelectionMode(currentSelectionType === 'area' ? null : 'area')}
            aria-label="Toggle area selection tool"
            className="w-full"
          >
            <MousePointer className="h-4 w-4 mr-2" />
            Area Selection
          </Toggle>
        </TooltipTrigger>
        <TooltipContent>
          <p>Draw custom area regions</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

export default Toolbar;
