
import React, { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, FileText, Pencil, Trash2 } from 'lucide-react';
import { Document } from '@/types/documents';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface DocumentListProps {
  documents: Document[];
  selectedDocumentId: string | null;
  onDocumentSelect: (documentId: string) => void;
  onDocumentRename: (documentId: string, newName: string) => void;
  onDocumentDelete: (documentId: string) => void;
  isCollapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  selectedDocumentId,
  onDocumentSelect,
  onDocumentRename,
  onDocumentDelete,
  isCollapsed,
  onCollapsedChange,
}) => {
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [documentOptionsVisible, setDocumentOptionsVisible] = useState<string | null>(null);

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

  const toggleDocumentOptions = (docId: string) => {
    console.log("Toggle document options for:", docId);
    setDocumentOptionsVisible(prev => prev === docId ? null : docId);
  };

  return (
    <div className="relative">
      {/* Fixed toggle button that's always visible */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed z-20 top-20 bg-background shadow-md border rounded-full"
        style={{ left: isCollapsed ? '16px' : '250px' }}
        onClick={() => onCollapsedChange(!isCollapsed)}
      >
        {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
      </Button>

      {/* Document list sidebar content */}
      <div className={`w-[250px] h-full bg-background border-r transition-all duration-300 ease-in-out ${isCollapsed ? '-translate-x-full' : 'translate-x-0'} fixed top-16 left-0 z-10`}>
        <div className="p-4 border-b">
          <h2 className="font-semibold">Documents</h2>
        </div>

        <ScrollArea className="h-[calc(100vh-10rem)]">
          <div className="p-2 space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className={`p-3 rounded-md flex items-center justify-between group hover:bg-accent/50 ${
                  selectedDocumentId === doc.id ? 'bg-accent' : ''
                }`}
                onClick={() => onDocumentSelect(doc.id)}
                onDoubleClick={() => toggleDocumentOptions(doc.id)}
              >
                <div className="flex items-center gap-2 flex-1 text-left">
                  <FileText className="h-4 w-4" />
                  <span className="truncate">{doc.name}</span>
                </div>

                <div className={`flex gap-1 ${documentOptionsVisible === doc.id || selectedDocumentId === doc.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
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
                    className="h-8 w-8 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDocumentToDelete(doc.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Dialog for renaming */}
        <Dialog open={!!isRenaming} onOpenChange={(open) => {
          if (!open) setIsRenaming(null);
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Rename document</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter new name"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRenaming(null)}>Cancel</Button>
              <Button onClick={() => isRenaming && handleRenameSubmit(isRenaming)}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Alert dialog for delete confirmation */}
        <AlertDialog open={!!documentToDelete} onOpenChange={() => setDocumentToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete document?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The document and all its regions will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      
      {/* Add a spacer div when the sidebar is open to prevent content overlap */}
      <div className={`w-[250px] transition-all duration-300 ease-in-out ${isCollapsed ? 'hidden' : 'block'}`}></div>
    </div>
  );
};

export default DocumentList;
