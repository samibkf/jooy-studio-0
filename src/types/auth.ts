
import { User, Session } from '@supabase/supabase-js';
import { Tables } from "@/integrations/supabase/types";

export interface AuthFormData {
  email: string;
  password: string;
  fullName?: string;
  rememberMe?: boolean; // Added rememberMe field
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'user' | 'admin';
  created_at: string;
  plan_id: string | null;
  credits_remaining: number;
}

export type TtsRequestWithDetails = Tables<'tts_requests'> & {
  profile: { full_name: string | null; email: string } | null;
  documents: { name: string } | null;
};
