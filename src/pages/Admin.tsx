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
import { Download, LogOut, Search, User, RefreshCw, ExternalLink, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { exportDocumentTexts } from '@/utils/textExportUtils';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const Admin = () => {
  const { authState, signOut } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [userDocuments, setUserDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [storageInitialized, setStorageInitialized] = useState(false);
  const [initializingStorage, setInitializingStorage] = useState(false);
  const [showStorageHelp, setShowStorageHelp] = useState(false);
  const [creatorPlan, setCreatorPlan] = useState<CreditPlan | null>(null);
  const [userTtsRequests, setUserTtsRequests] = useState<TtsRequestWithDetails[]>([]);
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
        async () => {
          console.log('Document change detected, refetching user details');
          if (selectedUser) {
            fetchUserDetails(selectedUser);
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
      setStorageInitialized(initialized);
      if (!initialized) {
        toast.error('PDF storage bucket is not properly configured');
        setShowStorageHelp(true);
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
      if (authState.session && authState.profile?.role === 'admin') {
        fetchUsers();
      } else if (authState.session && authState.profile?.role !== 'admin') {
        navigate('/');
      }
    };
    checkAdminStatus();
  }, [authState.profile, authState.session, navigate]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: usersData, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'admin')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(usersData || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (user: Profile) => {
    setLoadingDetails(true);
    try {
      const [docs, requests] = await Promise.all([
        fetchUserDocuments(user.id),
        fetchUserTtsRequests(user.id)
      ]);
      setUserDocuments(docs);
      setUserTtsRequests(requests);
    } catch (error) {
      toast.error(`Failed to fetch details for ${user.email}`);
    } finally {
      setLoadingDetails(false);
    }
  };

  const fetchUserDocuments = async (userId: string): Promise<DocumentData[]> => {
    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to fetch documents');
      return [];
    }
    
    if (!documents) return [];

    return await Promise.all(documents.map(async (doc) => {
      const { data: regions, error: regionsError } = await supabase
        .from('document_regions')
        .select('id')
        .eq('document_id', doc.id);
        
      if (regionsError) console.error('Error fetching region count:', regionsError);

      return {
        ...doc,
        regions: regions || [],
        user_id: doc.user_id,
      } as DocumentData;
    }));
  };

  const fetchUserTtsRequests = async (userId: string): Promise<TtsRequestWithDetails[]> => {
    const { data, error } = await supabase
      .from('tts_requests')
      .select('*, documents:documents(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching TTS requests:', error);
      toast.error('Failed to load TTS requests.');
      return [];
    }
    return (data as TtsRequestWithDetails[]) || [];
  };

  const handleUserSelect = (user: Profile) => {
    if (selectedUser?.id === user.id) {
      setSelectedUser(null);
    } else {
      setSelectedUser(user);
      fetchUserDetails(user);
    }
  };

  const handleDownload = async (doc: DocumentData) => {
    const storageReady = await initializeStorage();
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
        toast.error(response.status === 404 ? 'File not found in storage' : 'Failed to download document');
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
  
  const handleExport = async (doc: DocumentData) => {
    await exportDocumentTexts(doc.id, doc.name);
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
      {/* Header and Search */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-2xl font-bold">Admin Dashboard</CardTitle>
          <Button variant="destructive" size="sm" className="flex items-center gap-2" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Logged in as: {authState.profile?.email}</p>
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
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Users Master Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredUsers.map((user) => (
                  <Collapsible asChild key={user.id} open={selectedUser?.id === user.id} onOpenChange={() => handleUserSelect(user)}>
                    <>
                      <TableRow className="cursor-pointer" data-state={selectedUser?.id === user.id ? 'open' : 'closed'}>
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-9 p-0">
                              <ChevronRight className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-90" />
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{user.full_name || 'Unnamed User'}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </TableCell>
                        <TableCell>
                          {user.plan_id === creatorPlan?.id ? (
                            <Badge variant="default">Creator</Badge>
                          ) : (
                            <Badge variant="secondary">Free</Badge>
                          )}
                        </TableCell>
                        <TableCell>{user.credits_remaining}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setManagingCreditsUser(user); }}>Manage Credits</Button>
                            {creatorPlan && user.plan_id !== creatorPlan.id && (
                              <Button variant="default" size="sm" onClick={(e) => { e.stopPropagation(); handleUpgradeUser(user); }}>Upgrade</Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                        <tr>
                          <td colSpan={5}>
                            <div className="p-4 bg-muted/50">
                              {loadingDetails ? (
                                <div className="space-y-4">
                                  <Skeleton className="h-24 w-full" />
                                  <Skeleton className="h-24 w-full" />
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                  <Card>
                                    <CardHeader>
                                      <CardTitle>Documents</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      {userDocuments.length > 0 ? (
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead>Name</TableHead>
                                              <TableHead>Regions</TableHead>
                                              <TableHead>Actions</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {userDocuments.map(doc => (
                                              <TableRow key={doc.id}>
                                                <TableCell className="truncate max-w-[200px]">{doc.name}</TableCell>
                                                <TableCell>{doc.regions.length}</TableCell>
                                                <TableCell><Button variant="outline" size="sm" onClick={() => handleDownload(doc)}><Download className="h-3 w-3"/></Button></TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      ) : <p className="text-sm text-muted-foreground">No documents found.</p>}
                                    </CardContent>
                                  </Card>
                                  <Card>
                                    <CardHeader>
                                      <CardTitle>TTS Requests</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                       {userTtsRequests.length > 0 ? (
                                          <Table>
                                            <TableHeader>
                                              <TableRow>
                                                <TableHead>Document</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Actions</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {userTtsRequests.map(req => (
                                                <TableRow key={req.id}>
                                                  <TableCell className="truncate max-w-[150px]">{req.documents?.name || 'N/A'}</TableCell>
                                                  <TableCell><Badge variant={req.status === 'completed' ? 'default' : 'secondary'}>{req.status}</Badge></TableCell>
                                                  <TableCell><Button variant="outline" size="sm" onClick={() => handleManageTtsRequest(req)}>Manage</Button></TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                       ) : <p className="text-sm text-muted-foreground">No TTS requests found.</p>}
                                    </CardContent>
                                  </Card>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ManageTtsRequestDialog
        request={managingTtsRequest}
        open={!!managingTtsRequest}
        onOpenChange={(open) => !open && setManagingTtsRequest(null)}
        onSuccess={() => selectedUser && fetchUserDetails(selectedUser)}
      />
      <CreditManagementDialog
        open={!!managingCreditsUser}
        onOpenChange={(open) => !open && setManagingCreditsUser(null)}
        user={managingCreditsUser}
        onSuccess={() => {
          fetchUsers();
          if (selectedUser && managingCreditsUser && selectedUser.id === managingCreditsUser.id) {
            fetchUserDetails(selectedUser);
          }
        }}
      />

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
              <li>Verify that the bucket <code className="bg-gray-100 px-1 py-0.5 rounded">pdfs</code> exists.</li>
              <li>Click on the bucket and go to the "Policies" tab.</li>
              <li>Ensure policies exist that allow authenticated users to perform SELECT, INSERT, UPDATE, and DELETE operations.</li>
            </ol>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowStorageHelp(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;