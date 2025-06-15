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

interface TTSRequestModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  documentId: string | null;
  pageCount: number;
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

const TTSRequestModal = ({ isOpen, onOpenChange, documentId, pageCount, onSuccess }: TTSRequestModalProps) => {
  const { authState, refreshProfile } = useAuth();
  const [selectedPages, setSelectedPages] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedPages('');
    }
  }, [isOpen]);

  const parsedPages = useMemo(() => parsePageRanges(selectedPages, pageCount), [selectedPages, pageCount]);
  const costInCredits = parsedPages.length;
  const creditsRemaining = authState.profile?.credits_remaining || 0;
  const creditsUsed = Math.min(costInCredits, creditsRemaining);
  const creditsNeeded = Math.max(0, costInCredits - creditsRemaining);
  const extraCost = creditsNeeded * 250; 

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
    try {
      const { data: requestData, error } = await supabase.from('tts_requests').insert({
        user_id: authState.profile.id,
        document_id: documentId,
        requested_pages: parsedPages,
        cost_in_credits: costInCredits,
        extra_cost_da: extraCost,
        status: 'pending',
      }).select().single();

      if (error) throw error;
      
      const newCredits = creditsRemaining - creditsUsed;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ credits_remaining: newCredits })
        .eq('id', authState.profile.id);

      if (profileError) throw profileError;
      
      const { error: taskError } = await supabase.from('admin_tasks').insert({
          tts_request_id: requestData.id,
          status: 'pending',
      });

      if (taskError) throw taskError;
      
      toast.success('TTS request submitted successfully!');
      await refreshProfile();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting TTS request:', error);
      toast.error('Failed to submit TTS request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Text-to-Speech</DialogTitle>
          <DialogDescription>
            Select the pages you want to convert to audio. The document has {pageCount} pages.
          </DialogDescription>
        </DialogHeader>
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
          <Button onClick={handleSubmit} disabled={isSubmitting || parsedPages.length === 0}>
            {isSubmitting ? 'Submitting...' : `Submit for ${costInCredits} credits`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TTSRequestModal;
