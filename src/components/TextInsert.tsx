import React, { useState, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button, buttonVariants } from '@/components/ui/button';
import { toast } from 'sonner';
import { Undo2, ArrowRight, Sparkles, Settings, Trash2, Text } from 'lucide-react';
import { Region } from '@/types/regions';
import { useTextAssignment } from '@/contexts/TextAssignmentContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getGeminiApiKeys } from './GeminiApiKeyDialog';
import { generateGuidanceFromImage } from '@/services/geminiService';
import { pdfCacheService } from '@/services/pdfCacheService';
import * as pdfjsLib from 'pdfjs-dist';
import { TitledText } from '@/contexts/TextAssignmentContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TextInsertProps {
  regions: Region[];
  onRegionUpdate: (region: Region) => void;
  selectedRegion: Region | null;
  onRegionSelect: (regionId: string) => void;
  documentId: string | null;
  currentPage: number;
  showManualInsert: boolean;
}

const SYSTEM_INSTRUCTIONS_TEMPLATE = `Purpose and Goals:
* Primary goal is to guide learners through reasoning, not give direct answers.
* Help students develop their critical thinking, problem-solving, and decision-making skills in any subject area—math, science, language, or others.

Behaviors and Rules:

For Each Question in the provided worksheet:
Respond with 3 short reasoning paragraphs that:
* Help the student reflect on what they already know that's relevant to the problem.
* Lead the student to analyze or break down the given options, data, or elements of the question.
* Encourage the student to mentally test or evaluate possible solutions within the problem's context.
After each reasoning paragraph, include a separate reflective prompt (mini-review call-to-action). These should:
* Encourage the student to pause, apply their thinking, and take the next mental step.
* Be short, varied in wording, and written in a friendly, student-facing tone.
Never give away the final answer. The goal is to guide students toward figuring it out themselves through progressive, scaffolded reasoning.

IMPORTANT FORMATTING REQUIREMENTS:
* Format each section with a title wrapped in double asterisks: **Your Title Here**
* Follow each title immediately with the content
* Example format:
**Question Analysis**
Think about what you already know about this topic...

**Breaking Down the Problem**
Let's look at each part of this question...

**Testing Your Ideas**
Now consider which approach might work best...

Ensure the tone is:
* Encouraging and non-judgmental.
* Clear and age-appropriate, adaptable for both young and older learners.
* Suitable for multiple disciplines and adaptable to various complexity levels.
* Foster a sense of curiosity and discovery.`;

const TextInsert = ({
  regions,
  onRegionUpdate,
  selectedRegion,
  onRegionSelect,
  documentId,
  currentPage,
  showManualInsert,
}: TextInsertProps) => {
  const [inputText, setInputText] = useState<string>('');
  const [activeTextIndex, setActiveTextIndex] = useState<number | null>(null);
  const [systemInstructions, setSystemInstructions] = useState(SYSTEM_INSTRUCTIONS_TEMPLATE);
  const [isGenerating, setIsGenerating] = useState(false);
  const [textToDelete, setTextToDelete] = useState<TitledText | null>(null);
  const [textToPreview, setTextToPreview] = useState<TitledText | null>(null);
  const [autoAssign, setAutoAssign] = useState(false);

  const {
    getCurrentDocumentTexts,
    assignTextsToRegions,
    replaceAllContentForPage,
    undoAllAssignments,
    undoRegionAssignment,
    assignTextToRegion,
    isRegionAssigned,
    getUnassignedRegionsByPage,
    deleteDocumentText,
  } = useTextAssignment();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Get texts for current document and filter by current page, sorted by orderIndex
  const currentPageTexts = documentId ? getCurrentDocumentTexts(documentId, currentPage) : [];

  const sortRegionsByName = (regionsToSort: Region[]): Region[] => {
    return [...regionsToSort].sort((a, b) => {
      const aNameParts = a.name.split('_').map(Number);
      const bNameParts = b.name.split('_').map(Number);

      if (
        aNameParts.length !== 2 ||
        bNameParts.length !== 2 ||
        isNaN(aNameParts[0]) ||
        isNaN(aNameParts[1]) ||
        isNaN(bNameParts[0]) ||
        isNaN(bNameParts[1])
      ) {
        return a.name.localeCompare(b.name);
      }

      if (aNameParts[0] !== bNameParts[0]) {
        return aNameParts[0] - bNameParts[0];
      }
      return aNameParts[1] - bNameParts[1];
    });
  };

  const handleGenerateFromPage = async () => {
    if (!documentId) {
      toast.error('No document selected.');
      return;
    }
    const apiKeys = getGeminiApiKeys();
    if (apiKeys.length === 0) {
      toast.error('Gemini API Key is not set. Please set it in the header.');
      return;
    }
    if (!systemInstructions.trim()) {
      toast.error('System instructions cannot be empty.');
      return;
    }

    setIsGenerating(true);
    console.log(`[TextInsert] Starting AI generation for page ${currentPage}`);
    toast.loading('Generating guidance from page...', { id: 'gemini-generate' });

    const currentPageRegionsCheck = regions.filter(r => r.page === currentPage);
    if (currentPageRegionsCheck.length === 0) {
      toast.warning(`No regions found on page ${currentPage}. Please add regions first.`, { id: 'gemini-generate' });
      setIsGenerating(false);
      return;
    }

    try {
      console.log(`[TextInsert] Getting cached PDF for document ${documentId}`);
      const cachedPdf = await pdfCacheService.getCachedPDF(documentId);
      if (!cachedPdf) {
        throw new Error('PDF is not loaded. Please wait a moment and try again.');
      }

      console.log(`[TextInsert] Rendering page ${currentPage} to canvas`);
      const pdf = await pdfjsLib.getDocument({ data: cachedPdf }).promise;
      const page = await pdf.getPage(currentPage);
      const viewport = page.getViewport({ scale: 2.0 });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not get canvas context.');
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport: viewport }).promise;
      const imageBase64 = canvas.toDataURL('image/jpeg');

      console.log(`[TextInsert] Calling Gemini API with ${apiKeys.length} keys available`);
      const generatedText = await generateGuidanceFromImage(systemInstructions, imageBase64, apiKeys);

      if (!generatedText || !generatedText.trim()) {
        throw new Error('AI returned empty content.');
      }
      
      console.log(`[TextInsert] AI generated ${generatedText.length} characters of content`);
      console.log(`[TextInsert] Raw AI response preview:`, generatedText.substring(0, 300) + '...');
      console.log(`[TextInsert] Calling replaceAllContentForPage for page ${currentPage}`);
      
      const newTexts = await replaceAllContentForPage(generatedText, regions, documentId, currentPage);

      if (!newTexts || newTexts.length === 0) {
        console.error('[TextInsert] replaceAllContentForPage returned empty or undefined result');
        throw new Error('AI guidance was generated but could not be saved. The AI response format may not be compatible.');
      }

      console.log(`[TextInsert] Successfully generated and saved ${newTexts.length} text sections`);

      if (autoAssign) {
        const currentPageRegions = regions.filter(region => region.page === currentPage);
        const sortedRegions = sortRegionsByName(currentPageRegions);

        let assignedCount = 0;
        const sortedTexts = [...newTexts].sort((a, b) => a.orderIndex - b.orderIndex);
        sortedTexts.forEach((text, index) => {
          if (index < sortedRegions.length) {
            const region = sortedRegions[index];
            assignTextToRegion(text, region.id, documentId);
            onRegionUpdate({ ...region, description: text.content });
            assignedCount++;
          }
        });
        toast.success(`AI guidance generated and automatically assigned to ${assignedCount} regions.`, { id: 'gemini-generate' });
      } else {
        toast.success(`AI guidance generated with ${newTexts.length} texts. Please assign them manually.`, { id: 'gemini-generate' });
      }

    } catch (error) {
      console.error("[TextInsert] Error generating guidance:", error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      console.error(`[TextInsert] Error details: ${errorMessage}`);
      
      // Provide more specific error messages
      if (errorMessage.includes('could not be parsed')) {
        toast.error('AI response format is not compatible. Try adjusting the system instructions.', { id: 'gemini-generate' });
      } else {
        toast.error(errorMessage, { id: 'gemini-generate' });
      }
    } finally {
      setIsGenerating(false);
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

    const currentPageRegions = regions.filter(region => region.page === currentPage);

    if (currentPageRegions.length === 0) {
      toast.error(`No regions available on page ${currentPage}`);
      return;
    }

    const processedTexts = await assignTextsToRegions(inputText, currentPageRegions, documentId, currentPage);

    const sortedRegions = sortRegionsByName(currentPageRegions);

    if (processedTexts && processedTexts.length > 0) {
      const sortedTexts = [...processedTexts].sort((a, b) => a.orderIndex - b.orderIndex);
      sortedTexts.forEach((text, index) => {
        if (index < sortedRegions.length) {
          const region = sortedRegions[index];
          assignTextToRegion(text, region.id, documentId);

          onRegionUpdate({
            ...region,
            description: text.content
          });
        }
      });
      toast.success(`Text assigned to ${processedTexts.length} regions on page ${currentPage}`);
      setInputText('');
    }
  };

  const handleUndo = () => {
    if (!documentId) return;

    undoAllAssignments(documentId, currentPage);
    
    const currentPageRegions = regions.filter(region => region.page === currentPage);
    currentPageRegions.forEach(region => {
      if (isRegionAssigned(region.id, documentId)) {
        onRegionUpdate({
          ...region,
          description: null
        });
      }
    });
    
    toast.success(`Text assignments undone for page ${currentPage}`);
  };

  const handleUndoSpecificText = (regionId: string) => {
    if (!documentId) return;

    const region = regions.find(r => r.id === regionId);
    if (!region) return;

    if (region.page !== currentPage) {
      toast.error('Cannot undo assignment from a different page');
      return;
    }

    undoRegionAssignment(regionId, documentId);

    onRegionUpdate({
      ...region,
      description: null
    });
    toast.success(`Text unassigned from region ${region.name || regionId}`);
  };

  const handleAssignToRegion = (text: TitledText, regionId: string) => {
    if (!documentId) return;

    const region = regions.find(r => r.id === regionId);
    if (!text || !region) return;

    if (region.page !== currentPage) {
      toast.error('Cannot assign text to a region on a different page');
      return;
    }

    assignTextToRegion(text, regionId, documentId);

    onRegionUpdate({
      ...region,
      description: text.content
    });
    setActiveTextIndex(null);
    toast.success(`Assigned "${text.title}" to region ${region.name}`);
  };

  const handleRegionSelect = (regionId: string) => {
    onRegionSelect(regionId);
    
    setTimeout(() => {
      const regionElement = document.getElementById(`region-${regionId}`);
      if (regionElement) {
        regionElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }, 100);
  };

  const handleDeleteText = async () => {
    if (!textToDelete || !documentId) {
      toast.error("No text selected for deletion.");
      return;
    }
    try {
      await deleteDocumentText(documentId, textToDelete.id);
      toast.success(`"${textToDelete.title}" deleted successfully.`);
    } catch (error) {
      console.error("Error deleting text:", error);
      toast.error("Failed to delete text.");
    } finally {
      setTextToDelete(null);
    }
  };

  // Separate texts by assignment status and sort by orderIndex
  const unassignedTexts = currentPageTexts.filter(text => !text.assignedRegionId);
  const assignedTexts = currentPageTexts.filter(text => text.assignedRegionId);
  const unassignedRegionsByPage = documentId ? sortRegionsByName(getUnassignedRegionsByPage(regions, currentPage, documentId)) : [];
  
  return (
    <div className="space-y-4">
      {/* AI Generation Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">AI Generation</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
                <span className="sr-only">AI System Instructions</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">System Instructions</h4>
                  <p className="text-sm text-muted-foreground">
                    Define the AI's behavior for content generation.
                  </p>
                </div>
                <Textarea
                  value={systemInstructions}
                  onChange={(e) => setSystemInstructions(e.target.value)}
                  placeholder="Enter system instructions for the AI..."
                  className="min-h-0 h-48 text-xs"
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex items-center space-x-2 pt-1">
          <Checkbox id="auto-assign" checked={autoAssign} onCheckedChange={(checked) => setAutoAssign(Boolean(checked))} />
          <label
            htmlFor="auto-assign"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Auto-assign to regions
          </label>
          <div className="flex-grow" />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={handleGenerateFromPage} disabled={isGenerating} size="icon" variant="default">
                  <Sparkles className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span className="sr-only">Generate AI Guidance for this page</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Generate AI Guidance for this page</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {showManualInsert && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Insert Text Manually:</label>
                <span className="text-xs text-muted-foreground">Page {currentPage}</span>
              </div>
              <Textarea 
                ref={textareaRef} 
                value={inputText} 
                onChange={e => setInputText(e.target.value)} 
                placeholder="Paste your markdown text here..." 
                className="min-h-0 h-24" 
              />
              <div className="flex space-x-2">
                <Button onClick={handleInsertText} className="flex-1" disabled={!inputText.trim()}>
                  Insert to Page {currentPage}
                </Button>
                <Button onClick={handleUndo} variant="outline" className="flex-shrink-0" disabled={assignedTexts.length === 0}>
                  <Undo2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
      
      {currentPageTexts.length > 0 && (
        <div className="space-y-3 pt-4">
          {unassignedTexts.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Unassigned Texts (Page {currentPage}):</p>
              <ScrollArea className="h-[150px] border rounded-md p-2">
                <div className="space-y-2">
                  {unassignedTexts.map((text, index) => {
                    const textIndex = currentPageTexts.indexOf(text);
                    return (
                      <div key={`unassigned-${text.id}`} className="relative group">
                        <Popover open={activeTextIndex === textIndex} onOpenChange={open => setActiveTextIndex(open ? textIndex : null)}>
                          <PopoverTrigger asChild>
                            <div className="p-2 border rounded-md cursor-pointer border-gray-300 bg-white hover:border-blue-300 hover:bg-blue-50 transition-colors pr-20">
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
                                    <div key={region.id} className="p-2 hover:bg-muted rounded-md cursor-pointer flex items-center justify-between" onClick={() => handleAssignToRegion(text, region.id)}>
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
                        <div className="absolute top-1/2 -translate-y-1/2 right-1 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                           <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={(e) => { e.stopPropagation(); setTextToPreview(text); }}
                          >
                            <Text className="h-4 w-4" />
                            <span className="sr-only">Preview Text</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={(e) => { e.stopPropagation(); setTextToDelete(text); }}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete Text</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
          
          {assignedTexts.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Assigned Texts (Page {currentPage}):</p>
              <ScrollArea className="h-[150px] border rounded-md p-2">
                <div className="space-y-2">
                  {assignedTexts.map((text, index) => {
                    const assignedRegion = regions.find(r => r.id === text.assignedRegionId);
                    return (
                      <div key={`assigned-${text.id}`} className="p-2 border rounded-md border-green-500 bg-green-50 cursor-pointer hover:bg-green-100 transition-colors" onClick={() => text.assignedRegionId && handleRegionSelect(text.assignedRegionId)}>
                        <div className="flex justify-between items-center">
                          <p className="font-medium text-sm">{text.title}</p>
                          <Button onClick={e => {
                            e.stopPropagation();
                            text.assignedRegionId && handleUndoSpecificText(text.assignedRegionId);
                          }} size="sm" variant="ghost" className="h-6 px-1.5 text-xs text-blue-500 hover:text-blue-700">
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

      <AlertDialog open={!!textToDelete} onOpenChange={() => setTextToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the text titled "{textToDelete?.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteText} className={buttonVariants({ variant: "destructive" })}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!textToPreview} onOpenChange={() => setTextToPreview(null)}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{textToPreview?.title}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <ScrollArea className="max-h-[60vh] mt-4 pr-4">
                <p className="text-sm text-foreground whitespace-pre-wrap">{textToPreview?.content}</p>
              </ScrollArea>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setTextToPreview(null)}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TextInsert;
