
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface GeminiApiKeyDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onKeySave: () => void;
}

const API_KEY_STORAGE_KEY = 'gemini-api-key';

export const GeminiApiKeyDialog: React.FC<GeminiApiKeyDialogProps> = ({ isOpen, onOpenChange, onKeySave }) => {
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if (isOpen) {
      const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
      if (storedKey) {
        setApiKey(storedKey);
      }
    }
  }, [isOpen]);

  const handleSave = () => {
    if (!apiKey.trim()) {
      toast.error('API Key cannot be empty.');
      return;
    }
    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    toast.success('Gemini API Key saved successfully.');
    onKeySave();
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Set Gemini API Key</DialogTitle>
          <DialogDescription>
            Enter your API key to enable AI generation. You can get your key from{' '}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              Google AI Studio
            </a>
            . Your key is stored only in your browser.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="gemini-api-key" className="text-right">
              API Key
            </Label>
            <Input
              id="gemini-api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Gemini API key"
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>Save Key</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const getGeminiApiKey = (): string | null => {
  return localStorage.getItem(API_KEY_STORAGE_KEY);
};
