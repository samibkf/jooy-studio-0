
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DocumentData } from '@/types/documents';
import { Profile } from '@/types/auth';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

interface DocumentSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: DocumentData | null;
  user: Profile | null;
  pageCount: number;
  onUpdate: (updates: Partial<Pick<DocumentData, 'drm_protected_pages'>>) => void;
}

export const DocumentSettingsDialog: React.FC<DocumentSettingsDialogProps> = ({
  open,
  onOpenChange,
  document,
  user,
  pageCount,
  onUpdate,
}) => {
  const { t, isRTL } = useLanguage();
  const isSubscriber = !!user?.plan_id;
  const [drmPages, setDrmPages] = useState<boolean | number[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (document) {
      setDrmPages(document.drm_protected_pages || []);
    }
  }, [document, open]);
  
  const handleSave = () => {
    if (!document) return;
    setLoading(true);
    // Only update DRM settings
    onUpdate({
      drm_protected_pages: drmPages,
    });
    setLoading(false);
    onOpenChange(false);
  };
  
  const handleAllPagesDrmChange = (checked: boolean) => {
    if (!isSubscriber) {
      toast.error(t('drm.subscriber_required'));
      return;
    }
    if (checked) {
        setDrmPages(true);
    } else {
        setDrmPages([]);
    }
  };

  const handlePageDrmChange = (page: number, checked: boolean) => {
    if (!isSubscriber) {
      toast.error(t('drm.subscriber_required'));
      return;
    }
    let currentPages: number[] = [];
    if (Array.isArray(drmPages)) {
      currentPages = drmPages;
    }

    let newPages: number[];
    if (checked) {
      newPages = [...currentPages, page];
    } else {
      newPages = currentPages.filter(p => p !== page);
    }
    setDrmPages(newPages);
  };

  if (!document) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle dir={isRTL ? 'rtl' : 'ltr'}>{t('drm.protection')}</DialogTitle>
          <DialogDescription dir={isRTL ? 'rtl' : 'ltr'}>
            {t('drm.manage_settings_for')} <span className="font-semibold">{document.name}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <h4 className="font-medium" dir={isRTL ? 'rtl' : 'ltr'}>{t('drm.protection')}</h4>
            <div className={`flex items-center justify-between ${isRTL ? 'rtl-container-flex' : 'ltr-container-flex'}`}>
              <Label htmlFor="drm-toggle-all" dir={isRTL ? 'rtl' : 'ltr'}>{t('drm.protect_entire_document')}</Label>
              <Switch
                id="drm-toggle-all"
                checked={drmPages === true}
                onCheckedChange={handleAllPagesDrmChange}
                disabled={!isSubscriber}
              />
            </div>
            {drmPages !== true && (
             <div className={`space-y-2 mt-2 ${isRTL ? 'pr-2' : 'pl-2'}`}>
                <Label dir={isRTL ? 'rtl' : 'ltr'} className={isRTL ? 'text-right' : 'text-left'}>{t('drm.select_pages_to_protect')}</Label>
                <ScrollArea className="h-40 w-full rounded-md border p-2">
                  <div className="space-y-2">
                    {Array.from({ length: pageCount }, (_, i) => i + 1).map(page => (
                      <div key={page} className={`flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'} ${isRTL ? 'rtl-container-flex' : 'ltr-container-flex'}`}>
                        <Checkbox
                          id={`page-${page}`}
                          checked={Array.isArray(drmPages) && drmPages.includes(page)}
                          onCheckedChange={(checked) => handlePageDrmChange(page, !!checked)}
                          disabled={!isSubscriber}
                        />
                        <Label htmlFor={`page-${page}`} className="font-normal" dir={isRTL ? 'rtl' : 'ltr'}>{t('drm.page_number')} {page}</Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
            {!isSubscriber && <p className="text-xs text-muted-foreground mt-2" dir={isRTL ? 'rtl' : 'ltr'}>{t('drm.upgrade_subscription')}</p>}
          </div>
        </div>
        <DialogFooter className={isRTL ? 'rtl-button-flex' : 'ltr-button-flex'}>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            <span dir={isRTL ? 'rtl' : 'ltr'}>{t('common.cancel')}</span>
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <span dir={isRTL ? 'rtl' : 'ltr'}>{loading ? t('drm.saving') : t('drm.save_changes')}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
