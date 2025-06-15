
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DocumentData } from '@/types/documents';
import { Profile } from '@/types/auth';
import { toast } from 'sonner';

interface DocumentSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: DocumentData | null;
  user: Profile | null;
  pageCount: number;
  onUpdate: (updates: Partial<Pick<DocumentData, 'is_private' | 'drm_protected_pages'>>) => void;
}

export const DocumentSettingsDialog: React.FC<DocumentSettingsDialogProps> = ({
  open,
  onOpenChange,
  document,
  user,
  pageCount,
  onUpdate,
}) => {
  const [isPrivate, setIsPrivate] = useState(document?.is_private || false);
  const [drmPages, setDrmPages] = useState<boolean | number[]>(document?.drm_protected_pages || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (document) {
      setIsPrivate(document.is_private);
      setDrmPages(document.drm_protected_pages || []);
    }
  }, [document, open]);
  
  const isSubscriber = !!user?.plan_id;

  const handleSave = () => {
    if (!document) return;
    setLoading(true);
    onUpdate({
      is_private: isPrivate,
      drm_protected_pages: drmPages,
    });
    setLoading(false);
    onOpenChange(false);
  };
  
  const handlePrivacyChange = (checked: boolean) => {
    if (!isSubscriber) {
      toast.error('You must be a subscriber to make documents private.');
      return;
    }
    setIsPrivate(checked);
  };
  
  const handleAllPagesDrmChange = (checked: boolean) => {
    if (!isSubscriber) {
      toast.error('You must be a subscriber to use DRM protection.');
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
      toast.error('You must be a subscriber to use DRM protection.');
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
          <DialogTitle>Document Settings</DialogTitle>
          <DialogDescription>
            Manage visibility and DRM for <span className="font-semibold">{document.name}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <h4 className="font-medium">Visibility</h4>
            <div className="flex items-center space-x-2">
              <Switch
                id="privacy-toggle"
                checked={isPrivate}
                onCheckedChange={handlePrivacyChange}
                disabled={!isSubscriber}
              />
              <Label htmlFor="privacy-toggle">Private Document</Label>
            </div>
            {!isSubscriber && <p className="text-xs text-muted-foreground">Upgrade to a subscription to make documents private.</p>}
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">DRM Protection</h4>
            <div className="flex items-center space-x-2">
              <Switch
                id="drm-toggle"
                checked={drmPages === true}
                onCheckedChange={handleAllPagesDrmChange}
                disabled={!isSubscriber}
              />
              <Label htmlFor="drm-toggle">Protect entire document</Label>
            </div>
            {drmPages !== true && (
              <div className="space-y-2 mt-2 pl-2">
                <Label>Select pages to protect:</Label>
                <ScrollArea className="h-40 w-full rounded-md border p-2">
                  <div className="space-y-2">
                    {Array.from({ length: pageCount }, (_, i) => i + 1).map(page => (
                      <div key={page} className="flex items-center space-x-2">
                        <Checkbox
                          id={`page-${page}`}
                          checked={Array.isArray(drmPages) && drmPages.includes(page)}
                          onCheckedChange={(checked) => handlePageDrmChange(page, !!checked)}
                          disabled={!isSubscriber}
                        />
                        <Label htmlFor={`page-${page}`} className="font-normal">Page {page}</Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
            {!isSubscriber && <p className="text-xs text-muted-foreground mt-2">Upgrade to a subscription to enable DRM protection.</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
