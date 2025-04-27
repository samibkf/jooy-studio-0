
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { toast } from 'sonner';
import type { Profile } from '@/types/auth';
import type { Document } from '@/types/documents';
import { exportRegionMapping } from '@/utils/exportUtils';

interface UserDocumentsProps {
  user: Profile;
  onDocumentView: (document: Document) => void;
}

const UserDocuments = ({ user, onDocumentView }: UserDocumentsProps) => {
  const { data: documents, isLoading } = useQuery({
    queryKey: ['user-documents', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          regions:document_regions(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const docsWithRegions = await Promise.all(
        data.map(async (doc) => {
          const { data: signedUrl } = await supabase.storage
            .from('pdfs')
            .createSignedUrl(`${user.id}/${doc.id}.pdf`, 3600);

          if (signedUrl?.signedUrl) {
            const response = await fetch(signedUrl.signedUrl);
            const blob = await response.blob();
            const file = new File([blob], doc.name, { type: 'application/pdf' });
            return { 
              ...doc, 
              file, 
              regions: doc.regions || [],
              created_at: doc.created_at // Ensure created_at is included
            };
          }
          return null;
        })
      );

      return docsWithRegions.filter(Boolean) as Document[];
    },
  });

  const handleExport = (document: Document) => {
    const mapping = {
      documentName: document.name,
      documentId: document.id,
      regions: document.regions
    };
    exportRegionMapping(mapping);
  };

  if (isLoading) {
    return <div>Loading documents...</div>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Document Name</TableHead>
            <TableHead>Regions</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents?.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell>{doc.name}</TableCell>
              <TableCell>{doc.regions.length} regions</TableCell>
              <TableCell>{new Date(doc.created_at).toLocaleDateString()}</TableCell>
              <TableCell className="space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDocumentView(doc)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport(doc)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default UserDocuments;
