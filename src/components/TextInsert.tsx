
import React, { useState, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Undo2 } from 'lucide-react';
import { Region } from '@/types/regions';
import { useTextAssignment } from '@/contexts/TextAssignmentContext';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TextInsertProps {
  regions: Region[];
  onRegionUpdate: (region: Region) => void;
  selectedRegion: Region | null;
}

const TextInsert = ({ regions, onRegionUpdate, selectedRegion }: TextInsertProps) => {
  const [inputText, setInputText] = useState<string>('');
  const { 
    titledTexts, 
    assignTextsToRegions, 
    undoAllAssignments, 
    assignTextToRegion, 
    undoRegionAssignment,
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
    if (processedTexts && processedTexts.length > 0) {
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
    }
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
    
    toast.success('Text assignments undone');
  };

  const handleDragStart = (e: React.DragEvent, textIndex: number) => {
    e.dataTransfer.setData('text/plain', textIndex.toString());
    e.currentTarget.classList.add('opacity-50');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('opacity-50');
  };

  const handleUndoSpecificText = (regionId: string) => {
    // Find the region
    const region = regions.find(r => r.id === regionId);
    if (!region) return;
    
    // Undo the assignment
    undoRegionAssignment(regionId);
    
    // Update region description to null
    onRegionUpdate({
      ...region,
      description: null
    });
    
    toast.success(`Text unassigned from region ${region.name || regionId}`);
  };

  // Get unassigned texts and texts that are assigned (for display)
  const unassignedTexts = titledTexts.filter(text => !text.assignedRegionId);
  const assignedTexts = titledTexts.filter(text => text.assignedRegionId);

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
            <Undo2 className="h-4 w-4 mr-1" /> Undo All
          </Button>
        </div>
      </div>
      
      {titledTexts.length > 0 && (
        <div className="flex flex-col space-y-4">
          {unassignedTexts.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Unassigned Texts:</p>
              <ScrollArea className="h-[180px] border rounded-md p-2">
                <div className="space-y-2">
                  {unassignedTexts.map((text, index) => (
                    <div
                      key={`unassigned-${index}`}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, titledTexts.indexOf(text))}
                      onDragEnd={handleDragEnd}
                      className="p-2 border rounded-md cursor-move border-gray-300 bg-white hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <p className="font-medium text-sm">{text.title}</p>
                      <p className="text-xs line-clamp-2">{text.content}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
          
          {assignedTexts.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Assigned Texts:</p>
              <ScrollArea className="h-[180px] border rounded-md p-2">
                <div className="space-y-2">
                  {assignedTexts.map((text, index) => {
                    // Find which region this text is assigned to
                    const assignedRegion = regions.find(r => r.id === text.assignedRegionId);
                    
                    return (
                      <div
                        key={`assigned-${index}`}
                        className="p-2 border rounded-md border-green-500 bg-green-50"
                      >
                        <div className="flex justify-between items-center">
                          <p className="font-medium text-sm">{text.title}</p>
                          <Button
                            onClick={() => text.assignedRegionId && handleUndoSpecificText(text.assignedRegionId)}
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs text-blue-500 hover:text-blue-700"
                          >
                            <Undo2 className="h-3 w-3 mr-1" />
                            Undo
                          </Button>
                        </div>
                        <p className="text-xs">{text.content.substring(0, 50)}...</p>
                        {assignedRegion && (
                          <p className="text-xs mt-1 text-green-700">Assigned to: {assignedRegion.name || 'Unnamed Region'}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TextInsert;
