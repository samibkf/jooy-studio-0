
export interface VirtualTutorRequest {
  id: string;
  document_id: string;
  user_id: string;
  special_instructions?: string;
  voice_preference: 'male' | 'female';
  language: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  audio_url?: string;
  created_at: string;
  updated_at: string;
  documents?: {
    title: string;
  };
}

export interface CreateVirtualTutorRequestData {
  document_id: string;
  user_id: string;
  special_instructions?: string;
  voice_preference: 'male' | 'female';
  language: string;
}

export interface VirtualTutorRequestResponse {
  data: VirtualTutorRequest[];
  total: number;
  page: number;
  limit: number;
}
