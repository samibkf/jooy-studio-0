import React, { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, FileText, Pencil, Trash2 } from 'lucide-react';
import { Document } from '@/types/documents';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

interface DocumentListProps {
  documents: Document[];
  selectedDocumentId: string | null;
  onDocumentSelect: (documentId: string) => void;
  onDocumentRename: (documentId: string, newName: string) => void;
  onDocumentDelete: (documentId: string) => void;
  isCollapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  isLoading: boolean;
}

const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  selectedDocumentId,
  onDocumentSelect,
  onDocumentRename,
  onDocumentDelete,
  isCollapsed,
  onCollapsedChange,
  isLoading,
}) => {
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  const handleRenameSubmit = (documentId: string) => {
    if (newName.trim()) {
      onDocumentRename(documentId, newName.trim());
      setIsRenaming(null);
      setNewName("");
      toast.success('Document renamed');
    }
  };

  const handleDeleteConfirm = () => {
    if (documentToDelete) {
      onDocumentDelete(documentToDelete);
      setDocumentToDelete(null);
      toast.success('Document deleted');
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="fixed z-20 top-20 bg-background shadow-md border rounded-full"
        style={{ left: isCollapsed ? '16px' : '250px', transition: 'left 300ms ease-in-out' }}
        onClick={() => onCollapsedChange(!isCollapsed)}
      >
        {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
      </Button>

      <div className={`w-[250px] h-full bg-background border-r transition-transform duration-300 ease-in-out ${isCollapsed ? '-translate-x-full' : 'translate-x-0'} fixed top-16 left-0 z-10 flex flex-col`}>
        <div className="p-4 border-b">
          <h2 className="font-semibold">Documents</h2>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-3 flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              ))
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  className={`group relative p-3 rounded-md flex items-center justify-between cursor-pointer hover:bg-accent/50 ${
                    selectedDocumentId === doc.id ? 'bg-accent' : ''
                  }`}
                  onClick={() => onDocumentSelect(doc.id)}
                >
                  <div className="flex items-center gap-2 flex-1 text-left overflow-hidden">
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="truncate flex-1">{doc.name}</span>
                  </div>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity bg-accent/50 rounded-md">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsRenaming(doc.id);
                        setNewName(doc.name);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDocumentToDelete(doc.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
      
      <Dialog open={!!isRenaming} onOpenChange={(open) => !open && setIsRenaming(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename document</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Enter new name" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenaming(null)}>Cancel</Button>
            <Button onClick={() => isRenaming && handleRenameSubmit(isRenaming)}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!documentToDelete} onOpenChange={() => setDocumentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The document and all its regions will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DocumentList;