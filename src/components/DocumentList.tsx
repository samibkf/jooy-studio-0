
import React, { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, FileText, Pencil, Trash2 } from 'lucide-react';
import { Document } from '@/types/documents';
import { toast } from 'sonner';

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
    <div className="relative border-l">
      <Button
        variant="ghost"
        size="icon"
        className="absolute -left-12 top-2 z-10 rounded-full bg-background shadow-md border"
        onClick={() => onCollapsedChange(!isCollapsed)}
      >
        {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
      </Button>

      {!isCollapsed && (
        <div className="w-[250px] h-full bg-background">
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
                >
                  {isRenaming === doc.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleRenameSubmit(doc.id);
                      }}
                      className="flex-1 mr-2"
                    >
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        autoFocus
                        onBlur={() => {
                          setIsRenaming(null);
                          setNewName("");
                        }}
                      />
                    </form>
                  ) : (
                    <button
                      className="flex items-center gap-2 flex-1 text-left"
                      onClick={() => onDocumentSelect(doc.id)}
                    >
                      <FileText className="h-4 w-4" />
                      <span className="truncate">{doc.name}</span>
                    </button>
                  )}

                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
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
                      onClick={() => setDocumentToDelete(doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

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
      )}
    </div>
  );
};

export default DocumentList;
