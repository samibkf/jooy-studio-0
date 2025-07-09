
import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
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
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface GeminiApiKeyDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onKeySave: () => void;
}

const API_KEYS_STORAGE_KEY = 'gemini-api-keys';

interface ApiKey {
  id: string;
  key: string;
}

export const GeminiApiKeyDialog: React.FC<GeminiApiKeyDialogProps> = ({ isOpen, onOpenChange, onKeySave }) => {
  const { t, isRTL } = useLanguage();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newApiKey, setNewApiKey] = useState('');

  useEffect(() => {
    if (isOpen) {
      const storedKeys = localStorage.getItem(API_KEYS_STORAGE_KEY);
      if (storedKeys) {
        try {
          const parsedKeys = JSON.parse(storedKeys);
          if (Array.isArray(parsedKeys)) {
            setApiKeys(parsedKeys);
          }
        } catch (e) {
          console.error("Failed to parse API keys from localStorage", e);
          setApiKeys([]);
        }
      } else {
        setApiKeys([]);
      }
      setNewApiKey('');
    }
  }, [isOpen]);

  const handleAddKey = () => {
    if (!newApiKey.trim()) {
      toast.error(t('api.key_empty_error'));
      return;
    }
    if (apiKeys.some(k => k.key === newApiKey.trim())) {
      toast.error(t('api.key_exists_error'));
      return;
    }
    setApiKeys([...apiKeys, { id: uuidv4(), key: newApiKey.trim() }]);
    setNewApiKey('');
    toast.info(t('api.key_added_info'));
  };

  const handleRemoveKey = (id: string) => {
    setApiKeys(apiKeys.filter(key => key.id !== id));
  };

  const handleSave = () => {
    let finalKeys = [...apiKeys];
    if (newApiKey.trim() && !finalKeys.some(k => k.key === newApiKey.trim())) {
      finalKeys.push({ id: uuidv4(), key: newApiKey.trim() });
    }
    
    localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(finalKeys));
    toast.success(t('api.keys_saved_success'));
    onKeySave();
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle dir={isRTL ? 'rtl' : 'ltr'}>{t('api.set_gemini_keys')}</DialogTitle>
          <DialogDescription dir={isRTL ? 'rtl' : 'ltr'}>
            {t('api.description')}{' '}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              {t('api.google_ai_studio')}
            </a>
            .
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-4">
            <Label dir={isRTL ? 'rtl' : 'ltr'} className={isRTL ? 'block text-right w-full' : 'block text-left w-full'} style={isRTL ? { textAlign: 'right' } : { textAlign: 'left' }}>{t('api.your_keys')}</Label>
            {apiKeys.length > 0 && (
              <div className="space-y-2 rounded-md border p-2 max-h-48 overflow-y-auto">
                {apiKeys.map((apiKey, index) => (
                  <div key={apiKey.id} className={`flex items-center gap-2 ${isRTL ? 'rtl-container-flex' : 'ltr-container-flex'}`}>
                    <Label className="flex-shrink-0 w-16 text-muted-foreground" dir={isRTL ? 'rtl' : 'ltr'}>{t('api.key_number')} {index + 1}</Label>
                    <Input
                      type="password"
                      value={apiKey.key}
                      readOnly
                      className="flex-grow font-mono text-xs"
                      dir="ltr"
                    />
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveKey(apiKey.id)} title={t('api.remove_key')}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
             <div className={`flex items-center gap-2 ${isRTL ? 'rtl-button-flex' : 'ltr-button-flex'}`}>
                <Input
                  id="gemini-api-key"
                  type="password"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder={t('api.enter_new_key')}
                  className="flex-grow"
                  dir="ltr"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddKey();
                    }
                  }}
                />
                <Button onClick={handleAddKey} variant="outline">
                  <span dir={isRTL ? 'rtl' : 'ltr'}>{t('api.add_key')}</span>
                </Button>
            </div>
          </div>
        </div>
        <DialogFooter className={isRTL ? 'rtl-button-flex' : 'ltr-button-flex'}>
          <Button onClick={handleSave}>
            <span dir={isRTL ? 'rtl' : 'ltr'}>{t('api.save_keys')}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const getGeminiApiKeys = (): string[] => {
  const storedKeys = localStorage.getItem(API_KEYS_STORAGE_KEY);
  if (!storedKeys) return [];
  try {
    const parsedKeys: ApiKey[] = JSON.parse(storedKeys);
    if(Array.isArray(parsedKeys)) {
      return parsedKeys.map(k => k.key);
    }
    return [];
  } catch (e) {
    console.error("Failed to parse API keys from localStorage", e);
    // Legacy support for a single, non-JSON-encoded key
    const singleKey = localStorage.getItem('gemini-api-key');
    if (singleKey) return [singleKey];
    return [];
  }
};
