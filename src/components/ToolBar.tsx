
import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Toggle } from '@/components/ui/toggle';
import { Edit } from 'lucide-react';

interface ToolbarProps {
  isSelectionMode: boolean;
  onToggleSelectionMode: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  isSelectionMode,
  onToggleSelectionMode
}) => {
  return (
    <div className="bg-white border-r border-gray-200 p-4 flex flex-col gap-2 h-full">
      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            pressed={isSelectionMode}
            onPressedChange={onToggleSelectionMode}
            aria-label="Toggle selection tool"
            className="w-full"
          >
            <Edit className="h-4 w-4 mr-2" />
            Selection Tool
          </Toggle>
        </TooltipTrigger>
        <TooltipContent>
          <p>Draw regions on the PDF</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

export default Toolbar;
