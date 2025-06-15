import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TtsRequestWithDetails } from "@/types/auth";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ManageTtsRequestDialogProps {
  request: TtsRequestWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const TTS_STATUSES = ['pending', 'processing', 'completed', 'failed'];

export const ManageTtsRequestDialog = ({ request, open, onOpenChange, onSuccess }: ManageTtsRequestDialogProps) => {
  const [status, setStatus] = useState(request?.status || 'pending');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (request) {
      setStatus(request.status);
    }
  }, [request]);

  if (!request) return null;

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('tts_requests')
        .update({ status: status, updated_at: new Date().toISOString() })
        .eq('id', request.id);

      if (error) throw error;
      
      toast.success("TTS request status updated successfully.");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating TTS request status:", error);
      if (error instanceof Error) {
        toast.error(`Failed to update status: ${error.message}`);
      } else {
        toast.error("Failed to update TTS request status.");
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage TTS Request</DialogTitle>
          <DialogDescription>
            Update the status for the TTS request for document "{request.documents?.name}".
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <p><strong>User:</strong> {request.profile?.full_name} ({request.profile?.email})</p>
          <p><strong>Submitted:</strong> {new Date(request.created_at).toLocaleString()}</p>
          <p><strong>Cost:</strong> {request.cost_in_credits} credits</p>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {TTS_STATUSES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleUpdate} disabled={isUpdating}>
            {isUpdating ? 'Updating...' : 'Update Status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
