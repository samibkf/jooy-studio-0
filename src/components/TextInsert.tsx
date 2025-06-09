
import React, { useState, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Undo2, ArrowRight, RefreshCw } from 'lucide-react';
import { Region } from '@/types/regions';
import { useTextAssignment } from '@/contexts/TextAssignmentContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface TextInsertProps {
  regions: Region[];
  onRegionUpdate: (region: Region) => void;
  selectedRegion: Region | null;
  onRegionSelect: (regionId: string) => void;
  documentId: string | null;
  currentPage: number;
}

const TextInsert = ({
  regions,
  onRegionUpdate,
  selectedRegion,
  onRegionSelect,
  documentId,
  currentPage
}: TextInsertProps) => {
  const [inputText, setInputText] = useState<string>('');
  const [activeTextIndex, setActiveTextIndex] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const {
    getCurrentPageTexts,
    assignTextsToRegions,
    undoAllAssignments,
    assignTextToRegion,
    undoRegionAssignment,
    isRegionAssigned,
    getUnassignedRegionsByPage,
    refreshAssignments,
    isLoading,
    isReady
  } = useTextAssignment();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Get texts for current document and current page only
  const titledTexts = documentId ? getCurrentPageTexts(documentId, currentPage) : [];

  const handleRefresh = async () => {
    if (!documentId) return;
    
    setIsRefreshing(true);
    try {
      await refreshAssignments(documentId);
      console.log(`🔄 Refreshed data for page ${currentPage}`);
    } catch (error) {
      console.error('❌ Failed to refresh:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleInsertText = async () => {
    if (!inputText.trim()) {
      toast.error('Please enter some text to insert');
      return;
    }

    if (!documentId) {
      toast.error('No document selected');
      return;
    }

    if (!isReady || isLoading) {
      toast.error('System is still loading, please wait');
      return;
    }

    console.log(`📝 Inserting text for page ${currentPage}`);

    try {
      // Process the input text and get titled sections for the current page
      const processedTexts = await assignTextsToRegions(inputText, regions, documentId, currentPage);

      if (!processedTexts || processedTexts.length === 0) {
        toast.error('Failed to process text. Please try again.');
        return;
      }

      // Sort regions by their name to ensure proper assignment order, but only for current page
      const currentPageRegions = regions.filter(region => region.page === currentPage);
      const sortedRegions = [...currentPageRegions].sort((a, b) => {
        const aName = a.name.split('_').map(Number);
        const bName = b.name.split('_').map(Number);
        if (aName[0] !== bName[0]) {
          return aName[0] - bName[0];
        }
        return aName[1] - bName[1];
      });

      console.log(`🎯 Found ${sortedRegions.length} regions on page ${currentPage} for ${processedTexts.length} texts`);

      // Assign texts to regions in order
      if (processedTexts.length > 0) {
        for (let i = 0; i < Math.min(processedTexts.length, sortedRegions.length); i++) {
          const text = processedTexts[i];
          const region = sortedRegions[i];
          
          // Get updated texts list (including newly added texts)
          const updatedTexts = getCurrentPageTexts(documentId, currentPage);
          const textIndex = updatedTexts.findIndex(t => 
            t.title === text.title && 
            t.content === text.content && 
            !t.assignedRegionId
          );
          
          if (textIndex !== -1) {
            console.log(`🔗 Assigning "${text.title}" to region ${region.name}`);
            await assignTextToRegion(textIndex, region.id, documentId);

            // Update region description through parent component
            onRegionUpdate({
              ...region,
              description: text.content
            });
          }
        }
        
        // Clear input after successful assignment
        setInputText('');
        toast.success(`${Math.min(processedTexts.length, sortedRegions.length)} texts assigned to regions on page ${currentPage}`);
        
        if (processedTexts.length > sortedRegions.length) {
          toast.warning(`${processedTexts.length - sortedRegions.length} texts could not be assigned (not enough regions)`);
        }
      }
    } catch (error) {
      console.error('❌ Error inserting text:', error);
      toast.error('Failed to insert text. Please try again.');
    }
  };

  const handleUndo = async () => {
    if (!documentId) return;

    try {
      await undoAllAssignments(documentId);

      // Reset region descriptions to original for current page only
      regions.filter(region => region.page === currentPage).forEach(region => {
        if (isRegionAssigned(region.id, documentId)) {
          onRegionUpdate({
            ...region,
            description: null
          });
        }
      });
      toast.success(`Text assignments undone for page ${currentPage}`);
    } catch (error) {
      console.error('❌ Error undoing assignments:', error);
      toast.error('Failed to undo assignments');
    }
  };

  const handleUndoSpecificText = async (regionId: string) => {
    if (!documentId) return;

    // Find the region
    const region = regions.find(r => r.id === regionId);
    if (!region) return;

    try {
      // Undo the assignment
      await undoRegionAssignment(regionId, documentId);

      // Update region description to null
      onRegionUpdate({
        ...region,
        description: null
      });
      toast.success(`Text unassigned from region ${region.name || regionId}`);
    } catch (error) {
      console.error('❌ Error undoing specific assignment:', error);
      toast.error('Failed to undo assignment');
    }
  };

  const handleAssignToRegion = async (textIndex: number, regionId: string) => {
    if (!documentId) return;

    // Find the text and region
    const text = titledTexts[textIndex];
    const region = regions.find(r => r.id === regionId);
    if (!text || !region) return;

    try {
      // Assign text to region
      await assignTextToRegion(textIndex, regionId, documentId);

      // Update region description
      onRegionUpdate({
        ...region,
        description: text.content
      });
      setActiveTextIndex(null); // Close the popover
      toast.success(`Assigned "${text.title}" to region ${region.name}`);
    } catch (error) {
      console.error('❌ Error assigning text to region:', error);
      toast.error('Failed to assign text');
    }
  };

  const handleRegionSelect = (regionId: string) => {
    onRegionSelect(regionId);
    
    // Add a small delay to ensure the region is selected before scrolling
    setTimeout(() => {
      const regionElement = document.getElementById(`region-${regionId}`);
      if (regionElement) {
        // Scroll the region into view with smooth scrolling
        regionElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }, 100);
  };

  // Get unassigned texts and texts that are assigned (for current page only)
  const unassignedTexts = titledTexts.filter(text => !text.assignedRegionId);
  const assignedTexts = titledTexts.filter(text => text.assignedRegionId);

  // Get unassigned regions for the popover, filtered by current page
  const unassignedRegionsByPage = documentId ? getUnassignedRegionsByPage(regions, currentPage, documentId) : [];
  
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Insert Text (Page {currentPage}):</label>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm" 
            disabled={!documentId || isRefreshing || isLoading}
            className="h-8 px-2"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <Textarea 
          ref={textareaRef} 
          value={inputText} 
          onChange={e => setInputText(e.target.value)} 
          placeholder="Paste your markdown text here..." 
          className="min-h-0 h-24" 
          disabled={!isReady || isLoading}
        />
        <div className="flex space-x-2">
          <Button 
            onClick={handleInsertText} 
            className="flex-1" 
            disabled={!inputText.trim() || !isReady || isLoading}
          >
            {isLoading ? 'Processing...' : 'Insert'}
          </Button>
          <Button 
            onClick={handleUndo} 
            variant="outline" 
            className="flex-shrink-0" 
            disabled={titledTexts.length === 0 || isLoading}
          >
            <Undo2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {!isReady && (
        <div className="p-4 text-center text-muted-foreground">
          <div className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
          Loading text assignments...
        </div>
      )}
      
      {isReady && titledTexts.length > 0 && (
        <div className="space-y-3">
          {/* Unassigned Texts Section */}
          {unassignedTexts.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Unassigned Texts (Page {currentPage}):</p>
              <ScrollArea className="h-[150px] border rounded-md p-2">
                <div className="space-y-2">
                  {unassignedTexts.map((text, index) => {
                    const textIndex = titledTexts.indexOf(text);
                    return (
                      <Popover key={`unassigned-${index}`} open={activeTextIndex === textIndex} onOpenChange={open => setActiveTextIndex(open ? textIndex : null)}>
                        <PopoverTrigger asChild>
                          <div className="p-2 border rounded-md cursor-pointer border-gray-300 bg-white hover:border-blue-300 hover:bg-blue-50 transition-colors">
                            <p className="font-medium text-sm">{text.title}</p>
                            <p className="text-xs line-clamp-2">{text.content.substring(0, 50)}...</p>
                            <p className="text-xs text-muted-foreground mt-1">Page: {text.page}</p>
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
                                  <div key={region.id} className="p-2 hover:bg-muted rounded-md cursor-pointer flex items-center justify-between" onClick={() => handleAssignToRegion(textIndex, region.id)}>
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
              <p className="text-sm font-medium">Assigned Texts (Page {currentPage}):</p>
              <ScrollArea className="h-[150px] border rounded-md p-2">
                <div className="space-y-2">
                  {assignedTexts.map((text, index) => {
                    // Find which region this text is assigned to
                    const assignedRegion = regions.find(r => r.id === text.assignedRegionId);
                    return (
                      <div key={`assigned-${index}`} className="p-2 border rounded-md border-green-500 bg-green-50 cursor-pointer hover:bg-green-100 transition-colors" onClick={() => text.assignedRegionId && handleRegionSelect(text.assignedRegionId)}>
                        <div className="flex justify-between items-center">
                          <p className="font-medium text-sm">{text.title}</p>
                          <Button 
                            onClick={e => {
                              e.stopPropagation(); // Prevent region selection when undoing
                              text.assignedRegionId && handleUndoSpecificText(text.assignedRegionId);
                            }} 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 px-1.5 text-xs text-blue-500 hover:text-blue-700"
                            disabled={isLoading}
                          >
                            <Undo2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <p className="text-xs">{text.content.substring(0, 50)}...</p>
                        <p className="text-xs text-muted-foreground mt-1">Page: {text.page}</p>
                        {assignedRegion && <p className="text-xs mt-1 text-green-700">Assigned to: {assignedRegion.name || 'Unnamed Region'}</p>}
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
