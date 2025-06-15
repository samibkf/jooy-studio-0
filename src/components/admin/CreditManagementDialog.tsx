
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/auth';

interface CreditManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: Profile | null;
  onSuccess: () => void;
}

export const CreditManagementDialog: React.FC<CreditManagementDialogProps> = ({
  open,
  onOpenChange,
  user,
  onSuccess,
}) => {
  const [amount, setAmount] = useState<number>(0);
  const [operation, setOperation] = useState<'add' | 'set'>('add');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount(0);
      setOperation('add');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!user) return;
    if (amount <= 0) {
      toast.error('Please enter a positive credit amount.');
      return;
    }

    setLoading(true);

    const currentCredits = user.credits_remaining || 0;
    const newCredits = operation === 'add' ? currentCredits + amount : amount;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ credits_remaining: newCredits })
        .eq('id', user.id);

      if (error) throw error;

      toast.success(
        `Successfully ${operation === 'add' ? 'added' : 'set'} ${amount} credits for ${user.email}.`
      );
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Failed to update credits: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Credits</DialogTitle>
          <DialogDescription>
            Manage credits for <span className="font-semibold">{user.email}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p>
            Current credits: <span className="font-bold">{user.credits_remaining}</span>
          </p>
          <div className="space-y-2">
            <Label htmlFor="amount">Credit Amount</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="e.g., 100"
              min="1"
            />
          </div>
          <RadioGroup
            value={operation}
            onValueChange={(value: 'add' | 'set') => setOperation(value)}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="add" id="add" />
              <Label htmlFor="add">Add to existing credits</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="set" id="set" />
              <Label htmlFor="set">Set as total credits</Label>
            </div>
          </RadioGroup>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || amount <= 0}>
            {loading ? 'Updating...' : 'Update Credits'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
