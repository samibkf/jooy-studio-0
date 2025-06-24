
import React, { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, FileText, Pencil, Trash2 } from 'lucide-react';
import { Document } from '@/types/documents';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';

interface DocumentListProps {
  documents: Document[];
  selectedDocumentId: string | null;
  onDocumentSelect: (documentId: string) => void;
  onDocumentRename: (documentId: string, newName: string) => void;
  onDocumentDelete: (documentId: string) => void;
  isCollapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  isLoading?: boolean;
}

const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  selectedDocumentId,
  onDocumentSelect,
  onDocumentRename,
  onDocumentDelete,
  isCollapsed,
  onCollapsedChange,
  isLoading = false,
}) => {
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

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

  const DocumentSkeleton = () => (
    <div className="p-3 rounded-md flex items-center gap-2">
      <Skeleton className="h-4 w-4 rounded" />
      <Skeleton className="h-4 flex-1 rounded" />
    </div>
  );

  return (
    <div className="relative">
      {/* Fixed toggle button that's always visible */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed z-20 top-20 bg-background shadow-md border rounded-full transition-all duration-300"
        style={{ 
          [isRTL ? 'right' : 'left']: isCollapsed ? '16px' : '250px' 
        }}
        onClick={() => onCollapsedChange(!isCollapsed)}
      >
        {isCollapsed ? 
          (isRTL ? <ChevronLeft /> : <ChevronRight />) : 
          (isRTL ? <ChevronRight /> : <ChevronLeft />)
        }
      </Button>

      {/* Document list sidebar content */}
      <div className={`w-[250px] h-full bg-background border-r transition-all duration-300 ease-in-out ${isCollapsed ? (isRTL ? 'translate-x-full' : '-translate-x-full') : 'translate-x-0'} fixed top-16 ${isRTL ? 'right-0' : 'left-0'} z-10`}>
        <div className="p-4 border-b">
          <h2 className="font-semibold">{t('documentList.documents')}</h2>
        </div>

        <ScrollArea className="h-[calc(100vh-10rem)]">
          <div className="p-2 space-y-2">
            {isLoading ? (
              // Show skeleton loaders while loading
              Array.from({ length: 5 }).map((_, index) => (
                <DocumentSkeleton key={index} />
              ))
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  className={`p-3 rounded-md flex items-center justify-between group hover:bg-accent/50 cursor-pointer transition-colors ${
                    selectedDocumentId === doc.id ? 'bg-accent' : ''
                  }`}
                  onClick={() => onDocumentSelect(doc.id)}
                >
                  <div className="flex items-center gap-2 flex-1 text-left min-w-0">
                    <FileText className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{doc.name}</span>
                  </div>

                  {/* Action buttons that appear on hover */}
                  <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${isRTL ? 'mr-2' : 'ml-2'}`}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-accent"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsRenaming(doc.id);
                        setNewName(doc.name);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDocumentToDelete(doc.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Dialog for renaming */}
        <Dialog open={!!isRenaming} onOpenChange={(open) => {
          if (!open) setIsRenaming(null);
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('documentList.renameDocument')}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('documentList.enterNewName')}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isRenaming) {
                    handleRenameSubmit(isRenaming);
                  }
                }}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRenaming(null)}>{t('documentList.cancel')}</Button>
              <Button onClick={() => isRenaming && handleRenameSubmit(isRenaming)}>{t('documentList.save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Alert dialog for delete confirmation */}
        <AlertDialog open={!!documentToDelete} onOpenChange={() => setDocumentToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('documentList.deleteDocument')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('documentList.deleteWarning')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('documentList.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm}>{t('documentList.delete')}</AlertDialogAction>
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
