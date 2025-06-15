
-- Phase 1: Database & Storage Setup

-- 1. Create tts storage bucket for audio files
-- Using ON CONFLICT DO NOTHING to avoid errors on re-runs
INSERT INTO storage.buckets (id, name, public)
VALUES ('tts', 'tts', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for tts bucket
-- Drop existing policies to avoid conflicts if they exist
DROP POLICY IF EXISTS "Public read access for tts files" ON storage.objects;
CREATE POLICY "Public read access for tts files" ON storage.objects
FOR SELECT USING ( bucket_id = 'tts' );

DROP POLICY IF EXISTS "Admin can manage all tts files" ON storage.objects;
CREATE POLICY "Admin can manage all tts files" ON storage.objects
FOR ALL USING ( public.is_admin(auth.uid()) AND bucket_id = 'tts' );


-- 2. Create tts_audio_files table
CREATE TABLE IF NOT EXISTS public.tts_audio_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tts_request_id UUID NOT NULL REFERENCES public.tts_requests(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT,
  duration_seconds NUMERIC(10, 2),
  status TEXT NOT NULL DEFAULT 'generated', -- e.g., 'generated', 'approved', 'rejected'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add a unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tts_audio_files_request_page_unique' AND conrelid = 'public.tts_audio_files'::regclass
  ) THEN
    ALTER TABLE public.tts_audio_files
    ADD CONSTRAINT tts_audio_files_request_page_unique UNIQUE (tts_request_id, page_number);
  END IF;
END;
$$;


-- Enable RLS for tts_audio_files
ALTER TABLE public.tts_audio_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tts_audio_files
DROP POLICY IF EXISTS "Admins can manage tts_audio_files" ON public.tts_audio_files;
CREATE POLICY "Admins can manage tts_audio_files"
ON public.tts_audio_files FOR ALL
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view their approved tts_audio_files" ON public.tts_audio_files;
CREATE POLICY "Users can view their approved tts_audio_files"
ON public.tts_audio_files FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tts_requests req
    WHERE req.id = tts_audio_files.tts_request_id AND req.user_id = auth.uid() AND tts_audio_files.status = 'approved'
  )
);

-- 3. Add final_audio_path to tts_requests to store the final compiled audio's path in storage
ALTER TABLE public.tts_requests
ADD COLUMN IF NOT EXISTS final_audio_path TEXT;
