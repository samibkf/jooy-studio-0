
import React from 'react';
import { TooltipProvider, TooltipTrigger, TooltipContent, Tooltip } from '@/components/ui/tooltip';
import { Toggle } from '@/components/ui/toggle';
import { MousePointer } from 'lucide-react';

interface ToolbarProps {
  isSelectionMode: boolean;
  onToggleSelectionMode: (mode: 'area' | null) => void;
  currentSelectionType: 'area' | null;
}

const Toolbar: React.FC<ToolbarProps> = ({
  isSelectionMode,
  onToggleSelectionMode,
  currentSelectionType
}) => {
  return (
    <TooltipProvider>
      <div className="bg-white border-r border-gray-200 p-4 flex flex-col gap-2 h-full">
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              pressed={currentSelectionType === 'area'}
              onPressedChange={() => onToggleSelectionMode(currentSelectionType === 'area' ? null : 'area')}
              aria-label="Toggle area selection tool"
              className={`w-full ${currentSelectionType === 'area' ? 'bg-blue-100 ring-2 ring-primary' : ''}`}
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
    </TooltipProvider>
  );
};

export default Toolbar;
