
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
import { Download, LogOut, Search, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { exportRegionMapping } from '@/utils/exportUtils';
import { toast } from 'sonner';

const Admin = () => {
  const { authState, signOut } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [userDocuments, setUserDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      console.log('Admin page - Checking admin status:', authState.profile);
      
      if (!authState.session) {
        console.log('Admin page - No session, waiting for redirect in ProtectedRoute');
        return;
      }
      
      if (!authState.profile) {
        console.log('Admin page - Profile not loaded yet, waiting...');
        return;
      }
      
      if (authState.profile.role !== 'admin') {
        console.log('Admin page - Non-admin detected, role:', authState.profile.role);
        console.log('Admin page - Redirecting to home');
        navigate('/');
        return;
      }
      
      console.log('Admin page - Admin confirmed, fetching users');
      fetchUsers();
    };

    checkAdminStatus();
  }, [authState.profile, authState.session, navigate]);

  const fetchUsers = async () => {
    try {
      const { data: users, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'admin');

      if (error) throw error;
      console.log('Fetched users:', users);
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
      console.log('Fetching documents for user:', userId);
      setLoadingDocuments(true);
      
      const { data: documents, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching documents:', error);
        throw error;
      }
      
      console.log('Fetched documents:', documents);

      if (!documents || documents.length === 0) {
        setUserDocuments([]);
        toast.info('No documents found for this user');
        setLoadingDocuments(false);
        return;
      }

      // Fetch regions for each document
      const docsWithRegions = await Promise.all(documents.map(async (doc) => {
        const { data: regions, error: regionsError } = await supabase
          .from('document_regions')
          .select('*')
          .eq('document_id', doc.id);
          
        if (regionsError) {
          console.error('Error fetching regions for document:', doc.id, regionsError);
        }
        
        return {
          ...doc,
          regions: regions || []
        };
      }));

      console.log('Documents with regions:', docsWithRegions);
      
      // Process documents to get signed URLs
      const transformedDocuments = await Promise.all(docsWithRegions.map(async (doc) => {
        try {
          const { data: fileData, error: urlError } = await supabase.storage
            .from('pdfs')
            .createSignedUrl(`${doc.user_id}/${doc.id}.pdf`, 3600);

          if (urlError) {
            console.error('Error creating signed URL:', urlError);
            return null;
          }

          console.log('Signed URL created for document:', doc.id, fileData?.signedUrl);

          if (fileData?.signedUrl) {
            try {
              const response = await fetch(fileData.signedUrl);
              if (!response.ok) {
                console.error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
                // Return document without file but with other info so we can still show it
                return {
                  ...doc,
                  file: null,
                  regions: doc.regions || []
                };
              }
              const blob = await response.blob();
              const file = new File([blob], doc.name, { type: 'application/pdf' });
              
              return {
                ...doc,
                file,
                regions: doc.regions || []
              };
            } catch (fetchError) {
              console.error('Error fetching PDF from signed URL:', fetchError);
              // Return document without file but with other info
              return {
                ...doc,
                file: null,
                regions: doc.regions || []
              };
            }
          }
          // Return document without file but with other info
          return {
            ...doc,
            file: null,
            regions: doc.regions || []
          };
        } catch (fileError) {
          console.error('Error processing document:', doc.id, fileError);
          // Return document without file but with other info
          return {
            ...doc,
            file: null,
            regions: doc.regions || []
          };
        }
      }));

      const validDocuments = transformedDocuments.filter(Boolean) as DocumentData[];
      console.log('Processed documents:', validDocuments.length);
      setUserDocuments(validDocuments);
    } catch (error) {
      console.error('Error fetching user documents:', error);
      toast.error('Failed to load user documents');
      setUserDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleUserSelect = (user: Profile) => {
    setSelectedUser(user);
    setUserDocuments([]); // Clear previous documents
    fetchUserDocuments(user.id);
  };

  const handleExport = (doc: DocumentData) => {
    if (doc.regions.length === 0) {
      toast.error('No regions defined in this document');
      return;
    }

    const mapping = {
      documentName: doc.name,
      documentId: doc.id,
      regions: doc.regions
    };

    exportRegionMapping(mapping);
    toast.success('Data exported successfully');
  };

  const handleDownload = async (doc: DocumentData) => {
    if (!doc.file) {
      toast.error('File not available for download');
      return;
    }
    
    try {
      const blob = await doc.file.slice().arrayBuffer();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.name);
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

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <Button 
          variant="outline"
          size="sm" 
          className="flex items-center gap-2"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        Logged in as: {authState.profile?.email} (Role: {authState.profile?.role})
      </p>

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
          {loadingDocuments ? (
            <p>Loading documents...</p>
          ) : selectedUser ? (
            userDocuments.length > 0 ? (
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
                            disabled={!document.file}
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
            ) : (
              <p>No documents found for this user.</p>
            )
          ) : (
            <p>Select a user to view their documents.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Admin;
