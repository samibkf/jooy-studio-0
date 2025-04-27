
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
import { Download, LogOut, Search, User, RefreshCw, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { exportRegionMapping } from '@/utils/exportUtils';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [initializingStorage, setInitializingStorage] = useState(false);
  const [showStorageHelp, setShowStorageHelp] = useState(false);

  useEffect(() => {
    if (!selectedUser) return;

    // Clean up any previous subscription
    const cleanupSubscription = supabase.getChannels().forEach(channel => {
      if (channel.topic.includes('documents-changes')) {
        supabase.removeChannel(channel);
      }
    });

    console.log(`Setting up real-time subscription for user: ${selectedUser.id}`);
    
    const channel = supabase
      .channel('documents-changes')
      .on(
        'postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'documents',
          filter: `user_id=eq.${selectedUser.id}`
        },
        (payload) => {
          console.log('Document change detected:', payload);
          
          switch(payload.eventType) {
            case 'DELETE':
              console.log('Document deleted:', payload.old.id);
              setUserDocuments(prev => 
                prev.filter(doc => doc.id !== payload.old.id)
              );
              break;
            case 'UPDATE':
              console.log('Document updated:', payload.new);
              setUserDocuments(prev => 
                prev.map(doc => 
                  doc.id === payload.new.id 
                    ? { 
                        ...doc,
                        name: payload.new.name // Ensure name updates are applied
                      } 
                    : doc
                )
              );
              break;
            case 'INSERT':
              console.log('Document inserted:', payload.new);
              setUserDocuments(prev => [
                ...prev, 
                { 
                  id: payload.new.id,
                  name: payload.new.name,
                  user_id: payload.new.user_id,
                  regions: [], 
                  file: null as unknown as File, 
                  fileAvailable: false 
                } as DocumentData
              ]);
              break;
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      console.log('Cleaning up document subscription');
      supabase.removeChannel(channel);
    };
  }, [selectedUser]);

  const initStorage = async () => {
    try {
      setInitializingStorage(true);
      const initialized = await initializeStorage();
      console.log('Storage initialization result:', initialized);
      setStorageInitialized(initialized);
      if (!initialized) {
        toast.error('PDF storage bucket is not properly configured');
        setShowStorageHelp(true);
      } else {
        toast.success('PDF storage configured successfully');
      }
    } catch (error) {
      console.error('Error during storage initialization:', error);
      setStorageInitialized(false);
      toast.error('Failed to check PDF storage status');
    } finally {
      setInitializingStorage(false);
    }
  };

  useEffect(() => {
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
      
      // Get the latest documents from the database
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
          file: null as File | null,
          fileAvailable: false,
          user_id: doc.user_id
        } as DocumentData;
      }));

      console.log('Documents with regions:', docsWithRegions);
      
      setUserDocuments(docsWithRegions);
    
      try {
        const storageReady = await initializeStorage();
        setStorageInitialized(storageReady);
        
        if (!storageReady) {
          console.log('Storage initialization failed, skipping file fetching');
          return;
        }
        
        // Check which files actually exist in storage
        const updatedDocs = await Promise.all(docsWithRegions.map(async (doc) => {
          try {
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
            
            return {
              ...doc,
              fileAvailable: true
            };
          } catch (fileError) {
            console.error('Error processing document:', doc.id, fileError);
            return doc;
          }
        }));

        console.log('Processed documents with files available:', updatedDocs.filter(d => d.fileAvailable).length);
        setUserDocuments(updatedDocs);
      } catch (storageError) {
        console.error('Error accessing storage:', storageError);
        toast.error('Could not access document storage');
      }
    } catch (error) {
      console.error('Error in fetchUserDocuments:', error);
      toast.error('Failed to fetch user documents');
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
    const storageReady = await initializeStorage();
    setStorageInitialized(storageReady);
    
    if (!storageReady) {
      toast.error('PDF storage is not configured properly');
      setShowStorageHelp(true);
      return;
    }
    
    try {
      console.log(`Attempting admin download for document: ${doc.id} from user ${doc.user_id}`);
      
      const { data: fileData, error: urlError } = await supabase.storage
        .from('pdfs')
        .createSignedUrl(`${doc.user_id}/${doc.id}.pdf`, 3600);

      if (urlError || !fileData?.signedUrl) {
        console.error('Error creating signed URL:', urlError);
        toast.error('File not available for download');
        return;
      }

      const response = await fetch(fileData.signedUrl);
      
      if (!response.ok) {
        console.error(`Download failed: ${response.status} ${response.statusText}`);
        toast.error('Failed to download document');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.name || `document_${doc.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Document downloaded successfully');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('An unexpected error occurred while downloading the document');
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

  const handleRetryStorage = () => {
    initStorage();
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
            <Alert className="mt-4 border-amber-500 bg-amber-50">
              <AlertTitle className="font-semibold text-amber-700">
                PDF Storage Configuration Issue
              </AlertTitle>
              <AlertDescription className="text-amber-700">
                <p className="mb-2">The PDF storage bucket "pdfs" exists but there might be permission issues.</p>
                <div className="flex items-center space-x-2 mt-2">
                  {initializingStorage ? (
                    <span className="block">Checking storage status...</span>
                  ) : (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300"
                        onClick={handleRetryStorage}
                        disabled={initializingStorage}
                      >
                        <RefreshCw className={`h-3 w-3 mr-1 ${initializingStorage ? 'animate-spin' : ''}`} />
                        Check Again
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300"
                        onClick={() => setShowStorageHelp(true)}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Configuration Help
                      </Button>
                    </>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={showStorageHelp} onOpenChange={setShowStorageHelp}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>PDF Storage Configuration</DialogTitle>
            <DialogDescription>
              Follow these steps to configure PDF storage in your Supabase project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <ol className="list-decimal pl-5 space-y-2">
              <li>Go to your Supabase project dashboard.</li>
              <li>Navigate to "Storage" in the left sidebar.</li>
              <li>Verify that the bucket <code className="bg-gray-100 px-1 py-0.5 rounded">pdfs</code> exists (it should since we created it).</li>
              <li>Click on the bucket and go to the "Policies" tab.</li>
              <li>Add the following policies:</li>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>
                  <strong>SELECT policy:</strong> Allow authenticated users to view files
                  <br />
                  <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">
                    (auth.role() = 'authenticated')
                  </code>
                </li>
                <li>
                  <strong>INSERT policy:</strong> Allow authenticated users to upload files
                  <br />
                  <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">
                    (auth.role() = 'authenticated')
                  </code>
                </li>
              </ul>
              <li>Return to this page and click "Check Again".</li>
            </ol>
            <Alert className="bg-blue-50 border-blue-200 text-blue-800">
              <AlertTitle>Important:</AlertTitle>
              <AlertDescription>
                Make sure your storage bucket has RLS (Row Level Security) policies that allow authenticated users to access files. 
                Without proper policies, you'll get "violates row-level security policy" errors when trying to access files.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowStorageHelp(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
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
                            disabled={!storageInitialized}
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
