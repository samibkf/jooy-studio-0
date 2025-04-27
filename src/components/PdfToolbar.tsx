
import React from 'react';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { TooltipProvider, TooltipTrigger, TooltipContent, Tooltip } from '@/components/ui/tooltip';
import { MousePointer, ArrowLeft, ArrowRight } from 'lucide-react';
import { RegionType } from '@/types/regions';

interface PdfToolbarProps {
  currentPage: number;
  totalPages: number;
  scale: number;
  currentSelectionType: RegionType | null;
  onPrevPage: () => void;
  onNextPage: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSelectionTypeChange: (type: RegionType | null) => void;
}

const PdfToolbar: React.FC<PdfToolbarProps> = ({
  currentPage,
  totalPages,
  scale,
  currentSelectionType,
  onPrevPage,
  onNextPage,
  onZoomIn,
  onZoomOut,
  onSelectionTypeChange
}) => {
  return (
    <div className="bg-white border-b border-gray-200 p-2 w-full sticky top-0 z-10">
      <div className="flex items-center justify-between max-w-[1200px] mx-auto">
        <div className="flex items-center space-x-6">
          <div className="flex items-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    pressed={currentSelectionType === 'area'}
                    onPressedChange={() => onSelectionTypeChange(currentSelectionType === 'area' ? null : 'area')}
                    aria-label="Toggle area selection tool"
                    className={`${currentSelectionType === 'area' ? 'bg-blue-100 ring-2 ring-primary' : ''}`}
                  >
                    <MousePointer className="h-4 w-4" />
                    <span className="sr-only">Area Selection</span>
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Draw custom area regions</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="icon"
              onClick={onPrevPage}
              disabled={currentPage <= 0}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Previous page</span>
            </Button>
            <span className="text-sm min-w-[100px] text-center">
              Page {currentPage + 1} of {totalPages}
            </span>
            <Button 
              variant="outline" 
              size="icon"
              onClick={onNextPage}
              disabled={currentPage >= totalPages - 1}
            >
              <ArrowRight className="h-4 w-4" />
              <span className="sr-only">Next page</span>
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onZoomOut}
              disabled={scale <= 0.5}
            >
              -
            </Button>
            <span className="text-sm w-16 text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onZoomIn}
              disabled={scale >= 3}
            >
              +
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfToolbar;
