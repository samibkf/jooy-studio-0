import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthProvider';
import { Profile, TtsRequestWithDetails } from '@/types/auth';
import { supabase, initializeStorage } from '@/integrations/supabase/client';
import { DocumentData } from '@/types/documents';
import { CreditPlan } from '@/types/credits';
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
import { exportDocumentTexts } from '@/utils/textExportUtils';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ManageTtsRequestDialog } from '@/components/admin/ManageTtsRequestDialog';
import { CreditManagementDialog } from '@/components/admin/CreditManagementDialog';

const Admin = () => {
  const { authState, signOut } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [userDocuments, setUserDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [refreshingDocuments, setRefreshingDocuments] = useState(false);
  const [storageInitialized, setStorageInitialized] = useState(false);
  const [initializingStorage, setInitializingStorage] = useState(false);
  const [showStorageHelp, setShowStorageHelp] = useState(false);
  const [creatorPlan, setCreatorPlan] = useState<CreditPlan | null>(null);
  const [ttsRequests, setTtsRequests] = useState<TtsRequestWithDetails[]>([]);
  const [managingTtsRequest, setManagingTtsRequest] = useState<TtsRequestWithDetails | null>(null);
  const [managingCreditsUser, setManagingCreditsUser] = useState<Profile | null>(null);

  const cleanupChannels = useCallback(() => {
    const channels = supabase.getChannels();
    for (const channel of channels) {
      if (channel.topic.includes('documents-changes')) {
        console.log(`Removing existing channel: ${channel.topic}`);
        supabase.removeChannel(channel);
      }
    }
  }, []);

  useEffect(() => {
    if (!selectedUser) return;

    cleanupChannels();
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
        async (payload) => {
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
              try {
                const { data: fileList, error: listError } = await supabase.storage
                  .from('pdfs')
                  .list(selectedUser.id);
                
                if (listError) {
                  console.error('Error checking file existence:', listError);
                  return;
                }
                
                const fileExists = fileList?.some(file => file.name === `${payload.new.id}.pdf`);
                console.log(`File exists check for ${payload.new.id}.pdf:`, fileExists);
                
                setUserDocuments(prev => 
                  prev.map(doc => 
                    doc.id === payload.new.id 
                      ? { 
                          ...doc,
                          name: payload.new.name,
                          is_private: payload.new.is_private,
                          drm_protected_pages: payload.new.drm_protected_pages as (boolean | number[] | null),
                        } 
                      : doc
                  )
                );
              } catch (error) {
                console.error('Error checking file existence:', error);
              }
              break;
              
            case 'INSERT':
              console.log('Document inserted:', payload.new);
              try {
                const { data: fileList, error: listError } = await supabase.storage
                  .from('pdfs')
                  .list(selectedUser.id);
                
                if (listError) {
                  console.error('Error checking file existence:', listError);
                  return;
                }
                
                const fileExists = fileList?.some(file => file.name === `${payload.new.id}.pdf`);
                console.log(`File exists check for ${payload.new.id}.pdf:`, fileExists);
                
                setUserDocuments(prev => [
                  ...prev,
                  {
                    id: payload.new.id,
                    name: payload.new.name,
                    user_id: payload.new.user_id,
                    regions: [],
                    is_private: payload.new.is_private,
                    drm_protected_pages: payload.new.drm_protected_pages as (boolean | number[] | null),
                  }
                ]);
              } catch (error) {
                console.error('Error checking file existence:', error);
              }
              break;
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      console.log('Cleaning up document subscription');
      cleanupChannels();
    };
  }, [selectedUser, cleanupChannels]);

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
    const fetchCreatorPlan = async () => {
      try {
        const { data, error } = await supabase
          .from('credit_plans')
          .select('*')
          .eq('name', 'Creator')
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
          setCreatorPlan(data);
        } else {
          console.warn('"Creator" plan not found in database.');
        }
      } catch (error) {
        console.error('Error fetching Creator plan:', error);
        toast.error('Could not load Creator plan details.');
      }
    };
    fetchCreatorPlan();
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
      fetchTtsRequests();
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

  const fetchTtsRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('tts_requests')
        .select('*, profile:profiles(full_name, email), documents:documents(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTtsRequests((data as TtsRequestWithDetails[]) || []);
    } catch (error) {
      console.error('Error fetching TTS requests:', error);
      toast.error('Failed to load TTS requests.');
    }
  };

  const fetchUserDocuments = async (userId: string) => {
    try {
      console.log('Fetching documents for user:', userId);
      setLoadingDocuments(true);
      
      const storageReady = await initializeStorage();
      setStorageInitialized(storageReady);
      
      if (!storageReady) {
        console.log('Storage initialization failed, skipping file fetching');
        setLoadingDocuments(false);
        toast.error('Cannot fetch documents: PDF storage is not properly configured');
        return;
      }

      const { data: fileList, error: listError } = await supabase.storage
        .from('pdfs')
        .list(userId);
      
      if (listError) {
        console.error('Error listing files:', listError);
        setLoadingDocuments(false);
        toast.error('Failed to check available files');
        return;
      }

      console.log(`Files found in storage for user ${userId}:`, fileList);
      
      const { data: documents, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching documents:', error);
        setLoadingDocuments(false);
        toast.error('Failed to fetch documents');
        return;
      }
      
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

        const fileExists = fileList?.some(file => file.name === `${doc.id}.pdf`);
        console.log(`File exists check for ${doc.id}.pdf:`, fileExists);
        
        return {
          ...doc,
          regions: regions || [],
          user_id: doc.user_id
        } as DocumentData;
      }));

      const availableFileCount = docsWithRegions.filter(d => fileList?.some(file => file.name === `${d.id}.pdf`)).length;
      console.log(`Processed ${docsWithRegions.length} documents, ${availableFileCount} files available`);
      
      setUserDocuments(docsWithRegions);
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

  const handleExport = async (doc: DocumentData) => {
    await exportDocumentTexts(doc.id, doc.name);
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
        
        if (response.status === 404) {
          setUserDocuments(prev => 
            prev.map(d => 
              d.id === doc.id 
                ? { ...d } 
                : d
            )
          );
          toast.error('File not found in storage');
        } else {
          toast.error('Failed to download document');
        }
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

  const handleRefreshDocuments = async () => {
    if (!selectedUser) return;
    
    setRefreshingDocuments(true);
    try {
      await fetchUserDocuments(selectedUser.id);
      toast.success('Document list refreshed');
    } catch (error) {
      console.error('Error refreshing documents:', error);
      toast.error('Failed to refresh documents');
    } finally {
      setRefreshingDocuments(false);
    }
  };

  const handleUpgradeUser = async (userToUpgrade: Profile) => {
    if (!creatorPlan) {
      toast.error('Creator plan details not loaded yet.');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          plan_id: creatorPlan.id,
          credits_remaining: (userToUpgrade.credits_remaining || 0) + creatorPlan.credits_included,
        })
        .eq('id', userToUpgrade.id);
      
      if (error) throw error;
      
      toast.success(`${userToUpgrade.email} upgraded to Creator plan.`);
      // Refetch users to update the UI
      fetchUsers();
    } catch (error) {
      console.error('Error upgrading user:', error);
      toast.error('Failed to upgrade user.');
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

  const handleManageTtsRequest = (request: TtsRequestWithDetails) => {
    setManagingTtsRequest(request);
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
                  <TableHead>Actions</TableHead>
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
                          <p className="text-xs text-muted-foreground mt-1">
                            Credits: {user.credits_remaining}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUserSelect(user)}
                        >
                          View Documents
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setManagingCreditsUser(user)}
                        >
                          Manage Credits
                        </Button>
                        {creatorPlan && user.plan_id !== creatorPlan.id && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleUpgradeUser(user)}
                          >
                            Upgrade to Creator
                          </Button>
                        )}
                        {creatorPlan && user.plan_id === creatorPlan.id && (
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                            Creator Plan
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {selectedUser ? `${selectedUser.full_name || selectedUser.email}'s Documents` : 'Select a User'}
            </h2>
            {selectedUser && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRefreshDocuments}
                disabled={refreshingDocuments || loadingDocuments}
                className="flex items-center gap-1"
              >
                <RefreshCw className={`h-4 w-4 ${refreshingDocuments ? 'animate-spin' : ''}`} />
                {refreshingDocuments ? 'Refreshing...' : 'Refresh'}
              </Button>
            )}
          </div>
          {loadingDocuments || refreshingDocuments ? (
            <p>Loading documents...</p>
          ) : selectedUser ? (
            userDocuments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Regions</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userDocuments.map((document) => (
                    <TableRow key={document.id}>
                      <TableCell>
                        <span className="px-2 py-1">{document.name}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start gap-1">
                          {document.is_private && <Badge variant="secondary">Private</Badge>}
                          {(document.drm_protected_pages === true || (Array.isArray(document.drm_protected_pages) && document.drm_protected_pages.length > 0)) && <Badge variant="outline">DRM</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>{document.regions.length}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(document)}
                            title="Download document"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExport(document)}
                            title="Export text content"
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

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>All TTS Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading TTS requests...</p>
          ) : ttsRequests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ttsRequests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <div className="font-medium">{req.profile?.full_name}</div>
                      <div className="text-sm text-muted-foreground">{req.profile?.email}</div>
                    </TableCell>
                    <TableCell className="truncate max-w-xs">
                      {req.documents?.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={req.status === 'completed' ? 'default' : req.status === 'pending' ? 'secondary' : 'destructive'}>
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p>{req.cost_in_credits} credits</p>
                      {req.extra_cost_da > 0 && (
                        <p className="text-xs text-muted-foreground">{req.extra_cost_da.toLocaleString()} DA</p>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(req.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleManageTtsRequest(req)}>Manage</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p>No TTS requests found.</p>
          )}
        </CardContent>
      </Card>
      <ManageTtsRequestDialog
        request={managingTtsRequest}
        open={!!managingTtsRequest}
        onOpenChange={(open) => !open && setManagingTtsRequest(null)}
        onSuccess={fetchTtsRequests}
      />
      <CreditManagementDialog
        open={!!managingCreditsUser}
        onOpenChange={(open) => !open && setManagingCreditsUser(null)}
        user={managingCreditsUser}
        onSuccess={() => {
          fetchUsers();
          if (selectedUser && managingCreditsUser && selectedUser.id === managingCreditsUser.id) {
            // Also refresh selected user profile if they are being edited
            setSelectedUser(prev => prev ? {...prev, credits_remaining: managingCreditsUser.credits_remaining} : null)
          }
        }}
      />
    </div>
  );
};

export default Admin;
