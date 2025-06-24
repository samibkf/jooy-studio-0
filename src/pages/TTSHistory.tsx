
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserRound, RefreshCw } from 'lucide-react';
import TTSRequestModal from '@/components/TTSRequestModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';

interface DocForTutor {
    id: string;
    name: string;
}

const TTSHistory = () => {
    const { authState } = useAuth();
    const { t, isRTL } = useLanguage();
    const navigate = useNavigate();
    const [documents, setDocuments] = useState<DocForTutor[]>([]);
    const [virtualTutorRequests, setVirtualTutorRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDocument, setSelectedDocument] = useState<DocForTutor | null>(null);

    const fetchAllData = useCallback(async () => {
        if (!authState.user) return;
        setLoading(true);
        try {
            const [docs, requests] = await Promise.all([
                supabase.from('documents').select('id, name').eq('user_id', authState.user.id),
                supabase.from('tts_requests').select('*, documents(name)').eq('user_id', authState.user.id).order('created_at', { ascending: false })
            ]);

            if (docs.error) throw docs.error;
            if (requests.error) throw requests.error;

            setDocuments(docs.data || []);
            setVirtualTutorRequests(requests.data || []);
        } catch (error) {
            toast.error(t('tts.failed_fetch'));
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [authState.user, t]);

    useEffect(() => {
        if (authState.session && authState.user) {
            fetchAllData();
        } else if (!authState.session) {
            navigate('/auth', { replace: true });
        }
    }, [authState, navigate, fetchAllData]);
    

    const handleRequestVirtualTutor = (doc: DocForTutor) => {
        setSelectedDocument(doc);
    };
    
    return (
        <div className="container mx-auto py-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold" dir={isRTL ? 'rtl' : 'ltr'}>
                    {t('tts.virtual_tutor_requests')}
                </h1>
                <Button variant="outline" asChild>
                    <Link to="/">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        <span dir={isRTL ? 'rtl' : 'ltr'}>{t('tts.back_to_studio')}</span>
                    </Link>
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle dir={isRTL ? 'rtl' : 'ltr'}>{t('tts.your_documents')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <p dir={isRTL ? 'rtl' : 'ltr'}>{t('tts.loading')}</p>
                        ) : documents.length > 0 ? (
                            <ul className="space-y-2">
                                {documents.map(doc => (
                                    <li key={doc.id} className="flex justify-between items-center p-2 border rounded-md">
                                        <span className="truncate pr-2" dir={isRTL ? 'rtl' : 'ltr'}>{doc.name}</span>
                                        <Button onClick={() => handleRequestVirtualTutor(doc)} size="sm">
                                            <UserRound className="mr-2 h-4 w-4" /> 
                                            <span dir={isRTL ? 'rtl' : 'ltr'}>{t('tts.request_virtual_tutor')}</span>
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p dir={isRTL ? 'rtl' : 'ltr'}>{t('tts.no_documents')}</p>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle dir={isRTL ? 'rtl' : 'ltr'}>{t('tts.request_history')}</CardTitle>
                        <Button variant="ghost" size="icon" onClick={fetchAllData} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <p dir={isRTL ? 'rtl' : 'ltr'}>{t('tts.loading')}</p>
                        ) : virtualTutorRequests.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead dir={isRTL ? 'rtl' : 'ltr'}>{t('tts.document')}</TableHead>
                                        <TableHead dir={isRTL ? 'rtl' : 'ltr'}>{t('tts.status')}</TableHead>
                                        <TableHead dir={isRTL ? 'rtl' : 'ltr'}>{t('tts.pages')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {virtualTutorRequests.map(req => (
                                        <TableRow key={req.id}>
                                            <TableCell className="truncate max-w-xs" dir={isRTL ? 'rtl' : 'ltr'}>
                                                {req.documents.name}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={req.status === 'completed' ? 'default' : 'secondary'}>
                                                    {req.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{req.requested_pages.length}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <p dir={isRTL ? 'rtl' : 'ltr'}>{t('tts.no_requests')}</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {selectedDocument && (
                <TTSRequestModal 
                    isOpen={!!selectedDocument}
                    onOpenChange={(isOpen) => !isOpen && setSelectedDocument(null)}
                    documentId={selectedDocument.id}
                    documentName={selectedDocument.name}
                    onSuccess={fetchAllData}
                />
            )}
        </div>
    );
};

export default TTSHistory;
