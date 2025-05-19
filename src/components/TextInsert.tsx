
import React, { useState, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Undo2 } from 'lucide-react';
import { Region } from '@/types/regions';
import { useTextAssignment } from '@/contexts/TextAssignmentContext';

interface TextInsertProps {
  regions: Region[];
  onRegionUpdate: (region: Region) => void;
}

const TextInsert = ({ regions, onRegionUpdate }: TextInsertProps) => {
  const [inputText, setInputText] = useState<string>('');
  const [showDraggable, setShowDraggable] = useState(false);
  const { 
    titledTexts, 
    assignTextsToRegions, 
    undoAllAssignments, 
    assignTextToRegion, 
    isRegionAssigned
  } = useTextAssignment();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const handleInsertText = () => {
    if (!inputText.trim()) {
      toast.error('Please enter some text to insert');
      return;
    }
    
    // Process the input text and get titled sections
    const processedTexts = assignTextsToRegions(inputText, regions);
    
    // Sort regions by their name to ensure proper assignment order
    const sortedRegions = [...regions].sort((a, b) => {
      const aName = a.name.split('_').map(Number);
      const bName = b.name.split('_').map(Number);
      
      if (aName[0] !== bName[0]) {
        return aName[0] - bName[0];
      }
      return aName[1] - bName[1];
    });
    
    // Assign texts to regions in order
    processedTexts.forEach((text, index) => {
      if (index < sortedRegions.length) {
        const regionId = sortedRegions[index].id;
        assignTextToRegion(index, regionId);
        
        // Update region description through parent component
        onRegionUpdate({
          ...sortedRegions[index],
          description: text.content
        });
      }
    });
    
    toast.success('Text assigned to regions');
    setShowDraggable(false);
  };
  
  const handleUndo = () => {
    undoAllAssignments();
    
    // Reset region descriptions to original
    regions.forEach(region => {
      if (isRegionAssigned(region.id)) {
        onRegionUpdate({
          ...region,
          description: null
        });
      }
    });
    
    setShowDraggable(true);
    toast.success('Text assignments undone');
  };

  const handleDragStart = (e: React.DragEvent, textIndex: number) => {
    e.dataTransfer.setData('text/plain', textIndex.toString());
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Insert Text (Markdown with **Titles**)</label>
        <Textarea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste your markdown text here..."
          className="min-h-32"
        />
        <div className="flex space-x-2">
          <Button 
            onClick={handleInsertText} 
            className="flex-1"
            disabled={!inputText.trim()}
          >
            Insert
          </Button>
          <Button 
            onClick={handleUndo} 
            variant="outline" 
            className="flex-shrink-0"
            disabled={titledTexts.length === 0}
          >
            <Undo2 className="h-4 w-4 mr-1" /> Undo
          </Button>
        </div>
      </div>
      
      {showDraggable && titledTexts.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Drag text to assign to regions:</p>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {titledTexts.map((text, index) => (
              <div
                key={index}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                className={`p-2 border rounded-md cursor-move ${
                  text.assignedRegionId ? 'opacity-50 border-green-500' : 'border-gray-300'
                }`}
              >
                <p className="font-medium text-sm">{text.title}</p>
                <p className="text-xs line-clamp-2">{text.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TextInsert;
