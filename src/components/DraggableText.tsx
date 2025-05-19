
import React from 'react';
import { useTextAssignment } from '@/contexts/TextAssignmentContext';
import { Region } from '@/types/regions';
import { Undo2 } from 'lucide-react';
import { Button } from './ui/button';

interface DraggableTextProps {
  region: Region;
  onRegionUpdate: (region: Region) => void;
}

const DraggableText = ({ region, onRegionUpdate }: DraggableTextProps) => {
  const { 
    titledTexts,
    undoRegionAssignment,
    assignTextToRegion,
    isRegionAssigned
  } = useTextAssignment();

  // Find the text assigned to this region
  const assignedText = titledTexts.find(text => text.assignedRegionId === region.id);

  const handleUndoText = () => {
    undoRegionAssignment(region.id);
    onRegionUpdate({
      ...region,
      description: null
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const textIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    
    if (!isNaN(textIndex) && textIndex >= 0 && textIndex < titledTexts.length) {
      assignTextToRegion(textIndex, region.id);
      
      onRegionUpdate({
        ...region,
        description: titledTexts[textIndex].content
      });
    }
  };

  return (
    <div 
      className="mt-2 p-2 border border-dashed border-gray-300 rounded-md bg-gray-50"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium">Drop Zone</span>
        {isRegionAssigned(region.id) && (
          <Button
            onClick={handleUndoText}
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs text-blue-500 hover:text-blue-700"
          >
            <Undo2 className="h-3 w-3 mr-1" />
            Undo
          </Button>
        )}
      </div>
      
      {assignedText && (
        <div className="mt-1 text-xs text-gray-500">
          <span className="font-medium">{assignedText.title}:</span> {assignedText.content.substring(0, 50)}...
        </div>
      )}
    </div>
  );
};

export default DraggableText;
