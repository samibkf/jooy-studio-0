import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthProvider';
import { Profile } from '@/types/auth';
import { supabase, initializeStorage } from '@/integrations/supabase/client';
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const Admin = () => {
  const { authState, signOut } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [userDocuments, setUserDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [storageInitialized, setStorageInitialized] = useState(false);

  useEffect(() => {
    const initStorage = async () => {
      try {
        const initialized = await initializeStorage();
        console.log('Storage initialization result:', initialized);
        setStorageInitialized(initialized);
        if (!initialized) {
          toast.error('Failed to configure PDF storage. Some features may not work.');
        }
      } catch (error) {
        console.error('Error during storage initialization:', error);
        setStorageInitialized(false);
        toast.error('Failed to configure PDF storage');
      }
    };
    
    initStorage();
  }, []);

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
      
      // First check if the user has any documents
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
          regions: regions || [],
          file: null,
          user_id: doc.user_id
        };
      }));

      console.log('Documents with regions:', docsWithRegions);
      
      // Set documents even without files so the user sees something
      setUserDocuments(docsWithRegions);
      
      // If storage is not initialized, don't try to fetch files
      if (!storageInitialized) {
        console.log('Storage not initialized, skipping file fetching');
        setLoadingDocuments(false);
        return;
      }
      
      // Try to get signed URLs for each document
      try {
        // Check if the pdfs bucket exists
        const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
        
        if (bucketError || !buckets?.some(bucket => bucket.name === 'pdfs')) {
          console.error('pdfs bucket does not exist:', bucketError);
          toast.error('PDF storage is not properly configured');
          setLoadingDocuments(false);
          return;
        }
        
        // Now try to update each document with its file if available
        const updatedDocs = await Promise.all(docsWithRegions.map(async (doc) => {
          try {
            // First check if the file exists
            const { data: fileList, error: listError } = await supabase.storage
              .from('pdfs')
              .list(userId);
              
            if (listError) {
              console.error('Error listing files:', listError);
              return doc;
            }
            
            const fileExists = fileList?.some(file => file.name === `${doc.id}.pdf`);
            
            if (!fileExists) {
              console.log(`File ${doc.id}.pdf does not exist for user ${doc.user_id}`);
              return doc;
            }
            
            // File exists, try to get a signed URL
            const { data: fileData, error: urlError } = await supabase.storage
              .from('pdfs')
              .createSignedUrl(`${userId}/${doc.id}.pdf`, 3600);

            if (urlError) {
              console.error('Error creating signed URL:', urlError);
              return doc;
            }

            console.log('Signed URL created for document:', doc.id);

            if (fileData?.signedUrl) {
              try {
                const response = await fetch(fileData.signedUrl);
                if (!response.ok) {
                  console.error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
                  return doc;
                }
                const blob = await response.blob();
                const file = new File([blob], doc.name, { type: 'application/pdf' });
                
                return {
                  ...doc,
                  file
                };
              } catch (fetchError) {
                console.error('Error fetching PDF from signed URL:', fetchError);
                return doc;
              }
            }
            return doc;
          } catch (fileError) {
            console.error('Error processing document:', doc.id, fileError);
            return doc;
          }
        }));

        console.log('Processed documents with files:', updatedDocs.filter(d => d.file).length);
        setUserDocuments(updatedDocs);
      } catch (storageError) {
        console.error('Error accessing storage:', storageError);
        toast.error('Could not access document storage');
      }
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
    setUserDocuments([]);
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
    if (!storageInitialized) {
      toast.error('PDF storage is not configured properly');
      return;
    }
    
    if (!doc.file && doc.user_id) {
      try {
        console.log(`Attempting direct download for document: ${doc.id} from user ${doc.user_id}`);
        
        // Try to get a signed URL directly
        const { data: fileData, error: urlError } = await supabase.storage
          .from('pdfs')
          .createSignedUrl(`${doc.user_id}/${doc.id}.pdf`, 3600);

        if (urlError || !fileData?.signedUrl) {
          console.error('Error creating signed URL:', urlError);
          toast.error('File not available for download');
          return;
        }

        // Download using the URL
        const link = document.createElement('a');
        link.href = fileData.signedUrl;
        link.setAttribute('download', doc.name);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success('Document downloaded successfully');
      } catch (error) {
        console.error('Error downloading document:', error);
        toast.error('Failed to download document');
      }
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
      toast.success('Signed out successfully');
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
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-2xl font-bold">Admin Dashboard</CardTitle>
          <Button 
            variant="destructive"
            size="sm" 
            className="flex items-center gap-2"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Logged in as: {authState.profile?.email} (Role: {authState.profile?.role})
          </p>
          {!storageInitialized && (
            <Alert variant="destructive" className="mt-2">
              <AlertTitle className="font-semibold text-amber-600">
                PDF Storage Not Configured
              </AlertTitle>
              <AlertDescription className="text-amber-600">
                The PDF storage system is not properly configured. Document downloads may not work correctly. 
                Please contact your system administrator.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
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
                            title={storageInitialized ? "Download document" : "PDF storage not configured"}
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
