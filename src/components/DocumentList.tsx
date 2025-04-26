
import React, { useState } from 'react';
import { Document } from '@/types/documents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FileText, ChevronRight, Edit, Trash2 } from 'lucide-react';

interface DocumentListProps {
  documents: Document[];
  currentDocument: Document | null;
  onDocumentSelect: (doc: Document) => void;
  onDocumentDelete: (docId: string) => void;
  onDocumentRename: (docId: string, newName: string) => void;
}

const DocumentList = ({
  documents,
  currentDocument,
  onDocumentSelect,
  onDocumentDelete,
  onDocumentRename,
}: DocumentListProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const handleRenameSubmit = (docId: string) => {
    onDocumentRename(docId, newName);
    setEditingId(null);
    setNewName('');
  };

  return (
    <div className="fixed right-0 top-20 z-10 bg-background border-l shadow-lg h-[calc(100vh-5rem)]">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon" className="absolute -left-12 top-2 rounded-full bg-background shadow-md border">
            <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="w-72 p-4">
          <h3 className="font-semibold mb-4">Documents</h3>
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className={`flex items-center gap-2 p-2 rounded-lg ${
                  currentDocument?.id === doc.id ? 'bg-accent' : 'hover:bg-accent/50'
                }`}
              >
                {editingId === doc.id ? (
                  <form
                    className="flex-1 flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleRenameSubmit(doc.id);
                    }}
                  >
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="h-8"
                      autoFocus
                    />
                    <Button size="sm" type="submit">Save</Button>
                  </form>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      className="flex-1 justify-start gap-2 h-8 px-2"
                      onClick={() => onDocumentSelect(doc)}
                    >
                      <FileText className="h-4 w-4" />
                      <span className="truncate">{doc.name}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditingId(doc.id);
                        setNewName(doc.name);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => onDocumentDelete(doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default DocumentList;
