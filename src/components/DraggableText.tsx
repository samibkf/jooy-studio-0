
import React from 'react';
import { useTextAssignment } from '@/contexts/TextAssignmentContext';
import { Region } from '@/types/regions';

interface DraggableTextProps {
  region: Region;
  onRegionUpdate: (region: Region) => void;
}

const DraggableText = ({ region, onRegionUpdate }: DraggableTextProps) => {
  const { 
    titledTexts,
    undoRegionAssignment,
    assignTextToRegion,
    getAssignedText,
    isRegionAssigned
  } = useTextAssignment();

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
          <button
            onClick={handleUndoText}
            className="text-xs text-blue-500 hover:text-blue-700"
          >
            Undo
          </button>
        )}
      </div>
    </div>
  );
};

export default DraggableText;
