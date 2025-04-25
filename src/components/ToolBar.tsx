
import React from 'react';
import { TooltipProvider, TooltipTrigger, TooltipContent, Tooltip } from '@/components/ui/tooltip';
import { Toggle } from '@/components/ui/toggle';
import { Square, Circle, Polygon } from 'lucide-react';

interface ToolbarProps {
  isSelectionMode: boolean;
  onToggleSelectionMode: (mode: 'area' | 'polygon' | 'circle' | null) => void;
  currentSelectionType: 'area' | 'polygon' | 'circle' | null;
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
              aria-label="Toggle rectangle selection tool"
              className={`w-full ${currentSelectionType === 'area' ? 'bg-blue-100 ring-2 ring-primary' : ''}`}
            >
              <Square className="h-4 w-4 mr-2" />
              Rectangle
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>
            <p>Draw rectangle regions</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              pressed={currentSelectionType === 'circle'}
              onPressedChange={() => onToggleSelectionMode(currentSelectionType === 'circle' ? null : 'circle')}
              aria-label="Toggle circle selection tool"
              className={`w-full ${currentSelectionType === 'circle' ? 'bg-blue-100 ring-2 ring-primary' : ''}`}
            >
              <Circle className="h-4 w-4 mr-2" />
              Circle
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>
            <p>Draw circle regions</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              pressed={currentSelectionType === 'polygon'}
              onPressedChange={() => onToggleSelectionMode(currentSelectionType === 'polygon' ? null : 'polygon')}
              aria-label="Toggle polygon selection tool"
              className={`w-full ${currentSelectionType === 'polygon' ? 'bg-blue-100 ring-2 ring-primary' : ''}`}
            >
              <Polygon className="h-4 w-4 mr-2" />
              Polygon
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>
            <p>Draw polygon regions</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

export default Toolbar;
