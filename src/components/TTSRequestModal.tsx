
import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthProvider';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { usePdfPageCount } from '@/hooks/usePdfPageCount';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface TTSRequestModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  documentId: string | null;
  documentName: string;
  onSuccess: () => void;
}

function parsePageRanges(input: string, maxPage: number): number[] {
  const pages = new Set<number>();
  if (!input.trim()) return [];

  const parts = input.split(',').map(part => part.trim());

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end) && start <= end && start > 0 && end <= maxPage) {
        for (let i = start; i <= end; i++) {
          pages.add(i);
        }
      } else {
        return []; // Invalid range
      }
    } else {
      const page = parseInt(part, 10);
      if (!isNaN(page) && page > 0 && page <= maxPage) {
        pages.add(page);
      } else {
        return []; // Invalid page
      }
    }
  }
  return Array.from(pages).sort((a, b) => a - b);
}

const TTSRequestModal = ({ isOpen, onOpenChange, documentId, documentName, onSuccess }: TTSRequestModalProps) => {
  const { authState, refreshProfile } = useAuth();
  const [selectedPages, setSelectedPages] = useState('');
  const [voiceType, setVoiceType] = useState<'male' | 'female'>('female');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { pageCount, isLoading: isLoadingPageCount, error: pageCountError } = usePdfPageCount({ documentId });

  useEffect(() => {
    if (isOpen) {
      setSelectedPages('');
      setVoiceType('female');
    }
  }, [isOpen]);

  const parsedPages = useMemo(() => parsePageRanges(selectedPages, pageCount), [selectedPages, pageCount]);
  const costInCredits = parsedPages.length;
  const creditsRemaining = authState.profile?.credits_remaining || 0;
  const creditsUsed = Math.min(costInCredits, creditsRemaining);
  const creditsNeeded = Math.max(0, costInCredits - creditsRemaining);
  const extraCost = creditsNeeded * 250; 

  const handleSelectAll = () => {
    if (pageCount > 0) {
      setSelectedPages(`1-${pageCount}`);
    }
  };

  const handleSubmit = async () => {
    if (!documentId || !authState.profile) {
      toast.error('You must be logged in and have a document selected.');
      return;
    }

    if (parsedPages.length === 0) {
      toast.error('Please select valid pages to proceed.');
      return;
    }

    setIsSubmitting(true);
    console.log("Submitting TTS request with profile ID:", authState.profile.id);

    // Step 1: Insert the TTS request
    const { data: requestData, error: requestError } = await supabase
      .from('tts_requests')
      .insert({
        user_id: authState.profile.id,
        document_id: documentId,
        requested_pages: parsedPages,
        cost_in_credits: costInCredits,
        extra_cost_da: extraCost,
        status: 'pending',
        voice_type: voiceType,
      })
      .select()
      .single();

    if (requestError) {
      console.error('Error inserting TTS request:', requestError);
      toast.error(`Failed to submit TTS request: ${requestError.message}`);
      setIsSubmitting(false);
      return;
    }

    toast.success('TTS request submitted successfully!');
    let hadSubsequentErrors = false;

    // Step 2: Update user credits
    const newCredits = creditsRemaining - creditsUsed;
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ credits_remaining: newCredits })
      .eq('id', authState.profile.id);

    if (profileError) {
      console.error('Failed to update user credits:', profileError);
      toast.warning('Request submitted, but failed to update credits. Please contact support.');
      hadSubsequentErrors = true;
    }

    // Step 3: Create a corresponding admin task
    if (requestData) {
      const { error: taskError } = await supabase.from('admin_tasks').insert({
        tts_request_id: requestData.id,
        status: 'pending',
      });

      if (taskError) {
        console.error('Failed to create admin task:', taskError);
        toast.error('Request submitted, but failed to create admin task. Please contact support.');
        hadSubsequentErrors = true;
      }
    }

    // Finalization
    try {
      await refreshProfile();
      onSuccess();
    } catch (e) {
      console.error("Error refreshing data after submission", e);
      toast.warning("Could not refresh data automatically.");
    }
    
    // Only close the modal if everything was successful
    if (!hadSubsequentErrors) {
      onOpenChange(false);
    }
    
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request TTS for "{documentName}"</DialogTitle>
          <DialogDescription>
            {isLoadingPageCount ? (
              'Loading document details...'
            ) : pageCountError ? (
              <span className="text-destructive">Could not load PDF details. Please try again.</span>
            ) : (
              `Select the pages you want to convert to audio. The document has ${pageCount} pages.`
            )}
          </DialogDescription>
        </DialogHeader>
        {isLoadingPageCount ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : pageCountError ? (
          <div className="py-4 text-center text-destructive">
            <p>Failed to load document information. Please close this and try again.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="pages" className="text-right">
                  Pages
                </Label>
                <Input
                  id="pages"
                  value={selectedPages}
                  onChange={(e) => setSelectedPages(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., 1, 3-5, 8"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="voice" className="text-right">
                  Voice
                </Label>
                <RadioGroup
                  defaultValue="female"
                  onValueChange={(value: 'male' | 'female') => setVoiceType(value)}
                  value={voiceType}
                  className="col-span-3 flex items-center space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="r-female" />
                    <Label htmlFor="r-female">Female</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="r-male" />
                    <Label htmlFor="r-male">Male</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="flex justify-end -mt-2">
                <Button variant="link" size="sm" onClick={handleSelectAll} className="p-0 h-auto text-xs">
                  Select all pages
                </Button>
              </div>
              <div className="space-y-2 text-sm p-4 bg-slate-50 rounded-md">
                <div className="flex justify-between">
                  <span>Total pages selected:</span>
                  <span className="font-medium">{costInCredits}</span>
                </div>
                <div className="flex justify-between">
                  <span>Your credits:</span>
                  <span className="font-medium">{creditsRemaining}</span>
                </div>
                 <div className="flex justify-between">
                    <span>Credits that will be used:</span>
                    <span className="font-medium">{creditsUsed}</span>
                </div>
                {extraCost > 0 && (
                    <div className="flex justify-between font-semibold text-amber-600 pt-2 border-t">
                    <span>Extra cost:</span>
                    <span>{extraCost.toLocaleString()} DA</span>
                    </div>
                )}
                </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={isSubmitting || parsedPages.length === 0 || !!pageCountError}>
                {isSubmitting ? 'Submitting...' : `Submit for ${costInCredits} credits`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TTSRequestModal;
