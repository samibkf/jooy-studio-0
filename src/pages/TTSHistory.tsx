import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/use-toast';
import { ArrowDown, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthProvider';
import { Pagination } from '@/components/ui/pagination';
import { VirtualTutorRequest } from '@/types/virtualTutorRequest';
import { VirtualTutorRequestService } from '@/services/VirtualTutorRequestService';
import { format } from 'date-fns';
import { enUS, arSA } from 'date-fns/locale';

interface FilterOptions {
  status: string;
  voice_preference: string;
  language: string;
}

const TTSHistory = () => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { authState } = useAuth();
  const [requests, setRequests] = useState<VirtualTutorRequest[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<VirtualTutorRequest | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    status: 'all',
    voice_preference: 'any',
    language: 'any',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
	const [totalItems, setTotalItems] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [voicePreference, setVoicePreference] = useState('male');
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const locale = language === 'ar' ? arSA : enUS;
    return format(date, 'PPP p', { locale });
  };

  const fetchRequests = useCallback(async () => {
    if (!authState.user) return;
		setIsInitialLoad(true);
    try {
      const service = new VirtualTutorRequestService(authState.session?.access_token || '');
      const response = await service.getVirtualTutorRequests(authState.user.id, currentPage, itemsPerPage);
      setRequests(response.data);
			setTotalItems(response.total);
    } catch (error) {
      console.error('Error fetching TTS requests:', error);
      toast({
        title: t('tts.fetch_error_title'),
        description: t('tts.fetch_error_description'),
        variant: 'destructive',
      });
    } finally {
			setIsInitialLoad(false);
		}
  }, [authState.user, authState.session?.access_token, currentPage, itemsPerPage, t, toast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleFilterChange = (field: keyof FilterOptions, value: string) => {
    setFilterOptions(prev => ({ ...prev, [field]: value }));
  };

  const filteredRequests = requests.filter(request => {
    const statusMatch = filterOptions.status === 'all' || request.status === filterOptions.status;
    const voiceMatch = filterOptions.voice_preference === 'any' || request.voice_preference === filterOptions.voice_preference;
    const languageMatch = filterOptions.language === 'any' || request.language === filterOptions.language;
    return statusMatch && voiceMatch && languageMatch;
  });

  const handleSubmit = async () => {
    if (!authState.user) return;
    setIsSubmitting(true);
    try {
      const service = new VirtualTutorRequestService(authState.session?.access_token || '');
      await service.createVirtualTutorRequest({
        document_id: 'd964948c-7592-417f-9a5f-4cedf194c9e9', // Replace with actual document ID
        user_id: authState.user.id,
        special_instructions: specialInstructions,
        voice_preference: voicePreference,
        language: selectedLanguage,
      });
      toast({
        title: t('tts.request_success_title'),
        description: t('tts.request_success_description'),
      });
      setIsModalOpen(false);
      setSpecialInstructions('');
      fetchRequests();
    } catch (error) {
      console.error('Error submitting TTS request:', error);
      toast({
        title: t('tts.request_error_title'),
        description: t('tts.request_error_description'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{t('tts.history_title')}</h1>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="gradient-bg-orange-purple"
          size="lg"
        >
          {t('tts.request_virtual_tutor')}
        </Button>
      </div>

      <div className="flex items-center space-x-4 mb-4">
        <div>
          <Label htmlFor="status-filter">{t('tts.filter_status')}</Label>
          <select
            id="status-filter"
            className="border rounded px-2 py-1"
            value={filterOptions.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="all">{t('tts.all_statuses')}</option>
            <option value="completed">{t('tts.status_completed')}</option>
            <option value="processing">{t('tts.status_processing')}</option>
            <option value="failed">{t('tts.status_failed')}</option>
          </select>
        </div>

        <div>
          <Label htmlFor="voice-filter">{t('tts.filter_voice')}</Label>
          <select
            id="voice-filter"
            className="border rounded px-2 py-1"
            value={filterOptions.voice_preference}
            onChange={(e) => handleFilterChange('voice_preference', e.target.value)}
          >
            <option value="any">{t('tts.any_voice')}</option>
            <option value="male">{t('tts.male_voice')}</option>
            <option value="female">{t('tts.female_voice')}</option>
          </select>
        </div>

        <div>
          <Label htmlFor="language-filter">{t('tts.filter_language')}</Label>
          <select
            id="language-filter"
            className="border rounded px-2 py-1"
            value={filterOptions.language}
            onChange={(e) => handleFilterChange('language', e.target.value)}
          >
            <option value="any">{t('tts.any_language')}</option>
            <option value="en-US">English</option>
            <option value="ar-SA">Arabic</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredRequests.map((request) => (
          <Card key={request.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">
                      {request.documents?.title || `Document ${request.document_id}`}
                    </h3>
                    <Badge variant={request.status === 'completed' ? 'default' : 
                                  request.status === 'processing' ? 'secondary' : 'destructive'}>
                      {t(`tts.status_${request.status}`)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground mb-4">
                    <div>
                      <strong>{t('tts.requested_at')}:</strong> {formatDate(request.created_at)}
                    </div>
                    <div>
                      <strong>{t('tts.status')}:</strong> {t(`tts.status_${request.status}`)}
                    </div>
                    <div>
                      <strong>{t('tts.voice_preference')}:</strong> {request.voice_preference}
                    </div>
                    <div>
                      <strong>{t('tts.language')}:</strong> {request.language}
                    </div>
                  </div>

                  {request.special_instructions && (
                    <div className="mb-4">
                      <strong className="text-sm">{t('tts.special_instructions')}:</strong>
                      <p className="text-sm text-muted-foreground mt-1">
                        {request.special_instructions}
                      </p>
                    </div>
                  )}

                  {request.audio_url && request.status === 'completed' && (
                    <div className="mb-4">
                      <audio controls className="w-full">
                        <source src={request.audio_url} type="audio/mpeg" />
                        {t('tts.audio_not_supported')}
                      </audio>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  {request.status === 'completed' && request.audio_url && (
                    <Button
                      onClick={() => handleDownload(request.audio_url!, `${request.documents?.title || 'audio'}.mp3`)}
                      variant="outline"
                      size="sm"
                    >
                      <ArrowDown className="h-4 w-4 mr-2" />
                      {t('tts.download')}
                    </Button>
                  )}
                  
                  <Button
                    onClick={() => setSelectedRequest(request)}
                    variant="outline"
                    size="sm"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {t('tts.view_details')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Pagination
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        totalItems={totalItems}
        onPageChange={handlePageChange}
      />

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogTrigger asChild>
          <span></span>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('tts.request_form_title')}</DialogTitle>
            <DialogDescription>
              {t('tts.request_form_description')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="voice" className="text-right">
                {t('tts.voice_preference')}
              </Label>
              <select
                id="voice"
                className="col-span-3 border rounded px-2 py-1"
                value={voicePreference}
                onChange={(e) => setVoicePreference(e.target.value)}
              >
                <option value="male">{t('tts.male_voice')}</option>
                <option value="female">{t('tts.female_voice')}</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="language" className="text-right">
                {t('tts.language')}:
              </Label>
              <select
                id="language"
                className="col-span-3 border rounded px-2 py-1"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
              >
                <option value="en-US">English</option>
                <option value="ar-SA">Arabic</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="instructions" className="text-right">
                {t('tts.special_instructions')}
              </Label>
              <Textarea
                id="instructions"
                className="col-span-3 min-h-[80px]"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                {t('tts.submitting')}
              </div>
            ) : (
              t('tts.submit_request')
            )}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>{t('tts.request_details')}</DialogTitle>
            <DialogDescription>
              {t('tts.request_details_description')}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <ScrollArea className="h-[400px] w-full">
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <strong className="block">{t('tts.document_title')}:</strong>
                    <span className="text-sm text-muted-foreground">{selectedRequest.documents?.title || 'N/A'}</span>
                  </div>
                  <div>
                    <strong className="block">{t('tts.requested_at')}:</strong>
                    <span className="text-sm text-muted-foreground">{formatDate(selectedRequest.created_at)}</span>
                  </div>
                  <div>
                    <strong className="block">{t('tts.status')}:</strong>
                    <span className="text-sm text-muted-foreground">{t(`tts.status_${selectedRequest.status}`)}</span>
                  </div>
                  <div>
                    <strong className="block">{t('tts.voice_preference')}:</strong>
                    <span className="text-sm text-muted-foreground">{selectedRequest.voice_preference}</span>
                  </div>
                  <div>
                    <strong className="block">{t('tts.language')}:</strong>
                    <span className="text-sm text-muted-foreground">{selectedRequest.language}</span>
                  </div>
                </div>
                <div>
                  <strong className="block">{t('tts.special_instructions')}:</strong>
                  <p className="text-sm text-muted-foreground">{selectedRequest.special_instructions || 'N/A'}</p>
                </div>
                {selectedRequest.audio_url && selectedRequest.status === 'completed' && (
                  <div>
                    <strong className="block">{t('tts.audio_playback')}:</strong>
                    <audio controls className="w-full">
                      <source src={selectedRequest.audio_url} type="audio/mpeg" />
                      {t('tts.audio_not_supported')}
                    </audio>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TTSHistory;
