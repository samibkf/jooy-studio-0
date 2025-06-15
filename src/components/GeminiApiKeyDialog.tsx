
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
      toast.error('API Key cannot be empty.');
      return;
    }
    if (apiKeys.some(k => k.key === newApiKey.trim())) {
      toast.error('This API key has already been added.');
      return;
    }
    setApiKeys([...apiKeys, { id: uuidv4(), key: newApiKey.trim() }]);
    setNewApiKey('');
    toast.info('API key added. Click "Save Keys" to persist changes.');
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
    toast.success('Gemini API Keys saved successfully.');
    onKeySave();
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Set Gemini API Keys</DialogTitle>
          <DialogDescription>
            Add one or more API keys. The system will automatically switch to another key if one reaches its limit. Your keys are stored only in your browser. Get keys from{' '}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              Google AI Studio
            </a>
            .
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-4">
            <Label>Your API Keys</Label>
            {apiKeys.length > 0 && (
              <div className="space-y-2 rounded-md border p-2 max-h-48 overflow-y-auto">
                {apiKeys.map((apiKey, index) => (
                  <div key={apiKey.id} className="flex items-center gap-2">
                    <Label className="flex-shrink-0 w-16 text-muted-foreground">Key {index + 1}</Label>
                    <Input
                      type="password"
                      value={apiKey.key}
                      readOnly
                      className="flex-grow font-mono text-xs"
                    />
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveKey(apiKey.id)} title="Remove Key">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
             <div className="flex items-center gap-2">
                <Input
                  id="gemini-api-key"
                  type="password"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder="Enter a new Gemini API key"
                  className="flex-grow"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddKey();
                    }
                  }}
                />
                <Button onClick={handleAddKey} variant="outline">Add Key</Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>Save Keys</Button>
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
