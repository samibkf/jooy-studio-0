
-- Add a new column to store the selected voice type for TTS requests.
ALTER TABLE public.tts_requests ADD COLUMN voice_type TEXT;

-- Add a check constraint to ensure the voice_type is either 'female' or 'male'.
-- This is applied on new or updated rows.
ALTER TABLE public.tts_requests
ADD CONSTRAINT voice_type_check CHECK (voice_type IN ('female', 'male'));
