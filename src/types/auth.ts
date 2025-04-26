
import { User, Session } from '@supabase/supabase-js';

export interface AuthFormData {
  email: string;
  password: string;
  fullName?: string;
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
}
