
import { VirtualTutorRequest, CreateVirtualTutorRequestData, VirtualTutorRequestResponse } from '@/types/virtualTutorRequest';

export class VirtualTutorRequestService {
  private accessToken: string;
  private baseUrl: string = import.meta.env.VITE_SUPABASE_URL || '';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async getVirtualTutorRequests(
    userId: string, 
    page: number = 1, 
    limit: number = 10
  ): Promise<VirtualTutorRequestResponse> {
    try {
      // Mock data for now - replace with actual API call
      const mockRequests: VirtualTutorRequest[] = [
        {
          id: '1',
          document_id: 'd964948c-7592-417f-9a5f-4cedf194c9e9',
          user_id: userId,
          special_instructions: 'Please speak slowly and clearly',
          voice_preference: 'female',
          language: 'en-US',
          status: 'completed',
          audio_url: 'https://example.com/audio1.mp3',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          documents: {
            title: 'Sample Document 1'
          }
        },
        {
          id: '2',
          document_id: 'd964948c-7592-417f-9a5f-4cedf194c9e9',
          user_id: userId,
          special_instructions: 'Add pauses between sections',
          voice_preference: 'male',
          language: 'ar-SA',
          status: 'processing',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          updated_at: new Date(Date.now() - 86400000).toISOString(),
          documents: {
            title: 'Sample Document 2'
          }
        }
      ];

      return {
        data: mockRequests,
        total: mockRequests.length,
        page,
        limit
      };
    } catch (error) {
      console.error('Error fetching virtual tutor requests:', error);
      throw error;
    }
  }

  async createVirtualTutorRequest(data: CreateVirtualTutorRequestData): Promise<VirtualTutorRequest> {
    try {
      // Mock response for now - replace with actual API call
      const newRequest: VirtualTutorRequest = {
        id: Date.now().toString(),
        ...data,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        documents: {
          title: 'New Document'
        }
      };

      return newRequest;
    } catch (error) {
      console.error('Error creating virtual tutor request:', error);
      throw error;
    }
  }
}
