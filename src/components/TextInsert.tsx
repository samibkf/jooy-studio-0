import React, { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Region } from '@/types/regions';
import { useTextAssignment } from '@/contexts/TextAssignmentContext';
import { toast } from 'sonner';
import { Alert, AlertCircle, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Undo2, Loader2 } from 'lucide-react';
import { parseTitledText } from '@/utils/textProcessing';
import { Badge } from '@/components/ui/badge';
import { getUnassignedRegionsByPage } from '@/utils/regionUtils';

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
  const [text, setText] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const { 
    getCurrentDocumentTexts,
    assignTextsToRegions,
    undoAllAssignments,
    assignTextToRegion,
  } = useTextAssignment();

  // Filter regions and texts to only show those from the current page
  const currentPageRegions = regions.filter(region => region.page === currentPage);
  const currentPageTexts = getCurrentDocumentTexts(documentId || '').filter(text => {
    // If text doesn't have a page property, we'll assume it belongs to page 1
    const textPage = (text as any).page || 1;
    return textPage === currentPage;
  });

  useEffect(() => {
    if (selectedRegion) {
      const assignedText = getCurrentDocumentTexts(documentId || '').find(text => text.assignedRegionId === selectedRegion.id);
      setText(assignedText?.content || '');
    }
  }, [selectedRegion, getCurrentDocumentTexts, documentId]);

  const handleUnassignText = (regionId: string) => {
    if (!documentId) return;

    const targetRegion = currentPageRegions.find(r => r.id === regionId);
    if (!targetRegion) {
      toast.error('Cannot unassign text from a region on a different page');
      return;
    }

    onRegionUpdate({
      ...targetRegion,
      description: null
    });
    onRegionSelect(targetRegion.id);
  };

  const handleUndoAll = () => {
    if (!documentId) return;
    undoAllAssignments(documentId);
    toast.success('All texts unassigned');
  };

  const handleAssignTexts = async () => {
    if (!text.trim() || !documentId) {
      toast.error('Please enter text and ensure a document is selected');
      return;
    }

    setIsAssigning(true);
    try {
      console.log(`Assigning texts to regions for page ${currentPage}`);
      
      // Parse texts and add page information
      const parsedTexts = parseTitledText(text);
      const textsWithPage = parsedTexts.map(parsedText => ({
        ...parsedText,
        page: currentPage
      }));

      // Save texts with page information
      const savedTexts = await assignTextsToRegions(text, currentPageRegions, documentId, currentPage);
      
      toast.success(`Assigned ${savedTexts.length} texts to regions on page ${currentPage}`);
      setText('');
    } catch (error) {
      console.error('Error assigning texts to regions:', error);
      toast.error('Failed to assign texts to regions');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleAssignToRegion = async (textIndex: number, regionId: string) => {
    if (!documentId) return;
    
    const textToAssign = currentPageTexts[textIndex];
    if (!textToAssign) return;

    const targetRegion = currentPageRegions.find(r => r.id === regionId);
    if (!targetRegion) {
      toast.error('Cannot assign text to a region on a different page');
      return;
    }

    try {
      await assignTextToRegion(textIndex, regionId, documentId);
      
      onRegionUpdate({
        ...targetRegion,
        description: textToAssign.content
      });
      
      toast.success(`Text assigned to ${targetRegion.name}`);
    } catch (error) {
      console.error('Error assigning text to region:', error);
      toast.error('Failed to assign text to region');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Insert Text</h3>
        <span className="text-sm text-muted-foreground">Page {currentPage}</span>
      </div>
      
      <Textarea 
        value={text} 
        onChange={(e) => setText(e.target.value)} 
        placeholder="Enter text to assign to regions..." 
        className="w-full min-h-[100px] resize-none"
        disabled={isAssigning}
      />
      
      <div className="flex gap-2">
        <Button 
          onClick={handleAssignTexts} 
          disabled={!text.trim() || isAssigning || currentPageRegions.length === 0}
          className="flex-1"
        >
          {isAssigning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Assigning...
            </>
          ) : (
            `Assign to Page ${currentPage} Regions`
          )}
        </Button>
        
        {currentPageTexts.length > 0 && (
          <Button 
            onClick={handleUndoAll} 
            variant="outline"
            disabled={isAssigning}
          >
            <Undo2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {currentPageRegions.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No regions on this page</AlertTitle>
          <AlertDescription>
            Create regions on page {currentPage} before inserting text.
          </AlertDescription>
        </Alert>
      )}

      {currentPageTexts.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Available Texts (Page {currentPage}):</h4>
          
          {currentPageTexts.map((text, index) => (
            <div key={index} className="border rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h5 className="font-medium text-sm">{text.title}</h5>
                  <p className="text-xs text-muted-foreground mt-1">
                    {text.content.substring(0, 100)}...
                  </p>
                </div>
                
                {text.assignedRegionId && (
                  <Badge variant="secondary" className="ml-2">
                    Assigned
                  </Badge>
                )}
              </div>
              
              {!text.assignedRegionId && (
                <div className="flex flex-wrap gap-1">
                  {getUnassignedRegionsByPage(currentPageRegions, currentPage, documentId || '').map((region) => (
                    <Button
                      key={region.id}
                      size="sm"
                      variant="outline"
                      onClick={() => handleAssignToRegion(index, region.id)}
                      className="text-xs"
                    >
                      {region.name}
                    </Button>
                  ))}
                </div>
              )}
              
              {text.assignedRegionId && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    Assigned to: {currentPageRegions.find(r => r.id === text.assignedRegionId)?.name || 'Unknown Region'}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => text.assignedRegionId && handleUnassignText(text.assignedRegionId)}
                    className="text-xs text-blue-500 hover:text-blue-700"
                  >
                    <Undo2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TextInsert;
