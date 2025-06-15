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
import { Skeleton } from "@/components/ui/skeleton";

interface ManageTtsRequestDialogProps {
  request: TtsRequestWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const TTS_STATUSES = ['pending', 'processing', 'generated', 'review', 'completed', 'failed'];

interface TtsAudioFile {
    id: string;
    page_number: number;
    storage_path: string;
    publicUrl?: string;
}

export const ManageTtsRequestDialog = ({ request, open, onOpenChange, onSuccess }: ManageTtsRequestDialogProps) => {
  const [status, setStatus] = useState(request?.status || 'pending');
  const [isUpdating, setIsUpdating] = useState(false);
  const [audioFiles, setAudioFiles] = useState<TtsAudioFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  useEffect(() => {
    if (request) {
      setStatus(request.status);
      if (open) {
          fetchAudioFiles(request.id);
      }
    }
  }, [request, open]);

  const fetchAudioFiles = async (requestId: string) => {
    setIsLoadingFiles(true);
    try {
        const { data, error } = await supabase
            .from('tts_audio_files')
            .select('*')
            .eq('tts_request_id', requestId)
            .order('page_number');

        if (error) throw error;
        
        const filesWithUrls = data.map(file => {
            const { data: { publicUrl } } = supabase.storage.from('tts').getPublicUrl(file.storage_path);
            return { ...file, publicUrl };
        });

        setAudioFiles(filesWithUrls);

    } catch(error) {
        console.error("Error fetching audio files:", error);
        toast.error("Failed to load audio files for this request.");
    } finally {
        setIsLoadingFiles(false);
    }
  }

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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage TTS Request</DialogTitle>
          <DialogDescription>
            Update status and review audio for document "{request.documents?.name}".
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p><strong>User:</strong> {request.profile?.full_name} ({request.profile?.email})</p>
              <p><strong>Submitted:</strong> {new Date(request.created_at).toLocaleString()}</p>
            </div>
            <div>
              <p><strong>Cost:</strong> {request.cost_in_credits} credits</p>
              <div className="flex items-center gap-2 mt-2">
                <Label htmlFor="status" className="shrink-0">
                  Status
                </Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {TTS_STATUSES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">Generated Audio Files</h4>
            {isLoadingFiles ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : audioFiles.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    {audioFiles.map(file => (
                        <div key={file.id} className="flex items-center justify-between p-2 border rounded-md">
                            <span className="font-mono text-sm">Page {file.page_number}</span>
                            <audio controls src={file.publicUrl} className="h-8"></audio>
                        </div>
                    ))}
                </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No audio files generated yet, or the request is not in a 'generated' state.
              </p>
            )}
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
