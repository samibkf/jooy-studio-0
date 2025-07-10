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
import { useLanguage } from '@/contexts/LanguageContext';
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
  const { t, isRTL } = useLanguage();
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
  const hasEnoughCredits = creditsRemaining >= costInCredits;

  const handleSelectAll = () => {
    if (pageCount > 0) {
      setSelectedPages(`1-${pageCount}`);
    }
  };

  const handleSubmit = async () => {
    if (!documentId || !authState.profile) {
      toast.error(t('tts.login_document_required') || 'You must be logged in and have a document selected.');
      return;
    }

    if (parsedPages.length === 0) {
      toast.error(t('tts.select_valid_pages') || 'Please select valid pages to proceed.');
      return;
    }

    if (!hasEnoughCredits) {
      toast.error(t('tts.not_enough_credits') || 'You do not have enough credits to make this request.');
      return;
    }

    setIsSubmitting(true);
    console.log("Submitting Virtual Tutor request with profile ID:", authState.profile.id);

    // Step 1: Insert the TTS request (table name remains the same)
    const { data: requestData, error: requestError } = await supabase
      .from('tts_requests')
      .insert({
        user_id: authState.profile.id,
        document_id: documentId,
        requested_pages: parsedPages,
        cost_in_credits: costInCredits,
        status: 'pending',
        voice_type: voiceType,
      })
      .select()
      .single();

    if (requestError) {
      console.error('Error inserting Virtual Tutor request:', requestError);
      toast.error(`${t('tts.request_failed') || 'Failed to submit Virtual Tutor request'}: ${requestError.message}`);
      setIsSubmitting(false);
      return;
    }

    toast.success(t('tts.request_submitted') || 'Virtual Tutor request submitted successfully!');
    let hadSubsequentErrors = false;

    // Step 2: Update user credits
    const newCredits = creditsRemaining - costInCredits;
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ credits_remaining: newCredits })
      .eq('id', authState.profile.id);

    if (profileError) {
      console.error('Failed to update user credits:', profileError);
      toast.warning(t('tts.credits_update_failed') || 'Request submitted, but failed to update credits. Please contact support.');
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
        toast.error(t('tts.admin_task_failed') || 'Request submitted, but failed to create admin task. Please contact support.');
        hadSubsequentErrors = true;
      }
    }

    // Finalization
    try {
      await refreshProfile();
      onSuccess();
    } catch (e) {
      console.error("Error refreshing data after submission", e);
      toast.warning(t('tts.refresh_failed') || "Could not refresh data automatically.");
    }
    
    // Only close the modal if everything was successful
    if (!hadSubsequentErrors) {
      onOpenChange(false);
    }
    
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={isRTL ? 'rtl' : 'ltr'} dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className={isRTL ? 'text-right' : 'text-left'}>
            <span dir={isRTL ? 'rtl' : 'ltr'}>
              {t('tts.request_tutor_for')} "<span dir="ltr">{documentName}</span>"
            </span>
          </DialogTitle>
          <DialogDescription className={isRTL ? 'text-right' : 'text-left'}>
            {isLoadingPageCount ? (
              t('tts.loading_document')
            ) : pageCountError ? (
              <span className="text-destructive">{t('tts.load_pdf_error')}</span>
            ) : (
              <span dir={isRTL ? 'rtl' : 'ltr'}>
                {t('tts.select_pages_description')} {pageCount} {t('tts.document_pages')}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        {isLoadingPageCount ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : pageCountError ? (
          <div className={`py-4 text-center text-destructive ${isRTL ? 'rtl' : 'ltr'}`}>
            <p>{t('tts.failed_load_document')}</p>
          </div>
        ) : (
          <>
            <div className={`grid gap-4 py-4 ${isRTL ? 'rtl' : 'ltr'}`}>
              <div className={`grid grid-cols-4 items-center gap-4 ${isRTL ? 'rtl' : 'ltr'}`}>
                <Label htmlFor="pages" className={isRTL ? 'text-left' : 'text-right'}>
                  {t('tts.pages_label')}
                </Label>
                <Input
                  id="pages"
                  value={selectedPages}
                  onChange={(e) => setSelectedPages(e.target.value)}
                  className="col-span-3"
                  placeholder={t('tts.pages_placeholder')}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>
              <div className={`grid grid-cols-4 items-center gap-4 ${isRTL ? 'rtl' : 'ltr'}`}>
                <Label htmlFor="voice" className={isRTL ? 'text-left' : 'text-right'}>
                  {t('tts.voice_label')}
                </Label>
                <RadioGroup
                  defaultValue="female"
                  onValueChange={(value: 'male' | 'female') => setVoiceType(value)}
                  value={voiceType}
                  className={`col-span-3 flex items-center space-x-4 ${isRTL ? 'rtl:space-x-reverse' : ''}`}
                >
                  <div className={`flex items-center space-x-2 ${isRTL ? 'rtl:space-x-reverse' : ''}`}>
                    <RadioGroupItem value="female" id="r-female" />
                    <Label htmlFor="r-female">{t('tts.voice_female')}</Label>
                  </div>
                  <div className={`flex items-center space-x-2 ${isRTL ? 'rtl:space-x-reverse' : ''}`}>
                    <RadioGroupItem value="male" id="r-male" />
                    <Label htmlFor="r-male">{t('tts.voice_male')}</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'} -mt-2`}>
                <Button variant="link" size="sm" onClick={handleSelectAll} className="p-0 h-auto text-xs">
                  {t('tts.select_all_pages')}
                </Button>
              </div>
              <div className={`space-y-2 text-sm p-4 bg-slate-50 rounded-md ${isRTL ? 'rtl' : 'ltr'}`}>
                <div className="flex justify-between">
                  <span>{t('tts.total_pages_selected')}</span>
                  <span className="font-medium" dir="ltr">{costInCredits}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('tts.your_credits')}</span>
                  <span className="font-medium" dir="ltr">{creditsRemaining}</span>
                </div>
                 <div className="flex justify-between">
                    <span>{t('tts.credits_used')}</span>
                    <span className="font-medium" dir="ltr">{costInCredits}</span>
                </div>
                {!hasEnoughCredits && parsedPages.length > 0 && (
                  <div className="flex justify-between font-semibold text-destructive pt-2 border-t">
                    <span>{t('tts.credits_needed')}</span>
                    <span dir="ltr">{costInCredits - creditsRemaining}</span>
                  </div>
                )}
                </div>
            </div>
            <DialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
              <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleSubmit} disabled={isSubmitting || parsedPages.length === 0 || !!pageCountError || !hasEnoughCredits}>
                {isSubmitting
                  ? t('tts.submitting')
                  : !hasEnoughCredits && parsedPages.length > 0
                  ? t('tts.insufficient_credits')
                  : t('tts.submit_for_credits').replace('{count}', costInCredits.toString())}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TTSRequestModal;
