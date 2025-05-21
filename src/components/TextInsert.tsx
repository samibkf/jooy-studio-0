
import React, { useState, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Undo2, ArrowRight } from 'lucide-react';
import { Region } from '@/types/regions';
import { useTextAssignment } from '@/contexts/TextAssignmentContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TextInsertProps {
  regions: Region[];
  onRegionUpdate: (region: Region) => void;
  selectedRegion: Region | null;
  onRegionSelect: (regionId: string) => void;
}

const TextInsert = ({ regions, onRegionUpdate, selectedRegion, onRegionSelect }: TextInsertProps) => {
  const [inputText, setInputText] = useState<string>('');
  const [activeTextIndex, setActiveTextIndex] = useState<number | null>(null);
  const { 
    titledTexts, 
    assignTextsToRegions, 
    undoAllAssignments, 
    assignTextToRegion, 
    undoRegionAssignment,
    isRegionAssigned,
    getUnassignedRegions,
    getUnassignedRegionsByPage
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

  const handleAssignToRegion = (textIndex: number, regionId: string) => {
    // Find the text and region
    const text = titledTexts[textIndex];
    const region = regions.find(r => r.id === regionId);
    
    if (!text || !region) return;
    
    // Assign text to region
    assignTextToRegion(textIndex, regionId);
    
    // Update region description
    onRegionUpdate({
      ...region,
      description: text.content
    });
    
    setActiveTextIndex(null); // Close the popover
    toast.success(`Assigned "${text.title}" to region ${region.name}`);
  };

  const handleRegionSelect = (regionId: string) => {
    onRegionSelect(regionId);
  };

  // Get unassigned texts and texts that are assigned (for display)
  const unassignedTexts = titledTexts.filter(text => !text.assignedRegionId);
  const assignedTexts = titledTexts.filter(text => text.assignedRegionId);
  
  // Get unassigned regions for the popover, filtered by current page
  const currentPage = selectedRegion?.page || 1;
  const unassignedRegionsByPage = getUnassignedRegionsByPage(regions, currentPage);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="text-sm font-medium">Insert Text (Markdown with **Titles**)</label>
        <Textarea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste your markdown text here..."
          className="min-h-0 h-12"
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
            <Undo2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {titledTexts.length > 0 && (
        <div className="space-y-3">
          {/* Unassigned Texts Section */}
          {unassignedTexts.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Unassigned Texts:</p>
              <ScrollArea className="h-[150px] border rounded-md p-2">
                <div className="space-y-2">
                  {unassignedTexts.map((text, index) => {
                    const textIndex = titledTexts.indexOf(text);
                    return (
                      <Popover 
                        key={`unassigned-${index}`} 
                        open={activeTextIndex === textIndex}
                        onOpenChange={(open) => setActiveTextIndex(open ? textIndex : null)}
                      >
                        <PopoverTrigger asChild>
                          <div className="p-2 border rounded-md cursor-pointer border-gray-300 bg-white hover:border-blue-300 hover:bg-blue-50 transition-colors">
                            <p className="font-medium text-sm">{text.title}</p>
                            <p className="text-xs line-clamp-2">{text.content.substring(0, 50)}...</p>
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-0">
                          <div className="p-2 border-b">
                            <p className="font-medium">Assign to Region (Page {currentPage}):</p>
                          </div>
                          <ScrollArea className="h-[200px]">
                            {unassignedRegionsByPage.length > 0 ? (
                              <div className="p-1">
                                {unassignedRegionsByPage.map(region => (
                                  <div
                                    key={region.id}
                                    className="p-2 hover:bg-muted rounded-md cursor-pointer flex items-center justify-between"
                                    onClick={() => handleAssignToRegion(textIndex, region.id)}
                                  >
                                    <div>
                                      <p className="font-medium">{region.name || 'Unnamed Region'}</p>
                                      <p className="text-xs text-muted-foreground">Page: {region.page}</p>
                                    </div>
                                    <ArrowRight className="h-4 w-4" />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="p-4 text-center text-muted-foreground">
                                No unassigned regions on page {currentPage}
                              </div>
                            )}
                          </ScrollArea>
                        </PopoverContent>
                      </Popover>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
          
          {/* Assigned Texts Section */}
          {assignedTexts.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Assigned Texts:</p>
              <ScrollArea className="h-[150px] border rounded-md p-2">
                <div className="space-y-2">
                  {assignedTexts.map((text, index) => {
                    // Find which region this text is assigned to
                    const assignedRegion = regions.find(r => r.id === text.assignedRegionId);
                    
                    return (
                      <div
                        key={`assigned-${index}`}
                        className="p-2 border rounded-md border-green-500 bg-green-50 cursor-pointer"
                        onClick={() => text.assignedRegionId && handleRegionSelect(text.assignedRegionId)}
                      >
                        <div className="flex justify-between items-center">
                          <p className="font-medium text-sm">{text.title}</p>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent region selection when undoing
                              text.assignedRegionId && handleUndoSpecificText(text.assignedRegionId);
                            }}
                            size="sm"
                            variant="ghost"
                            className="h-6 px-1.5 text-xs text-blue-500 hover:text-blue-700"
                          >
                            <Undo2 className="h-3.5 w-3.5" />
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
