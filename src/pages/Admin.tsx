import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthProvider';
import { Profile } from '@/types/auth';
import { supabase } from '@/integrations/supabase/client';
import { DocumentData } from '@/types/documents';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Download, Search, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { exportRegionMapping } from '@/utils/exportUtils';
import { toast } from 'sonner';

const Admin = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [userDocuments, setUserDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!authState.profile?.role || authState.profile.role !== 'admin') {
        navigate('/');
        return;
      }
      fetchUsers();
    };

    checkAdminStatus();
  }, [authState.profile, navigate]);

  const fetchUsers = async () => {
    try {
      const { data: users, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'admin');

      if (error) throw error;
      setUsers(users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDocuments = async (userId: string) => {
    try {
      const { data: documents, error } = await supabase
        .from('documents')
        .select(`
          *,
          regions:document_regions(*)
        `)
        .eq('user_id', userId);

      if (error) throw error;

      // Transform the data to match our DocumentData type
      const transformedDocuments = await Promise.all((documents || []).map(async (doc) => {
        const { data: fileData } = await supabase.storage
          .from('pdfs')
          .createSignedUrl(`${doc.user_id}/${doc.id}.pdf`, 3600);

        if (fileData?.signedUrl) {
          const response = await fetch(fileData.signedUrl);
          const blob = await response.blob();
          const file = new File([blob], doc.name, { type: 'application/pdf' });

          return {
            ...doc,
            file,
            regions: doc.regions || []
          };
        }
        return null;
      }));

      setUserDocuments(transformedDocuments.filter(Boolean) as DocumentData[]);
    } catch (error) {
      console.error('Error fetching user documents:', error);
      toast.error('Failed to load user documents');
    }
  };

  const handleUserSelect = (user: Profile) => {
    setSelectedUser(user);
    fetchUserDocuments(user.id);
  };

  const handleExport = (document: DocumentData) => {
    if (document.regions.length === 0) {
      toast.error('No regions defined in this document');
      return;
    }

    const mapping = {
      documentName: document.name,
      documentId: document.id,
      regions: document.regions
    };

    exportRegionMapping(mapping);
    toast.success('Data exported successfully');
  };

  const handleDownload = async (document: DocumentData) => {
    try {
      const blob = await document.file.slice().arrayBuffer();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', document.name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Document downloaded successfully');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      
      <div className="flex items-center gap-4 mb-6">
        <Search className="h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Users</h2>
          {loading ? (
            <p>Loading users...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <div>
                          <p className="font-medium">{user.full_name || 'Unnamed User'}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUserSelect(user)}
                      >
                        View Documents
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">
            {selectedUser ? `${selectedUser.full_name || selectedUser.email}'s Documents` : 'Select a User'}
          </h2>
          {selectedUser && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Regions</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userDocuments.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell>{document.name}</TableCell>
                    <TableCell>{document.regions.length}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(document)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExport(document)}
                        >
                          Export
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Admin;
